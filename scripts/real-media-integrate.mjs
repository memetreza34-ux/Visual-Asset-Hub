import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';
import { searchPexels } from './lib/pexels.mjs';
import { planSearchQueries } from './lib/search-planner.mjs';
import {
  buildTimelineBinding,
  choosePexelsDownload,
  extensionForDownload,
  mergeRealCandidate,
  rankRealCandidates,
  realMediaPolicy,
  safeMediaName,
  timingMapFromPayload
} from './lib/real-media.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  loadDotEnv(path.join(root, '.env'));
  const queuePath = path.resolve(String(args.queue ?? ''));
  if (!args.queue || !fs.existsSync(queuePath)) throw new Error('--queue muss auf eine vorhandene real-material-queue.json zeigen.');

  const queue = readJson(queuePath);
  if (!Array.isArray(queue.assets)) throw new Error('Real-Media-Queue enthält kein assets-Array.');

  const outputDir = path.resolve(args['output-dir'] ?? path.join(path.dirname(queuePath), 'real-media'));
  const mediaDir = path.join(outputDir, 'files');
  const metaDir = path.join(outputDir, 'metadata');
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.mkdirSync(metaDir, { recursive: true });

  const timings = args.timings ? timingMapFromPayload(readJson(path.resolve(args.timings))) : new Map();
  const suggestions = readJson(path.join(root, 'catalog', 'topic-suggestions.json'));
  const options = {
    pages: integerOption(args.pages, 2, 1, 10, 'pages'),
    perPage: integerOption(args['per-page'], 30, 1, 80, 'per-page'),
    queries: integerOption(args.queries, 3, 1, 8, 'queries'),
    alternates: integerOption(args.alternates, 3, 0, 10, 'alternates'),
    maxDimension: integerOption(args['max-dimension'], 1920, 720, 7680, 'max-dimension'),
    defaultDuration: numberOption(args['default-duration'], 4, 1, 30, 'default-duration'),
    download: booleanOption(args.download, true, 'download'),
    locale: String(args.locale ?? 'en-US')
  };

  const report = {
    version: 1,
    strategy: 'ai-first-real-material-resolution',
    source_queue: relative(queuePath),
    generated_at: new Date().toISOString(),
    options,
    summary: {},
    items: []
  };
  const timeline = {
    version: 1,
    format: 'remotion-ready-media-bindings',
    generated_at: report.generated_at,
    source_queue: report.source_queue,
    bindings: []
  };

  for (const [index, item] of queue.assets.entries()) {
    console.log(`[${index + 1}/${queue.assets.length}] ${item.beat_id ?? item.id}: ${item.stock_query ?? item.reason ?? 'real media'}`);
    const result = await resolveItem(item, { suggestions, timings, options, mediaDir, metaDir });
    report.items.push(result.reportItem);
    timeline.bindings.push(result.binding);
  }

  report.summary = summarize(report.items);
  fs.writeFileSync(path.join(outputDir, 'real-media-resolution.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'remotion-real-media.json'), `${JSON.stringify(timeline, null, 2)}\n`);

  console.log(`Fertig: ${report.summary.ready} Timeline-Assets bereit, ${report.summary.manual_required} exakte Quellen manuell/official nötig, ${report.summary.unresolved} ungelöst.`);
  console.log(`Resolution: ${relative(path.join(outputDir, 'real-media-resolution.json'))}`);
  console.log(`Remotion-Manifest: ${relative(path.join(outputDir, 'remotion-real-media.json'))}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function resolveItem(item, context) {
  const { suggestions, timings, options, mediaDir, metaDir } = context;
  const policy = realMediaPolicy(item);
  const timing = timings.get(item.beat_id) ?? null;

  if (!policy.auto_search) {
    return {
      reportItem: {
        id: item.id,
        beat_id: item.beat_id,
        status: 'manual-required',
        reason: item.reason,
        stock_query: item.stock_query ?? null,
        policy,
        message: 'Diese Aussage benötigt eine exakte reale/official Quelle. Generische Stock-Aufnahmen werden nicht automatisch als Beleg eingesetzt.'
      },
      binding: {
        id: item.id,
        beat_id: item.beat_id,
        status: 'manual-required',
        source_mode: 'exact-real-source',
        asset_type: item.asset_type,
        reason: item.reason,
        placement: {
          start_seconds: timing?.start_seconds ?? null,
          duration_seconds: timing?.duration_seconds ?? options.defaultDuration,
          fit: 'cover'
        }
      }
    };
  }

  const querySeed = String(item.stock_query ?? '').trim();
  if (!querySeed) {
    return unresolved(item, timing, options.defaultDuration, 'stock_query fehlt.');
  }

  const plan = planSearchQueries({
    topic: querySeed,
    topicSuggestions: suggestions.topics ?? {},
    maxQueries: options.queries
  });
  const queries = unique([querySeed, ...plan.queries.map((entry) => entry.query)]).slice(0, options.queries);
  const pexelsType = item.asset_type === 'video' ? 'video' : 'photo';
  const candidateMap = new Map();
  const errors = [];

  for (const query of queries) {
    for (let page = 1; page <= options.pages; page += 1) {
      try {
        const response = await searchPexels({
          apiKey: process.env.PEXELS_API_KEY,
          query,
          type: pexelsType,
          orientation: item.orientation,
          locale: options.locale,
          page,
          perPage: options.perPage
        });
        for (const asset of response.assets) mergeRealCandidate(candidateMap, asset, query, page);
        if (!response.next_page || response.assets.length < options.perPage) break;
      } catch (error) {
        errors.push({ query, page, message: error instanceof Error ? error.message : String(error) });
        break;
      }
    }
  }

  const ranked = rankRealCandidates([...candidateMap.values()], {
    orientation: item.orientation,
    assetType: item.asset_type
  });
  const selected = ranked[0] ?? null;
  if (!selected) return unresolved(item, timing, options.defaultDuration, errors[0]?.message ?? 'Keine geeigneten Treffer.', { queries, errors });

  const alternates = ranked.slice(1, 1 + options.alternates).map(candidateSummary);
  let localFile = null;
  let technical = null;
  let download = null;
  let downloadError = null;

  if (options.download) {
    download = choosePexelsDownload(selected, { maxDimension: options.maxDimension });
    if (!download?.url) {
      downloadError = 'Kein geeigneter direkter Download verfügbar.';
    } else {
      try {
        const target = await downloadAsset({ item, selected, download, mediaDir });
        localFile = relative(target);
        technical = selected.type === 'video' ? analyzeVideo(target) : {
          width: selected.width ?? null,
          height: selected.height ?? null,
          orientation: selected.orientation ?? null
        };
        writeMetadata({ item, selected, download, target, technical, metaDir, queries });
      } catch (error) {
        downloadError = error instanceof Error ? error.message : String(error);
      }
    }
  }

  const binding = buildTimelineBinding({
    item,
    selected,
    localFile,
    timing,
    defaultDuration: options.defaultDuration,
    technical: technical?.technical ?? technical
  });
  if (!options.download) binding.status = 'selected-not-downloaded';
  if (downloadError) binding.status = 'download-failed';
  binding.review_required = policy.review_required;
  binding.selection_score = selected.real_media_score;

  return {
    reportItem: {
      id: item.id,
      beat_id: item.beat_id,
      status: binding.status,
      reason: item.reason,
      stock_query: querySeed,
      policy,
      queries,
      errors,
      selected: candidateSummary(selected),
      alternates,
      download: download ? {
        quality: download.quality ?? null,
        width: download.width ?? null,
        height: download.height ?? null,
        file_type: download.file_type ?? null,
        local_file: localFile
      } : null,
      download_error: downloadError,
      technical
    },
    binding
  };
}

function unresolved(item, timing, defaultDuration, message, extra = {}) {
  return {
    reportItem: {
      id: item.id,
      beat_id: item.beat_id,
      status: 'unresolved',
      reason: item.reason,
      stock_query: item.stock_query ?? null,
      message,
      ...extra
    },
    binding: {
      id: item.id,
      beat_id: item.beat_id,
      status: 'unresolved',
      source_mode: 'real-media',
      asset_type: item.asset_type,
      reason: item.reason,
      placement: {
        start_seconds: timing?.start_seconds ?? null,
        duration_seconds: timing?.duration_seconds ?? defaultDuration,
        fit: 'cover'
      }
    }
  };
}

async function downloadAsset({ item, selected, download, mediaDir }) {
  assertSafePexelsUrl(download.url);
  const ext = extensionForDownload(download.url, download.file_type, selected.type);
  const base = `${safeMediaName(item.beat_id ?? item.id)}-${selected.type}-${safeMediaName(selected.provider_id)}.${ext}`;
  const target = uniquePath(path.join(mediaDir, base));
  const partial = `${target}.part`;
  const response = await fetch(download.url, {
    headers: { 'User-Agent': 'Visual-Asset-Hub/0.5', Accept: '*/*' },
    redirect: 'follow'
  });
  if (!response.ok || !response.body) throw new Error(`Download fehlgeschlagen (${response.status}).`);

  const maxBytes = 700 * 1024 * 1024;
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new Error('Download ist größer als 700 MB.');

  try {
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial, { flags: 'wx' }));
    const size = fs.statSync(partial).size;
    if (!size) throw new Error('Heruntergeladene Datei ist leer.');
    if (size > maxBytes) throw new Error('Heruntergeladene Datei überschreitet 700 MB.');
    fs.renameSync(partial, target);
  } catch (error) {
    if (fs.existsSync(partial)) fs.rmSync(partial, { force: true });
    throw error;
  }
  return target;
}

function analyzeVideo(file) {
  const result = spawnSync(process.execPath, ['scripts/analyze-media.mjs', '--file', file, '--preview', 'false'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) {
    return { error: (result.stderr || result.stdout || 'FFmpeg-Analyse fehlgeschlagen.').trim() };
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { error: 'FFmpeg-Analyse lieferte ungültiges JSON.' };
  }
}

function writeMetadata({ item, selected, download, target, technical, metaDir, queries }) {
  const metadata = {
    version: 1,
    beat_id: item.beat_id,
    request_id: item.id,
    reason: item.reason,
    provider: 'pexels',
    provider_id: selected.provider_id,
    title: selected.title,
    source_url: selected.source_url,
    creator: selected.creator,
    creator_url: selected.creator_url,
    license_status: 'licensed',
    license_url: 'https://www.pexels.com/license/',
    attribution: selected.attribution,
    matched_queries: selected.matched_queries,
    queries,
    selection_score: selected.real_media_score,
    downloaded_at: new Date().toISOString(),
    downloaded_file: relative(target),
    chosen_download: {
      quality: download.quality ?? null,
      width: download.width ?? null,
      height: download.height ?? null,
      file_type: download.file_type ?? null
    },
    technical
  };
  const file = path.join(metaDir, `${safeMediaName(item.id)}.json`);
  fs.writeFileSync(file, `${JSON.stringify(metadata, null, 2)}\n`);
}

function candidateSummary(asset) {
  return {
    provider: asset.provider,
    provider_id: asset.provider_id,
    type: asset.type,
    title: asset.title,
    source_url: asset.source_url,
    creator: asset.creator,
    creator_url: asset.creator_url,
    width: asset.width,
    height: asset.height,
    duration_seconds: asset.duration_seconds ?? null,
    orientation: asset.orientation,
    preview_url: asset.preview_url,
    score: asset.real_media_score,
    matched_queries: asset.matched_queries
  };
}

function summarize(items) {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === 'ready').length,
    selected_not_downloaded: items.filter((item) => item.status === 'selected-not-downloaded').length,
    download_failed: items.filter((item) => item.status === 'download-failed').length,
    manual_required: items.filter((item) => item.status === 'manual-required').length,
    unresolved: items.filter((item) => item.status === 'unresolved').length
  };
}

function assertSafePexelsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Nur HTTPS-Downloads sind erlaubt.');
  const host = url.hostname.toLowerCase();
  if (host !== 'pexels.com' && !host.endsWith('.pexels.com')) throw new Error(`Unerwarteter Download-Host: ${host}`);
}

function uniquePath(target) {
  if (!fs.existsSync(target)) return target;
  const ext = path.extname(target);
  const stem = target.slice(0, -ext.length);
  let index = 2;
  while (fs.existsSync(`${stem}-${index}${ext}`)) index += 1;
  return `${stem}-${index}${ext}`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = argv[index + 1];
    args[key] = inline ?? (next && !next.startsWith('--') ? argv[++index] : 'true');
  }
  return args;
}

function integerOption(value, fallback, min, max, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${name} muss zwischen ${min} und ${max} liegen.`);
  return number;
}

function numberOption(value, fallback, min, max, name) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${name} muss zwischen ${min} und ${max} liegen.`);
  return number;
}

function booleanOption(value, fallback, name) {
  if (value === undefined) return fallback;
  const normalized = String(value).toLowerCase();
  if (!['true', 'false'].includes(normalized)) throw new Error(`${name} muss true oder false sein.`);
  return normalized === 'true';
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function help() {
  console.log(`
Real Media Integration

Löst die real-material-queue des AI-first Visual Planners auf, sucht echte Pexels-
B-Rolls/Fotos, lädt die beste Datei, analysiert Videos und erzeugt ein Remotion-
kompatibles Beat-Mapping.

Beispiel:
  npm run real:integrate -- --queue .local-storage/visual-plans/SESSION/real-material-queue.json

Mit Beat-Timings:
  npm run real:integrate -- --queue ./real-material-queue.json --timings ./beat-timings.json

Optionen:
  --queue <pfad>             real-material-queue.json (erforderlich)
  --timings <pfad>           optional: { beats: [{ beat_id, start_seconds, duration_seconds }] }
  --output-dir <pfad>        Standard: real-media/ neben der Queue
  --queries <1-8>            Suchrichtungen pro Beat; Standard: 3
  --pages <1-10>             Pexels-Seiten je Suchrichtung; Standard: 2
  --per-page <1-80>          Treffer je Anfrage; Standard: 30
  --alternates <0-10>        alternative Kandidaten speichern; Standard: 3
  --max-dimension <px>       bevorzugte maximale Videokante; Standard: 1920
  --default-duration <sek>   Timeline-Dauer ohne Timing-Datei; Standard: 4
  --download <true|false>    Dateien wirklich laden; Standard: true
  --locale <wert>            Pexels-Suchsprache; Standard: en-US

Ausgabe:
  real-media-resolution.json
  remotion-real-media.json
  files/*
  metadata/*

Exakte Screenshots, Dokumente, Marken und Ereignisbelege werden absichtlich nicht
mit generischem Stockmaterial ersetzt, sondern als manual-required markiert.
`);
}
