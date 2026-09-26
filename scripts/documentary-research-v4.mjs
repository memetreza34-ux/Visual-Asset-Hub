import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {researchDocumentaryProjectV3} from './documentary-research-v3.mjs';
import {searchNasa} from './lib/nasa-media.mjs';
import {searchWikimedia} from './lib/wikimedia.mjs';
import {searchLibraryOfCongress} from './lib/loc-media.mjs';
import {documentaryCandidateScore} from './lib/documentary-source-router.mjs';

const EVIDENCE_LEVELS = new Set(['exact-event-or-era', 'exact-entity', 'exact-place']);
const ARCHIVE_PROVIDERS = new Set(['nasa', 'wikimedia', 'loc', 'openverse']);
const STOCK_PROVIDERS = new Set(['pexels', 'pixabay', 'unsplash']);
const DEFAULT_MAX_GLOBAL_VIDEO_SHARE = 0.72;

/**
 * V4 is a strict editorial quality gate on top of V3.
 * It fixes the real-test failure mode where weak stock B-roll won merely because it was video.
 * A missing good visual is preferable to a visibly wrong visual.
 */
export async function researchDocumentaryProjectV4(options = {}) {
  const base = await researchDocumentaryProjectV3(options);
  const scenePlan = base.scenePlan;
  const summary = {
    ...base.summary,
    version: 4,
    director: 'multi-shot-v4-evidence-first-quality-gate',
    qualityBlockedScenes: 0,
    supplementalArchiveSearches: 0,
    supplementalArchiveCandidates: 0,
    selectedProviderUsage: {},
    totalShots: 0,
    videoShots: 0,
    imageShots: 0
  };
  const state = {
    providerCounts: new Map(),
    selectedIdentities: new Set(),
    familyKeys: new Set(),
    totalShots: 0,
    videoShots: 0
  };

  for (const scene of scenePlan.scenes) {
    const evidenceLevel = scene.documentary?.evidenceLevel || 'contextual';
    const needsSupplement = EVIDENCE_LEVELS.has(evidenceLevel) || bestEffectiveScore(scene.candidates) < 52;
    if (needsSupplement) {
      const extra = await supplementalArchiveSearch(scene, options);
      summary.supplementalArchiveSearches += extra.searches;
      summary.supplementalArchiveCandidates += extra.candidates.length;
      scene.candidates = mergeCandidates(scene, scene.candidates ?? [], extra.candidates);
      if (extra.errors.length) {
        scene.research = {...scene.research, supplementalArchiveErrors: extra.errors};
      }
    }

    const ranked = [...(scene.candidates ?? [])]
      .filter((candidate) => candidate?.mediaUrl)
      .map((candidate) => ({...candidate, qualityGateScore: qualityGateScore(scene, candidate, state)}))
      .sort((a, b) => b.qualityGateScore - a.qualityGateScore || effectiveScore(b) - effectiveScore(a));

    const targetCount = Math.max(1, Number(scene.research?.shotTarget) || scene.recommendedShots?.length || 1);
    const eligible = ranked.filter((candidate) => passesQualityGate(scene, candidate));
    const selected = selectQualityShots(scene, eligible, targetCount, state);

    scene.candidates = ranked;
    scene.recommendedShots = selected.map((candidate, index) => ({
      shotId: `SHOT-${String(index + 1).padStart(2, '0')}`,
      candidateKey: candidate.key,
      role: shotRole(scene, candidate, index),
      mediaType: candidate.type === 'video' ? 'video' : 'image',
      provider: candidate.provider,
      familyKey: candidate.familyKey ?? null,
      motifKey: candidate.motifKey ?? null,
      documentaryScore: candidate.documentaryScore,
      directorScore: candidate.directorScore,
      qualityGateScore: candidate.qualityGateScore,
      visionScore: candidate.vision?.visibleRelevance ?? null,
      visionExactness: candidate.vision?.exactness ?? null,
      evidenceLevel
    }));
    scene.recommendedPrimary = scene.recommendedShots[0]?.candidateKey ?? null;
    const selectedKeys = new Set(scene.recommendedShots.map((shot) => shot.candidateKey));
    scene.recommendedAlternatives = ranked
      .filter((candidate) => !selectedKeys.has(candidate.key) && passesQualityGate(scene, candidate))
      .slice(0, options.alternatives ?? 4)
      .map((candidate) => candidate.key);

    const blocked = scene.recommendedShots.length === 0;
    if (blocked) summary.qualityBlockedScenes += 1;
    scene.research = {
      ...scene.research,
      strategy: 'multi-shot-v4-evidence-first-quality-gate',
      qualityGate: {
        status: blocked ? 'blocked-no-reliable-visual' : 'passed',
        eligibleCandidates: eligible.length,
        rejectedCandidates: Math.max(0, ranked.length - eligible.length),
        selectedShots: scene.recommendedShots.length,
        rule: 'wrong-visual-is-worse-than-missing-visual'
      },
      selectedVideoShots: scene.recommendedShots.filter((shot) => shot.mediaType === 'video').length
    };

    registerSelected(scene, selected, state);
    writeSceneResearchFile(options.projectDirectory, scene);
  }

  summary.totalShots = state.totalShots;
  summary.videoShots = state.videoShots;
  summary.imageShots = state.totalShots - state.videoShots;
  for (const [provider, count] of state.providerCounts) summary.selectedProviderUsage[provider] = count;
  summary.videoShare = state.totalShots ? Number((state.videoShots / state.totalShots).toFixed(3)) : 0;
  summary.scenesWithRecommendation = scenePlan.scenes.filter((scene) => scene.recommendedPrimary).length;

  scenePlan.researchDirector = {
    ...(scenePlan.researchDirector ?? {}),
    version: 4,
    strategy: 'evidence-first-quality-gate-balanced-media',
    totalShots: summary.totalShots,
    videoShots: summary.videoShots,
    imageShots: summary.imageShots,
    qualityBlockedScenes: summary.qualityBlockedScenes
  };

  const root = path.resolve(options.projectDirectory);
  writeJson(path.join(root, '05-PROJECT', 'scenes.json'), scenePlan);
  writeJson(path.join(root, '05-PROJECT', 'research-summary.json'), summary);
  rewriteSources(root, scenePlan.scenes);
  return {scenePlan, summary};
}

