import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {searchPexels} from './lib/pexels.mjs';
import {searchPixabay} from './lib/pixabay.mjs';
import {searchUnsplash} from './lib/unsplash.mjs';
import {searchOpenverse} from './lib/openverse.mjs';
import {searchWikimedia} from './lib/wikimedia.mjs';
import {searchNasa} from './lib/nasa-media.mjs';
import {searchLibraryOfCongress} from './lib/loc-media.mjs';
import {documentaryCandidateScore, routeDocumentaryProviders} from './lib/documentary-source-router.mjs';

const KEYED_PROVIDERS = new Set(['pexels', 'pixabay', 'unsplash']);
const PHOTO_ONLY = new Set(['unsplash', 'openverse']);
const DEFAULT_MAX_TASKS = 18;
const DEFAULT_PER_PAGE = 8;
const DEFAULT_ALTERNATIVES = 4;
const MAX_RETAINED = 24;

export async function researchDocumentaryProjectV2({
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
  if (!Array.isArray(scenePlan.scenes) || !scenePlan.scenes.length) throw new Error('scenes.json enthält keine Szenen.');

  const ledger = createVisualLedger();
  const summary = {
    format: 'visual-asset-hub-documentary-research-summary',
    version: 2,
    director: 'multi-shot-v2',
    researchedAt: new Date().toISOString(),
    sceneCount: scenePlan.scenes.length,
    researchedScenes: 0,
    scenesWithRecommendation: 0,
    totalCandidates: 0,
    totalShots: 0,
    videoShots: 0,
    imageShots: 0,
    providerUsage: {},
    selectedProviderUsage: {},
    errors: []
  };

  for (const scene of scenePlan.scenes) {
    const result = await researchSceneV2({
      scene,
      searchers,
      keys,
      perPage,
      maxTasks: maxTasksPerScene,
      alternatives,
      orientation,
      ledger
    });
    Object.assign(scene, result.scene);
    summary.researchedScenes += 1;
    summary.totalCandidates += result.scene.candidates.length;
    if (result.scene.recommendedPrimary) summary.scenesWithRecommendation += 1;
    for (const provider of result.providersUsed) summary.providerUsage[provider] = (summary.providerUsage[provider] ?? 0) + 1;
    for (const shot of result.scene.recommendedShots ?? []) {
      summary.totalShots += 1;
      if (shot.mediaType === 'video') summary.videoShots += 1;
      else summary.imageShots += 1;
      summary.selectedProviderUsage[shot.provider] = (summary.selectedProviderUsage[shot.provider] ?? 0) + 1;
    }
    for (const error of result.errors) summary.errors.push({sceneId: scene.sceneId, ...error});
    writeSceneResearchFiles(projectDir, scene);
  }

  scenePlan.researchDirector = {
    version: 2,
    strategy: 'multi-shot-provider-balanced-diversity-ledger',
    targetShots: summary.totalShots,
    videoShots: summary.videoShots,
    imageShots: summary.imageShots
  };
  fs.writeFileSync(scenesFile, `${JSON.stringify(scenePlan, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(projectDir, '05-PROJECT', 'research-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(projectDir, '05-PROJECT', 'visual-ledger.json'), `${JSON.stringify(exportLedger(ledger), null, 2)}\n`, 'utf8');
  writeRecommendedSources(projectDir, scenePlan.scenes);
  return {scenePlan, summary};
}

export async function researchSceneV2({
  scene,
  searchers = defaultSearchers(),
  keys = readProviderKeys(),
  perPage = DEFAULT_PER_PAGE,
  maxTasks = DEFAULT_MAX_TASKS,
  alternatives = DEFAULT_ALTERNATIVES,
  orientation = 'horizontal',
  ledger = createVisualLedger()
} = {}) {
  if (!scene || typeof scene !== 'object') throw new Error('Szene fehlt.');
  const directions = normalizedDirections(scene);
  if (!directions.length) throw new Error(`Szene ${scene.sceneId ?? '?'} hat keine Suchanfragen.`);
  const configuredOrder = Array.isArray(scene.documentary?.providerPriority)
    ? scene.documentary.providerPriority
    : routeDocumentaryProviders(scene);
  const providers = configuredOrder.filter((provider) => !KEYED_PROVIDERS.has(provider) || Boolean(keys[provider]));
  if (!providers.length) throw new Error(`Szene ${scene.sceneId ?? '?'} hat keine nutzbare Medienquelle.`);

  const tasks = buildBalancedTasks({scene, directions, providers, maxTasks});
  const candidates = [];
  const seen = new Set();
  const errors = [];
  const providersUsed = new Set();

  for (const task of tasks) {
    try {
      const result = await executeProviderSearch({
        ...task,
        orientation,
        perPage,
        apiKey: keys[task.provider],
        searchers
      });
      providersUsed.add(task.provider);
      for (const asset of result.assets ?? []) {
        const candidate = candidateFromAsset({asset, task, scene, orientation, ledger});
        const identity = candidateIdentity(candidate);
        if (!identity || seen.has(identity)) continue;
        seen.add(identity);
        candidates.push(candidate);
      }
    } catch (error) {
      errors.push({provider: task.provider, query: task.query, type: task.type, error: errorMessage(error)});
    }
  }

  candidates.sort((a, b) =>
    b.directorScore - a.directorScore ||
    b.documentaryScore - a.documentaryScore ||
    b.technicalFit - a.technicalFit ||
    String(a.title).localeCompare(String(b.title), 'de')
  );

  const retained = retainDiverseCandidates(candidates, MAX_RETAINED);
  const shotCount = targetShotCount(scene);
  const selected = selectShots({scene, candidates: retained, count: shotCount, ledger});
  registerShots(ledger, selected);

  const recommendedShots = selected.map((candidate, index) => ({
    shotId: `SHOT-${String(index + 1).padStart(2, '0')}`,
    candidateKey: candidate.key,
    role: shotRole(candidate, index, selected),
    mediaType: candidate.type === 'video' ? 'video' : 'image',
    provider: candidate.provider,
    familyKey: candidate.familyKey,
    motifKey: candidate.motifKey,
    documentaryScore: candidate.documentaryScore,
    directorScore: candidate.directorScore
  }));
  const recommendedPrimary = recommendedShots[0]?.candidateKey ?? null;
  const selectedKeys = new Set(recommendedShots.map((shot) => shot.candidateKey));
  const recommendedAlternatives = retained
    .filter((candidate) => !selectedKeys.has(candidate.key))
    .slice(0, alternatives)
    .map((candidate) => candidate.key);

  return {
    providersUsed: [...providersUsed],
    errors,
    scene: {
      ...scene,
      candidates: retained,
      recommendedPrimary,
      recommendedShots,
      recommendedAlternatives,
      research: {
        status: recommendedPrimary ? 'recommendation-ready' : 'no-recommendation',
        searchedAt: new Date().toISOString(),
        strategy: 'multi-shot-v2',
        providerPriority: configuredOrder,
        providersAvailable: providers,
        providersUsed: [...providersUsed],
        tasks: tasks.length,
        taskPlan: tasks.map(({provider, query, type, directionKind}) => ({provider, query, type, directionKind})),
        candidateCount: retained.length,
        shotTarget: shotCount,
        selectedShots: recommendedShots.length,
        selectedVideoShots: recommendedShots.filter((shot) => shot.mediaType === 'video').length,
        errors,
        rightsStatus: 'review-required-before-publication'
      }
    }
  };
}

function buildBalancedTasks({scene, directions, providers, maxTasks}) {
  const preferred = String(scene.preferredMediaType ?? 'mixed').toLowerCase();
  const typeOrder = preferred === 'photo' ? ['photo', 'video'] : ['video', 'photo'];
  const tasks = [];
  const seen = new Set();

  for (const mediaType of typeOrder) {
    for (let directionIndex = 0; directionIndex < directions.length; directionIndex += 1) {
      const direction = directions[directionIndex];
      for (const provider of providers) {
        if (!providerSupportsType(provider, mediaType)) continue;
        if (direction.preferredMediaType && direction.preferredMediaType !== 'mixed' && direction.preferredMediaType !== mediaType) continue;
        const key = `${provider}|${mediaType}|${direction.query}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        tasks.push({provider, type: mediaType, query: direction.query, directionKind: direction.kind});
        if (tasks.length >= maxTasks) return tasks;
      }
    }
  }

  for (const direction of directions) {
    for (const provider of providers) {
      for (const type of searchTypes(provider, preferred)) {
        const key = `${provider}|${type}|${direction.query}`.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        tasks.push({provider, type, query: direction.query, directionKind: direction.kind});
        if (tasks.length >= maxTasks) return tasks;
      }
    }
  }
  return tasks;
}

