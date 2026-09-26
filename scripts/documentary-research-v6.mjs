import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {researchDocumentaryProjectV5} from './documentary-research-v5.mjs';
import {searchWikimedia} from './lib/wikimedia.mjs';
import {searchNasa} from './lib/nasa-media.mjs';
import {documentaryCandidateScore} from './lib/documentary-source-router.mjs';

const ARCHIVE_PROVIDERS = new Set(['wikimedia', 'nasa', 'loc', 'openverse']);
const STOCK_PROVIDERS = new Set(['pexels', 'pixabay', 'unsplash']);
const QUERY_STOP = new Set(['the','and','for','with','from','into','sea','lake','river','archive','historical','documentary','footage','photo','video','image']);
const AI_GENERATED_RE = /\b(ai[- ]generated|generated (?:with|by) ai|artificial intelligence generated|midjourney|stable diffusion|sora generated|synthetic ai)\b/i;

/**
 * V6 keeps V5's strict evidence-first pipeline and fixes three real-test issues:
 * 1) generic stock with no lexical relevance is removed,
 * 2) Wikimedia/NASA rescue is ranked with provider diversity and scene-aware query variants,
 * 3) strong evidence may continue across one nearby semantic scene instead of forcing a random new asset.
 */
export async function researchDocumentaryProjectV6(options = {}) {
  const anchors = normalizeAnchors(options.visualSearchAnchors ?? []);
  const base = await researchDocumentaryProjectV5(options);
  const scenePlan = base.scenePlan;
  const cache = new Map();
  const report = {
    format: 'visual-asset-hub-documentary-v6-rescue',
    version: 6,
    generatedAt: new Date().toISOString(),
    anchorCount: anchors.length,
    stockPrunedForIrrelevance: 0,
    searches: 0,
    cacheHits: 0,
    candidatesByProvider: {},
    selectedByProvider: {},
    rescuedScenes: 0,
    continuityReusedScenes: 0,
    generatedMediaRejected: Number(base.anchorRescue?.generatedMediaRejected || 0),
    topicMismatchRejected: Number(base.anchorRescue?.topicMismatchRejected || 0),
    errors: []
  };

  for (const scene of scenePlan.scenes ?? []) pruneIrrelevantStock(scene, report);

  const usage = buildUsage(scenePlan.scenes ?? []);
  const evidencePool = buildEvidencePool(scenePlan.scenes ?? [], anchors);

  for (const scene of scenePlan.scenes ?? []) {
    if ((scene.recommendedShots ?? []).length) continue;

    const chosenAnchors = anchorsForScene(scene, anchors).slice(0, 4);
    const rescueCandidates = [];
    for (const anchor of chosenAnchors) {
      for (const query of queryVariants(scene, anchor)) {
        for (const provider of providersForAnchor(anchor)) {
          for (const type of mediaTypesForAnchor(anchor, provider)) {
            const result = await cachedSearch({provider, type, query, options, cache, report});
            for (const asset of result.assets ?? []) {
              report.candidatesByProvider[provider] = (report.candidatesByProvider[provider] ?? 0) + 1;
              const candidate = candidateFromArchiveAsset(scene, anchor, query, provider, type, asset, anchors);
              if (!candidate) continue;
              rescueCandidates.push(candidate);
            }
          }
        }
      }
    }

    const selected = selectFreshCandidates(rescueCandidates, usage, 1);
    if (selected.length) {
      assignCandidates(scene, selected, 'multi-shot-v6-scene-aware-archive-rescue');
      for (const candidate of selected) {
        incrementUsage(usage, candidate);
        evidencePool.push(poolEntry(scene, candidate, anchors));
        report.selectedByProvider[candidate.provider] = (report.selectedByProvider[candidate.provider] ?? 0) + 1;
      }
      report.rescuedScenes += 1;
      writeSceneResearch(options.projectDirectory, scene);
      continue;
    }

    const continuity = selectContinuityEvidence(scene, chosenAnchors, evidencePool, usage);
    if (continuity) {
      const reused = {...continuity.candidate, continuityReuse: true, continuityFromScene: continuity.sceneId};
      assignCandidates(scene, [reused], 'multi-shot-v6-controlled-evidence-continuity', {
        continuityFromScene: continuity.sceneId
      });
      incrementUsage(usage, reused);
      report.continuityReusedScenes += 1;
      report.selectedByProvider[reused.provider] = (report.selectedByProvider[reused.provider] ?? 0) + 1;
      writeSceneResearch(options.projectDirectory, scene);
      continue;
    }

    scene.research = {
      ...scene.research,
      strategy: 'multi-shot-v6-strict-no-filler',
      qualityGate: {...(scene.research?.qualityGate ?? {}), status: 'blocked-no-reliable-visual'},
      v6Rescue: {
        status: 'no-reliable-result',
        tried: chosenAnchors.map((anchor) => anchor.query)
      }
    };
    writeSceneResearch(options.projectDirectory, scene);
  }

  const stats = summarize(scenePlan.scenes ?? []);
  const uniqueAssets = countUniqueAssets(scenePlan.scenes ?? []);
  const summary = {
    ...base.summary,
    version: 6,
    director: 'multi-shot-v6-evidence-continuity',
    totalShots: stats.totalShots,
    videoShots: stats.videoShots,
    imageShots: stats.imageShots,
    videoShare: stats.totalShots ? Number((stats.videoShots / stats.totalShots).toFixed(3)) : 0,
    selectedProviderUsage: stats.providerUsage,
    coveredScenes: stats.coveredScenes,
    qualityBlockedScenes: stats.blockedScenes,
    uniqueSelectedAssets: uniqueAssets,
    stockPrunedForIrrelevance: report.stockPrunedForIrrelevance,
    v6RescueSearches: report.searches,
    v6RescueCacheHits: report.cacheHits,
    v6CandidatesByProvider: report.candidatesByProvider,
    v6SelectedByProvider: report.selectedByProvider,
    v6RescuedScenes: report.rescuedScenes,
    v6ContinuityReusedScenes: report.continuityReusedScenes
  };

  scenePlan.researchDirector = {
    ...(scenePlan.researchDirector ?? {}),
    version: 6,
    strategy: 'scene-aware-archive-rescue-controlled-continuity',
    totalShots: stats.totalShots,
    coveredScenes: stats.coveredScenes,
    qualityBlockedScenes: stats.blockedScenes,
    uniqueSelectedAssets: uniqueAssets
  };

  const root = path.resolve(options.projectDirectory);
  writeJson(path.join(root, '05-PROJECT', 'scenes.json'), scenePlan);
  writeJson(path.join(root, '05-PROJECT', 'research-summary.json'), summary);
  if (base.anchorRescue) writeJson(path.join(root, '05-PROJECT', 'anchor-rescue-v5-report.json'), base.anchorRescue);
  writeJson(path.join(root, '05-PROJECT', 'anchor-rescue-report.json'), report);
  rewriteSources(root, scenePlan.scenes ?? []);
  return {scenePlan, summary, anchorRescue: report};
}