async function supplementalArchiveSearch(scene, options) {
  const queries = uniqueStrings([
    ...(scene.queries ?? []),
    ...(scene.entities ?? []),
    scene.visualIntent,
    scene.originalText
  ]).slice(0, 2);
  const evidence = scene.documentary?.evidenceLevel || 'contextual';
  const sceneText = normalize([scene.originalText, scene.visualIntent, ...(scene.entities ?? [])].join(' '));
  const providers = [];
  if (/\b(nasa|space|raumfahrt|satellit|satellite|klima|climate|erde|earth|aral|see|lake|meer)\b/.test(sceneText)) providers.push(['nasa', searchNasa]);
  providers.push(['wikimedia', searchWikimedia]);
  if (EVIDENCE_LEVELS.has(evidence)) providers.push(['loc', searchLibraryOfCongress]);

  const candidates = [];
  const errors = [];
  let searches = 0;
  const seen = new Set();
  for (const query of queries) {
    for (const [provider, search] of providers) {
      for (const type of ['photo', 'video']) {
        if (searches >= 8) break;
        searches += 1;
        try {
          const result = await search({query, type, orientation: 'horizontal', page: 1, perPage: Math.min(8, options.perPage || 8), fetchImpl: options.fetchImpl ?? globalThis.fetch});
          for (const asset of result.assets ?? []) {
            const candidate = normalizeSupplementalCandidate(scene, provider, query, type, asset);
            if (!candidate.mediaUrl || seen.has(candidate.key)) continue;
            seen.add(candidate.key);
            candidates.push(candidate);
          }
        } catch (error) {
          errors.push({provider, query, type, error: error instanceof Error ? error.message : String(error)});
        }
      }
    }
  }
  return {candidates, errors, searches};
}