function candidateFromAsset({asset, task, scene, orientation, ledger}) {
  const provider = task.provider;
  const providerId = String(asset?.provider_id ?? asset?.id ?? '').trim();
  const sourceUrl = String(asset?.source_url ?? '').trim();
  const mediaUrl = bestMediaUrl(asset?.files);
  const key = `${provider}:${providerId || stableUrlKey(sourceUrl || mediaUrl)}`;
  const base = {
    key,
    provider,
    providerId: providerId || null,
    query: task.query,
    directionKind: task.directionKind,
    title: asset?.title || `${provider} ${providerId || 'asset'}`,
    type: asset?.type === 'video' || task.type === 'video' ? 'video' : 'image',
    width: numberOrNull(asset?.width),
    height: numberOrNull(asset?.height),
    durationSeconds: numberOrNull(asset?.duration_seconds),
    creator: asset?.creator ?? '',
    sourceUrl,
    previewUrl: asset?.preview_url ?? '',
    mediaUrl,
    license: asset?.license ?? null,
    attribution: asset?.attribution ?? asset?.attribution_text ?? null,
    technicalFit: technicalFit(asset, task.type, orientation),
    reviewStatus: 'review-required',
    asset
  };
  base.identity = candidateIdentity(base);
  base.familyKey = visualFamilyKey(base);
  base.motifKey = visualMotifKey(base);
  base.reusedElsewhere = ledger.identities.has(base.identity);
  const score = documentaryCandidateScore(scene, base);
  base.scoreBreakdown = score;
  base.documentaryScore = score.score;
  const sameFamily = ledger.families.has(base.familyKey);
  const providerUse = ledger.providerCounts.get(provider) ?? 0;
  const motifUse = ledger.motifCounts.get(base.motifKey) ?? 0;
  const videoBoost = base.type === 'video' && String(scene.preferredMediaType ?? '').toLowerCase() !== 'photo' ? 9 : 0;
  const archiveVideoBoost = base.type === 'video' && ['wikimedia', 'loc', 'nasa'].includes(provider) ? 6 : 0;
  const directMediaPenalty = base.mediaUrl ? 0 : -30;
  base.directorScore = Math.max(0,
    base.documentaryScore
    + videoBoost
    + archiveVideoBoost
    + directMediaPenalty
    - (base.reusedElsewhere ? 45 : 0)
    - (sameFamily ? 24 : 0)
    - Math.min(12, providerUse * 2)
    - Math.min(15, motifUse * 4)
  );
  return base;
}