function pruneIrrelevantStock(scene, report) {
  const original = Array.isArray(scene.recommendedShots) ? scene.recommendedShots : [];
  const kept = [];
  for (const shot of original) {
    const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
    if (!candidate) continue;
    if (!STOCK_PROVIDERS.has(candidate.provider)) {
      kept.push(shot);
      continue;
    }
    const lexical = Number(candidate.scoreBreakdown?.lexicalMatch ?? 0);
    const visibleText = assetText(candidate.asset ?? candidate);
    const queryRatio = candidate.query ? termMatch(candidate.query, visibleText).ratio : 0;
    const isRelevant = lexical >= 6 || queryRatio >= 0.34;
    if (!isRelevant) {
      report.stockPrunedForIrrelevance += 1;
      continue;
    }
    kept.push(shot);
  }
  scene.recommendedShots = kept;
  scene.recommendedPrimary = kept[0]?.candidateKey ?? null;
  if (!kept.length && original.length) {
    scene.research = {
      ...scene.research,
      v6StockGate: {status: 'pruned-generic-stock', removed: original.length}
    };
  }
}

function normalizeAnchors(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const query = clean(value?.query);
    const cues = [...new Set((value?.cues ?? []).map(clean).filter(Boolean))].slice(0, 10);
    const intent = ['evidence','broll','map','satellite'].includes(value?.intent) ? value.intent : 'evidence';
    if (!query || cues.length < 2 || seen.has(query.toLowerCase())) continue;
    seen.add(query.toLowerCase());
    result.push({query, cues, intent});
  }
  return result.slice(0, 14);
}

