import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const supportedExtensions = new Set(['.mp4', '.mov', '.webm', '.mkv', '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff', '.svg']);
const maxUploadBytes = 2 * 1024 * 1024 * 1024;
const minimumFreeReserve = 100 * 1024 * 1024;

export function createLocalUploadApi({ root = process.cwd(), token } = {}) {
  if (!token) throw new Error('Lokales Verwaltungstoken fehlt.');
  return {
    async handle(request, response, url) {
      if (!url.pathname.startsWith('/upload-api/')) return false;
      setHeaders(response);
      if (!isLoopback(request.socket.remoteAddress)) return sendJson(response, 403, { error: 'Die Upload-API ist ausschließlich lokal erreichbar.' });
      if (request.method === 'GET' && url.pathname === '/upload-api/health') {
        return sendJson(response, 200, { ok: true, local: true, maxUploadBytes, supportedExtensions: [...supportedExtensions].sort() });
      }
      if (request.method !== 'POST' || url.pathname !== '/upload-api/file') return sendJson(response, 405, { error: 'Nur POST /upload-api/file ist erlaubt.' });
      if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Ungültiger Ursprung.' });
      if (request.headers['x-vah-token'] !== token) return sendJson(response, 403, { error: 'Ungültiges lokales Verwaltungstoken.' });
      if (String(request.headers['content-type'] || '').split(';')[0].trim() !== 'application/octet-stream') return sendJson(response, 415, { error: 'Content-Type muss application/octet-stream sein.' });
      if (request.headers['content-encoding']) return sendJson(response, 400, { error: 'Komprimierte Upload-Anfragen sind nicht erlaubt.' });

      let metadata;
      try { metadata = validateUploadMetadata(request.headers); }
      catch (error) { return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) }); }

      const inbox = path.join(root, 'inbox');
      fs.mkdirSync(inbox, { recursive: true });
      try { assertDiskSpace(inbox, metadata.size); }
      catch (error) { return sendJson(response, 507, { error: error instanceof Error ? error.message : String(error) }); }

      const storedFilename = uniqueFilename(inbox, metadata.filename);
      const finalPath = path.join(inbox, storedFilename);
      const tempPath = path.join(inbox, `.upload-${randomBytes(8).toString('hex')}.part`);
      try {
        const bytes = await streamRequestToFile(request, tempPath, metadata.size);
        validateUploadedFile(tempPath, metadata.extension);
        fs.renameSync(tempPath, finalPath);
        return sendJson(response, 201, {
          ok: true,
          originalFilename: metadata.filename,
          storedFilename,
          bytes,
          extension: metadata.extension.slice(1),
          renamed: storedFilename !== metadata.filename
        });
      } catch (error) {
        fs.rmSync(tempPath, { force: true });
        fs.rmSync(finalPath, { force: true });
        return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  };
}

export function validateUploadMetadata(headers) {
  const encodedName = String(headers['x-vah-filename'] || '');
  if (!encodedName) throw new Error('Dateiname fehlt.');
  let decoded;
  try { decoded = decodeURIComponent(encodedName); }
  catch { throw new Error('Dateiname ist nicht korrekt URL-codiert.'); }
  const filename = sanitizeUploadFilename(decoded);
  const extension = path.extname(filename).toLowerCase();
  if (!supportedExtensions.has(extension)) throw new Error(`Dateityp ${extension || '?'} wird nicht unterstützt.`);
  const size = strictInteger(headers['x-vah-size'], 1, maxUploadBytes, 'Dateigröße');
  const contentLength = headers['content-length'] === undefined ? null : strictInteger(headers['content-length'], 1, maxUploadBytes, 'Content-Length');
  if (contentLength !== null && contentLength !== size) throw new Error('Übertragungsgröße stimmt nicht mit der ausgewählten Datei überein.');
  return { filename, extension, size };
}