function selectShots({scene, candidates, count, ledger}) {
  const selected = [];
  const localProviders = new Map();
  const preferred = String(scene.preferredMediaType ?? 'mixed').toLowerCase();
  const usable = candidates.filter((candidate) => candidate.mediaUrl && !ledger.identities.has(candidate.identity));

  if (preferred !== 'photo') {
    const bestVideo = usable.find((candidate) => candidate.type === 'video' && !tooSimilarToSelected(candidate, selected));
    if (bestVideo) push(bestVideo);
  }

  while (selected.length < count) {
    const next = usable.find((candidate) => {
      if (selected.some((item) => item.key === candidate.key)) return false;
      if (tooSimilarToSelected(candidate, selected)) return false;
      if ((localProviders.get(candidate.provider) ?? 0) >= 2) return false;
      if (selected.length === 1 && selected[0].type === candidate.type && usable.some((item) => item.type !== candidate.type && !selected.some((s) => s.key === item.key))) return false;
      return true;
    });
    if (!next) break;
    push(next);
  }

  if (!selected.length && candidates[0]) push(candidates[0]);
  return selected;

  function push(candidate) {
    selected.push(candidate);
    localProviders.set(candidate.provider, (localProviders.get(candidate.provider) ?? 0) + 1);
  }
}

