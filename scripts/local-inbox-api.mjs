import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const fileTypes = new Map([
  ['.mp4', 'video'], ['.mov', 'video'], ['.webm', 'video'], ['.mkv', 'video'],
  ['.jpg', 'image'], ['.jpeg', 'image'], ['.png', 'image'], ['.webp', 'image'], ['.avif', 'image'], ['.tif', 'image'], ['.tiff', 'image'],
  ['.svg', 'graphic'], ['.gif', 'animation']
]);
const orientations = new Set(['vertical', 'horizontal', 'square', 'portrait', 'landscape', 'transparent', 'mixed']);

export function createLocalInboxApi({ root = process.cwd(), token } = {}) {
  if (!token) throw new Error('Lokales Verwaltungstoken fehlt.');
  let busy = false;
  return {
    async handle(request, response, url) {
      if (!url.pathname.startsWith('/inbox-api/')) return false;
      setHeaders(response);
      if (!isLoopback(request.socket.remoteAddress)) return sendJson(response, 403, { error: 'Die Inbox-API ist ausschließlich lokal erreichbar.' });
      if (request.method === 'GET' && url.pathname === '/inbox-api/list') return sendJson(response, 200, { ok: true, files: listInboxFiles(root) });
      if (request.method !== 'POST') return sendJson(response, 405, { error: 'Nur POST ist für diese Aktion erlaubt.' });
      if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Ungültiger Ursprung.' });
      if (request.headers['x-vah-token'] !== token) return sendJson(response, 403, { error: 'Ungültiges lokales Verwaltungstoken.' });
      if (busy) return sendJson(response, 409, { error: 'Ein anderer Inbox-Import läuft bereits.' });
      let payload;
      try { payload = await readBody(request, 64 * 1024); }
      catch (error) { return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Ungültige Anfrage.' }); }

      busy = true;
      try {
        if (url.pathname !== '/inbox-api/import') return sendJson(response, 404, { error: 'Inbox-Aktion nicht gefunden.' });
        const input = validateInboxImportPayload(payload, root);
        const args = buildArgs(input);
        const output = runScript(root, 'scripts/add-asset.mjs', args);
        if (input.removeAfterImport) fs.rmSync(input.absolutePath, { force: true });
        return sendJson(response, 200, { ok: true, imported: input.filename, removedFromInbox: input.removeAfterImport, output });
      } catch (error) {
        return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
      } finally {
        busy = false;
      }
    }
  };
}

export function listInboxFiles(root = process.cwd()) {
  const directory = path.join(root, 'inbox');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== 'README.md' && !entry.name.startsWith('.'))
    .map((entry) => {
      const extension = path.extname(entry.name).toLowerCase();
      const type = fileTypes.get(extension);
      if (!type) return null;
      const stat = fs.statSync(path.join(directory, entry.name));
      return {
        filename: entry.name,
        extension: extension.slice(1),
        type,
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        previewUrl: `/inbox/${encodeURIComponent(entry.name)}`
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
}

export function validateInboxImportPayload(payload, root = process.cwd()) {
  const filename = requireFilename(payload?.filename);
  const absolutePath = path.join(root, 'inbox', filename);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) throw new Error('Inbox-Datei wurde nicht gefunden.');
  const extension = path.extname(filename).toLowerCase();
  const type = fileTypes.get(extension);
  if (!type) throw new Error(`Dateityp ${extension || '?'} wird nicht unterstützt.`);
  if (fs.statSync(absolutePath).size > 2 * 1024 * 1024 * 1024) throw new Error('Inbox-Datei ist größer als 2 GB.');
  if (payload?.rightsOwned !== true) throw new Error('Der Import eigener Dateien benötigt eine ausdrückliche Bestätigung der Nutzungsrechte.');

  const channelId = requireSlug(payload?.channel, 'channel');
  const collectionId = requireSlug(payload?.collection, 'collection');
  const channelIndex = readJson(path.join(root, 'catalog', 'channels', 'index.json'));
  const channelFile = (channelIndex.files ?? []).find((file) => path.basename(file, '.json') === channelId);
  if (!channelFile) throw new Error(`Unbekannter Kanal: ${channelId}`);
  const channel = readJson(path.join(root, channelFile));
  const collection = (channel.collections ?? []).find((entry) => entry.id === collectionId);
  if (!collection) throw new Error(`Unbekannte Sammlung: ${channelId}/${collectionId}`);

  const title = requireText(payload?.title, 'title', 3, 160);
  const description = requireText(payload?.description, 'description', 10, 1500);
  const orientation = requireText(payload?.orientation, 'orientation', 3, 20);
  if (!orientations.has(orientation)) throw new Error(`Ungültige Ausrichtung: ${orientation}`);
  const extraTags = list(payload?.tags, 12).map(slug);
  const aliases = list(payload?.aliases, 12);
  const tags = [...new Set([channel.channelTag, `collection-${collection.id}`, ...collection.tags, ...extraTags])].slice(0, 40);
  const width = optionalInteger(payload?.width, 1, 100000, 'width');
  const height = optionalInteger(payload?.height, 1, 100000, 'height');
  const duration = optionalNumber(payload?.duration, 0, 24 * 60 * 60, 'duration');
  const sourceName = optionalText(payload?.sourceName, 'sourceName', 120) || 'Eigene Produktion';
  const notes = optionalText(payload?.notes, 'notes', 1000);
  const removeAfterImport = payload?.removeAfterImport !== false;

  return {
    filename,
    absolutePath,
    relativePath: `inbox/${filename}`,
    type,
    channel,
    collection,
    category: channel.primaryCategory,
    title,
    description,
    orientation,
    tags,
    aliases,
    width,
    height,
    duration,
    sourceName,
    notes,
    removeAfterImport,
    subject: collection.id,
    action: ['video', 'animation'].includes(type) ? 'b-roll' : 'reference-image',
    shot: type === 'graphic' ? 'not-applicable' : 'mixed',
    movement: ['video', 'animation'].includes(type) ? 'mixed' : 'static',
    style: type === 'graphic' ? 'illustration-2d' : 'realistic',
    storage: ['video', 'animation'].includes(type) ? 'git-lfs' : 'repository'
  };
}

function buildArgs(input) {
  const args = [
    '--file', input.relativePath,
    '--type', input.type,
    '--category', input.category,
    '--subject', input.subject,
    '--action', input.action,
    '--shot', input.shot,
    '--orientation', input.orientation,
    '--title', input.title,
    '--description', input.description,
    '--tags', input.tags.join(','),
    '--style', input.style,
    '--movement', input.movement,
    '--license', 'owned',
    '--source', input.sourceName,
    '--scopes', 'organic-social,youtube,website,app,presentation',
    '--status', 'review',
    '--storage', input.storage,
    '--created-by', 'local-inbox-browser',
    '--quality', '3',
    '--notes', input.notes || `Eigene Datei aus inbox/${input.filename}; Kanal ${input.channel.label}; Sammlung ${input.collection.label}.`
  ];
  if (input.aliases.length) args.push('--aliases', input.aliases.join(','));
  if (input.width) args.push('--width', String(input.width));
  if (input.height) args.push('--height', String(input.height));
  if (input.duration !== undefined) args.push('--duration', String(input.duration));
  return args;
}

function runScript(root, script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 4 * 1024 * 1024 });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status !== 0) throw new Error(output || `${script} ist fehlgeschlagen.`);
  return output.slice(-10000);
}

