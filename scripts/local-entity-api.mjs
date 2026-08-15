import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { buildEntityResearchPlan, validateChannel, validateScript, validateTopic } from './entity-research-plan.mjs';
import { searchPexels } from './lib/pexels.mjs';
import { searchPixabay } from './lib/pixabay.mjs';
import { searchUnsplash } from './lib/unsplash.mjs';
import { searchOpenverse } from './lib/openverse.mjs';
import { searchWikimedia } from './lib/wikimedia.mjs';

const PROVIDERS = ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'];
const KEYLESS = new Set(['openverse', 'wikimedia']);
const PHOTO_ONLY = new Set(['unsplash', 'openverse', 'wikimedia']);
const MAX_TASKS = 40;

export function createLocalEntityApi({ root = process.cwd(), token, searchers = defaultSearchers() } = {}) {
  if (!token) throw new Error('Lokales Verwaltungstoken fehlt.');
  let busy = false;
  const searchDirectory = path.join(root, '.local-storage', 'arsenal-web');

  return {
    async handle(request, response, url) {
      if (!url.pathname.startsWith('/entity-api/')) return false;
      setHeaders(response);
      if (!isLoopback(request.socket.remoteAddress)) return sendJson(response, 403, { error: 'Die Themenrecherche ist ausschließlich lokal erreichbar.' });
      if (request.method === 'GET' && url.pathname === '/entity-api/health') return sendJson(response, 200, { ok: true, local: true, providers: PROVIDERS, maxTasks: MAX_TASKS });
      if (request.method !== 'POST') return sendJson(response, 405, { error: 'Nur POST ist für diese Aktion erlaubt.' });
      if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Ungültiger Ursprung.' });
      if (request.headers['x-vah-token'] !== token) return sendJson(response, 403, { error: 'Ungültiges lokales Verwaltungstoken.' });
      if (busy) return sendJson(response, 409, { error: 'Eine andere Themenrecherche läuft bereits.' });

      let payload;
      try { payload = await readBody(request, 96 * 1024); }
      catch (error) { return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Ungültige Anfrage.' }); }

      busy = true;
      try {
        if (url.pathname === '/entity-api/plan') {
          const input = validateEntityPayload(payload);
          return sendJson(response, 200, { ok: true, plan: buildEntityResearchPlan(input) });
        }
        if (url.pathname === '/entity-api/search') {
          const input = validateEntityPayload(payload);
          const plan = buildEntityResearchPlan(input);
          const channel = readChannel(root, plan.channel);
          const keys = validateKeys(payload?.keys);
          const perPage = integer(payload?.perPage ?? 6, 3, 12, 'perPage');
          const enabledProviders = PROVIDERS.filter((provider) => KEYLESS.has(provider) || Boolean(keys[provider]));
          if (!enabledProviders.length) throw new Error('Keine nutzbare Medienquelle vorhanden. Openverse/Wikimedia sollten ohne Key verfügbar sein.');
          const tasks = buildTasks(plan, enabledProviders).slice(0, MAX_TASKS);
          fs.mkdirSync(searchDirectory, { recursive: true });
          const groups = [];
          const errors = [];
          const dedupe = new Set();

          for (const task of tasks) {
            try {
              const result = await executeTask(task, keys, perPage, searchers);
              const filtered = [];
              for (const asset of result.assets ?? []) {
                const keysForAsset = assetKeys(task.provider, asset);
                if (keysForAsset.some((key) => key && dedupe.has(key))) continue;
                for (const key of keysForAsset) if (key) dedupe.add(key);
                filtered.push(asset);
              }
              if (!filtered.length) continue;
              result.assets = filtered;
              const searchId = createSearchId();
              const job = buildJob({ plan, channel, facet: task.facet, provider: task.provider, perPage });
              const wrapper = {
                version: 7,
                searchId,
                provider: task.provider,
                searchedAt: new Date().toISOString(),
                cached: false,
                research: { topic: plan.topic, topicSlug: plan.topicSlug, section: task.facet.id, sectionLabel: task.facet.label },
                arsenalJob: job,
                result
              };
              fs.writeFileSync(path.join(searchDirectory, `${searchId}.json`), `${JSON.stringify(wrapper, null, 2)}\n`, { mode: 0o600 });
              groups.push(responsePayload(wrapper));
            } catch (error) {
              errors.push({ provider: task.provider, section: task.facet.label, query: task.facet.query, error: error instanceof Error ? error.message : String(error) });
            }
          }

          runVault(root);
          return sendJson(response, 200, {
            ok: true,
            research: { topic: plan.topic, topicSlug: plan.topicSlug, channel: plan.channel, depth: plan.depth },
            plan,
            searchedProviders: enabledProviders,
            skippedProviders: PROVIDERS.filter((provider) => !enabledProviders.includes(provider)),
            groups,
            errors,
            assets: groups.reduce((sum, group) => sum + group.assets.length, 0),
            searches: groups.length
          });
        }
        return sendJson(response, 404, { error: 'Themenrecherche-Aktion nicht gefunden.' });
      } catch (error) {
        return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
      } finally {
        busy = false;
      }
    }
  };
}

export function validateEntityPayload(payload) {
  return {
    topic: validateTopic(payload?.topic),
    channel: validateChannel(payload?.channel ?? 'combat-sports'),
    script: validateScript(payload?.script ?? ''),
    depth: payload?.depth === 'quick' ? 'quick' : 'deep'
  };
}

export function buildTasks(plan, providers) {
  const tasks = [];
  for (const facet of plan.facets) {
    for (const provider of providers) {
      tasks.push({ provider, facet, type: PHOTO_ONLY.has(provider) ? 'photo' : facet.preferredMedia });
    }
  }
  return tasks;
}

function buildJob({ plan, channel, facet, provider, perPage }) {
  const collection = `topic-${plan.topicSlug}-${facet.id}`.slice(0, 100).replace(/-+$/g, '');
  return {
    id: `${channel.id}-${collection}-${provider}`.slice(0, 180),
    channel: channel.id,
    channelLabel: channel.label,
    collection,
    collectionLabel: `${plan.topic} · ${facet.label}`,
    category: channel.primaryCategory,
    query: facet.query,
    type: PHOTO_ONLY.has(provider) ? 'photo' : facet.preferredMedia,
    orientation: 'vertical',
    perPage,
    tags: [...new Set([channel.channelTag, `collection-${collection}`, `topic-${plan.topicSlug}`, `topic-section-${facet.id}`, 'entity-research'])],
    reviewNotes: `Themenrecherche zu ${plan.topic}. Sichtbare Personen, Marken, Veranstalter-, Broadcast- und Kontextrechte vor Freigabe prüfen.`,
    researchTopic: plan.topic,
    researchTopicSlug: plan.topicSlug,
    researchSection: facet.id,
    researchSectionLabel: facet.label
  };
}

async function executeTask(task, keys, perPage, searchers) {
  const query = task.facet.query;
  const provider = task.provider;
  if (provider === 'pexels') return searchers.pexels({ apiKey: keys.pexels, query, type: task.type, orientation: 'vertical', locale: 'de-DE', page: 1, perPage });
  if (provider === 'pixabay') return searchers.pixabay({ apiKey: keys.pixabay, query, type: task.type, orientation: 'vertical', locale: 'de', page: 1, perPage });
  if (provider === 'unsplash') return searchers.unsplash({ apiKey: keys.unsplash, query, orientation: 'vertical', page: 1, perPage, contentFilter: 'high' });
  if (provider === 'openverse') return searchers.openverse({ query, orientation: 'vertical', page: 1, perPage });
  return searchers.wikimedia({ query, orientation: 'vertical', page: 1, perPage });
}

function defaultSearchers() {
  return { pexels: searchPexels, pixabay: searchPixabay, unsplash: searchUnsplash, openverse: searchOpenverse, wikimedia: searchWikimedia };
}

function readChannel(root, channelId) {
  const index = readJson(path.join(root, 'catalog', 'channels', 'index.json'));
  const file = (index.files ?? []).find((entry) => path.basename(entry, '.json') === channelId);
  if (!file) throw new Error(`Kanaldatei nicht gefunden: ${channelId}`);
  return readJson(path.join(root, file));
}

function validateKeys(value) {
  const input = value && typeof value === 'object' ? value : {};
  const keys = {};
  for (const provider of ['pexels', 'pixabay', 'unsplash']) {
    const raw = typeof input[provider] === 'string' ? input[provider].trim() : '';
    if (raw && (raw.length < 8 || raw.length > 300 || /[\u0000-\u001F\u007F]/.test(raw))) throw new Error(`${provider} API-Key ist ungültig.`);
    keys[provider] = raw;
  }
  return keys;
}

function assetKeys(provider, asset) {
  const values = [
    `${provider}|${asset?.provider_id ?? asset?.id ?? ''}`,
    canonicalUrl(asset?.source_url),
    canonicalUrl(asset?.original_url),
    canonicalUrl(bestMediaUrl(asset?.files))
  ];
  return [...new Set(values.filter(Boolean))];
}

function bestMediaUrl(files) {
  if (Array.isArray(files)) return files.find((item) => item?.url)?.url ?? '';
  if (!files || typeof files !== 'object') return '';
  for (const key of ['original', 'large', 'medium', 'small']) {
    const value = files[key];
    if (typeof value === 'string') return value;
    if (value?.url) return value.url;
  }
  return '';
}

function canonicalUrl(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|auto$|cs$|fit$|h$|w$|ixid$)/i.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch { return ''; }
}

