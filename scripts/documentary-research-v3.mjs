import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {researchDocumentaryProjectV2} from './documentary-research-v2.mjs';
import {visionRerankCandidates} from './lib/documentary-vision-rerank.mjs';

export async function researchDocumentaryProjectV3(options = {}) {
  const base = await researchDocumentaryProjectV2(options);
  const scenePlan = base.scenePlan;
  const summary = {...base.summary, version: 3, director: 'multi-shot-v3-vision-verified', visionCheckedScenes: 0, visionFallbackScenes: 0, visionRejectedCandidates: 0};

  for (const scene of scenePlan.scenes) {
    const result = await visionRerankCandidates({
      scene,
      candidates: [...(scene.candidates ?? [])].sort((a, b) => Number(b.directorScore || 0) - Number(a.directorScore || 0)),
      apiKey: options.openaiApiKey,
      model: options.visionModel,
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
      maxCandidates: options.visionCandidates ?? 6
    });

    if (!result.applied) {
      summary.visionFallbackScenes += 1;
      scene.research = {...scene.research, visionGate: {applied: false, reason: result.reason}};
      continue;
    }

    summary.visionCheckedScenes += 1;
    for (const candidate of scene.candidates ?? []) {
      const vision = result.scores.get(candidate.key);
      if (!vision) continue;
      candidate.vision = vision;
      const mismatchPenalty = vision.exactness === 'mismatch' ? 45 : 0;
      const symbolicPenalty = vision.exactness === 'symbolic' && ['exact-event-or-era','exact-entity','exact-place'].includes(scene.documentary?.evidenceLevel) ? 18 : 0;
      candidate.visionDirectorScore = Math.max(0, Math.round(Number(candidate.directorScore || 0) * 0.55 + vision.visibleRelevance * 0.45 - mismatchPenalty - symbolicPenalty));
      if (vision.visibleRelevance < 55 || vision.exactness === 'mismatch') summary.visionRejectedCandidates += 1;
    }

    const ranked = [...(scene.candidates ?? [])].sort((a, b) => effectiveScore(b) - effectiveScore(a));
    const targetCount = Math.max(1, scene.recommendedShots?.length || 1);
    const selected = selectVisionVerifiedShots(scene, ranked, targetCount);
    if (selected.length) {
      scene.recommendedShots = selected.map((candidate, index) => ({
        shotId: `SHOT-${String(index + 1).padStart(2, '0')}`,
        candidateKey: candidate.key,
        role: candidate.type === 'video' ? (index === 0 ? 'broll-primary' : 'broll-support') : (index === 0 ? 'evidence-primary' : 'evidence-support'),
        mediaType: candidate.type === 'video' ? 'video' : 'image',
        provider: candidate.provider,
        familyKey: candidate.familyKey,
        motifKey: candidate.motifKey,
        documentaryScore: candidate.documentaryScore,
        directorScore: candidate.directorScore,
        visionScore: candidate.vision?.visibleRelevance ?? null,
        visionExactness: candidate.vision?.exactness ?? null
      }));
      scene.recommendedPrimary = scene.recommendedShots[0].candidateKey;
      const selectedKeys = new Set(scene.recommendedShots.map((shot) => shot.candidateKey));
      scene.recommendedAlternatives = ranked.filter((candidate) => !selectedKeys.has(candidate.key) && candidate.mediaUrl).slice(0, 4).map((candidate) => candidate.key);
    }
    scene.candidates = ranked;
    scene.research = {
      ...scene.research,
      visionGate: {applied: true, checked: result.checked, model: result.model, selectedAfterVision: scene.recommendedShots?.length ?? 0},
      selectedVideoShots: (scene.recommendedShots ?? []).filter((shot) => shot.mediaType === 'video').length
    };
    writeSceneResearchFile(options.projectDirectory, scene);
  }

  summary.totalShots = scenePlan.scenes.reduce((sum, scene) => sum + (scene.recommendedShots?.length ?? 0), 0);
  summary.videoShots = scenePlan.scenes.reduce((sum, scene) => sum + (scene.recommendedShots ?? []).filter((shot) => shot.mediaType === 'video').length, 0);
  summary.imageShots = summary.totalShots - summary.videoShots;
  scenePlan.researchDirector = {...scenePlan.researchDirector, version: 3, strategy: 'multi-shot-provider-balanced-diversity-ledger-plus-vision'};
  const root = path.resolve(options.projectDirectory);
  writeJson(path.join(root, '05-PROJECT', 'scenes.json'), scenePlan);
  writeJson(path.join(root, '05-PROJECT', 'research-summary.json'), summary);
  rewriteSources(root, scenePlan.scenes);
  return {scenePlan, summary};
}

