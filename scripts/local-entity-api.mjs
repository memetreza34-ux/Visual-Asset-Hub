import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { buildEntityResearchPlan, validateChannel, validateResearchType, validateScript, validateTopic } from './entity-research-plan.mjs';
import { searchPexels } from './lib/pexels.mjs';
import { searchPixabay } from './lib/pixabay.mjs';
import { searchUnsplash } from './lib/unsplash.mjs';
import { searchOpenverse } from './lib/openverse.mjs';
import { searchWikimedia } from './lib/wikimedia.mjs';

const PROVIDERS = ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'];
const KEYLESS = new Set(['openverse', 'wikimedia']);
const PHOTO_ONLY = new Set(['unsplash', 'openverse', 'wikimedia']);
const MAX_TASKS = 60;
const PIXABAY_CACHE_MS = 24 * 60 * 60 * 1000;
const CHANNEL_FOLDERS = { finance: '01-Finanzen', ai: '02-KI', electro: '03-Elektrotechnik', 'combat-sports': '04-Kampfsport' };

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
              const execution = await executeTaskCached(task, keys, perPage, searchers, searchDirectory);
              const result = execution.result;
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
                version: 8,
                searchId,
                provider: task.provider,
                searchedAt: new Date().toISOString(),
                expiresAt: execution.expiresAt ?? null,
                cached: execution.cached,
                research: {
                  topic: plan.topic,
                  topicSlug: plan.topicSlug,
                  researchType: plan.researchType,
                  researchTypeLabel: plan.researchTypeLabel,
                  section: task.facet.id,
                  sectionLabel: task.facet.label
                },
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
          const guidePath = writeResearchGuide(root, plan, channel, enabledProviders, groups, errors);
          return sendJson(response, 200, {
            ok: true,
            research: {
              topic: plan.topic,
              topicSlug: plan.topicSlug,
              channel: plan.channel,
              researchType: plan.researchType,
              researchTypeLabel: plan.researchTypeLabel,
              depth: plan.depth,
              guidePath
            },
            plan,
            searchedProviders: enabledProviders,
            skippedProviders: PROVIDERS.filter((provider) => !enabledProviders.includes(provider)),
            groups,
            errors,
            assets: groups.reduce((sum, group) => sum + group.assets.length, 0),
            searches: groups.length,
            cachedSearches: groups.filter((group) => group.cached).length
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
    researchType: validateResearchType(payload?.researchType ?? 'auto'),
    script: validateScript(payload?.script ?? ''),
    depth: payload?.depth === 'quick' ? 'quick' : payload?.depth === 'max' ? 'max' : 'deep'
  };
}

export function buildTasks(plan, providers) {
  const tasks = [];
  for (const facet of plan.facets) {
    for (const provider of providers) tasks.push({ provider, facet, type: PHOTO_ONLY.has(provider) ? 'photo' : facet.preferredMedia });
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
    category: researchCategory(plan.researchType, channel),
    query: facet.query,
    type: PHOTO_ONLY.has(provider) ? 'photo' : facet.preferredMedia,
    orientation: 'vertical',
    perPage,
    tags: [...new Set([
      channel.channelTag,
      `collection-${collection}`,
      `topic-${plan.topicSlug}`,
      `topic-type-${plan.researchType}`,
      `topic-section-${facet.id}`,
      'entity-research'
    ])],
    reviewNotes: `Universelle Themenrecherche zu ${plan.topic} (${plan.researchTypeLabel}). Urheber-, Personen-, Marken-, Event-, Broadcast- und Kontextrechte vor Freigabe prüfen.`,
    researchTopic: plan.topic,
    researchTopicSlug: plan.topicSlug,
    researchType: plan.researchType,
    researchTypeLabel: plan.researchTypeLabel,
    researchSection: facet.id,
    researchSectionLabel: facet.label
  };
}

function researchCategory(type, channel) {
  return ({
    person: 'people-lifestyle',
    organization: 'business-work',
    product: 'objects-products',
    event: 'news-events',
    place: 'travel-places',
    technology: channel.id === 'ai' ? 'technology-ai' : 'science-engineering',
    sport: 'combat-sports',
    history: 'culture-entertainment',
    concept: channel.primaryCategory
  })[type] ?? channel.primaryCategory;
}

async function executeTaskCached(task, keys, perPage, searchers, searchDirectory) {
  if (task.provider !== 'pixabay') return { result: await executeTask(task, keys, perPage, searchers), cached: false, expiresAt: null };
  const cacheDirectory = path.join(searchDirectory, 'pixabay-cache');
  fs.mkdirSync(cacheDirectory, { recursive: true });
  const request = pixabayCacheRequest(task, perPage);
  const cacheKey = createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 32);
  const cacheFile = path.join(cacheDirectory, `${cacheKey}.json`);
  const cachedEntry = readFreshPixabayCache(cacheFile);
  if (cachedEntry) return { result: structuredClone(cachedEntry.result), cached: true, expiresAt: cachedEntry.expiresAt };

  const result = await executeTask(task, keys, perPage, searchers);
  const expiresAt = new Date(Date.now() + PIXABAY_CACHE_MS).toISOString();
  fs.writeFileSync(cacheFile, `${JSON.stringify({
    version: 1,
    provider: 'pixabay',
    cacheKey,
    fetchedAt: new Date().toISOString(),
    expiresAt,
    request,
    result
  }, null, 2)}\n`, { mode: 0o600 });
  return { result, cached: false, expiresAt };
}

