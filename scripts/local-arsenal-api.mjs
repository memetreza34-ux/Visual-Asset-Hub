import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { searchPexels } from './lib/pexels.mjs';
import { searchPixabay } from './lib/pixabay.mjs';
import { searchUnsplash } from './lib/unsplash.mjs';
import { searchOpenverse } from './lib/openverse.mjs';
import { searchWikimedia } from './lib/wikimedia.mjs';

const searchIdPattern = /^ARS-[A-F0-9]{16}$/;
const providerIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const PIXABAY_CACHE_MS = 24 * 60 * 60 * 1000;
const PROVIDERS = ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'];
const KEYLESS_PROVIDERS = new Set(['openverse', 'wikimedia']);
const PHOTO_ONLY_PROVIDERS = new Set(['unsplash', 'openverse', 'wikimedia']);

export function createLocalArsenalApi({ root = process.cwd(), token } = {}) {
  if (!token) throw new Error('Lokales Verwaltungstoken fehlt.');
  let busy = false;
  const searchDirectory = path.join(root, '.local-storage', 'arsenal-web');

  return {
    async handle(request, response, url) {
      if (!url.pathname.startsWith('/arsenal-api/')) return false;
      setHeaders(response);
      if (!isLoopback(request.socket.remoteAddress)) return sendJson(response, 403, { error: 'Die Arsenal-API ist ausschließlich lokal erreichbar.' });
      if (request.method === 'GET' && url.pathname === '/arsenal-api/health') return sendJson(response, 200, { ok: true, local: true, providers: PROVIDERS, maxBatchCollections: 5 });
      if (request.method !== 'POST') return sendJson(response, 405, { error: 'Nur POST ist für diese Aktion erlaubt.' });
      if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Ungültiger Ursprung.' });
      if (request.headers['x-vah-token'] !== token) return sendJson(response, 403, { error: 'Ungültiges lokales Verwaltungstoken.' });
      if (busy) return sendJson(response, 409, { error: 'Eine andere Arsenal-Aktion läuft bereits.' });

      let payload;
      try { payload = await readBody(request, 64 * 1024); }
      catch (error) { return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Ungültige Anfrage.' }); }

      busy = true;
      try {
        fs.mkdirSync(searchDirectory, { recursive: true });

        if (url.pathname === '/arsenal-api/search') {
          const input = validateSearchPayload(payload, root);
          const data = await executeAndStoreSearch({ input, searchDirectory });
          return sendJson(response, 200, data);
        }

        if (url.pathname === '/arsenal-api/batch-search') {
          const inputs = validateBatchSearchPayload(payload, root);
          const groups = [];
          for (const input of inputs) groups.push(await executeAndStoreSearch({ input, searchDirectory }));
          return sendJson(response, 200, {
            ok: true,
            provider: inputs[0]?.provider,
            groups,
            collections: groups.length,
            assets: groups.reduce((sum, group) => sum + group.assets.length, 0)
          });
        }

        if (url.pathname === '/arsenal-api/import') {
          const input = validateImportPayload(payload);
          const file = path.join(searchDirectory, `${input.searchId}.json`);
          if (!fs.existsSync(file)) throw new Error('Suchergebnis wurde nicht gefunden oder ist abgelaufen.');
          const relative = path.relative(root, file);
          if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Ungültiger Suchergebnis-Pfad.');
          const wrapper = readJson(file);
          const provider = wrapper.provider ?? wrapper.result?.provider ?? 'pexels';
          const env = provider === 'unsplash' ? { UNSPLASH_ACCESS_KEY: requireText(input.apiKey, 'apiKey', 8, 300) } : {};
          const catalogPath = path.join(root, 'catalog', 'assets.json');
          const beforeCount = countCatalogAssets(catalogPath);
          const output = runScript(root, 'scripts/arsenal-import-selected.mjs', ['--input', relative, '--ids', input.ids.join(',')], env);
          const afterCount = countCatalogAssets(catalogPath);
          const imported = Math.max(0, afterCount - beforeCount);
          const skipped = Math.max(0, input.ids.length - imported);
          return sendJson(response, 200, { ok: true, provider, requested: input.ids.length, imported, skipped, output });
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

async function executeAndStoreSearch({ input, searchDirectory }) {
  const searchId = createSearchId();
  const file = path.join(searchDirectory, `${searchId}.json`);
  let result;
  let cached = false;
  let expiresAt = null;

  if (input.provider === 'pixabay') {
    const cacheDirectory = path.join(searchDirectory, 'pixabay-cache');
    fs.mkdirSync(cacheDirectory, { recursive: true });
    const cacheKey = createPixabayCacheKey(input.job);
    const cacheFile = path.join(cacheDirectory, `${cacheKey}.json`);
    const cachedEntry = readFreshPixabayCache(cacheFile, PIXABAY_CACHE_MS);
    if (cachedEntry) {
      result = cachedEntry.result;
      cached = true;
      expiresAt = cachedEntry.expiresAt;
    } else {
      result = await searchProvider(input);
      expiresAt = new Date(Date.now() + PIXABAY_CACHE_MS).toISOString();
      const cacheEntry = {
        version: 1,
        provider: 'pixabay',
        cacheKey,
        fetchedAt: new Date().toISOString(),
        expiresAt,
        request: pixabayCacheRequest(input.job),
        result
      };
      fs.writeFileSync(cacheFile, `${JSON.stringify(cacheEntry, null, 2)}\n`, { mode: 0o600 });
    }
  } else {
    result = await searchProvider(input);
  }

  const wrapper = {
    version: 6,
    searchId,
    provider: input.provider,
    searchedAt: new Date().toISOString(),
    expiresAt,
    cached,
    arsenalJob: input.job,
    result
  };
  fs.writeFileSync(file, `${JSON.stringify(wrapper, null, 2)}\n`, { mode: 0o600 });
  return responsePayload(wrapper, cached);
}

async function searchProvider(input) {
  if (input.provider === 'pixabay') return searchPixabay({ apiKey: input.apiKey, query: input.job.query, type: input.job.type, orientation: input.job.orientation, locale: 'de', page: 1, perPage: input.job.perPage });
  if (input.provider === 'unsplash') return searchUnsplash({ apiKey: input.apiKey, query: input.job.query, orientation: input.job.orientation, page: 1, perPage: input.job.perPage, contentFilter: 'high' });
  if (input.provider === 'openverse') return searchOpenverse({ query: input.job.query, orientation: input.job.orientation, page: 1, perPage: input.job.perPage });
  if (input.provider === 'wikimedia') return searchWikimedia({ query: input.job.query, orientation: input.job.orientation, page: 1, perPage: input.job.perPage });
  return searchPexels({ apiKey: input.apiKey, query: input.job.query, type: input.job.type, orientation: input.job.orientation, locale: 'de-DE', page: 1, perPage: input.job.perPage });
}

export function validateBatchSearchPayload(payload, root = process.cwd()) {
  if (!Array.isArray(payload?.collections) || payload.collections.length < 1 || payload.collections.length > 5) throw new Error('collections benötigt 1 bis 5 Sammlungen.');
  const collections = [...new Set(payload.collections.map((value) => String(value).trim()))];
  if (collections.length !== payload.collections.length) throw new Error('collections enthält Duplikate.');
  return collections.map((collection) => validateSearchPayload({ ...payload, collection }, root));
}

export function validateSearchPayload(payload, root = process.cwd()) {
  const provider = requireMember(payload?.provider ?? 'pexels', PROVIDERS, 'provider');
  const apiKey = KEYLESS_PROVIDERS.has(provider) ? '' : requireText(payload?.apiKey, 'apiKey', 8, 300);
  const channelId = requireSlug(payload?.channel, 'channel');
  const collectionId = requireSlug(payload?.collection, 'collection');
  const variantId = requireSlug(payload?.variant, 'variant');
  const perPageRequested = payload?.perPage === undefined ? undefined : integer(payload.perPage, 3, 20, 'perPage');
  const queryIndex = payload?.queryIndex === undefined ? 0 : integer(payload.queryIndex, 0, 7, 'queryIndex');
  const index = readJson(path.join(root, 'catalog', 'channels', 'index.json'));
  const channelFile = (index.files ?? []).find((entry) => path.basename(entry, '.json') === channelId);
  if (!channelFile) throw new Error(`Unbekannter Kanal: ${channelId}`);
  const channel = readJson(path.join(root, channelFile));
  const collection = (channel.collections ?? []).find((entry) => entry.id === collectionId);
  if (!collection) throw new Error(`Unbekannte Sammlung: ${channelId}/${collectionId}`);
  const variant = (index.variants ?? []).find((entry) => entry.id === variantId);
  if (!variant) throw new Error(`Unbekannte Variante: ${variantId}`);
  if (PHOTO_ONLY_PROVIDERS.has(provider) && variant.type !== 'photo') throw new Error(`${providerLabel(provider)} bietet in diesem Builder nur Bilder an. Bitte ein Fotoformat wählen.`);
  const query = collection.queries[queryIndex % collection.queries.length];
  const perPage = Math.min(20, Math.max(3, perPageRequested ?? variant.perPage ?? 15));
  return {
    apiKey,
    provider,
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
  if (!Array.isArray(payload?.ids) || payload.ids.length < 1 || payload.ids.length > 20) throw new Error('ids benötigt 1 bis 20 ausgewählte Medien-IDs.');
  const ids = [...new Set(payload.ids.map((value) => String(value).trim()))];
  if (ids.length !== payload.ids.length || ids.some((id) => !providerIdPattern.test(id))) throw new Error('ids enthält Duplikate oder ungültige Medien-IDs.');
  return { searchId, ids, apiKey: payload?.apiKey };
}

export function createPixabayCacheKey(job) {
  return createHash('sha256').update(JSON.stringify(pixabayCacheRequest(job))).digest('hex').slice(0, 32);
}

function pixabayCacheRequest(job) {
  return {
    query: job.query,
    type: job.type,
    orientation: job.orientation,
    perPage: job.perPage,
    locale: 'de',
    page: 1
  };
}

function createSearchId() {
  return `ARS-${randomBytes(8).toString('hex').toUpperCase()}`;
}

function readFreshPixabayCache(file, ttl) {
  if (!fs.existsSync(file)) return null;
  try {
    const stat = fs.statSync(file);
    const entry = readJson(file);
    if (entry?.provider !== 'pixabay' || !Array.isArray(entry?.result?.assets)) return null;
    if (Date.now() - stat.mtimeMs >= ttl) return null;
    if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return null;
    return entry;
  } catch {
    return null;
  }
}

function countCatalogAssets(file) {
  const catalog = readJson(file);
  return Array.isArray(catalog.assets) ? catalog.assets.length : 0;
}

function responsePayload(wrapper, cached) {
  return {
    ok: true,
    provider: wrapper.provider ?? wrapper.result?.provider ?? 'pexels',
    cached,
    searchId: wrapper.searchId,
    job: wrapper.arsenalJob,
    totalResults: wrapper.result.total_results,
    rateLimit: wrapper.result.rate_limit ?? null,
    assets: wrapper.result.assets
  };
}
function runScript(root, script, args, envOverrides = {}) { const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, ...envOverrides } }); const output = `${result.stdout || ''}${result.stderr || ''}`.trim(); if (result.status !== 0) throw new Error(output || `${script} ist fehlgeschlagen.`); return output.slice(-10000); }
async function readBody(request, limit) { const contentType = String(request.headers['content-type'] || '').split(';')[0].trim(); if (contentType !== 'application/json') throw new Error('Content-Type muss application/json sein.'); const chunks = []; let size = 0; for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error('Anfrage ist zu groß.'); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new Error('JSON konnte nicht gelesen werden.'); } }
function sameOrigin(request) { const origin = request.headers.origin; if (!origin) return true; try { const parsed = new URL(origin); return parsed.protocol === 'http:' && parsed.host === request.headers.host; } catch { return false; } }
function isLoopback(address) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || ''); }
function setHeaders(response) { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); }
function sendJson(response, status, value) { response.statusCode = status; response.end(`${JSON.stringify(value, null, 2)}\n`); return true; }
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia Commons' })[value] ?? value; }
function requireText(value, label, min, max) { if (typeof value !== 'string') throw new Error(`${label} muss Text sein.`); const text = value.trim(); if (text.length < min || text.length > max) throw new Error(`${label} muss zwischen ${min} und ${max} Zeichen lang sein.`); if (/[\u0000-\u001F\u007F]/.test(text)) throw new Error(`${label} enthält ungültige Zeichen.`); return text; }
function requireSlug(value, label) { const slug = requireText(value, label, 2, 100); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${label} ist kein gültiger Slug.`); return slug; }
function requireMember(value, values, label) { const normalized = String(value ?? '').trim(); if (!values.includes(normalized)) throw new Error(`${label} ist ungültig.`); return normalized; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