function selectVisionVerifiedShots(scene, ranked, count) {
  const verified = ranked.filter((candidate) => candidate.mediaUrl && (!candidate.vision || (candidate.vision.visibleRelevance >= 55 && candidate.vision.exactness !== 'mismatch')));
  const selected = [];
  const duplicateGroups = new Set();
  const families = new Set();
  const providers = new Map();
  const preferred = String(scene.preferredMediaType ?? 'mixed').toLowerCase();

  if (preferred !== 'photo') {
    const video = verified.find((candidate) => candidate.type === 'video' && acceptable(candidate));
    if (video) push(video);
  }
  while (selected.length < count) {
    const next = verified.find((candidate) => !selected.some((item) => item.key === candidate.key) && acceptable(candidate));
    if (!next) break;
    push(next);
  }
  if (!selected.length) return ranked.filter((candidate) => candidate.mediaUrl).slice(0, 1);
  return selected;

  function acceptable(candidate) {
    const group = candidate.vision?.duplicateGroup || '';
    if (group && duplicateGroups.has(group)) return false;
    if (candidate.familyKey && families.has(candidate.familyKey)) return false;
    if ((providers.get(candidate.provider) ?? 0) >= 2) return false;
    return true;
  }
  function push(candidate) {
    selected.push(candidate);
    if (candidate.vision?.duplicateGroup) duplicateGroups.add(candidate.vision.duplicateGroup);
    if (candidate.familyKey) families.add(candidate.familyKey);
    providers.set(candidate.provider, (providers.get(candidate.provider) ?? 0) + 1);
  }
}

function effectiveScore(candidate) {
  return Number.isFinite(Number(candidate.visionDirectorScore)) ? Number(candidate.visionDirectorScore) : Number(candidate.directorScore || 0);
}

function writeSceneResearchFile(projectDirectory, scene) {
  if (!projectDirectory) return;
  const sceneDir = path.join(path.resolve(projectDirectory), '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, {recursive: true});
  writeJson(path.join(sceneDir, '00-research.json'), {sceneId: scene.sceneId, originalText: scene.originalText, visualIntent: scene.visualIntent, documentary: scene.documentary, research: scene.research, recommendedPrimary: scene.recommendedPrimary, recommendedShots: scene.recommendedShots, recommendedAlternatives: scene.recommendedAlternatives, candidates: scene.candidates});
}

function rewriteSources(projectDirectory, scenes) {
  const lines = [];
  const rows = [['scene','role','provider','creator','source_url','license','review_status','vision_score']];
  for (const scene of scenes) {
    for (const [index, shot] of (scene.recommendedShots ?? []).entries()) {
      const candidate = scene.candidates?.find((item) => item.key === shot.candidateKey);
      if (!candidate) continue;
      lines.push(`${scene.sceneId} | shot-${index + 1} | ${candidate.provider} | ${candidate.title} | ${candidate.sourceUrl || 'keine Quelle'}`);
      rows.push([scene.sceneId, `shot-${index + 1}`, candidate.provider, candidate.creator || '', candidate.sourceUrl || '', candidate.license || 'provider-policy-check-required', candidate.reviewStatus || 'review-required', candidate.vision?.visibleRelevance ?? '']);
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
    const result = await researchDocumentaryProjectV3(parseArgs(process.argv.slice(2)));
    process.stdout.write(`Vision-geprüfte Szenen: ${result.summary.visionCheckedScenes}\n`);
    process.stdout.write(`Fallback-Szenen: ${result.summary.visionFallbackScenes}\n`);
    process.stdout.write(`Shots: ${result.summary.totalShots} (${result.summary.videoShots} Video)\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
