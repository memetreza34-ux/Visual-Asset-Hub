import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {researchDocumentaryProjectV4} from './documentary-research-v4.mjs';
import {searchWikimedia} from './lib/wikimedia.mjs';
import {searchNasa} from './lib/nasa-media.mjs';
import {documentaryCandidateScore} from './lib/documentary-source-router.mjs';

const ARCHIVE_PROVIDERS = new Set(['wikimedia', 'nasa', 'loc', 'openverse']);
const AI_GENERATED_RE = /\b(ai[- ]generated|generated (?:with|by) ai|artificial intelligence generated|midjourney|stable diffusion|sora generated|synthetic ai)\b/i;
const QUERY_STOP = new Set(['the','and','for','with','from','into','sea','lake','river','archive','historical','documentary','footage','photo','video','image']);

/**
 * V5 keeps V4's strict gate but rescues blocked scenes with topic-level semantic search anchors.
 * The anchor's German cues decide WHEN a query is appropriate; the international query decides HOW
 * Wikimedia/NASA should be searched. Search results are cached across scenes to avoid repeated calls.
 */
export async function researchDocumentaryProjectV5(options = {}) {
  const anchors = normalizeAnchors(options.visualSearchAnchors ?? []);
  const base = await researchDocumentaryProjectV4(options);
  const scenePlan = base.scenePlan;
  const cache = new Map();
  const usedIdentities = new Set();
  const usedFamilies = new Set();
  const report = {
    format: 'visual-asset-hub-documentary-anchor-rescue',
    version: 5,
    generatedAt: new Date().toISOString(),
    anchorCount: anchors.length,
    searches: 0,
    cacheHits: 0,
    candidates: 0,
    rescuedScenes: 0,
    rescuedShots: 0,
    generatedMediaRejected: 0,
    topicMismatchRejected: 0,
    errors: []
  };

  for (const scene of scenePlan.scenes ?? []) {
    pruneUnsafeExistingShots(scene, anchors, usedIdentities, usedFamilies, report);
    if ((scene.recommendedShots ?? []).length) {
      registerSceneShots(scene, usedIdentities, usedFamilies);
      continue;
    }
    if (!anchors.length) continue;

    const chosenAnchors = anchorsForScene(scene, anchors).slice(0, 3);
    const rescueCandidates = [];
    for (const anchor of chosenAnchors) {
      const providers = providersForAnchor(anchor);
      for (const provider of providers) {
        const types = mediaTypesForAnchor(anchor, provider);
        for (const type of types) {
          const result = await cachedSearch({provider, type, anchor, options, cache, report});
          for (const asset of result.assets ?? []) {
            const candidate = candidateFromAnchorAsset(scene, anchor, provider, type, asset, anchors);
            if (!candidate) {
              const haystack = assetText(asset);
              if (AI_GENERATED_RE.test(haystack)) report.generatedMediaRejected += 1;
              else report.topicMismatchRejected += 1;
              continue;
            }
            rescueCandidates.push(candidate);
          }
        }
      }
    }

    report.candidates += rescueCandidates.length;
    const unique = dedupeCandidates(rescueCandidates)
      .filter((candidate) => !usedIdentities.has(candidate.identity))
      .filter((candidate) => !candidate.familyKey || !usedFamilies.has(candidate.familyKey))
      .sort((a, b) => b.anchorRescueScore - a.anchorRescueScore || b.documentaryScore - a.documentaryScore);

    const target = Math.max(1, Math.min(2, Number(scene.research?.shotTarget) || 1));
    const selected = selectDiverse(unique, target);
    if (!selected.length) {
      scene.research = {
        ...scene.research,
        anchorRescue: {
          status: 'no-reliable-anchor-result',
          tried: chosenAnchors.map((anchor) => anchor.query),
          candidateCount: unique.length
        }
      };
      writeSceneResearch(options.projectDirectory, scene);
      continue;
    }

    mergeSceneCandidates(scene, selected);
    scene.recommendedShots = selected.map((candidate, index) => ({
      shotId: `SHOT-${String(index + 1).padStart(2, '0')}`,
      candidateKey: candidate.key,
      role: candidate.anchorIntent === 'broll' ? (index === 0 ? 'broll-primary' : 'broll-support') : (index === 0 ? 'evidence-primary' : 'evidence-support'),
      mediaType: candidate.type === 'video' ? 'video' : 'image',
      provider: candidate.provider,
      familyKey: candidate.familyKey,
      motifKey: candidate.motifKey,
      documentaryScore: candidate.documentaryScore,
      directorScore: candidate.directorScore,
      qualityGateScore: candidate.anchorRescueScore,
      anchorQuery: candidate.anchorQuery,
      anchorIntent: candidate.anchorIntent,
      anchorMatched: true,
      evidenceLevel: scene.documentary?.evidenceLevel ?? 'contextual'
    }));
    scene.recommendedPrimary = scene.recommendedShots[0].candidateKey;
    scene.recommendedAlternatives = [];
    scene.research = {
      ...scene.research,
      strategy: 'multi-shot-v5-semantic-anchor-rescue',
      qualityGate: {
        ...(scene.research?.qualityGate ?? {}),
        status: 'rescued-by-semantic-anchor',
        selectedShots: selected.length
      },
      anchorRescue: {
        status: 'rescued',
        tried: chosenAnchors.map((anchor) => anchor.query),
        selected: selected.map((candidate) => ({key: candidate.key, provider: candidate.provider, title: candidate.title, anchorQuery: candidate.anchorQuery, score: candidate.anchorRescueScore}))
      }
    };
    report.rescuedScenes += 1;
    report.rescuedShots += selected.length;
    registerSceneShots(scene, usedIdentities, usedFamilies);
    writeSceneResearch(options.projectDirectory, scene);
  }

  const stats = summarize(scenePlan.scenes ?? []);
  const summary = {
    ...base.summary,
    version: 5,
    director: 'multi-shot-v5-semantic-anchor-rescue',
    totalShots: stats.totalShots,
    videoShots: stats.videoShots,
    imageShots: stats.imageShots,
    videoShare: stats.totalShots ? Number((stats.videoShots / stats.totalShots).toFixed(3)) : 0,
    selectedProviderUsage: stats.providerUsage,
    qualityBlockedScenes: stats.blockedScenes,
    anchorCount: anchors.length,
    anchorRescueSearches: report.searches,
    anchorRescueCacheHits: report.cacheHits,
    anchorRescueCandidates: report.candidates,
    anchorRescuedScenes: report.rescuedScenes,
    anchorRescuedShots: report.rescuedShots,
    generatedMediaRejected: report.generatedMediaRejected,
    topicMismatchRejected: report.topicMismatchRejected
  };
  scenePlan.researchDirector = {
    ...(scenePlan.researchDirector ?? {}),
    version: 5,
    strategy: 'semantic-anchor-rescue-evidence-first',
    totalShots: stats.totalShots,
    videoShots: stats.videoShots,
    imageShots: stats.imageShots,
    qualityBlockedScenes: stats.blockedScenes,
    anchorRescuedScenes: report.rescuedScenes
  };

  const root = path.resolve(options.projectDirectory);
  writeJson(path.join(root, '05-PROJECT', 'scenes.json'), scenePlan);
  writeJson(path.join(root, '05-PROJECT', 'research-summary.json'), summary);
  writeJson(path.join(root, '05-PROJECT', 'anchor-rescue-report.json'), report);
  rewriteSources(root, scenePlan.scenes ?? []);
  return {scenePlan, summary, anchorRescue: report};
}

