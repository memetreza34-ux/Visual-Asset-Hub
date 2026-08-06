import { createHash, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import fs from 'node:fs';
import { isIP } from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

const assetIdPattern = /^VAH-[A-Z0-9]{8}$/;
const rejectedContentTypes = new Set(['text/html', 'text/plain', 'application/json', 'application/xml', 'text/xml']);

export async function createMediaPack({
  root = process.cwd(),
  ids,
  name = 'media-pack',
  maxFileBytes = 300 * 1024 * 1024,
  maxTotalBytes = 1500 * 1024 * 1024,
  fetchImpl = globalThis.fetch,
  resolveHost = defaultResolveHost,
  dryRun = false
} = {}) {
  const assetIds = validateIds(ids);
  const safeName = slug(name, 'name');
  if (!Number.isInteger(maxFileBytes) || maxFileBytes < 1024) throw new Error('maxFileBytes ist ungültig.');
  if (!Number.isInteger(maxTotalBytes) || maxTotalBytes < maxFileBytes) throw new Error('maxTotalBytes ist ungültig.');
  const catalog = readJson(path.join(root, 'catalog', 'assets.json'));
  const byId = new Map((catalog.assets ?? []).map((asset) => [asset.id, asset]));
  const assets = assetIds.map((id) => {
    const asset = byId.get(id);
    if (!asset) throw new Error(`Asset nicht gefunden: ${id}`);
    if (asset.status !== 'approved') throw new Error(`${id} ist nicht freigegeben und darf nicht in ein Medienpaket exportiert werden.`);
    return asset;
  });

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const exportsRoot = path.join(root, 'exports', 'media-packs');
  const finalDirectory = uniqueDirectory(exportsRoot, `${safeName}-${stamp}`);
  const tempDirectory = path.join(root, 'exports', `.tmp-media-pack-${randomBytes(6).toString('hex')}`);
  const filesDirectory = path.join(tempDirectory, 'media');
  const plan = assets.map((asset) => ({ id: asset.id, filename: asset.filename, storageKind: asset.storage.kind, source: sourceFor(asset) }));

  if (dryRun) return { dryRun: true, name: safeName, assetCount: assets.length, plan };
  fs.mkdirSync(filesDirectory, { recursive: true });
  const manifest = {
    format: 'visual-asset-hub-media-pack',
    version: 1,
    name: safeName,
    createdAt: new Date().toISOString(),
    catalogUpdatedAt: catalog.updatedAt,
    assetCount: assets.length,
    totalBytes: 0,
    assets: []
  };

  try {
    for (const asset of assets) {
      const target = path.join(filesDirectory, asset.filename);
      let result;
      if (asset.storage.kind === 'external') {
        result = await downloadVerified({
          url: asset.storage.externalUrl,
          target,
          maxBytes: maxFileBytes,
          expectedType: asset.type,
          fetchImpl,
          resolveHost
        });
      } else {
        const source = safeLocalPath(root, asset.storage.path);
        if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`${asset.id}: lokale Originaldatei fehlt.`);
        const bytes = fs.statSync(source).size;
        if (bytes > maxFileBytes) throw new Error(`${asset.id}: Datei überschreitet das Limit von ${formatBytes(maxFileBytes)}.`);
        fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
        result = { bytes, sha256: sha256File(target), finalUrl: null, contentType: localContentType(asset.filename) };
      }
      manifest.totalBytes += result.bytes;
      if (manifest.totalBytes > maxTotalBytes) throw new Error(`Medienpaket überschreitet das Gesamtlimit von ${formatBytes(maxTotalBytes)}.`);
      manifest.assets.push({
        id: asset.id,
        title: asset.title,
        filename: asset.filename,
        type: asset.type,
        category: asset.category,
        tags: asset.tags,
        bytes: result.bytes,
        sha256: result.sha256,
        contentType: result.contentType,
        sourceName: asset.rights.sourceName,
        sourcePage: asset.rights.sourceUrl ?? null,
        licenseStatus: asset.rights.licenseStatus,
        licenseUrl: asset.rights.licenseUrl ?? null,
        attributionRequired: asset.rights.attributionRequired,
        attributionText: asset.rights.attributionText ?? null,
        originalUrl: asset.storage.externalUrl ?? null,
        resolvedDownloadUrl: result.finalUrl,
        localPath: `media/${asset.filename}`
      });
    }

    fs.writeFileSync(path.join(tempDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(tempDirectory, 'ATTRIBUTION.md'), `${buildAttribution(manifest)}\n`);
    fs.writeFileSync(path.join(tempDirectory, 'README.md'), `${buildReadme(manifest)}\n`);
    fs.mkdirSync(exportsRoot, { recursive: true });
    fs.renameSync(tempDirectory, finalDirectory);
    return {
      dryRun: false,
      directory: path.relative(root, finalDirectory),
      assetCount: manifest.assetCount,
      totalBytes: manifest.totalBytes,
      files: manifest.assets.map((asset) => asset.localPath)
    };
  } catch (error) {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
    throw error;
  }
}

export function validatePublicHttpUrl(value) {
  let url;
  try { url = new URL(value); }
  catch { throw new Error('Download-URL ist ungültig.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Download-URL muss HTTP(S) verwenden.');
  if (url.username || url.password) throw new Error('Download-URL darf keine Zugangsdaten enthalten.');
  const hostname = normalizeHost(url.hostname);
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) throw new Error('Lokale Download-Ziele sind nicht erlaubt.');
  if (isBlockedAddress(hostname)) throw new Error('Private, reservierte oder lokale Download-Ziele sind nicht erlaubt.');
  return url;
}

export function validateIds(value) {
  const values = Array.isArray(value) ? value : String(value ?? '').split(',');
  const ids = values.map((item) => String(item).trim()).filter(Boolean);
  if (ids.length < 1 || ids.length > 20) throw new Error('Ein Medienpaket benötigt 1 bis 20 Asset-IDs.');
  if (new Set(ids).size !== ids.length || ids.some((id) => !assetIdPattern.test(id))) throw new Error('Asset-IDs enthalten Duplikate oder ungültige Werte.');
  return ids;
}

async function downloadVerified({ url, target, maxBytes, expectedType, fetchImpl, resolveHost }) {
  if (typeof fetchImpl !== 'function') throw new Error('Download-Funktion ist nicht verfügbar.');
  let current = validatePublicHttpUrl(url);
  let response;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertResolvedPublic(current.hostname, resolveHost);
    response = await fetchImpl(current, { method: 'GET', redirect: 'manual', headers: { Accept: '*/*', 'User-Agent': 'Visual-Asset-Hub/0.4' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Download-Weiterleitung enthält kein Ziel.');
      if (redirects === 5) throw new Error('Zu viele Download-Weiterleitungen.');
      current = validatePublicHttpUrl(new URL(location, current).toString());
      continue;
    }
    break;
  }
  if (!response?.ok || !response.body) throw new Error(`Download fehlgeschlagen: HTTP ${response?.status ?? '?'}.`);
  const contentType = normalizeContentType(response.headers.get('content-type'));
  validateContentType(contentType, expectedType);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared && (!Number.isFinite(declared) || declared < 0)) throw new Error('Ungültige Content-Length-Angabe.');
  if (declared && declared > maxBytes) throw new Error(`Datei überschreitet das Limit von ${formatBytes(maxBytes)}.`);
  const hash = createHash('sha256');
  let bytes = 0;
  const counter = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > maxBytes) return callback(new Error(`Datei überschreitet das Limit von ${formatBytes(maxBytes)}.`));
      hash.update(chunk);
      callback(null, chunk);
    }
  });
  try {
    await pipeline(Readable.fromWeb(response.body), counter, fs.createWriteStream(target, { flags: 'wx' }));
  } catch (error) {
    fs.rmSync(target, { force: true });
    throw error;
  }
  if (!bytes) {
    fs.rmSync(target, { force: true });
    throw new Error('Heruntergeladene Datei ist leer.');
  }
  return { bytes, sha256: hash.digest('hex'), finalUrl: current.toString(), contentType };
}