function responsePayload(wrapper) {
  return {
    ok: true,
    provider: wrapper.provider,
    cached: false,
    searchId: wrapper.searchId,
    job: wrapper.arsenalJob,
    research: wrapper.research,
    totalResults: wrapper.result.total_results ?? wrapper.result.assets?.length ?? 0,
    rateLimit: wrapper.result.rate_limit ?? null,
    assets: wrapper.result.assets ?? []
  };
}

function runVault(root) {
  const result = spawnSync(process.execPath, ['scripts/build-found-media-vault.mjs'], { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${result.stdout || ''}${result.stderr || ''}`.trim() || 'ALLES-GEFUNDEN konnte nicht aktualisiert werden.');
}

function createSearchId() { return `ARS-${randomBytes(8).toString('hex').toUpperCase()}`; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
async function readBody(request, limit) { const contentType = String(request.headers['content-type'] || '').split(';')[0].trim(); if (contentType !== 'application/json') throw new Error('Content-Type muss application/json sein.'); const chunks = []; let size = 0; for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error('Anfrage ist zu groß.'); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new Error('JSON konnte nicht gelesen werden.'); } }
function sameOrigin(request) { const origin = request.headers.origin; if (!origin) return true; try { const parsed = new URL(origin); return parsed.protocol === 'http:' && parsed.host === request.headers.host; } catch { return false; } }
function isLoopback(address) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || ''); }
function setHeaders(response) { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); }
function sendJson(response, status, value) { response.statusCode = status; response.end(`${JSON.stringify(value, null, 2)}\n`); return true; }