function normalizeAnchors(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const query = clean(value?.query);
    const cues = [...new Set((value?.cues ?? []).map(clean).filter(Boolean))].slice(0, 8);
    const intent = ['evidence','broll','map','satellite'].includes(value?.intent) ? value.intent : 'evidence';
    if (!query || cues.length < 2 || seen.has(query.toLowerCase())) continue;
    seen.add(query.toLowerCase());
    result.push({query, cues, intent});
  }
  return result.slice(0, 12);
}

function anchorsForScene(scene, anchors) {
  const sceneText = normalize([scene.originalText, scene.visualIntent, ...(scene.entities ?? []), ...(scene.concepts ?? [])].filter(Boolean).join(' '));
  return anchors
    .map((anchor, index) => {
      const cueMatches = anchor.cues.reduce((sum, cue) => sum + (sceneText.includes(normalize(cue)) ? 1 : 0), 0);
      const intentBonus = anchor.intent === 'satellite' && /satellit|satellite|karte|map|wasserflache|flaeche|jahr|\b(?:19|20)\d{2}\b/.test(sceneText) ? 2 : 0;
      return {anchor, index, score: cueMatches * 4 + intentBonus + (index === 0 ? 0.25 : 0)};
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((item, index) => item.score > 0 || index === 0)
    .map((item) => item.anchor);
}

function providersForAnchor(anchor) {
  if (anchor.intent === 'satellite') return ['nasa', 'wikimedia'];
  if (anchor.intent === 'map') return ['wikimedia'];
  return ['wikimedia', 'nasa'];
}

function mediaTypesForAnchor(anchor, provider) {
  if (provider === 'nasa') return anchor.intent === 'satellite' ? ['photo'] : ['photo', 'video'];
  if (anchor.intent === 'map') return ['photo'];
  return ['photo', 'video'];
}

async function cachedSearch({provider, type, anchor, options, cache, report}) {
  const key = `${provider}|${type}|${anchor.query.toLowerCase()}`;
  if (cache.has(key)) {
    report.cacheHits += 1;
    return cache.get(key);
  }
  report.searches += 1;
  try {
    const search = provider === 'nasa' ? searchNasa : searchWikimedia;
    const result = await search({
      query: anchor.query,
      type,
      orientation: 'horizontal',
      page: 1,
      perPage: Math.min(12, Number(options.perPage) || 8),
      fetchImpl: options.fetchImpl ?? globalThis.fetch
    });
    cache.set(key, result);
    return result;
  } catch (error) {
    report.errors.push({provider, type, query: anchor.query, error: error instanceof Error ? error.message : String(error)});
    const empty = {assets: []};
    cache.set(key, empty);
    return empty;
  }
}

function candidateFromAnchorAsset(scene, anchor, provider, type, asset, anchors) {
  const text = assetText(asset);
  if (AI_GENERATED_RE.test(text)) return null;
  const anchorMatch = termMatch(anchor.query, text);
  const topicMatch = topicMatchRatio(anchors, text);
  if (anchorMatch.ratio < 0.2 && topicMatch < 0.2) return null;

  const mediaUrl = bestMediaUrl(asset?.files);
  if (!mediaUrl) return null;
  const providerId = String(asset?.provider_id ?? asset?.id ?? '').trim();
  const sourceUrl = String(asset?.source_url ?? '').trim();
  const title = String(asset?.title || `${provider} ${providerId || 'asset'}`).trim();
  const key = `${provider}:${providerId || stableKey(sourceUrl || mediaUrl)}`;
  const base = {
    key,
    provider,
    providerId: providerId || null,
    query: anchor.query,
    directionKind: `anchor-${anchor.intent}`,
    anchorQuery: anchor.query,
    anchorIntent: anchor.intent,
    anchorMatched: true,
    title,
    type: asset?.type === 'video' || type === 'video' ? 'video' : 'image',
    width: numberOrNull(asset?.width),
    height: numberOrNull(asset?.height),
    durationSeconds: numberOrNull(asset?.duration_seconds),
    creator: asset?.creator ?? '',
    sourceUrl,
    previewUrl: asset?.preview_url ?? '',
    mediaUrl,
    license: asset?.license ?? null,
    attribution: asset?.attribution ?? asset?.attribution_text ?? null,
    technicalFit: technicalFit(asset, type),
    reviewStatus: 'review-required',
    asset
  };
  base.identity = `${provider}|${providerId || stableKey(sourceUrl || mediaUrl)}`;
  base.motifKey = motifKey(title);
  base.familyKey = `${provider}|${normalize(base.creator)}|${base.motifKey}`;
  const documentary = documentaryCandidateScore(scene, base);
  base.scoreBreakdown = documentary;
  base.documentaryScore = documentary.score;
  const archiveBonus = ARCHIVE_PROVIDERS.has(provider) ? 8 : 0;
  const videoBonus = base.type === 'video' ? 3 : 0;
  const anchorBonus = Math.round(anchorMatch.ratio * 32);
  const topicBonus = Math.round(topicMatch * 26);
  const intentBonus = anchor.intent === 'satellite' && provider === 'nasa' ? 8 : anchor.intent === 'map' && provider === 'wikimedia' ? 6 : 0;
  base.directorScore = documentary.score + archiveBonus + videoBonus;
  base.anchorMatch = Math.round(anchorMatch.ratio * 100);
  base.topicMatch = Math.round(topicMatch * 100);
  base.anchorRescueScore = Math.round((documentary.score + archiveBonus + videoBonus + anchorBonus + topicBonus + intentBonus) * 10) / 10;
  if (base.anchorRescueScore < 42) return null;
  return base;
}

function pruneUnsafeExistingShots(scene, anchors, usedIdentities, usedFamilies, report) {
  const original = Array.isArray(scene.recommendedShots) ? scene.recommendedShots : [];
  const safe = [];
  for (const shot of original) {
    const candidate = scene.candidates?.find((item) => item.key === shot.candidateKey);
    if (!candidate) continue;
    const text = assetText(candidate.asset ?? candidate);
    if (AI_GENERATED_RE.test(text)) {
      report.generatedMediaRejected += 1;
      continue;
    }
    const identity = candidate.identity || `${candidate.provider}|${candidate.providerId || candidate.key}`;
    if (usedIdentities.has(identity)) continue;
    if (ARCHIVE_PROVIDERS.has(candidate.provider)) {
      const topicMatch = topicMatchRatio(anchors, text);
      const sceneAnchorMatch = anchorsForScene(scene, anchors).some((anchor) => termMatch(anchor.query, text).ratio >= 0.2);
      if (anchors.length && topicMatch < 0.2 && !sceneAnchorMatch) {
        report.topicMismatchRejected += 1;
        continue;
      }
    }
    if (candidate.familyKey && usedFamilies.has(candidate.familyKey)) continue;
    safe.push(shot);
  }
  scene.recommendedShots = safe;
  scene.recommendedPrimary = safe[0]?.candidateKey ?? null;
}

function registerSceneShots(scene, identities, families) {
  for (const shot of scene.recommendedShots ?? []) {
    const candidate = scene.candidates?.find((item) => item.key === shot.candidateKey);
    if (!candidate) continue;
    identities.add(candidate.identity || `${candidate.provider}|${candidate.providerId || candidate.key}`);
    if (candidate.familyKey) families.add(candidate.familyKey);
  }
}

function mergeSceneCandidates(scene, selected) {
  const map = new Map((scene.candidates ?? []).map((candidate) => [candidate.key, candidate]));
  for (const candidate of selected) map.set(candidate.key, candidate);
  scene.candidates = [...map.values()].sort((a, b) => Number(b.anchorRescueScore ?? b.qualityGateScore ?? b.directorScore ?? 0) - Number(a.anchorRescueScore ?? a.qualityGateScore ?? a.directorScore ?? 0));
}

function selectDiverse(candidates, target) {
  const selected = [];
  const providers = new Set();
  const families = new Set();
  for (const candidate of candidates) {
    if (selected.length >= target) break;
    if (candidate.familyKey && families.has(candidate.familyKey)) continue;
    if (selected.length === 1 && providers.has(candidate.provider) && candidates.some((item) => !providers.has(item.provider))) continue;
    selected.push(candidate);
    providers.add(candidate.provider);
    if (candidate.familyKey) families.add(candidate.familyKey);
  }
  return selected;
}

function dedupeCandidates(values) {
  const map = new Map();
  for (const candidate of values) {
    const key = candidate.identity || candidate.key;
    const prior = map.get(key);
    if (!prior || candidate.anchorRescueScore > prior.anchorRescueScore) map.set(key, candidate);
  }
  return [...map.values()];
}

function topicMatchRatio(anchors, haystack) {
  if (!anchors.length) return 0;
  const coreTerms = [...new Set(anchors.slice(0, 4).flatMap((anchor) => meaningfulQueryTerms(anchor.query)))];
  if (!coreTerms.length) return 0;
  const matched = coreTerms.filter((term) => haystack.includes(term));
  return matched.length / Math.min(coreTerms.length, 8);
}

function termMatch(query, haystack) {
  const terms = meaningfulQueryTerms(query);
  if (!terms.length) return {ratio: 0, matched: []};
  const matched = terms.filter((term) => haystack.includes(term));
  return {ratio: matched.length / terms.length, matched};
}

function meaningfulQueryTerms(value) {
  return [...new Set(normalize(value).split(/\s+/).filter((term) => term.length >= 4 && !QUERY_STOP.has(term)))].slice(0, 8);
}

function assetText(asset) {
  return normalize([
    asset?.title,
    asset?.description,
    asset?.creator,
    ...(Array.isArray(asset?.tags) ? asset.tags : []),
    asset?.source_name,
    asset?.attribution_text
  ].filter(Boolean).join(' '));
}

function bestMediaUrl(files) {
  if (Array.isArray(files)) return files.filter((item) => item?.url).sort((a, b) => (Number(b.width)||0)*(Number(b.height)||0) - (Number(a.width)||0)*(Number(a.height)||0))[0]?.url ?? '';
  if (!files || typeof files !== 'object') return '';
  for (const key of ['original','large','full','regular','medium','small']) {
    const value = files[key];
    if (typeof value === 'string' && value) return value;
    if (value?.url) return value.url;
  }
  return '';
}

function technicalFit(asset, type) {
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  let score = 0;
  if (!width || !height || width > height) score += 24;
  const shortSide = width && height ? Math.min(width, height) : 0;
  if (shortSide >= 1080) score += 28;
  else if (shortSide >= 720) score += 20;
  else if (shortSide >= 480) score += 12;
  if (asset?.source_url) score += 12;
  if (asset?.preview_url) score += 10;
  if (type === 'video') score += 8;
  return Math.min(100, score);
}

function motifKey(value) {
  return meaningfulQueryTerms(value).slice(0, 5).sort().join('-') || stableKey(value);
}
function stableKey(value) { let hash = 2166136261; for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); }
function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function normalize(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }

function summarize(scenes) {
  const providerUsage = {};
  let totalShots = 0;
  let videoShots = 0;
  let blockedScenes = 0;
  for (const scene of scenes) {
    const shots = scene.recommendedShots ?? [];
    if (!shots.length) blockedScenes += 1;
    for (const shot of shots) {
      totalShots += 1;
      if (shot.mediaType === 'video') videoShots += 1;
      providerUsage[shot.provider] = (providerUsage[shot.provider] ?? 0) + 1;
    }
  }
  return {totalShots, videoShots, imageShots: totalShots - videoShots, blockedScenes, providerUsage};
}

function writeSceneResearch(projectDirectory, scene) {
  if (!projectDirectory) return;
  const sceneDir = path.join(path.resolve(projectDirectory), '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
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
}

function rewriteSources(projectDirectory, scenes) {
  const lines = [];
  const rows = [['scene','role','provider','creator','source_url','license','review_status','quality_gate_score','anchor_query']];
  for (const scene of scenes) {
    for (const [index, shot] of (scene.recommendedShots ?? []).entries()) {
      const candidate = scene.candidates?.find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      lines.push(`${scene.sceneId} | shot-${index + 1} | ${candidate.provider} | ${candidate.title} | ${candidate.sourceUrl || 'keine Quelle'}`);
      rows.push([scene.sceneId, `shot-${index + 1}`, candidate.provider, candidate.creator || '', candidate.sourceUrl || '', candidate.license || 'provider-policy-check-required', candidate.reviewStatus || 'review-required', candidate.anchorRescueScore ?? candidate.qualityGateScore ?? '', candidate.anchorQuery ?? '']);
    }
  }
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'sources.txt'), `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'licenses.csv'), `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');
}

function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }

function parseArgs(argv) {
  const args = {projectDirectory: '', visualSearchAnchors: []};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--anchors-file') args.visualSearchAnchors = JSON.parse(fs.readFileSync(path.resolve(argv[++index]), 'utf8')).visualSearchAnchors ?? [];
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const result = await researchDocumentaryProjectV5(parseArgs(process.argv.slice(2)));
    process.stdout.write(`V5 Shots: ${result.summary.totalShots} (${result.summary.videoShots} Video / ${result.summary.imageShots} Bild)\n`);
    process.stdout.write(`Anchor-rescued Szenen: ${result.summary.anchorRescuedScenes}\n`);
    process.stdout.write(`Noch blockierte Szenen: ${result.summary.qualityBlockedScenes}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
