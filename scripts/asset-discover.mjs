import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { searchPexels } from './lib/pexels.mjs';
import { planSearchQueries } from './lib/search-planner.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help === 'true') {
  help();
  process.exit(0);
}

await loadDotEnv();

const topic = String(args.topic ?? '').trim();
if (!topic) {
  help();
  process.exitCode = 1;
} else {
  try {
    const result = await discover(topic, args);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = args.output ?? path.join('.local-storage', 'discovery', `${safeSlug(topic)}-${timestamp}.json`);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

    console.log(`Discovery abgeschlossen: ${result.stats.unique_candidates} eindeutige Kandidaten.`);
    console.log(`Ausgewählt: ${result.assets.length} Assets (${result.stats.selected_videos} B-Rolls, ${result.stats.selected_images} Bilder).`);
    console.log(`API-Anfragen: ${result.stats.requests_succeeded} erfolgreich, ${result.stats.requests_failed} fehlgeschlagen.`);
    console.log(`Gespeichert: ${outputPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export async function discover(topic, options = {}, dependencies = {}) {
  const search = dependencies.searchPexels ?? searchPexels;
  const suggestionsPath = options.suggestions ?? path.join('catalog', 'topic-suggestions.json');
  const suggestionData = JSON.parse(await readFile(suggestionsPath, 'utf8'));
  const maxQueries = integerOption(options.queries, 8, 1, 30, 'queries');
  const pages = integerOption(options.pages, 2, 1, 20, 'pages');
  const perPage = integerOption(options['per-page'], 30, 1, 80, 'per-page');
  const top = integerOption(options.top, 80, 1, 500, 'top');
  const type = String(options.type ?? 'both').toLowerCase();
  if (!['both', 'video', 'photo'].includes(type)) throw new Error('type muss both, video oder photo sein.');

  const mediaTypes = type === 'both' ? ['video', 'photo'] : [type];
  const orientation = normalizeOrientationOption(options.orientation);
  const locale = String(options.locale ?? 'en-US');
  const plan = planSearchQueries({
    topic,
    topicSuggestions: suggestionData.topics ?? {},
    maxQueries
  });

  const candidates = new Map();
  const errors = [];
  let requestsSucceeded = 0;
  let requestsFailed = 0;
  let rawResults = 0;

  for (const intent of plan.queries) {
    for (const mediaType of mediaTypes) {
      for (let page = 1; page <= pages; page += 1) {
        try {
          const response = await search({
            apiKey: process.env.PEXELS_API_KEY,
            query: intent.query,
            type: mediaType,
            orientation,
            locale,
            page,
            perPage
          });
          requestsSucceeded += 1;
          rawResults += response.assets.length;

          for (const asset of response.assets) mergeCandidate(candidates, asset, intent.query, page);
          if (!response.next_page || response.assets.length < perPage) break;
        } catch (error) {
          requestsFailed += 1;
          errors.push({
            query: intent.query,
            type: mediaType,
            page,
            message: error instanceof Error ? error.message : String(error)
          });
          break;
        }
      }
    }
  }

  if (requestsSucceeded === 0) {
    const firstError = errors[0]?.message ?? 'Keine Anfrage konnte ausgeführt werden.';
    throw new Error(`Discovery fehlgeschlagen. ${firstError}`);
  }

  const ranked = [...candidates.values()]
    .map((candidate) => finalizeCandidate(candidate, orientation))
    .sort((a, b) => b.discovery_score - a.discovery_score || b.query_matches.length - a.query_matches.length);
  const selected = diversify(ranked, plan.queries.map((entry) => entry.query), top, mediaTypes);

  return {
    version: 1,
    provider: 'pexels',
    topic,
    created_at: new Date().toISOString(),
    options: {
      type,
      orientation: orientation ?? 'any',
      locale,
      query_count: plan.queries.length,
      pages_per_query: pages,
      per_page: perPage,
      top
    },
    plan,
    stats: {
      requests_succeeded: requestsSucceeded,
      requests_failed: requestsFailed,
      raw_results: rawResults,
      unique_candidates: ranked.length,
      selected_assets: selected.length,
      selected_videos: selected.filter((asset) => asset.type === 'video').length,
      selected_images: selected.filter((asset) => asset.type === 'image').length
    },
    errors,
    assets: selected
  };
}

function mergeCandidate(map, asset, query, page) {
  const key = `${asset.provider}:${asset.type}:${asset.provider_id}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      ...asset,
      query_matches: [query],
      occurrences: 1,
      first_seen_page: page
    });
    return;
  }

  existing.occurrences += 1;
  existing.first_seen_page = Math.min(existing.first_seen_page, page);
  if (!existing.query_matches.includes(query)) existing.query_matches.push(query);
}