function readFreshPixabayCache(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const stat = fs.statSync(file);
    const entry = readJson(file);
    if (entry?.provider !== 'pixabay' || !Array.isArray(entry?.result?.assets)) return null;
    if (Date.now() - stat.mtimeMs >= PIXABAY_CACHE_MS) return null;
    if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return null;
    return entry;
  } catch {
    return null;
  }
}

function pixabayCacheRequest(task, perPage) {
  return { query: task.facet.query, type: task.type, orientation: 'vertical', perPage, locale: 'de', page: 1 };
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
    cached: Boolean(wrapper.cached),
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

function writeResearchGuide(root, plan, channel, providers, groups, errors) {
  const topicRoot = path.join(root, 'ALLES-GEFUNDEN', '05-THEMENRECHERCHEN', CHANNEL_FOLDERS[channel.id] ?? safeName(channel.label), safeName(plan.topic));
  const linksRoot = path.join(topicRoot, '99-EXTERNE-SUCHLINKS');
  fs.mkdirSync(linksRoot, { recursive: true });
  const broadLinks = [
    ['YouTube-Suche', `https://www.youtube.com/results?search_query=${encodeURIComponent(plan.topic)}`],
    ['Google-Bilder', `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(plan.topic)}`],
    ['Google-Videos', `https://www.google.com/search?tbm=vid&q=${encodeURIComponent(plan.topic)}`],
    ['Google-News', `https://www.google.com/search?tbm=nws&q=${encodeURIComponent(plan.topic)}`],
    ['Wikipedia-Suche', `https://de.wikipedia.org/w/index.php?search=${encodeURIComponent(plan.topic)}`]
  ];
  if (channel.id === 'combat-sports') broadLinks.push(['Offizielle-UFC-Websuche', `https://www.google.com/search?q=${encodeURIComponent(`site:ufc.com "${plan.topic}"`)}`]);
  for (const [name, url] of broadLinks) writeShortcut(path.join(linksRoot, `${name}.url`), url);

  const modeLabel = plan.depth === 'max' ? 'maximal' : plan.depth === 'deep' ? 'tief' : 'schnell';
  const lines = [
    `# Rechercheplan – ${plan.topic}`, '',
    '> Dieser Ordner sammelt Recherchekandidaten. Externe Suchlinks und gefundene Medien sind keine automatische Nutzungs- oder Veröffentlichungserlaubnis.', '',
    `- Zielkanal: **${channel.label}**`,
    `- Rechercheart: **${plan.researchTypeLabel}**`,
    `- Recherchemodus: **${modeLabel}**`,
    `- erfolgreiche Suchgruppen: **${groups.length}**`,
    `- davon aus 24-Stunden-Cache: **${groups.filter((group) => group.cached).length}**`,
    `- eindeutige API-Treffer: **${groups.reduce((sum, group) => sum + group.assets.length, 0)}**`,
    `- verwendete API-Quellen: **${providers.map(providerLabel).join(', ')}**`,
    `- fehlgeschlagene Einzelsuchen: **${errors.length}**`, '',
    '## Suchbereiche', '',
    ...plan.facets.map((facet) => `${facet.order}. **${facet.label}** – \`${facet.query}\` – ${facet.preferredMedia === 'video' ? 'Video bevorzugt' : 'Foto bevorzugt'}`), '',
    '## Zusätzliche externe Sichtung', '',
    '- `99-EXTERNE-SUCHLINKS/YouTube-Suche.url`',
    '- `99-EXTERNE-SUCHLINKS/Google-Bilder.url`',
    '- `99-EXTERNE-SUCHLINKS/Google-Videos.url`',
    '- `99-EXTERNE-SUCHLINKS/Google-News.url`',
    '- `99-EXTERNE-SUCHLINKS/Wikipedia-Suche.url`',
    ...(channel.id === 'combat-sports' ? ['- `99-EXTERNE-SUCHLINKS/Offizielle-UFC-Websuche.url`'] : []), '',
    '## Rechtehinweis', '',
    'Material von TV-Sendern, Veranstaltern, Social-Media-Accounts, Presseagenturen, Marken oder anderen Rechteinhabern darf nicht allein deshalb verwendet werden, weil es über einen Suchlink sichtbar ist. Vor Reel-Nutzung müssen Quelle, Lizenz, Urheber-, Personen-/Markenrechte und der konkrete Nutzungskontext geprüft werden.'
  ];
  const guide = path.join(topicRoot, '00-RECHERCHEPLAN.md');
  fs.writeFileSync(guide, `${lines.join('\n')}\n`);
  return path.relative(root, guide);
}

function writeShortcut(file, url) { fs.writeFileSync(file, `[InternetShortcut]\nURL=${url.replace(/[\r\n]/g, '')}\n`); }
function safeName(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Thema'; }
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia Commons' })[value] ?? value; }
function createSearchId() { return `ARS-${randomBytes(8).toString('hex').toUpperCase()}`; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
async function readBody(request, limit) { const contentType = String(request.headers['content-type'] || '').split(';')[0].trim(); if (contentType !== 'application/json') throw new Error('Content-Type muss application/json sein.'); const chunks = []; let size = 0; for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error('Anfrage ist zu groß.'); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new Error('JSON konnte nicht gelesen werden.'); } }
function sameOrigin(request) { const origin = request.headers.origin; if (!origin) return true; try { const parsed = new URL(origin); return parsed.protocol === 'http:' && parsed.host === request.headers.host; } catch { return false; } }
function isLoopback(address) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || ''); }
function setHeaders(response) { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); }
function sendJson(response, status, value) { response.statusCode = status; response.end(`${JSON.stringify(value, null, 2)}\n`); return true; }