function anchorsForScene(scene, anchors) {
  const text = normalize([scene.originalText, scene.visualIntent, ...(scene.entities ?? []), ...(scene.concepts ?? [])].filter(Boolean).join(' '));
  const ranked = anchors.map((anchor, index) => {
    const cueMatches = anchor.cues.reduce((sum, cue) => sum + (text.includes(normalize(cue)) ? 1 : 0), 0);
    const satelliteBonus = anchor.intent === 'satellite' && /satellit|satellite|karte|map|wasserflache|flaeche|jahr|\b(?:19|20)\d{2}\b/.test(text) ? 3 : 0;
    const mapBonus = anchor.intent === 'map' && /karte|lage|region|grenze|fluss|see/.test(text) ? 2 : 0;
    return {anchor, index, score: cueMatches * 6 + satelliteBonus + mapBonus};
  }).sort((a, b) => b.score - a.score || a.index - b.index);
  const matched = ranked.filter((item) => item.score > 0).map((item) => item.anchor);
  if (matched.length) return matched;
  return anchors.slice(0, Math.min(2, anchors.length));
}

function queryVariants(scene, anchor) {
  const variants = [anchor.query];
  const years = [...new Set(String(scene.originalText ?? '').match(/\b(?:19|20)\d{2}\b/g) ?? [])].slice(0, 2);
  for (const year of years) {
    if (!anchor.query.includes(year)) variants.push(`${anchor.query} ${year}`);
  }
  return [...new Set(variants)].slice(0, 3);
}

function providersForAnchor(anchor) {
  if (anchor.intent === 'map') return ['wikimedia', 'nasa'];
  if (anchor.intent === 'satellite') return ['wikimedia', 'nasa'];
  return ['wikimedia', 'nasa'];
}

function mediaTypesForAnchor(anchor, provider) {
  if (provider === 'nasa') return anchor.intent === 'satellite' ? ['photo'] : ['photo', 'video'];
  if (anchor.intent === 'map') return ['photo'];
  return ['photo', 'video'];
}

async function cachedSearch({provider, type, query, options, cache, report}) {
  const key = `${provider}|${type}|${query.toLowerCase()}`;
  if (cache.has(key)) {
    report.cacheHits += 1;
    return cache.get(key);
  }
  report.searches += 1;
  try {
    const search = provider === 'nasa' ? searchNasa : searchWikimedia;
    const result = await search({
      query,
      type,
      orientation: 'horizontal',
      page: 1,
      perPage: Math.min(14, Number(options.perPage) || 8),
      fetchImpl: options.fetchImpl ?? globalThis.fetch
    });
    cache.set(key, result);
    return result;
  } catch (error) {
    report.errors.push({provider, type, query, error: error instanceof Error ? error.message : String(error)});
    const empty = {assets: []};
    cache.set(key, empty);
    return empty;
  }
}

