import fs from 'node:fs';
import path from 'node:path';
import {researchDocumentaryProjectV6} from './documentary-research-v6.mjs';

const ARCHIVE_PROVIDERS = new Set(['wikimedia', 'openverse', 'loc']);
const TERM_STOP = new Set([
  'the','and','for','with','from','into','sea','lake','river','archive','historical','documentary','footage','photo','video','image',
  'und','der','die','das','ein','eine','einer','eines','mit','von','auf','aus','zum','zur','den','dem','des','see','fluss','bild','bilder','video'
]);

/**
 * V7 is a conservative post-gate on top of V6.
 * It does not invent replacement visuals. It removes archive selections that
 * slipped through earlier ranking despite having neither V6 anchor evidence,
 * lexical scene evidence nor a real topic-term match. V6 rescue selections
 * already carry anchorQuery/anchorMatch and remain untouched.
 */
export async function researchDocumentaryProjectV7(options = {}) {
  const base = await researchDocumentaryProjectV6(options);
  const scenePlan = base.scenePlan;
  const anchors = normalizeAnchors(options.visualSearchAnchors ?? []);
  const topicTerms = buildTopicTerms(anchors);
  const report = {
    format: 'visual-asset-hub-documentary-v7-archive-relevance',
    version: 7,
    generatedAt: new Date().toISOString(),
    archivePrunedForIrrelevance: 0,
    removed: []
  };

  for (const scene of scenePlan.scenes ?? []) {
    const original = Array.isArray(scene.recommendedShots) ? scene.recommendedShots : [];
    const kept = [];
    for (const shot of original) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      if (!shouldRejectArchiveCandidate(candidate, topicTerms)) {
        kept.push(shot);
        continue;
      }
      report.archivePrunedForIrrelevance += 1;
      report.removed.push({
        sceneId: scene.sceneId,
        candidateKey: candidate.key,
        provider: candidate.provider,
        title: candidate.title ?? '',
        lexicalMatch: Number(candidate.scoreBreakdown?.lexicalMatch ?? 0),
        reason: 'archive-without-anchor-lexical-or-topic-evidence'
      });
    }

    scene.recommendedShots = kept;
    scene.recommendedPrimary = kept[0]?.candidateKey ?? null;
    if (!kept.length && original.length) {
      scene.research = {
        ...scene.research,
        strategy: 'multi-shot-v7-archive-relevance-gate',
        qualityGate: {
          ...(scene.research?.qualityGate ?? {}),
          status: 'blocked-irrelevant-archive'
        },
        v7ArchiveGate: {
          status: 'pruned-irrelevant-archive',
          removed: original.length
        }
      };
    }
  }

  const stats = summarize(scenePlan.scenes ?? []);
  const summary = {
    ...base.summary,
    version: 7,
    director: 'multi-shot-v7-evidence-relevance-continuity',
    totalShots: stats.totalShots,
    videoShots: stats.videoShots,
    imageShots: stats.imageShots,
    videoShare: stats.totalShots ? Number((stats.videoShots / stats.totalShots).toFixed(3)) : 0,
    selectedProviderUsage: stats.providerUsage,
    coveredScenes: stats.coveredScenes,
    qualityBlockedScenes: stats.blockedScenes,
    uniqueSelectedAssets: countUniqueAssets(scenePlan.scenes ?? []),
    archivePrunedForIrrelevance: report.archivePrunedForIrrelevance
  };

  scenePlan.researchDirector = {
    ...(scenePlan.researchDirector ?? {}),
    version: 7,
    strategy: 'evidence-first-archive-relevance-controlled-continuity',
    totalShots: stats.totalShots,
    coveredScenes: stats.coveredScenes,
    qualityBlockedScenes: stats.blockedScenes,
    uniqueSelectedAssets: summary.uniqueSelectedAssets,
    archivePrunedForIrrelevance: report.archivePrunedForIrrelevance
  };

  const root = path.resolve(options.projectDirectory);
  writeJson(path.join(root, '05-PROJECT', 'scenes.json'), scenePlan);
  writeJson(path.join(root, '05-PROJECT', 'research-summary.json'), summary);
  writeJson(path.join(root, '05-PROJECT', 'archive-relevance-v7-report.json'), report);
  rewriteSources(root, scenePlan.scenes ?? []);
  return {scenePlan, summary, anchorRescue: base.anchorRescue, archiveRelevance: report};
}