async function assertResolvedPublic(hostname, resolveHost) {
  const normalized = normalizeHost(hostname);
  if (isIpLiteral(normalized)) {
    if (isBlockedAddress(normalized)) throw new Error(`Private, reservierte oder lokale Adresse ist nicht erlaubt: ${normalized}`);
    return;
  }
  let addresses;
  try { addresses = await resolveHost(normalized); }
  catch { throw new Error(`Hostname konnte nicht sicher aufgelöst werden: ${normalized}`); }
  if (!addresses.length || addresses.some((entry) => isBlockedAddress(entry.address ?? entry))) throw new Error(`Hostname verweist auf eine private, reservierte oder lokale Adresse: ${normalized}`);
}

async function defaultResolveHost(hostname) {
  return lookup(hostname, { all: true, verbatim: true });
}

function normalizeHost(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '');
}

function isIpLiteral(value) {
  return isIP(normalizeHost(value)) !== 0;
}

function isBlockedAddress(value) {
  const address = normalizeHost(value);
  if (address.startsWith('::ffff:')) return isBlockedAddress(address.slice('::ffff:'.length));
  const family = isIP(address);
  if (family === 6) {
    return address === '::' || address === '::1' || /^f[cd]/.test(address) || /^fe[89ab]/.test(address) || address.startsWith('2001:db8:') || address.startsWith('2001:10:');
  }
  if (family !== 4) return false;
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && [18, 19].includes(b)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113);
}