function candidateFromArchiveAsset(scene, anchor, query, provider, type, asset, anchors) {
  const text = assetText(asset);
  if (AI_GENERATED_RE.test(text)) return null;
  const anchorMatch = termMatch(anchor.query, text);
  const queryMatch = termMatch(query, text);
  const topicMatch = topicMatchRatio(anchors, text);
  if (Math.max(anchorMatch.ratio, queryMatch.ratio) < 0.2 && topicMatch < 0.2) return null;

  const mediaUrl = bestMediaUrl(asset?.files);
  if (!mediaUrl) return null;
  const providerId = String(asset?.provider_id ?? asset?.id ?? '').trim();
  const sourceUrl = String(asset?.source_url ?? '').trim();
  const title = String(asset?.title || `${provider} ${providerId || 'asset'}`).trim();
  const key = `${provider}:${providerId || stableKey(sourceUrl || mediaUrl)}`;
  const candidate = {
    key,
    provider,
    providerId: providerId || null,
    query,
    directionKind: `v6-${anchor.intent}`,
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
  candidate.identity = `${provider}|${providerId || stableKey(sourceUrl || mediaUrl)}`;
  candidate.motifKey = motifKey(title);
  candidate.familyKey = `${provider}|${normalize(candidate.creator)}|${candidate.motifKey}`;
  const documentary = documentaryCandidateScore(scene, candidate);
  candidate.scoreBreakdown = documentary;
  candidate.documentaryScore = documentary.score;

  const sceneYears = String(scene.originalText ?? '').match(/\b(?:19|20)\d{2}\b/g) ?? [];
  const yearMatch = sceneYears.some((year) => text.includes(year)) ? 1 : 0;
  const providerBonus = provider === 'wikimedia' ? 12 : provider === 'nasa' ? 10 : 0;
  const videoBonus = candidate.type === 'video' ? 2 : 0;
  const anchorBonus = Math.round(Math.max(anchorMatch.ratio, queryMatch.ratio) * 38);
  const topicBonus = Math.round(topicMatch * 22);
  const yearBonus = yearMatch ? 10 : 0;
  const intentBonus = anchor.intent === 'satellite' ? 6 : anchor.intent === 'map' ? 5 : 0;
  candidate.anchorMatch = Math.round(anchorMatch.ratio * 100);
  candidate.topicMatch = Math.round(topicMatch * 100);
  candidate.yearMatch = Boolean(yearMatch);
  candidate.directorScore = documentary.score + providerBonus + videoBonus;
  candidate.anchorRescueScore = Math.round((documentary.score + providerBonus + videoBonus + anchorBonus + topicBonus + yearBonus + intentBonus) * 10) / 10;
  if (candidate.anchorRescueScore < 44) return null;
  return candidate;
}

function selectFreshCandidates(values, usage, target) {
  const deduped = dedupeCandidates(values)
    .filter((candidate) => (usage.identities.get(candidate.identity) ?? 0) === 0)
    .sort(compareCandidates);
  if (!deduped.length) return [];

  const best = deduped[0];
  const bestWikimedia = deduped.find((candidate) => candidate.provider === 'wikimedia');
  const preferred = bestWikimedia && bestWikimedia.anchorRescueScore >= best.anchorRescueScore - 8 ? bestWikimedia : best;
  const selected = [preferred];
  for (const candidate of deduped) {
    if (selected.length >= target) break;
    if (candidate.identity === preferred.identity) continue;
    if (candidate.familyKey && selected.some((item) => item.familyKey === candidate.familyKey)) continue;
    selected.push(candidate);
  }
  return selected;
}

function compareCandidates(a, b) {
  if (b.anchorRescueScore !== a.anchorRescueScore) return b.anchorRescueScore - a.anchorRescueScore;
  if (a.provider === 'wikimedia' && b.provider !== 'wikimedia') return -1;
  if (b.provider === 'wikimedia' && a.provider !== 'wikimedia') return 1;
  return b.documentaryScore - a.documentaryScore;
}

function selectContinuityEvidence(scene, chosenAnchors, pool, usage) {
  const sequence = Number(scene.sequence) || 0;
  const ranked = [];
  for (const item of pool) {
    const distance = Math.abs(sequence - item.sequence);
    if (distance < 1 || distance > 3) continue;
    const used = usage.identities.get(item.candidate.identity) ?? 0;
    if (used >= 2) continue;
    if (!ARCHIVE_PROVIDERS.has(item.candidate.provider) && Number(item.candidate.scoreBreakdown?.lexicalMatch ?? 0) < 20) continue;
    const text = assetText(item.candidate.asset ?? item.candidate);
    const anchorFit = chosenAnchors.reduce((best, anchor) => Math.max(best, termMatch(anchor.query, text).ratio), 0);
    if (chosenAnchors.length && anchorFit < 0.2) continue;
    const score = Number(item.candidate.anchorRescueScore ?? item.candidate.qualityGateScore ?? item.candidate.directorScore ?? 0) + anchorFit * 25 - distance * 4;
    if (score < 48) continue;
    ranked.push({...item, continuityScore: score});
  }
  ranked.sort((a, b) => b.continuityScore - a.continuityScore);
  return ranked[0] ?? null;
}

function buildEvidencePool(scenes, anchors) {
  const pool = [];
  for (const scene of scenes) {
    for (const shot of scene.recommendedShots ?? []) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      if (AI_GENERATED_RE.test(assetText(candidate.asset ?? candidate))) continue;
      if (ARCHIVE_PROVIDERS.has(candidate.provider) || Number(candidate.scoreBreakdown?.lexicalMatch ?? 0) >= 20) {
        pool.push(poolEntry(scene, candidate, anchors));
      }
    }
  }
  return pool;
}