export function sanitizeUploadFilename(value) {
  if (typeof value !== 'string') throw new Error('Dateiname muss Text sein.');
  const normalized = value.normalize('NFC').trim();
  if (!normalized || normalized.length > 180) throw new Error('Dateiname muss zwischen 1 und 180 Zeichen lang sein.');
  if (normalized !== path.basename(normalized) || normalized.includes('/') || normalized.includes('\\') || normalized.startsWith('.')) throw new Error('Dateiname enthält einen ungültigen Pfad.');
  if (/[\u0000-\u001F\u007F]/.test(normalized)) throw new Error('Dateiname enthält Steuerzeichen.');
  if (/[<>:"|?*]/.test(normalized)) throw new Error('Dateiname enthält unter Windows ungültige Zeichen.');
  const stem = path.basename(normalized, path.extname(normalized));
  if (!stem || /[. ]$/.test(stem)) throw new Error('Dateiname endet ungültig.');
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reserved.test(stem)) throw new Error('Reservierter Windows-Dateiname ist nicht erlaubt.');
  return normalized;
}

export function validateUploadedFile(file, extension = path.extname(file).toLowerCase()) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size < 4) throw new Error('Datei ist leer oder unvollständig.');
  const descriptor = fs.openSync(file, 'r');
  const header = Buffer.alloc(Math.min(4096, stat.size));
  try { fs.readSync(descriptor, header, 0, header.length, 0); }
  finally { fs.closeSync(descriptor); }

  const hex = header.subarray(0, 16).toString('hex');
  if (['.jpg', '.jpeg'].includes(extension) && !hex.startsWith('ffd8ff')) throw new Error('Datei besitzt keine gültige JPEG-Signatur.');
  if (extension === '.png' && !hex.startsWith('89504e470d0a1a0a')) throw new Error('Datei besitzt keine gültige PNG-Signatur.');
  if (extension === '.gif' && !['GIF87a', 'GIF89a'].includes(header.subarray(0, 6).toString('ascii'))) throw new Error('Datei besitzt keine gültige GIF-Signatur.');
  if (extension === '.webp' && !(header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP')) throw new Error('Datei besitzt keine gültige WEBP-Signatur.');
  if (['.tif', '.tiff'].includes(extension) && !['49492a00', '4d4d002a'].includes(hex.slice(0, 8))) throw new Error('Datei besitzt keine gültige TIFF-Signatur.');
  if (['.webm', '.mkv'].includes(extension) && !hex.startsWith('1a45dfa3')) throw new Error('Datei besitzt keine gültige WEBM/MKV-Signatur.');
  if (['.mp4', '.mov'].includes(extension)) {
    const atom = header.subarray(4, 8).toString('ascii');
    if (!['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].includes(atom)) throw new Error('Datei besitzt keine gültige MP4/MOV-Signatur.');
  }
  if (extension === '.avif') {
    const atom = header.subarray(4, 8).toString('ascii');
    const brands = header.subarray(8, 64).toString('ascii');
    if (atom !== 'ftyp' || !/(avif|avis)/.test(brands)) throw new Error('Datei besitzt keine gültige AVIF-Signatur.');
  }
  if (extension === '.svg') validateSvg(file, stat.size);
  return true;
}

function validateSvg(file, size) {
  if (size > 10 * 1024 * 1024) throw new Error('SVG-Dateien dürfen höchstens 10 MB groß sein.');
  const source = fs.readFileSync(file, 'utf8');
  const compact = source.replace(/^\uFEFF/, '').trim().toLowerCase();
  if (!compact.includes('<svg')) throw new Error('Datei enthält kein SVG-Wurzelelement.');
  const blocked = [/<script\b/, /<foreignobject\b/, /<!doctype\b/, /<!entity\b/, /javascript\s*:/, /\bon[a-z]+\s*=/, /(?:href|src)\s*=\s*["']\s*(?:https?:|data:|\/\/)/];
  if (blocked.some((pattern) => pattern.test(compact))) throw new Error('SVG enthält aktive oder externe Inhalte und wurde blockiert.');
}

async function streamRequestToFile(request, target, expectedSize) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let settled = false;
    const output = fs.createWriteStream(target, { flags: 'wx', mode: 0o600 });
    const finish = (error) => {
      if (settled) return;
      settled = true;
      request.unpipe(output);
      output.destroy();
      if (error) reject(error); else resolve(bytes);
    };
    request.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > expectedSize || bytes > maxUploadBytes) finish(new Error('Upload überschreitet die angekündigte Dateigröße.'));
    });
    request.on('aborted', () => finish(new Error('Upload wurde abgebrochen.')));
    request.on('error', (error) => finish(error));
    output.on('error', (error) => finish(error));
    output.on('finish', () => {
      if (bytes !== expectedSize) finish(new Error(`Upload ist unvollständig: ${bytes} von ${expectedSize} Bytes.`));
      else finish();
    });
    request.pipe(output);
  });
}

function assertDiskSpace(directory, requiredBytes) {
  if (typeof fs.statfsSync !== 'function') return;
  const stat = fs.statfsSync(directory);
  const available = Number(stat.bavail) * Number(stat.bsize);
  if (Number.isFinite(available) && available < requiredBytes + minimumFreeReserve) throw new Error('Nicht genügend freier Speicher für den Upload und die Sicherheitsreserve.');
}

function uniqueFilename(directory, filename) {
  const extension = path.extname(filename);
  const stem = path.basename(filename, extension);
  let candidate = filename;
  for (let index = 2; fs.existsSync(path.join(directory, candidate)); index += 1) candidate = `${stem}-${index}${extension}`;
  return candidate;
}

function strictInteger(value, min, max, label) {
  if (!/^\d+$/.test(String(value ?? ''))) throw new Error(`${label} ist ungültig.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} Bytes liegen.`);
  return number;
}
function sameOrigin(request) { const origin = request.headers.origin; if (!origin) return true; try { const parsed = new URL(origin); return parsed.protocol === 'http:' && parsed.host === request.headers.host; } catch { return false; } }
function isLoopback(address) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || ''); }
function setHeaders(response) { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); }
function sendJson(response, status, value) { response.statusCode = status; response.end(`${JSON.stringify(value, null, 2)}\n`); return true; }
