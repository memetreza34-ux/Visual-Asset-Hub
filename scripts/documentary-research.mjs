import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { searchPexels } from './lib/pexels.mjs';
import { searchPixabay } from './lib/pixabay.mjs';
import { searchUnsplash } from './lib/unsplash.mjs';
import { searchOpenverse } from './lib/openverse.mjs';
import { searchWikimedia } from './lib/wikimedia.mjs';
import { documentaryCandidateScore, routeDocumentaryProviders } from './lib/documentary-source-router.mjs';

const KEYED_PROVIDERS = new Set(['pexels', 'pixabay', 'unsplash']);
const PHOTO_ONLY = new Set(['unsplash', 'openverse', 'wikimedia']);
const DEFAULT_MAX_TASKS = 8;
const DEFAULT_PER_PAGE = 8;
const DEFAULT_ALTERNATIVES = 3;
const MAX_RETAINED = 12;

export async function researchDocumentaryProject({
  projectDirectory,
  searchers = defaultSearchers(),
  keys = readProviderKeys(),
  perPage = DEFAULT_PER_PAGE,
  maxTasksPerScene = DEFAULT_MAX_TASKS,
  alternatives = DEFAULT_ALTERNATIVES,
  orientation = 'horizontal'
} = {}) {
  const projectDir = requireDirectory(projectDirectory);
  const scenesFile = path.join(projectDir, '05-PROJECT', 'scenes.json');
  if (!fs.existsSync(scenesFile)) throw new Error(`Szenenplan fehlt: ${scenesFile}`);

  const scenePlan = readJson(scenesFile);
  if (!Array.isArray(scenePlan.scenes) || !scenePlan.scenes.length) {
    throw new Error('scenes.json enthält keine Szenen.');
  }

  const usedSelections = new Set();
  const summary = {
    format: 'visual-asset-hub-documentary-research-summary',
    version: 1,
    researchedAt: new Date().toISOString(),
    sceneCount: scenePlan.scenes.length,
    researchedScenes: 0,
    scenesWithRecommendation: 0,
    totalCandidates: 0,
    providerUsage: {},
    errors: []
  };

  for (const scene of scenePlan.scenes) {
    const result = await researchScene({
      scene,
      searchers,
      keys,
      perPage,
      maxTasks: maxTasksPerScene,
      alternatives,
      orientation,
      usedSelections
    });

    Object.assign(scene, result.scene);
    summary.researchedScenes += 1;
    summary.totalCandidates += result.scene.candidates.length;
    if (result.scene.recommendedPrimary) summary.scenesWithRecommendation += 1;
    for (const provider of result.providersUsed) {
      summary.providerUsage[provider] = (summary.providerUsage[provider] ?? 0) + 1;
    }
    for (const error of result.errors) {
      summary.errors.push({ sceneId: scene.sceneId, ...error });
    }

    if (result.scene.recommendedPrimary) {
      const primary = result.scene.candidates.find((candidate) => candidate.key === result.scene.recommendedPrimary);
      if (primary) usedSelections.add(candidateIdentity(primary));
    }

    writeSceneResearchFiles(projectDir, scene);
  }

  fs.writeFileSync(scenesFile, `${JSON.stringify(scenePlan, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(projectDir, '05-PROJECT', 'research-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8'
  );
  writeRecommendedSources(projectDir, scenePlan.scenes);
  return { scenePlan, summary };
}

export async function researchScene({
  scene,
  searchers = defaultSearchers(),
  keys = readProviderKeys(),
  perPage = DEFAULT_PER_PAGE,
  maxTasks = DEFAULT_MAX_TASKS,
  alternatives = DEFAULT_ALTERNATIVES,
  orientation = 'horizontal',
  usedSelections = new Set()
} = {}) {
  if (!scene || typeof scene !== 'object') throw new Error('Szene fehlt.');
  const queries = uniqueStrings(scene.queries).slice(0, 5);
  if (!queries.length) throw new Error(`Szene ${scene.sceneId ?? '?'} hat keine Suchanfragen.`);

  const configuredOrder = Array.isArray(scene.documentary?.providerPriority)
    ? scene.documentary.providerPriority
    : routeDocumentaryProviders(scene);
  const providers = configuredOrder.filter((provider) => !KEYED_PROVIDERS.has(provider) || Boolean(keys[provider]));
  if (!providers.length) throw new Error(`Szene ${scene.sceneId ?? '?'} hat keine nutzbare Medienquelle.`);

  const candidates = [];
  const seen = new Set();
  const errors = [];
  const providersUsed = new Set();
  let tasks = 0;

  outer:
  for (const query of queries) {
    for (const provider of providers) {
      for (const type of searchTypes(provider, scene.preferredMediaType)) {
        if (tasks >= maxTasks) break outer;
        tasks += 1;
        try {
          const result = await executeProviderSearch({
            provider,
            query,
            type,
            orientation,
            perPage,
            apiKey: keys[provider],
            searchers
          });
          providersUsed.add(provider);
          for (const asset of result.assets ?? []) {
            const candidate = candidateFromAsset({ asset, provider, query, type, scene, orientation, usedSelections });
            const identity = candidateIdentity(candidate);
            if (!identity || seen.has(identity)) continue;
            seen.add(identity);
            candidates.push(candidate);
          }
        } catch (error) {
          errors.push({ provider, query, type, error: errorMessage(error) });
        }
      }
    }
  }

  candidates.sort((a, b) =>
    b.documentaryScore - a.documentaryScore ||
    Number(a.reusedElsewhere) - Number(b.reusedElsewhere) ||
    b.technicalFit - a.technicalFit ||
    String(a.title).localeCompare(String(b.title), 'de')
  );

  const retained = retainMediaMix(candidates, MAX_RETAINED);
  const recommendedPrimary = retained.find((candidate) => !candidate.reusedElsewhere)?.key ?? retained[0]?.key ?? null;
  const recommendedAlternatives = retained
    .filter((candidate) => candidate.key !== recommendedPrimary)
    .slice(0, alternatives)
    .map((candidate) => candidate.key);

  return {
    providersUsed: [...providersUsed],
    errors,
    scene: {
      ...scene,
      candidates: retained,
      recommendedPrimary,
      recommendedAlternatives,
      research: {
        status: recommendedPrimary ? 'recommendation-ready' : 'no-recommendation',
        searchedAt: new Date().toISOString(),
        providerPriority: configuredOrder,
        providersAvailable: providers,
        providersUsed: [...providersUsed],
        tasks,
        candidateCount: retained.length,
        errors,
        rightsStatus: 'review-required-before-publication'
      }
    }
  };
}

function candidateFromAsset({ asset, provider, query, type, scene, orientation, usedSelections }) {
  const providerId = String(asset?.provider_id ?? asset?.id ?? '').trim();
  const sourceUrl = String(asset?.source_url ?? '').trim();
  const mediaUrl = bestMediaUrl(asset?.files);
  const key = `${provider}:${providerId || stableUrlKey(sourceUrl || mediaUrl)}`;
  const base = {
    key,
    provider,
    providerId: providerId || null,
    query,
    title: asset?.title || `${provider} ${providerId || 'asset'}`,
    type: asset?.type ?? type,
    width: numberOrNull(asset?.width),
    height: numberOrNull(asset?.height),
    durationSeconds: numberOrNull(asset?.duration_seconds),
    creator: asset?.creator ?? '',
    sourceUrl,
    previewUrl: asset?.preview_url ?? '',
    mediaUrl,
    license: asset?.license ?? null,
    attribution: asset?.attribution ?? null,
    technicalFit: technicalFit(asset, type, orientation),
    reusedElsewhere: false,
    reviewStatus: 'review-required',
    asset
  };
  base.reusedElsewhere = usedSelections.has(candidateIdentity(base));
  const score = documentaryCandidateScore(scene, base);
  base.scoreBreakdown = score;
  base.documentaryScore = Math.max(0, score.score - (base.reusedElsewhere ? 15 : 0));
  return base;
}

async function executeProviderSearch({ provider, query, type, orientation, perPage, apiKey, searchers }) {
  if (provider === 'pexels') {
    return searchers.pexels({ apiKey, query, type, orientation, page: 1, perPage, locale: 'de-DE' });
  }
  if (provider === 'pixabay') {
    return searchers.pixabay({ apiKey, query, type, orientation, page: 1, perPage, locale: 'de' });
  }
  if (provider === 'unsplash') {
    return searchers.unsplash({ apiKey, query, orientation, page: 1, perPage, contentFilter: 'high' });
  }
  if (provider === 'openverse') {
    return searchers.openverse({ query, orientation, page: 1, perPage });
  }
  if (provider === 'wikimedia') {
    return searchers.wikimedia({ query, orientation, page: 1, perPage });
  }
  throw new Error(`Unbekannter Provider: ${provider}`);
}

function searchTypes(provider, preferredMediaType) {
  if (PHOTO_ONLY.has(provider)) return ['photo'];
  if (preferredMediaType === 'photo') return ['photo'];
  if (preferredMediaType === 'video') return ['video'];
  return ['video', 'photo'];
}

function technicalFit(asset, type, orientation) {
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  const actual = asset?.orientation || (width > height ? 'horizontal' : height > width ? 'vertical' : 'unknown');
  let score = 0;
  if (actual === orientation) score += 30;
  else if (actual === 'square') score += 10;
  const shortSide = width && height ? Math.min(width, height) : 0;
  if (shortSide >= 1080) score += 30;
  else if (shortSide >= 720) score += 22;
  else if (shortSide >= 480) score += 12;
  if (asset?.source_url) score += 10;
  if (asset?.preview_url) score += 10;
  if (asset?.creator) score += 5;
  if (type === 'video') {
    const duration = Number(asset?.duration_seconds) || 0;
    if (duration >= 4 && duration <= 30) score += 15;
    else if (duration > 0) score += 8;
  } else {
    const pixels = width * height;
    if (pixels >= 2_000_000) score += 15;
    else if (pixels >= 1_000_000) score += 10;
  }
  return Math.min(100, score);
}

function retainMediaMix(candidates, limit) {
  const selected = [];
  const used = new Set();
  const video = candidates.find((candidate) => candidate.type === 'video');
  const image = candidates.find((candidate) => candidate.type !== 'video');
  for (const candidate of [video, image]) {
    if (candidate && !used.has(candidate.key)) {
      selected.push(candidate);
      used.add(candidate.key);
    }
  }
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (used.has(candidate.key)) continue;
    selected.push(candidate);
    used.add(candidate.key);
  }
  return selected.sort((a, b) => b.documentaryScore - a.documentaryScore || b.technicalFit - a.technicalFit);
}

function writeSceneResearchFiles(projectDirectory, scene) {
  const sceneDir = path.join(projectDirectory, '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, { recursive: true });
  fs.writeFileSync(path.join(sceneDir, '00-research.json'), `${JSON.stringify({
    sceneId: scene.sceneId,
    originalText: scene.originalText,
    visualIntent: scene.visualIntent,
    documentary: scene.documentary,
    research: scene.research,
    recommendedPrimary: scene.recommendedPrimary,
    recommendedAlternatives: scene.recommendedAlternatives,
    candidates: scene.candidates
  }, null, 2)}\n`, 'utf8');

  const recommended = [scene.recommendedPrimary, ...(scene.recommendedAlternatives ?? [])]
    .map((key) => scene.candidates.find((candidate) => candidate.key === key))
    .filter(Boolean);

  for (let index = 0; index < recommended.length; index += 1) {
    const candidate = recommended[index];
    const prefix = index === 0 ? '01-MAIN' : `${String(index + 1).padStart(2, '0')}-ALT`;
    if (candidate.sourceUrl) writeUrlShortcut(path.join(sceneDir, `${prefix}-SOURCE.url`), candidate.sourceUrl);
    if (candidate.mediaUrl) writeUrlShortcut(path.join(sceneDir, `${prefix}-MEDIA.url`), candidate.mediaUrl);
    if (candidate.previewUrl) writeUrlShortcut(path.join(sceneDir, `${prefix}-PREVIEW.url`), candidate.previewUrl);
  }
}

function writeRecommendedSources(projectDirectory, scenes) {
  const sourceLines = [];
  const licenseRows = [['scene','role','provider','creator','source_url','license','review_status']];

  for (const scene of scenes) {
    const selections = [
      ['primary', scene.recommendedPrimary],
      ...(scene.recommendedAlternatives ?? []).map((key) => ['alternative', key])
    ];
    for (const [role, key] of selections) {
      const candidate = scene.candidates?.find((item) => item.key === key);
      if (!candidate) continue;
      sourceLines.push(`${scene.sceneId} | ${role} | ${candidate.provider} | ${candidate.title} | ${candidate.sourceUrl || 'keine Quelle'}`);
      licenseRows.push([
        scene.sceneId,
        role,
        candidate.provider,
        candidate.creator || '',
        candidate.sourceUrl || '',
        candidate.license || 'provider-policy-check-required',
        candidate.reviewStatus
      ]);
    }
  }

  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'sources.txt'), `${sourceLines.join('\n')}${sourceLines.length ? '\n' : ''}`, 'utf8');
  fs.writeFileSync(
    path.join(projectDirectory, '04-SOURCES', 'licenses.csv'),
    `${licenseRows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`,
    'utf8'
  );
}

function readProviderKeys(env = process.env) {
  return {
    pexels: env.PEXELS_API_KEY || env.PEXELS_API || '',
    pixabay: env.PIXABAY_API || env.PIXABAY_API_KEY || '',
    unsplash: env.UNSPLASH_ACCESS_KEY || env.UNSPLASH_API || ''
  };
}

function defaultSearchers() {
  return {
    pexels: searchPexels,
    pixabay: searchPixabay,
    unsplash: searchUnsplash,
    openverse: searchOpenverse,
    wikimedia: searchWikimedia
  };
}

function candidateIdentity(candidate) {
  return `${candidate.provider}|${candidate.providerId || canonicalUrl(candidate.sourceUrl) || canonicalUrl(candidate.mediaUrl)}`;
}

function bestMediaUrl(files) {
  if (Array.isArray(files)) {
    const usable = files.filter((item) => item?.url);
    usable.sort((a, b) => (Number(b.width) || 0) * (Number(b.height) || 0) - (Number(a.width) || 0) * (Number(a.height) || 0));
    return usable[0]?.url ?? '';
  }
  if (!files || typeof files !== 'object') return '';
  for (const key of ['original', 'large', 'full', 'regular', 'medium', 'small']) {
    const value = files[key];
    if (typeof value === 'string' && value) return value;
    if (value?.url) return value.url;
  }
  return '';
}

function canonicalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value));
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function stableUrlKey(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '').slice(-40) || 'unknown';
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function requireDirectory(value) {
  if (!value) throw new Error('projectDirectory fehlt.');
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error(`Projektordner nicht gefunden: ${resolved}`);
  return resolved;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeUrlShortcut(file, url) {
  fs.writeFileSync(file, `[InternetShortcut]\nURL=${String(url).replace(/[\r\n]/g, '')}\n`, 'utf8');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseArgs(argv) {
  const args = { project: '', perPage: DEFAULT_PER_PAGE, maxTasks: DEFAULT_MAX_TASKS, alternatives: DEFAULT_ALTERNATIVES };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.project = argv[++index] ?? '';
    else if (token === '--per-page') args.perPage = Number(argv[++index]);
    else if (token === '--max-tasks') args.maxTasks = Number(argv[++index]);
    else if (token === '--alternatives') args.alternatives = Number(argv[++index]);
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.project) throw new Error('Pflichtargument fehlt: --project');
  if (!Number.isInteger(args.perPage) || args.perPage < 3 || args.perPage > 20) throw new Error('--per-page muss zwischen 3 und 20 liegen.');
  if (!Number.isInteger(args.maxTasks) || args.maxTasks < 1 || args.maxTasks > 20) throw new Error('--max-tasks muss zwischen 1 und 20 liegen.');
  if (!Number.isInteger(args.alternatives) || args.alternatives < 0 || args.alternatives > 6) throw new Error('--alternatives muss zwischen 0 und 6 liegen.');
  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = await researchDocumentaryProject({
    projectDirectory: args.project,
    perPage: args.perPage,
    maxTasksPerScene: args.maxTasks,
    alternatives: args.alternatives
  });
  process.stdout.write(`Doku-Recherche fertig: ${result.summary.researchedScenes}/${result.summary.sceneCount} Szenen\n`);
  process.stdout.write(`Szenen mit Empfehlung: ${result.summary.scenesWithRecommendation}\n`);
  process.stdout.write(`Kandidaten: ${result.summary.totalCandidates}\n`);
  if (result.summary.errors.length) process.stdout.write(`Recherchefehler: ${result.summary.errors.length}\n`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    await runCli();
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}
