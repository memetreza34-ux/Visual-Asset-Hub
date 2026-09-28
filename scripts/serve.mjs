import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { PROVIDERS } from './lib/providers/index.mjs';
import { chooseDownload, downloadAsset, loadDotEnv, searchWithCache, writeSourceMetadata } from './lib/source-utils.mjs';

const root = process.cwd();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const inboxRoot = path.join(root, 'inbox');
const inboxManifest = path.join(root, '.local-storage', 'inbox-analysis', 'manifest.json');
const writeApiEnabled = ['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.VAH_DISABLE_WRITE_API !== 'true';
loadDotEnv(path.join(root, '.env'));

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT muss zwischen 1 und 65535 liegen.');
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mov': 'video/quicktime', '.mkv': 'video/x-matroska', '.ogv': 'video/ogg'
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
    return serveStatic(request, response, url);
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof Error ? error.message : 'Serverfehler.' });
  }
});

async function handleApi(request, response, url) {
  setSecurityHeaders(response);
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(response, 200, { ok: true, writeApiEnabled, host, version: '0.12' });
  }
  if (request.method === 'GET' && url.pathname === '/api/sources') {
    const providers = Object.fromEntries(Object.entries(PROVIDERS).map(([name, config]) => [name, {
      types: config.types,
      requiresKey: config.requiresKey,
      tier: config.tier,
      configured: !config.requiresKey || Boolean(process.env[config.requiresKey])
    }]));
    return sendJson(response, 200, { providers });
  }
  if (request.method === 'POST' && url.pathname === '/api/sources/search') {
    requireWriteApi(request);
    const body = await readJsonBody(request);
    const provider = String(body.provider || 'nasa').toLowerCase();
    const type = body.type || (provider === 'openverse' ? 'image' : 'video');
    const result = await searchWithCache({
      root,
      provider,
      type,
      query: String(body.query || '').trim(),
      orientation: body.orientation || undefined,
      page: boundedInteger(body.page, 1, 100000, 1),
      perPage: boundedInteger(body.perPage, 1, provider === 'pixabay' ? 200 : 100, 20),
      locale: body.locale || 'de-DE',
      language: body.language || 'de',
      refresh: body.refresh === true
    });
    return sendJson(response, 200, result);
  }
  if (request.method === 'POST' && url.pathname === '/api/sources/grab') {
    requireWriteApi(request);
    const body = await readJsonBody(request);
    const provider = String(body.provider || 'nasa').toLowerCase();
    const type = body.type || (provider === 'openverse' ? 'image' : 'video');
    const query = String(body.query || '').trim();
    const pick = boundedInteger(body.pick, 1, 200, 1);
    const perPage = Math.max(pick, boundedInteger(body.perPage, 1, provider === 'pixabay' ? 200 : 100, 20));
    const result = await searchWithCache({
      root, provider, type, query,
      orientation: body.orientation || undefined,
      page: boundedInteger(body.page, 1, 100000, 1),
      perPage,
      locale: body.locale || 'de-DE',
      language: body.language || 'de',
      refresh: body.refresh === true
    });
    const asset = result.assets[pick - 1];
    if (!asset) return sendJson(response, 404, { error: `Treffer ${pick} existiert nicht.` });
    const download = chooseDownload(asset, boundedInteger(body.maxDimension, 480, 7680, 1920));
    if (!download) return sendJson(response, 422, { error: 'Keine geeignete Download-Datei vorhanden.' });
    const downloaded = await downloadAsset({ root, asset, download, provider });
    const sourceMetadata = writeSourceMetadata({ root, downloaded, asset, provider, query });
    const scan = runNode('scripts/scan-inbox.mjs');
    return sendJson(response, 201, {
      message: 'Asset wurde in die Inbox geladen.',
      downloaded: downloaded.relativePath,
      sourceMetadata,
      manifest: scan.status === 0 ? readManifest() : null
    });
  }
  if (request.method === 'GET' && url.pathname === '/api/inbox') {
    return sendJson(response, 200, readManifest());
  }
  if (request.method === 'POST' && url.pathname === '/api/inbox/scan') {
    requireWriteApi(request);
    const scan = runNode('scripts/scan-inbox.mjs');
    if (scan.status !== 0) return sendJson(response, 500, { error: cleanProcessError(scan, 'Inbox-Scan fehlgeschlagen.') });
    return sendJson(response, 200, { message: 'Inbox wurde analysiert.', output: scan.stdout.trim(), manifest: readManifest() });
  }
  if (request.method === 'POST' && url.pathname === '/api/inbox/import') {
    requireWriteApi(request);
    const body = await readJsonBody(request);
    const sourceFile = safeInboxFile(body.file);
    const sourceMetadata = sourceMetadataFor(sourceFile);
    const effective = applySourceMetadata(body, sourceMetadata);
    const fields = ['type','category','subject','action','shot','title','description','tags','style','movement','license','source','scopes','quality','status','sourceUrl','licenseUrl','attributionRequired','attributionText','expires','rightsNotes','notes','createdBy'];
    const args = ['scripts/add-asset.mjs', '--file', sourceFile];
    for (const field of fields) {
      let value = effective[field];
      if (field === 'status' && (value === undefined || value === null || value === '')) value = 'approved';
      if (value === undefined || value === null || value === '') continue;
      args.push(`--${toKebab(field)}`, Array.isArray(value) ? value.join(',') : String(value));
    }
    const imported = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (imported.status !== 0) return sendJson(response, 400, { error: cleanProcessError(imported, 'Import fehlgeschlagen.') });

    let archivedTo = null;
    let warning = null;
    try { archivedTo = archiveInboxSource(sourceFile); }
    catch (error) { warning = `Asset ist importiert, aber die Inbox-Quelldatei konnte nicht archiviert werden: ${error instanceof Error ? error.message : String(error)}`; }
    const scan = runNode('scripts/scan-inbox.mjs');
    return sendJson(response, 201, {
      message: 'Asset wurde erfolgreich in die Bibliothek aufgenommen.',
      output: imported.stdout.trim(),
      archivedTo,
      warning,
      provider: sourceMetadata?.provider || null,
      manifest: scan.status === 0 ? readManifest() : null
    });
  }
  return sendJson(response, 404, { error: 'API-Endpunkt nicht gefunden.' });
}