function poolEntry(scene, candidate) {
  return {sceneId: scene.sceneId, sequence: Number(scene.sequence) || 0, candidate};
}

function buildUsage(scenes) {
  const identities = new Map();
  for (const scene of scenes) {
    for (const shot of scene.recommendedShots ?? []) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      incrementUsage({identities}, candidate);
    }
  }
  return {identities};
}

function incrementUsage(usage, candidate) {
  const identity = candidate.identity || `${candidate.provider}|${candidate.providerId || candidate.key}`;
  usage.identities.set(identity, (usage.identities.get(identity) ?? 0) + 1);
}

function assignCandidates(scene, candidates, strategy, extra = {}) {
  const map = new Map((scene.candidates ?? []).map((candidate) => [candidate.key, candidate]));
  for (const candidate of candidates) map.set(candidate.key, candidate);
  scene.candidates = [...map.values()];
  scene.recommendedShots = candidates.map((candidate, index) => ({
    shotId: `SHOT-${String(index + 1).padStart(2, '0')}`,
    candidateKey: candidate.key,
    role: candidate.anchorIntent === 'broll' ? 'broll-primary' : 'evidence-primary',
    mediaType: candidate.type === 'video' ? 'video' : 'image',
    provider: candidate.provider,
    familyKey: candidate.familyKey,
    motifKey: candidate.motifKey,
    documentaryScore: candidate.documentaryScore,
    directorScore: candidate.directorScore,
    qualityGateScore: candidate.anchorRescueScore ?? candidate.qualityGateScore,
    anchorQuery: candidate.anchorQuery ?? null,
    anchorIntent: candidate.anchorIntent ?? null,
    anchorMatched: Boolean(candidate.anchorMatched),
    continuityReuse: Boolean(candidate.continuityReuse),
    evidenceLevel: scene.documentary?.evidenceLevel ?? 'contextual'
  }));
  scene.recommendedPrimary = scene.recommendedShots[0]?.candidateKey ?? null;
  scene.recommendedAlternatives = [];
  scene.research = {
    ...scene.research,
    strategy,
    qualityGate: {...(scene.research?.qualityGate ?? {}), status: 'accepted-v6', selectedShots: candidates.length},
    v6Rescue: {
      status: candidateStatus(candidates),
      selected: candidates.map((candidate) => ({key: candidate.key, provider: candidate.provider, title: candidate.title, score: candidate.anchorRescueScore ?? candidate.qualityGateScore ?? null})),
      ...extra
    }
  };
}