function tooSimilarToSelected(candidate, selected) {
  return selected.some((item) => {
    if (item.familyKey && candidate.familyKey && item.familyKey === candidate.familyKey) return true;
    if (item.motifKey && candidate.motifKey && item.motifKey === candidate.motifKey) return true;
    return titleSimilarity(item.title, candidate.title) >= 0.72;
  });
}

function retainDiverseCandidates(candidates, limit) {
  const output = [];
  const familyCounts = new Map();
  const providerCounts = new Map();
  for (const candidate of candidates) {
    if (output.length >= limit) break;
    const familyCount = familyCounts.get(candidate.familyKey) ?? 0;
    const providerCount = providerCounts.get(candidate.provider) ?? 0;
    if (familyCount >= 2) continue;
    if (providerCount >= Math.max(5, Math.ceil(limit / 2))) continue;
    output.push(candidate);
    familyCounts.set(candidate.familyKey, familyCount + 1);
    providerCounts.set(candidate.provider, providerCount + 1);
  }
  return output;
}

function registerShots(ledger, shots) {
  for (const shot of shots) {
    ledger.identities.add(shot.identity);
    if (shot.familyKey) ledger.families.add(shot.familyKey);
    ledger.providerCounts.set(shot.provider, (ledger.providerCounts.get(shot.provider) ?? 0) + 1);
    if (shot.motifKey) ledger.motifCounts.set(shot.motifKey, (ledger.motifCounts.get(shot.motifKey) ?? 0) + 1);
    ledger.recent.push({provider: shot.provider, familyKey: shot.familyKey, motifKey: shot.motifKey, title: shot.title, type: shot.type});
    if (ledger.recent.length > 12) ledger.recent.shift();
  }
}

function createVisualLedger() {
  return {identities: new Set(), families: new Set(), providerCounts: new Map(), motifCounts: new Map(), recent: []};
}

function exportLedger(ledger) {
  return {
    format: 'visual-asset-hub-visual-ledger',
    version: 1,
    selectedAssets: ledger.identities.size,
    families: [...ledger.families],
    providerCounts: Object.fromEntries(ledger.providerCounts),
    motifCounts: Object.fromEntries(ledger.motifCounts),
    recent: ledger.recent
  };
}