function normalizeSupplementalCandidate(scene, provider, query, type, asset) {
  const providerId = String(asset?.provider_id ?? asset?.id ?? '').trim();
  const sourceUrl = String(asset?.source_url ?? '').trim();
  const mediaUrl = bestMediaUrl(asset?.files);
  const title = String(asset?.title || `${provider} ${providerId || 'asset'}`).trim();
  const key = `${provider}:${providerId || stableKey(sourceUrl || mediaUrl)}`;
  const candidate = {
    key,
    provider,
    providerId: providerId || null,
    query,
    directionKind: 'supplemental-evidence',
    title,
    type: asset?.type === 'video' || type === 'video' ? 'video' : 'image',
    width: finiteOrNull(asset?.width),
    height: finiteOrNull(asset?.height),
    durationSeconds: finiteOrNull(asset?.duration_seconds),
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
  candidate.familyKey = `${provider}|${normalize(candidate.creator)}|${motifKey(title)}`;
  candidate.motifKey = motifKey(title);
  const score = documentaryCandidateScore(scene, candidate);
  candidate.scoreBreakdown = score;
  candidate.documentaryScore = score.score;
  const sourceBonus = ARCHIVE_PROVIDERS.has(provider) ? 8 : 0;
  candidate.directorScore = Math.max(0, score.score + sourceBonus + (candidate.type === 'video' ? 2 : 0));
  return candidate;
}

function mergeCandidates(scene, existing, extra) {
  const map = new Map();
  for (const candidate of [...existing, ...extra]) {
    if (!candidate?.key) continue;
    const prior = map.get(candidate.key);
    if (!prior || effectiveScore(candidate) > effectiveScore(prior)) map.set(candidate.key, candidate);
  }
  return [...map.values()].sort((a, b) => qualityGateScore(scene, b, null) - qualityGateScore(scene, a, null));
}

function passesQualityGate(scene, candidate) {
  if (!candidate?.mediaUrl) return false;
  const evidence = scene.documentary?.evidenceLevel || 'contextual';
  const score = Number(candidate.documentaryScore || 0);
  const lexical = Number(candidate.scoreBreakdown?.lexicalMatch || 0);
  const exactEntity = candidate.scoreBreakdown?.exactEntityMatch === true;
  const exactYear = candidate.scoreBreakdown?.exactYearMatch === true;
  const provider = String(candidate.provider || '').toLowerCase();

  if (candidate.vision) {
    if (candidate.vision.exactness === 'mismatch' || Number(candidate.vision.visibleRelevance || 0) < 60) return false;
    if (EVIDENCE_LEVELS.has(evidence) && candidate.vision.exactness === 'symbolic') return false;
    return true;
  }

  if (EVIDENCE_LEVELS.has(evidence)) {
    if (ARCHIVE_PROVIDERS.has(provider)) return score >= 44 && (exactEntity || exactYear || lexical >= 12);
    return score >= 52 && lexical >= 24;
  }
  if (evidence === 'symbolic') return score >= 36;
  if (ARCHIVE_PROVIDERS.has(provider)) return score >= 42 && (lexical >= 8 || exactEntity || exactYear);
  return score >= 42 && lexical >= 10;
}

function qualityGateScore(scene, candidate, state) {
  if (!candidate) return -999;
  const evidence = scene.documentary?.evidenceLevel || 'contextual';
  const provider = String(candidate.provider || '').toLowerCase();
  let score = effectiveScore(candidate);
  if (candidate.vision) score += Number(candidate.vision.visibleRelevance || 0) * 0.15;
  if (EVIDENCE_LEVELS.has(evidence)) {
    if (ARCHIVE_PROVIDERS.has(provider)) score += 16;
    if (STOCK_PROVIDERS.has(provider)) score -= 12;
    if (candidate.scoreBreakdown?.exactEntityMatch) score += 10;
    if (candidate.scoreBreakdown?.exactYearMatch) score += 8;
  } else if (candidate.type === 'video') {
    score += 4;
  }
  if (state) {
    const providerCount = state.providerCounts.get(provider) ?? 0;
    score -= Math.min(18, providerCount * 1.5);
    if (provider === 'pexels' && state.totalShots >= 6 && providerCount / Math.max(1, state.totalShots) > 0.58) score -= 14;
    const currentVideoShare = state.totalShots ? state.videoShots / state.totalShots : 0;
    if (candidate.type === 'video' && currentVideoShare > DEFAULT_MAX_GLOBAL_VIDEO_SHARE) score -= 14;
    if (candidate.type !== 'video' && currentVideoShare > DEFAULT_MAX_GLOBAL_VIDEO_SHARE) score += 8;
  }
  return Math.round(score * 10) / 10;
}

function selectQualityShots(scene, candidates, count, state) {
  const selected = [];
  const localProviders = new Map();
  const localFamilies = new Set();
  const localDuplicateGroups = new Set();
  const pool = candidates
    .filter((candidate) => !state.selectedIdentities.has(candidate.identity || candidate.key))
    .sort((a, b) => qualityGateScore(scene, b, state) - qualityGateScore(scene, a, state));

  while (selected.length < count) {
    const next = pool.find((candidate) => {
      if (selected.some((item) => item.key === candidate.key)) return false;
      if (candidate.familyKey && (state.familyKeys.has(candidate.familyKey) || localFamilies.has(candidate.familyKey))) return false;
      const duplicateGroup = candidate.vision?.duplicateGroup || '';
      if (duplicateGroup && localDuplicateGroups.has(duplicateGroup)) return false;
      if ((localProviders.get(candidate.provider) ?? 0) >= 1 && selected.length < 2) return false;
      return true;
    });
    if (!next) break;
    selected.push(next);
    localProviders.set(next.provider, (localProviders.get(next.provider) ?? 0) + 1);
    if (next.familyKey) localFamilies.add(next.familyKey);
    if (next.vision?.duplicateGroup) localDuplicateGroups.add(next.vision.duplicateGroup);
  }
  return selected;
}

function registerSelected(scene, selected, state) {
  for (const candidate of selected) {
    state.totalShots += 1;
    if (candidate.type === 'video') state.videoShots += 1;
    state.providerCounts.set(candidate.provider, (state.providerCounts.get(candidate.provider) ?? 0) + 1);
    state.selectedIdentities.add(candidate.identity || candidate.key);
    if (candidate.familyKey) state.familyKeys.add(candidate.familyKey);
  }
}

function shotRole(scene, candidate, index) {
  const evidence = scene.documentary?.evidenceLevel || 'contextual';
  if (EVIDENCE_LEVELS.has(evidence) || candidate.type !== 'video') return index === 0 ? 'evidence-primary' : 'evidence-support';
  return index === 0 ? 'broll-primary' : 'broll-support';
}

function bestEffectiveScore(candidates = []) {
  return candidates.reduce((best, candidate) => Math.max(best, effectiveScore(candidate)), 0);
}

function effectiveScore(candidate) {
  return Number.isFinite(Number(candidate?.visionDirectorScore)) ? Number(candidate.visionDirectorScore) : Number(candidate?.directorScore || 0);
}

function technicalFit(asset, type) {
  const width = Number(asset?.width) || 0;
  const height = Number(asset?.height) || 0;
  let score = 0;
  if (width > height) score += 30;
  const shortSide = width && height ? Math.min(width, height) : 0;
  if (shortSide >= 1080) score += 30;
  else if (shortSide >= 720) score += 22;
  else if (shortSide >= 480) score += 12;
  if (asset?.source_url) score += 10;
  if (asset?.preview_url) score += 10;
  if (type === 'video') score += 8;
  return Math.min(100, score);
}

function bestMediaUrl(files) {
  if (Array.isArray(files)) return files.filter((item) => item?.url).sort((a, b) => (Number(b.width)||0)*(Number(b.height)||0) - (Number(a.width)||0)*(Number(a.height)||0))[0]?.url ?? '';
  if (!files || typeof files !== 'object') return '';
  for (const key of ['original', 'large', 'full', 'regular', 'medium', 'small']) {
    const value = files[key];
    if (typeof value === 'string' && value) return value;
    if (value?.url) return value.url;
  }
  return '';
}

function motifKey(value) {
  const stop = new Set(['the','and','for','with','from','this','that','video','photo','image','footage','archive','archival','documentary','historical','historisch','aufnahme']);
  return normalize(value).split(/\s+/).filter((word) => word.length >= 4 && !stop.has(word)).slice(0, 5).sort().join('-') || stableKey(value);
}

function normalize(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function stableKey(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}

function finiteOrNull(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function uniqueStrings(values) { return [...new Set(values.map((value) => String(value ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean))]; }

function writeSceneResearchFile(projectDirectory, scene) {
  if (!projectDirectory) return;
  const sceneDir = path.join(path.resolve(projectDirectory), '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, {recursive: true});
  writeJson(path.join(sceneDir, '00-research.json'), {sceneId: scene.sceneId, originalText: scene.originalText, visualIntent: scene.visualIntent, documentary: scene.documentary, research: scene.research, recommendedPrimary: scene.recommendedPrimary, recommendedShots: scene.recommendedShots, recommendedAlternatives: scene.recommendedAlternatives, candidates: scene.candidates});
}

function rewriteSources(projectDirectory, scenes) {
  const lines = [];
  const rows = [['scene','role','provider','creator','source_url','license','review_status','quality_gate_score','vision_score']];
  for (const scene of scenes) {
    for (const [index, shot] of (scene.recommendedShots ?? []).entries()) {
      const candidate = scene.candidates?.find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      lines.push(`${scene.sceneId} | shot-${index + 1} | ${candidate.provider} | ${candidate.title} | ${candidate.sourceUrl || 'keine Quelle'}`);
      rows.push([scene.sceneId, `shot-${index + 1}`, candidate.provider, candidate.creator || '', candidate.sourceUrl || '', candidate.license || 'provider-policy-check-required', candidate.reviewStatus || 'review-required', candidate.qualityGateScore ?? '', candidate.vision?.visibleRelevance ?? '']);
    }
  }
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'sources.txt'), `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'licenses.csv'), `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');
}

function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

function parseArgs(argv) {
  const args = {projectDirectory: '', visionCandidates: 6};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--vision-candidates') args.visionCandidates = Number(argv[++index]);
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const result = await researchDocumentaryProjectV4(parseArgs(process.argv.slice(2)));
    process.stdout.write(`V4 Shots: ${result.summary.totalShots} (${result.summary.videoShots} Video / ${result.summary.imageShots} Bild)\n`);
    process.stdout.write(`Quality-blocked Szenen: ${result.summary.qualityBlockedScenes}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