function validateContentType(contentType, expectedType) {
  if (!contentType) return;
  if (rejectedContentTypes.has(contentType) || contentType.startsWith('text/')) throw new Error(`Download lieferte keinen Medieninhalt, sondern ${contentType}.`);
  if (['video', 'animation'].includes(expectedType) && !contentType.startsWith('video/') && contentType !== 'application/octet-stream') {
    throw new Error(`Unerwarteter Inhaltstyp für Video: ${contentType}.`);
  }
  if (['image', 'graphic', 'icon', 'mockup'].includes(expectedType) && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
    throw new Error(`Unerwarteter Inhaltstyp für Bild: ${contentType}.`);
  }
}

function normalizeContentType(value) {
  return String(value ?? '').split(';')[0].trim().toLowerCase();
}

function localContentType(filename) {
  const extension = path.extname(filename).toLowerCase();
  return ({
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif',
    '.svg': 'image/svg+xml', '.gif': 'image/gif', '.tif': 'image/tiff', '.tiff': 'image/tiff'
  })[extension] ?? 'application/octet-stream';
}

function safeLocalPath(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.startsWith('/') || relative.split('/').includes('..')) throw new Error('Unsicherer lokaler Asset-Pfad.');
  const resolved = path.resolve(root, ...relative.split('/'));
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!resolved.startsWith(prefix)) throw new Error('Lokaler Asset-Pfad verlässt das Projektverzeichnis.');
  return resolved;
}

function uniqueDirectory(parent, base) {
  let candidate = path.join(parent, base);
  for (let index = 2; fs.existsSync(candidate); index += 1) candidate = path.join(parent, `${base}-${index}`);
  return candidate;
}

function sourceFor(asset) {
  return asset.storage.kind === 'external' ? asset.storage.externalUrl : asset.storage.path;
}

function buildAttribution(manifest) {
  const lines = ['# Quellen und Attribution', '', `Paket: **${manifest.name}**`, `Erstellt: ${manifest.createdAt}`, ''];
  for (const asset of manifest.assets) {
    lines.push(`## ${asset.title} (${asset.id})`, '', `- Datei: \`${asset.filename}\``, `- Quelle: ${asset.sourceName}`);
    if (asset.sourcePage) lines.push(`- Quellseite: ${asset.sourcePage}`);
    if (asset.licenseUrl) lines.push(`- Lizenz: ${asset.licenseUrl}`);
    lines.push(`- Attribution erforderlich: ${asset.attributionRequired ? 'ja' : 'nein'}`);
    if (asset.attributionText) lines.push(`- Hinweis: ${asset.attributionText}`);
    lines.push('');
  }
  return lines.join('\n');
}

function buildReadme(manifest) {
  return [
    '# Visual Asset Hub Medienpaket', '',
    `Name: **${manifest.name}**`,
    `Assets: **${manifest.assetCount}**`,
    `Größe: **${formatBytes(manifest.totalBytes)}**`, '',
    'Alle enthaltenen Medien waren beim Export im Status `approved`.',
    'Das Manifest enthält SHA-256-Prüfsummen, Inhaltstypen, Quellen, Lizenzstatus und lokale Dateipfade.',
    'Vor einer Veröffentlichung weiterhin den konkreten Einsatzkontext und sichtbare Marken prüfen.', ''
  ].join('\n');
}

function slug(value, label) {
  const result = String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  if (result.length < 2) throw new Error(`${label} ist zu kurz oder ungültig.`);
  return result;
}

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function parseArgs(values) { const result = {}; for (let index = 0; index < values.length; index += 1) { const token = values[index]; if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`); const [key, inline] = token.slice(2).split('=', 2); const next = values[index + 1]; result[key] = inline ?? (next && !next.startsWith('--') ? values[++index] : 'true'); } return result; }
function integerArg(value, fallback, min, max, label) { const number = value === undefined ? fallback : Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ids) throw new Error('--ids ist erforderlich.');
  const result = await createMediaPack({
    ids: args.ids,
    name: args.name ?? 'media-pack',
    maxFileBytes: integerArg(args['max-file-mb'], 300, 1, 2000, 'max-file-mb') * 1024 * 1024,
    maxTotalBytes: integerArg(args['max-total-mb'], 1500, 1, 10000, 'max-total-mb') * 1024 * 1024,
    dryRun: args['dry-run'] === 'true'
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
