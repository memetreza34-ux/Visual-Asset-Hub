import fs from 'node:fs';
import path from 'node:path';
import {researchDocumentaryProjectV6} from './documentary-research-v6.mjs';

const ARCHIVE_PROVIDERS = new Set(['wikimedia', 'openverse', 'loc']);
const TERM_STOP = new Set([
  'the','and','for','with','from','into','sea','lake','river','archive','historical','historic','documentary','footage','photo','video','image',
  'satellite','earth','nasa','central','comparison','view','views','map','maps','north','south','east','west',
  'und','der','die','das','ein','eine','einer','eines','mit','von','auf','aus','zum','zur','den','dem','des','see','fluss','bild','bilder','video'
]);
const INTEGRITY_RISK_RE = /pieced together.{0,120}(photoshop|gimp)|using adobe photoshop|created in adobe photoshop|photomontage|photo montage|digitally composited|digital composite|artist.?s impression|artist.?s conception/i;

/**
 * V7 is a conservative evidence gate on top of V6.
 * Archive media must have either explicit rescue-anchor evidence or a direct
 * lexical link to the spoken scene. Generic compilation videos and explicitly
 * manipulated/composited archive evidence are not allowed as primary shots.
 * V7 removes questionable media instead of inventing a replacement.
 */
export async function researchDocumentaryProjectV7(options = {}) {
  const base = await researchDocumentaryProjectV6(options);
  const scenePlan = base.scenePlan;
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
      const reason = archiveRejectionReason(candidate);
      if (!reason) {
        kept.push(shot);
        continue;
      }
      report.archivePrunedForIrrelevance += 1;
      report.removed.push({
        sceneId: scene.sceneId,
        candidateKey: candidate.key,
        provider: candidate.provider,
        mediaType: candidate.type ?? null,
        title: candidate.title ?? '',
        sourceUrl: candidate.sourceUrl ?? '',
        lexicalMatch: Number(candidate.scoreBreakdown?.lexicalMatch ?? 0),
        anchorQuery: candidate.anchorQuery ?? null,
        anchorMatch: candidate.anchorMatch ?? null,
        reason
      });
    }

    scene.recommendedShots = kept;
    scene.recommendedPrimary = kept[0]?.candidateKey ?? null;
    if (!kept.length && original.length) {
      scene.research = {
        ...scene.research,
        strategy: 'multi-shot-v7-archive-evidence-gate',
        qualityGate: {
          ...(scene.research?.qualityGate ?? {}),
          status: 'blocked-irrelevant-archive'
        },
        v7ArchiveGate: {
          status: 'pruned-irrelevant-archive',
          removed: original.length
        }
      };
    } else if (kept.length < original.length) {
      scene.research = {
        ...scene.research,
        v7ArchiveGate: {
          status: 'pruned-partial',
          removed: original.length - kept.length
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

function archiveRejectionReason(candidate) {
  if (!ARCHIVE_PROVIDERS.has(candidate.provider)) return null;

  const rawText = [
    candidate.title,
    candidate.asset?.title,
    candidate.asset?.description,
    candidate.description
  ].filter(Boolean).join(' ');
  if (INTEGRITY_RISK_RE.test(rawText)) return 'archive-manipulated-or-composited-evidence';

  const lexicalMatch = Number(candidate.scoreBreakdown?.lexicalMatch ?? 0);
  const hasAnchorEvidence = Boolean(candidate.anchorQuery) && Number(candidate.anchorMatch ?? 0) >= 20;

  // No archive asset is trusted merely because generic topic words happen to
  // occur in a long description. It needs an explicit anchor or scene match.
  if (!hasAnchorEvidence && lexicalMatch < 6) return 'archive-without-anchor-or-lexical-evidence';

  // Wikimedia compilation videos can mention the topic in a very long list
  // while the actual file contains many unrelated segments. For video, demand
  // a direct anchor token in the file/source identity unless scene lexical
  // evidence is strong enough to justify manual use of a segment.
  if (candidate.provider === 'wikimedia' && candidate.type === 'video' && hasAnchorEvidence) {
    const anchorTerms = meaningfulTerms(candidate.anchorQuery);
    const sourceIdentity = normalize(candidate.sourceUrl || candidate.asset?.source_url || candidate.asset?.sourceUrl || '');
    const sourceMatchesAnchor = anchorTerms.length === 0 || anchorTerms.some((term) => sourceIdentity.includes(term));
    if (!sourceMatchesAnchor && lexicalMatch < 12) return 'archive-compilation-video-without-direct-anchor';
  }

  return null;
}

function meaningfulTerms(value) {
  return normalize(value)
    .split(/\s+/)
    .filter((term) => term.length >= 4 && !TERM_STOP.has(term));
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
