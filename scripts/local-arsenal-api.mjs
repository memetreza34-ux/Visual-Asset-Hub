import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { searchPexels } from './lib/pexels.mjs';

const searchIdPattern = /^ARS-[A-F0-9]{16}$/;
const providerIdPattern = /^\d{1,20}$/;

export function createLocalArsenalApi({ root = process.cwd(), token } = {}) {
  if (!token) throw new Error('Lokales Verwaltungstoken fehlt.');
  let busy = false;
  const searchDirectory = path.join(root, '.local-storage', 'arsenal-web');

  return {
    async handle(request, response, url) {
      if (!url.pathname.startsWith('/arsenal-api/')) return false;
      setHeaders(response);
      if (!isLoopback(request.socket.remoteAddress)) return sendJson(response, 403, { error: 'Die Arsenal-API ist ausschließlich lokal erreichbar.' });
      if (request.method === 'GET' && url.pathname === '/arsenal-api/health') return sendJson(response, 200, { ok: true, local: true });
      if (request.method !== 'POST') return sendJson(response, 405, { error: 'Nur POST ist für diese Aktion erlaubt.' });
      if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Ungültiger Ursprung.' });
      if (request.headers['x-vah-token'] !== token) return sendJson(response, 403, { error: 'Ungültiges lokales Verwaltungstoken.' });
      if (busy) return sendJson(response, 409, { error: 'Eine andere Arsenal-Aktion läuft bereits.' });

      let payload;
      try { payload = await readBody(request, 64 * 1024); }
      catch (error) { return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Ungültige Anfrage.' }); }

      busy = true;
      try {
        if (url.pathname === '/arsenal-api/search') {
          const input = validateSearchPayload(payload, root);
          const result = await searchPexels({
            apiKey: input.apiKey,
            query: input.job.query,
            type: input.job.type,
            orientation: input.job.orientation,
            locale: 'de-DE',
            page: 1,
            perPage: input.job.perPage
          });
          const searchId = `ARS-${randomBytes(8).toString('hex').toUpperCase()}`;
          const wrapper = { version: 1, searchId, searchedAt: new Date().toISOString(), arsenalJob: input.job, result };
          fs.mkdirSync(searchDirectory, { recursive: true });
          fs.writeFileSync(path.join(searchDirectory, `${searchId}.json`), `${JSON.stringify(wrapper, null, 2)}\n`, { mode: 0o600 });
          return sendJson(response, 200, {
            ok: true,
            searchId,
            job: input.job,
            totalResults: result.total_results,
            assets: result.assets
          });
        }

        if (url.pathname === '/arsenal-api/import') {
          const input = validateImportPayload(payload);
          const file = path.join(searchDirectory, `${input.searchId}.json`);
          if (!fs.existsSync(file)) throw new Error('Suchergebnis wurde nicht gefunden oder ist abgelaufen.');
          const relative = path.relative(root, file);
          if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Ungültiger Suchergebnis-Pfad.');
          const output = runScript(root, 'scripts/arsenal-import-selected.mjs', ['--input', relative, '--ids', input.ids.join(',')]);
          return sendJson(response, 200, { ok: true, imported: input.ids.length, output });
        }

        return sendJson(response, 404, { error: 'Arsenal-Aktion nicht gefunden.' });
      } catch (error) {
        return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
      } finally {
        busy = false;
      }
    }
  };
}

export function validateSearchPayload(payload, root = process.cwd()) {
  const apiKey = requireText(payload?.apiKey, 'apiKey', 20, 300);
  const channelId = requireSlug(payload?.channel, 'channel');
  const collectionId = requireSlug(payload?.collection, 'collection');
  const variantId = requireSlug(payload?.variant, 'variant');
  const perPageRequested = payload?.perPage === undefined ? undefined : integer(payload.perPage, 1, 20, 'perPage');
  const queryIndex = payload?.queryIndex === undefined ? 0 : integer(payload.queryIndex, 0, 7, 'queryIndex');
  const index = readJson(path.join(root, 'catalog', 'channels', 'index.json'));
  const channelFile = (index.files ?? []).find((file) => path.basename(file, '.json') === channelId);
  if (!channelFile) throw new Error(`Unbekannter Kanal: ${channelId}`);
  const channel = readJson(path.join(root, channelFile));
  const collection = (channel.collections ?? []).find((entry) => entry.id === collectionId);
  if (!collection) throw new Error(`Unbekannte Sammlung: ${channelId}/${collectionId}`);
  const variant = (index.variants ?? []).find((entry) => entry.id === variantId);
  if (!variant) throw new Error(`Unbekannte Variante: ${variantId}`);
  const query = collection.queries[queryIndex % collection.queries.length];
  const perPage = Math.min(20, perPageRequested ?? variant.perPage ?? 15);
  return {
    apiKey,
    job: {
      id: `${channel.id}-${collection.id}-${variant.id}`,
      channel: channel.id,
      channelLabel: channel.label,
      collection: collection.id,
      collectionLabel: collection.label,
      category: channel.primaryCategory,
      query,
      type: variant.type,
      orientation: variant.orientation,
      perPage,
      tags: [...new Set([channel.channelTag, `collection-${collection.id}`, ...collection.tags])],
      reviewNotes: collection.reviewNotes ?? ''
    }
  };
}

export function validateImportPayload(payload) {
  const searchId = requireText(payload?.searchId, 'searchId', 20, 20);
  if (!searchIdPattern.test(searchId)) throw new Error('Ungültige searchId.');
  if (!Array.isArray(payload?.ids) || payload.ids.length < 1 || payload.ids.length > 20) throw new Error('ids benötigt 1 bis 20 ausgewählte Pexels-IDs.');
  const ids = [...new Set(payload.ids.map((value) => String(value).trim()))];
  if (ids.length !== payload.ids.length || ids.some((id) => !providerIdPattern.test(id))) throw new Error('ids enthält Duplikate oder ungültige Pexels-IDs.');
  return { searchId, ids };
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
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Anfrage ist zu groß.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw new Error('JSON konnte nicht gelesen werden.'); }
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try { const parsed = new URL(origin); return parsed.protocol === 'http:' && parsed.host === request.headers.host; }
  catch { return false; }
}
function isLoopback(address) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || ''); }
function setHeaders(response) { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); }
function sendJson(response, status, value) { response.statusCode = status; response.end(`${JSON.stringify(value, null, 2)}\n`); return true; }
function requireText(value, label, min, max) { if (typeof value !== 'string') throw new Error(`${label} muss Text sein.`); const text = value.trim(); if (text.length < min || text.length > max) throw new Error(`${label} muss zwischen ${min} und ${max} Zeichen lang sein.`); if (/[\u0000-\u001F\u007F]/.test(text)) throw new Error(`${label} enthält ungültige Zeichen.`); return text; }
function requireSlug(value, label) { const slug = requireText(value, label, 2, 100); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${label} ist kein gültiger Slug.`); return slug; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