function finalizeCandidate(candidate, requestedOrientation) {
  const resolution = bestResolution(candidate);
  let score = 25;
  score += Math.min(candidate.query_matches.length, 5) * 11;
  score += Math.min(candidate.occurrences, 8) * 2;
  score += Math.max(0, 8 - candidate.first_seen_page * 2);

  if (requestedOrientation && candidate.orientation === denormalizeOrientation(requestedOrientation)) score += 12;
  if (!requestedOrientation) score += 3;

  const pixels = resolution.width * resolution.height;
  if (pixels >= 3840 * 2160) score += 12;
  else if (pixels >= 1920 * 1080) score += 9;
  else if (pixels >= 1280 * 720) score += 6;
  else if (pixels > 0) score += 2;

  if (candidate.type === 'video') {
    const duration = Number(candidate.duration_seconds ?? 0);
    if (duration >= 4 && duration <= 45) score += 8;
    else if (duration > 45 && duration <= 90) score += 4;
    else if (duration > 120) score -= 4;
  }

  return {
    ...candidate,
    best_width: resolution.width || null,
    best_height: resolution.height || null,
    discovery_score: Math.max(0, Math.min(100, Math.round(score)))
  };
}

function diversify(ranked, queries, limit, mediaTypes) {
  const remaining = [...ranked];
  const selected = [];
  const queryCounts = new Map(queries.map((query) => [query, 0]));
  const typeCounts = new Map(mediaTypes.map((type) => [type === 'photo' ? 'image' : type, 0]));
  const desiredPerType = mediaTypes.length > 1 ? Math.ceil(limit / mediaTypes.length) : limit;

  while (selected.length < limit && remaining.length) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;

    for (let index = 0; index < remaining.length; index += 1) {
      const asset = remaining[index];
      const leastUsedQuery = [...asset.query_matches].sort((a, b) => (queryCounts.get(a) ?? 0) - (queryCounts.get(b) ?? 0))[0];
      const queryPenalty = (queryCounts.get(leastUsedQuery) ?? 0) * 3;
      const typeCount = typeCounts.get(asset.type) ?? 0;
      const typePenalty = mediaTypes.length > 1 && typeCount >= desiredPerType ? (typeCount - desiredPerType + 1) * 4 : 0;
      const adjusted = asset.discovery_score - queryPenalty - typePenalty;

      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    selected.push(picked);
    typeCounts.set(picked.type, (typeCounts.get(picked.type) ?? 0) + 1);
    const leastUsedQuery = [...picked.query_matches].sort((a, b) => (queryCounts.get(a) ?? 0) - (queryCounts.get(b) ?? 0))[0];
    if (leastUsedQuery) queryCounts.set(leastUsedQuery, (queryCounts.get(leastUsedQuery) ?? 0) + 1);
  }

  return selected;
}

function bestResolution(asset) {
  if (asset.type === 'image') return { width: Number(asset.width ?? 0), height: Number(asset.height ?? 0) };
  const files = Array.isArray(asset.files) ? asset.files : [];
  return files.reduce((best, file) => {
    const width = Number(file.width ?? 0);
    const height = Number(file.height ?? 0);
    return width * height > best.width * best.height ? { width, height } : best;
  }, { width: Number(asset.width ?? 0), height: Number(asset.height ?? 0) });
}

function normalizeOrientationOption(value) {
  if (!value || String(value).toLowerCase() === 'any') return undefined;
  const normalized = String(value).toLowerCase();
  if (!['vertical', 'horizontal', 'portrait', 'landscape', 'square'].includes(normalized)) {
    throw new Error('orientation muss vertical, horizontal, portrait, landscape, square oder any sein.');
  }
  return normalized;
}

function denormalizeOrientation(value) {
  if (value === 'portrait') return 'vertical';
  if (value === 'landscape') return 'horizontal';
  return value;
}

function integerOption(value, fallback, min, max, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
  }
  return number;
}

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    const next = argv[index + 1];
    const value = inlineValue ?? (next && !next.startsWith('--') ? argv[++index] : 'true');
    args[rawKey] = value;
  }
  args.topic ??= positional.join(' ');
  return args;
}

async function loadDotEnv(filePath = '.env') {
  if (!existsSync(filePath)) return;
  const content = await readFile(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function safeSlug(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'discovery';
}

function help() {
  console.log(`
Viele passende Bilder und B-Rolls aus einem Thema entdecken.

Beispiele:
  npm run discover -- "KI ersetzt Büro-Jobs" --orientation vertical
  npm run discover -- "industrial electrician maintenance" --queries 12 --pages 3 --per-page 40 --top 100

Optionen:
  --topic <text>             Thema; alternativ Positionswert
  --type <both|video|photo>  Standard: both
  --orientation <wert>       vertical, horizontal, portrait, landscape, square oder any
  --queries <zahl>           1 bis 30 automatische Suchrichtungen; Standard: 8
  --pages <zahl>             1 bis 20 Seiten je Suchrichtung und Medientyp; Standard: 2
  --per-page <zahl>          1 bis 80 Ergebnisse je API-Anfrage; Standard: 30
  --top <zahl>               1 bis 500 ausgewählte Kandidaten; Standard: 80
  --locale <wert>            Standard: en-US für breite Stock-Suche
  --output <pfad>            Optionaler JSON-Ausgabepfad
  --help                     Hilfe anzeigen

Die Discovery lädt keine Originaldateien herunter. Sie erzeugt einen deduplizierten,
gerankten Kandidaten-Pool mit mehreren Suchrichtungen für Bilder und B-Rolls.
`);
}