function targetShotCount(scene) {
  const words = String(scene.originalText ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (words >= 34) return 3;
  if (words >= 15) return 2;
  return 1;
}

function shotRole(candidate, index, selected) {
  if (index === 0 && candidate.type === 'video') return 'broll-primary';
  if (index === 0) return 'evidence-primary';
  if (candidate.type === 'video') return 'broll-support';
  if (selected.some((item) => item.type === 'video')) return 'evidence-support';
  return 'visual-support';
}

function normalizedDirections(scene) {
  const supplied = Array.isArray(scene.documentary?.searchDirections) ? scene.documentary.searchDirections : [];
  const fallback = uniqueStrings(scene.queries).map((query) => ({kind: 'query', query, preferredMediaType: 'mixed'}));
  const directions = supplied.length ? supplied : fallback;
  const seen = new Set();
  return directions.filter((item) => {
    const query = String(item?.query ?? '').replace(/\s+/g, ' ').trim();
    if (!query) return false;
    const key = query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    item.query = query;
    return true;
  }).slice(0, 10);
}

async function executeProviderSearch({provider, query, type, orientation, perPage, apiKey, searchers}) {
  if (provider === 'pexels') return searchers.pexels({apiKey, query, type, orientation, page: 1, perPage, locale: 'de-DE'});
  if (provider === 'pixabay') return searchers.pixabay({apiKey, query, type, orientation, page: 1, perPage, locale: 'de'});
  if (provider === 'unsplash') return searchers.unsplash({apiKey, query, orientation, page: 1, perPage, contentFilter: 'high'});
  if (provider === 'openverse') return searchers.openverse({query, orientation, page: 1, perPage});
  if (provider === 'wikimedia') return searchers.wikimedia({query, type, orientation, page: 1, perPage});
  if (provider === 'nasa') return searchers.nasa({query, type, page: 1, perPage});
  if (provider === 'loc') return searchers.loc({query, type, page: 1, perPage});
  throw new Error(`Unbekannter Provider: ${provider}`);
}

function providerSupportsType(provider, type) {
  if (PHOTO_ONLY.has(provider)) return type === 'photo';
  return ['photo', 'video'].includes(type);
}

function searchTypes(provider, preferredMediaType) {
  if (PHOTO_ONLY.has(provider)) return ['photo'];
  if (preferredMediaType === 'photo') return ['photo'];
  if (preferredMediaType === 'video') return ['video', 'photo'];
  return ['video', 'photo'];
}

function technicalFit(asset, type, orientation) {
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  const actual = asset?.orientation || (width > height ? 'horizontal' : height > width ? 'vertical' : 'unknown');
  let score = 0;
  if (actual === orientation) score += 28;
  else if (actual === 'square') score += 8;
  else if (actual === 'unknown') score += 12;
  const shortSide = width && height ? Math.min(width, height) : 0;
  if (shortSide >= 1080) score += 28;
  else if (shortSide >= 720) score += 22;
  else if (shortSide >= 480) score += 12;
  else if (!shortSide) score += 8;
  if (asset?.source_url) score += 10;
  if (asset?.preview_url) score += 8;
  if (asset?.creator) score += 5;
  if (type === 'video') {
    const duration = Number(asset?.duration_seconds) || 0;
    if (duration >= 4 && duration <= 45) score += 21;
    else if (duration > 0) score += 12;
    else score += 10;
  } else {
    const pixels = width * height;
    if (pixels >= 2_000_000) score += 15;
    else if (pixels >= 1_000_000) score += 10;
  }
  return Math.min(100, score);
}

function writeSceneResearchFiles(projectDirectory, scene) {
  const sceneDir = path.join(projectDirectory, '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, {recursive: true});
  writeJson(path.join(sceneDir, '00-research.json'), {
    sceneId: scene.sceneId,
    originalText: scene.originalText,
    visualIntent: scene.visualIntent,
    documentary: scene.documentary,
    research: scene.research,
    recommendedPrimary: scene.recommendedPrimary,
    recommendedShots: scene.recommendedShots,
    recommendedAlternatives: scene.recommendedAlternatives,
    candidates: scene.candidates
  });

  for (let index = 0; index < (scene.recommendedShots ?? []).length; index += 1) {
    const shot = scene.recommendedShots[index];
    const candidate = scene.candidates.find((item) => item.key === shot.candidateKey);
    if (!candidate) continue;
    const prefix = `${String(index + 1).padStart(2, '0')}-SHOT`;
    if (candidate.sourceUrl) writeUrlShortcut(path.join(sceneDir, `${prefix}-SOURCE.url`), candidate.sourceUrl);
    if (candidate.mediaUrl) writeUrlShortcut(path.join(sceneDir, `${prefix}-MEDIA.url`), candidate.mediaUrl);
    if (candidate.previewUrl) writeUrlShortcut(path.join(sceneDir, `${prefix}-PREVIEW.url`), candidate.previewUrl);
  }
}

function writeRecommendedSources(projectDirectory, scenes) {
  const sourceLines = [];
  const licenseRows = [['scene','role','provider','creator','source_url','license','review_status']];
  for (const scene of scenes) {
    const shotKeys = (scene.recommendedShots ?? []).map((shot, index) => [`shot-${index + 1}`, shot.candidateKey]);
    const alternativeKeys = (scene.recommendedAlternatives ?? []).map((key, index) => [`alternative-${index + 1}`, key]);
    for (const [role, key] of [...shotKeys, ...alternativeKeys]) {
      const candidate = scene.candidates?.find((item) => item.key === key);
      if (!candidate) continue;
      sourceLines.push(`${scene.sceneId} | ${role} | ${candidate.provider} | ${candidate.title} | ${candidate.sourceUrl || 'keine Quelle'}`);
      licenseRows.push([scene.sceneId, role, candidate.provider, candidate.creator || '', candidate.sourceUrl || '', candidate.license || 'provider-policy-check-required', candidate.reviewStatus]);
    }
  }
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'sources.txt'), `${sourceLines.join('\n')}${sourceLines.length ? '\n' : ''}`, 'utf8');
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'licenses.csv'), `${licenseRows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');
}

function defaultSearchers() {
  return {pexels: searchPexels, pixabay: searchPixabay, unsplash: searchUnsplash, openverse: searchOpenverse, wikimedia: searchWikimedia, nasa: searchNasa, loc: searchLibraryOfCongress};
}

function readProviderKeys(env = process.env) {
  return {
    pexels: env.PEXELS_API_KEY || env.PEXELS_API || '',
    pixabay: env.PIXABAY_API || env.PIXABAY_API_KEY || '',
    unsplash: env.UNSPLASH_ACCESS_KEY || env.UNSPLASH_API || ''
  };
}

function candidateIdentity(candidate) {
  return `${candidate.provider}|${candidate.providerId || canonicalUrl(candidate.sourceUrl) || canonicalUrl(candidate.mediaUrl)}`;
}

function visualFamilyKey(candidate) {
  const creator = normalize(candidate.creator).split(' ').slice(0, 3).join('-');
  const title = meaningfulTitleTerms(candidate.title).slice(0, 6).sort().join('-');
  return `${candidate.provider}|${creator}|${title || candidate.providerId || stableUrlKey(candidate.sourceUrl)}`;
}

function visualMotifKey(candidate) {
  return meaningfulTitleTerms(`${candidate.title} ${candidate.asset?.description || ''}`).slice(0, 4).sort().join('-') || candidate.provider;
}

function meaningfulTitleTerms(value) {
  const stop = new Set(['photo','image','video','footage','archive','archival','historical','documentary','the','and','with','from','for','und','der','die','das','mit','von','eine','einer']);
  return [...new Set(normalize(value).split(' ').filter((word) => word.length >= 4 && !stop.has(word)))];
}

function titleSimilarity(a, b) {
  const aa = new Set(meaningfulTitleTerms(a));
  const bb = new Set(meaningfulTitleTerms(b));
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const value of aa) if (bb.has(value)) common += 1;
  return common / (aa.size + bb.size - common);
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

function stableUrlKey(value) {
  return canonicalUrl(value).replace(/[^a-z0-9]/gi, '').slice(-48) || 'unknown';
}

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|ixid|auto|fit|crop|w|h|q)/i.test(key)) url.searchParams.delete(key);
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch { return String(value || '').trim().toLowerCase(); }
}

function normalize(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function uniqueStrings(values) { return [...new Set((Array.isArray(values) ? values : []).map((v) => String(v ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean))]; }
function requireDirectory(value) { if (!value) throw new Error('projectDirectory fehlt.'); const dir = path.resolve(value); if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`Projektordner nicht gefunden: ${dir}`); return dir; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }
function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function writeUrlShortcut(file, url) { fs.writeFileSync(file, `[InternetShortcut]\nURL=${url}\n`, 'utf8'); }

function parseArgs(argv) {
  const args = {projectDirectory: '', perPage: DEFAULT_PER_PAGE, maxTasksPerScene: DEFAULT_MAX_TASKS, alternatives: DEFAULT_ALTERNATIVES};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--per-page') args.perPage = Number(argv[++index]);
    else if (token === '--max-tasks') args.maxTasksPerScene = Number(argv[++index]);
    else if (token === '--alternatives') args.alternatives = Number(argv[++index]);
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const result = await researchDocumentaryProjectV2(parseArgs(process.argv.slice(2)));
    process.stdout.write(`Doku-Recherche V2: ${result.summary.researchedScenes}/${result.summary.sceneCount} Szenen\n`);
    process.stdout.write(`Shots: ${result.summary.totalShots} (${result.summary.videoShots} Video / ${result.summary.imageShots} Bild)\n`);
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}