function applySourceMetadata(body, metadata) {
  const value = { ...body };
  if (!metadata?.provider) return value;
  value.license = metadata.licenseStatus || value.license || 'unknown';
  value.source = metadata.sourceName || providerLabel(metadata.provider);
  value.sourceUrl = metadata.sourceUrl || value.sourceUrl;
  value.licenseUrl = metadata.licenseUrl || value.licenseUrl;
  value.attributionRequired = String(Boolean(metadata.attributionRequired));
  value.attributionText = metadata.attributionText || value.attributionText;
  if (!Array.isArray(value.scopes) || !value.scopes.length) value.scopes = metadata.suggestedScopes || ['internal-only'];
  if (['restricted', 'unknown'].includes(metadata.licenseStatus)) value.status = 'review';
  else if (!value.status && metadata.suggestedStatus) value.status = metadata.suggestedStatus;
  const provenance = `Imported via ${providerLabel(metadata.provider)}${metadata.providerId ? `; provider ID ${metadata.providerId}` : ''}${metadata.upstreamProvider ? `; upstream ${metadata.upstreamProvider}` : ''}.`;
  value.rightsNotes = [value.rightsNotes, metadata.rightsWarning, provenance].filter(Boolean).join(' ');
  return value;
}

function sourceMetadataFor(sourceFile) {
  const rel = path.relative(root, sourceFile).split(path.sep).join('/');
  const asset = (readManifest().ready || []).find((entry) => entry.file === rel);
  return asset?.sourceMetadata || null;
}