async function readBody(request, limit) {
  const contentType = String(request.headers['content-type'] || '').split(';')[0].trim();
  if (contentType !== 'application/json') throw new Error('Content-Type muss application/json sein.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error('Anfrage ist zu groß.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw new Error('JSON konnte nicht gelesen werden.'); }
}

function requireFilename(value) {
  const filename = requireText(value, 'filename', 1, 240);
  if (filename !== path.basename(filename) || filename.includes('/') || filename.includes('\\') || filename.startsWith('.')) throw new Error('filename ist ungültig.');
  return filename;
}
function requireText(value, label, min, max) { if (typeof value !== 'string') throw new Error(`${label} muss Text sein.`); const text = value.trim(); if (text.length < min || text.length > max) throw new Error(`${label} muss zwischen ${min} und ${max} Zeichen lang sein.`); if (text.startsWith('--') || /[\u0000-\u001F\u007F]/.test(text)) throw new Error(`${label} enthält ungültige Zeichen.`); return text; }
function optionalText(value, label, max) { if (value === undefined || value === null || value === '') return ''; return requireText(String(value), label, 1, max); }
function requireSlug(value, label) { const result = requireText(value, label, 2, 100); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new Error(`${label} ist kein gültiger Slug.`); return result; }
function slug(value) { const result = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); if (!result) throw new Error('Tag ist ungültig.'); return result; }
function list(value, max) { if (value === undefined || value === null || value === '') return []; const values = Array.isArray(value) ? value : String(value).split(','); const result = [...new Set(values.map((entry) => String(entry).trim()).filter(Boolean))]; if (result.length > max) throw new Error(`Liste darf höchstens ${max} Einträge enthalten.`); return result; }
function optionalInteger(value, min, max, label) { if (value === undefined || value === null || value === '') return undefined; const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} ist ungültig.`); return number; }
function optionalNumber(value, min, max, label) { if (value === undefined || value === null || value === '') return undefined; const number = Number(value); if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${label} ist ungültig.`); return number; }
function sameOrigin(request) { const origin = request.headers.origin; if (!origin) return true; try { const parsed = new URL(origin); return parsed.protocol === 'http:' && parsed.host === request.headers.host; } catch { return false; } }
function isLoopback(address) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || ''); }
function setHeaders(response) { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); }
function sendJson(response, status, value) { response.statusCode = status; response.end(`${JSON.stringify(value, null, 2)}\n`); return true; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