function candidateStatus(candidates) {
  return candidates.some((candidate) => candidate.continuityReuse) ? 'controlled-continuity' : 'scene-aware-archive-rescue';
}

function dedupeCandidates(values) {
  const map = new Map();
  for (const candidate of values) {
    const prior = map.get(candidate.identity);
    if (!prior || candidate.anchorRescueScore > prior.anchorRescueScore) map.set(candidate.identity, candidate);
  }
  return [...map.values()];
}

function topicMatchRatio(anchors, haystack) {
  if (!anchors.length) return 0;
  const core = [...new Set(anchors.slice(0, 5).flatMap((anchor) => meaningfulQueryTerms(anchor.query)))];
  if (!core.length) return 0;
  const matched = core.filter((term) => haystack.includes(term));
  return matched.length / Math.min(core.length, 10);
}

function termMatch(query, haystack) {
  const terms = meaningfulQueryTerms(query);
  if (!terms.length) return {ratio: 0, matched: []};
  const matched = terms.filter((term) => haystack.includes(term));
  return {ratio: matched.length / terms.length, matched};
}

function meaningfulQueryTerms(value) {
  return [...new Set(normalize(value).split(/\s+/).filter((term) => term.length >= 4 && !QUERY_STOP.has(term)))].slice(0, 10);
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

function summarize(scenes) {
  const providerUsage = {};
  let totalShots = 0;
  let videoShots = 0;
  let blockedScenes = 0;
  let coveredScenes = 0;
  for (const scene of scenes) {
    const shots = scene.recommendedShots ?? [];
    if (shots.length) coveredScenes += 1;
    else blockedScenes += 1;
    for (const shot of shots) {
      totalShots += 1;
      if (shot.mediaType === 'video') videoShots += 1;
      providerUsage[shot.provider] = (providerUsage[shot.provider] ?? 0) + 1;
    }
  }
  return {totalShots, videoShots, imageShots: totalShots - videoShots, blockedScenes, coveredScenes, providerUsage};
}

function countUniqueAssets(scenes) {
  const set = new Set();
  for (const scene of scenes) {
    for (const shot of scene.recommendedShots ?? []) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
      if (candidate) set.add(candidate.identity || `${candidate.provider}|${candidate.providerId || candidate.key}`);
    }
  }
  return set.size;
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
  const rows = [['scene','role','provider','creator','source_url','license','review_status','quality_gate_score','anchor_query','continuity_reuse']];
  for (const scene of scenes) {
    for (const [index, shot] of (scene.recommendedShots ?? []).entries()) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      lines.push(`${scene.sceneId} | shot-${index + 1} | ${candidate.provider} | ${candidate.title} | ${candidate.sourceUrl || 'keine Quelle'}`);
      rows.push([scene.sceneId, `shot-${index + 1}`, candidate.provider, candidate.creator || '', candidate.sourceUrl || '', candidate.license || 'provider-policy-check-required', candidate.reviewStatus || 'review-required', candidate.anchorRescueScore ?? candidate.qualityGateScore ?? '', candidate.anchorQuery ?? '', shot.continuityReuse ? 'yes' : 'no']);
    }
  }
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'sources.txt'), `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'licenses.csv'), `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');
}

function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function stableKey(value) { let hash = 2166136261; for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); }
function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function normalize(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
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
    const result = await researchDocumentaryProjectV6(parseArgs(process.argv.slice(2)));
    process.stdout.write(`V6 Shots: ${result.summary.totalShots} (${result.summary.videoShots} Video / ${result.summary.imageShots} Bild)\n`);
    process.stdout.write(`Abgedeckte Szenen: ${result.summary.coveredScenes}\n`);
    process.stdout.write(`Eindeutige Assets: ${result.summary.uniqueSelectedAssets}\n`);
    process.stdout.write(`Noch blockierte Szenen: ${result.summary.qualityBlockedScenes}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