function serveStatic(request, response, url) {
  if (!['GET', 'HEAD'].includes(request.method || 'GET')) return send(response, 405, 'Methode nicht erlaubt.');
  const pathname = url.pathname === '/' ? '/web/index.html' : decodeURIComponent(url.pathname);
  if (pathname.includes('\0') || pathname.split('/').some((part) => part === '..' || part.startsWith('.'))) return send(response, 400, 'Ungültiger Pfad.');
  const filePath = path.resolve(root, `.${pathname}`);
  const allowedPrefix = `${path.resolve(root)}${path.sep}`;
  if (!filePath.startsWith(allowedPrefix)) return send(response, 403, 'Zugriff verweigert.');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(response, 404, 'Datei nicht gefunden.');
  const stat = fs.statSync(filePath);
  const range = request.headers.range;
  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  response.setHeader('Content-Type', contentType);
  setSecurityHeaders(response);
  response.setHeader('Cache-Control', pathname.includes('/catalog/') ? 'no-store' : 'public, max-age=300');
  if (range && contentType.startsWith('video/')) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) return send(response, 416, 'Ungültiger Range-Header.');
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) return send(response, 416, 'Bereich nicht verfügbar.');
    response.writeHead(206, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    if (request.method === 'HEAD') return response.end();
    return fs.createReadStream(filePath, { start, end }).pipe(response);
  }
  response.setHeader('Content-Length', stat.size);
  if (request.method === 'HEAD') return response.end();
  return fs.createReadStream(filePath).pipe(response);
}

function readManifest() {
  if (!fs.existsSync(inboxManifest)) return { generatedAt: null, count: 0, ready: [], failed: [] };
  try { return JSON.parse(fs.readFileSync(inboxManifest, 'utf8')); }
  catch { return { generatedAt: null, count: 0, ready: [], failed: [], error: 'Manifest ist beschädigt.' }; }
}

function safeInboxFile(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Inbox-Datei fehlt.');
  const candidate = path.resolve(root, value);
  const prefix = `${path.resolve(inboxRoot)}${path.sep}`;
  if (!candidate.startsWith(prefix)) throw new Error('Nur Dateien innerhalb von inbox/ dürfen importiert werden.');
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) throw new Error('Inbox-Datei wurde nicht gefunden.');
  return candidate;
}

function archiveInboxSource(sourceFile) {
  const day = new Date().toISOString().slice(0, 10);
  const folder = path.join(root, 'archive', 'inbox-imported', day);
  fs.mkdirSync(folder, { recursive: true });
  const ext = path.extname(sourceFile);
  const base = path.basename(sourceFile, ext);
  let target = path.join(folder, `${base}${ext}`);
  let index = 2;
  while (fs.existsSync(target)) target = path.join(folder, `${base}-${index++}${ext}`);
  fs.renameSync(sourceFile, target);
  return path.relative(root, target).split(path.sep).join('/');
}

function runNode(script) { return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function cleanProcessError(result, fallback) { return (result.stderr || result.stdout || fallback).trim().slice(0, 8000); }
function requireWriteApi(request) {
  if (!writeApiEnabled) throw new Error('Schreibzugriff ist deaktiviert. Starte Visual Asset Hub lokal auf 127.0.0.1.');
  const remote = request.socket.remoteAddress || '';
  const localRemote = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  if (!localRemote) throw new Error('Schreibzugriff ist nur von diesem Computer erlaubt.');
  const fetchSite = request.headers['sec-fetch-site'];
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) throw new Error('Cross-Site-Schreibzugriff wurde blockiert.');
}
function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; if (body.length > 128 * 1024) { request.destroy(); reject(new Error('Request ist zu groß.')); } });
    request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Ungültiges JSON.')); } });
    request.on('error', reject);
  });
}
function boundedInteger(value, min, max, fallback) { const number = value === undefined || value === null || value === '' ? fallback : Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`Zahl muss zwischen ${min} und ${max} liegen.`); return number; }
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', openverse: 'Openverse', wikimedia: 'Wikimedia Commons', 'internet-archive': 'Internet Archive', nasa: 'NASA Image & Video Library', 'library-of-congress': 'Library of Congress' })[value] || String(value || 'Quelle'); }
function toKebab(value) { return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`); }
function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self'; script-src 'self'; connect-src 'self'");
}
function sendJson(response, status, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text), 'X-Content-Type-Options': 'nosniff' });
  response.end(text);
}
function send(response, status, text) { response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); response.end(text); }

server.listen(port, host, () => {
  console.log(`Visual Asset Hub: http://${host}:${port}`);
  console.log(`Lokale Review-API: ${writeApiEnabled ? 'aktiv' : 'nur lesen / deaktiviert'}`);
});