function shouldRejectArchiveCandidate(candidate, topicTerms) {
  if (!ARCHIVE_PROVIDERS.has(candidate.provider)) return false;
  if (candidate.anchorQuery && Number(candidate.anchorMatch ?? 0) >= 20) return false;
  if (Number(candidate.scoreBreakdown?.lexicalMatch ?? 0) >= 6) return false;

  const text = normalize([
    candidate.title,
    candidate.asset?.title,
    candidate.asset?.description,
    candidate.description,
    candidate.query
  ].filter(Boolean).join(' '));
  const matchedTopicTerms = topicTerms.filter((term) => text.includes(term));
  return matchedTopicTerms.length === 0;
}

function buildTopicTerms(anchors) {
  const terms = new Set();
  for (const anchor of anchors) {
    for (const term of meaningfulTerms(anchor.query)) terms.add(term);
  }
  return [...terms];
}

function normalizeAnchors(values) {
  return values
    .map((value) => ({query: String(value?.query ?? '').trim()}))
    .filter((value) => value.query);
}

function meaningfulTerms(value) {
  return normalize(value)
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !TERM_STOP.has(term));
}

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarize(scenes) {
  let totalShots = 0;
  let videoShots = 0;
  let imageShots = 0;
  let coveredScenes = 0;
  let blockedScenes = 0;
  const providerUsage = {};
  for (const scene of scenes) {
    const shots = scene.recommendedShots ?? [];
    if (shots.length) coveredScenes += 1;
    else blockedScenes += 1;
    for (const shot of shots) {
      totalShots += 1;
      if (shot.mediaType === 'video') videoShots += 1;
      else imageShots += 1;
      providerUsage[shot.provider] = (providerUsage[shot.provider] ?? 0) + 1;
    }
  }
  return {totalShots, videoShots, imageShots, coveredScenes, blockedScenes, providerUsage};
}

function countUniqueAssets(scenes) {
  const identities = new Set();
  for (const scene of scenes) {
    for (const shot of scene.recommendedShots ?? []) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      identities.add(candidate.identity || `${candidate.provider}|${candidate.providerId || candidate.key}`);
    }
  }
  return identities.size;
}

function rewriteSources(projectDirectory, scenes) {
  const lines = [];
  const rows = [['scene','role','provider','creator','source_url','license','review_status','quality_gate_score','anchor_query','continuity_reuse']];
  for (const scene of scenes) {
    for (const [index, shot] of (scene.recommendedShots ?? []).entries()) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      lines.push(`${scene.sceneId} | shot-${index + 1} | ${candidate.provider} | ${candidate.title ?? ''} | ${candidate.sourceUrl || 'keine Quelle'}`);
      rows.push([
        scene.sceneId,
        `shot-${index + 1}`,
        candidate.provider,
        candidate.creator || '',
        candidate.sourceUrl || '',
        candidate.license || 'provider-policy-check-required',
        candidate.reviewStatus || 'review-required',
        candidate.anchorRescueScore ?? candidate.qualityGateScore ?? '',
        candidate.anchorQuery ?? '',
        shot.continuityReuse ? 'yes' : 'no'
      ]);
    }
  }
  const sourcesDir = path.join(projectDirectory, '04-SOURCES');
  fs.mkdirSync(sourcesDir, {recursive: true});
  fs.writeFileSync(path.join(sourcesDir, 'sources.txt'), `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
  fs.writeFileSync(path.join(sourcesDir, 'licenses.csv'), `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, 'utf8');
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
