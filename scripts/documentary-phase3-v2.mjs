import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {alignFinalScriptToTimings, anchorScenesToFinalScript, applyWordTimingsToScenes, sha256Text} from './lib/documentary-timing-aligner.mjs';

export async function buildDocumentaryPhase3V2({projectDirectory, wordTimingsFile, timingSource = 'external-word-timestamps'} = {}) {
  const projectDir = requireDirectory(projectDirectory);
  const scriptFile = path.join(projectDir, '01-SCRIPT', 'script.txt');
  const audioFile = path.join(projectDir, '02-AUDIO', 'voiceover.mp3');
  const scenesFile = path.join(projectDir, '05-PROJECT', 'scenes.json');
  const projectFile = path.join(projectDir, '05-PROJECT', 'project.json');
  requireFile(scriptFile, 'Finales Skript');
  requireFile(audioFile, 'Finales Voiceover');
  requireFile(scenesFile, 'Szenenplan');
  requireFile(projectFile, 'Projektdatei');

  const script = fs.readFileSync(scriptFile, 'utf8').trim();
  const scenePlan = readJson(scenesFile);
  const project = readJson(projectFile);
  const scriptSha256 = sha256Text(script);
  if (scenePlan.scriptSha256 && scenePlan.scriptSha256 !== scriptSha256) throw new Error('script.txt wurde nach Phase 1 verändert. Phase 1 muss neu erzeugt werden.');

  const timingInputFile = resolveTimingInput(projectDir, wordTimingsFile);
  const timingInput = readJson(timingInputFile);
  const aligned = alignFinalScriptToTimings(script, {...timingInput, source: timingInput.source ?? timingSource});
  const anchored = anchorScenesToFinalScript(script, scenePlan.scenes);
  const timedScenes = applyWordTimingsToScenes(anchored.scenes, aligned);
  const audioSha256 = await sha256File(audioFile);
  const audioStat = fs.statSync(audioFile);
  const generatedAt = new Date().toISOString();

  const wordTimings = {
    ...aligned,
    generatedAt,
    project: project.slug ?? path.basename(projectDir),
    audioPath: '02-AUDIO/voiceover.mp3',
    audioSha256,
    audioBytes: audioStat.size,
    timingInput: toProjectRelativeOrAbsolute(projectDir, timingInputFile),
    validity: {scriptSha256, audioSha256, invalidIfScriptChanges: true, invalidIfAudioChanges: true}
  };

  const timeline = buildTimelineV2({project, timedScenes, scriptSha256, audioSha256, durationSeconds: wordTimings.durationSeconds, generatedAt, projectDirectory: projectDir});
  const editPlan = buildEditPlanV2({project, timeline, generatedAt});
  const handoff = buildAntigravityHandoffV2({project, timeline, generatedAt, projectDirectory: projectDir});
  const out = path.join(projectDir, '05-PROJECT');
  writeJson(path.join(out, 'word-timings.json'), wordTimings);
  writeJson(path.join(out, 'timeline.json'), timeline);
  writeJson(path.join(out, 'edit-plan.json'), editPlan);
  writeJson(path.join(out, 'antigravity-handoff.json'), handoff);
  writeJson(scenesFile, {...scenePlan, timing: 'exact-final-voiceover-word-alignment', scriptSha256, audioSha256, phase3PreparedAt: generatedAt, scenes: timedScenes});

  const phase3State = {
    format: 'visual-asset-hub-documentary-phase3-state', version: 2, status: handoff.gates.canRender ? 'ready-for-editor' : 'blocked-missing-local-visuals', generatedAt,
    scriptSha256, audioSha256, timingSource: wordTimings.source, timingAlignment: wordTimings.alignment,
    sceneCount: timedScenes.length, shotCount: timeline.shotCount, durationSeconds: wordTimings.durationSeconds,
    missingLocalVisuals: handoff.gates.missingLocalVisuals,
    files: {script: '01-SCRIPT/script.txt', audio: '02-AUDIO/voiceover.mp3', scenes: '05-PROJECT/scenes.json', wordTimings: '05-PROJECT/word-timings.json', timeline: '05-PROJECT/timeline.json', editPlan: '05-PROJECT/edit-plan.json', antigravityHandoff: '05-PROJECT/antigravity-handoff.json', exportTarget: timeline.exportTarget}
  };
  writeJson(path.join(out, 'phase3-state.json'), phase3State);
  return {projectDirectory: projectDir, wordTimings, timeline, editPlan, handoff, phase3State};
}

export function buildTimelineV2({project, timedScenes, scriptSha256, audioSha256, durationSeconds, generatedAt, projectDirectory}) {
  const scenes = timedScenes.map((scene) => {
    const visualShots = localShotsForScene(scene);
    return {
      sceneId: scene.sceneId,
      sequence: scene.sequence,
      startSeconds: scene.startSeconds,
      endSeconds: scene.endSeconds,
      durationSeconds: scene.durationSeconds,
      scriptWordStart: scene.scriptWordStart,
      scriptWordEnd: scene.scriptWordEnd,
      startPhrase: scene.startPhrase,
      endWord: scene.endWord,
      speechSection: scene.speechSection,
      visualIntent: scene.visualIntent,
      visualPath: visualShots[0]?.visualPath ?? null,
      visualType: visualShots[0]?.visualType ?? null,
      visualShots,
      shotCount: visualShots.length,
      rightsStatus: visualShots.some((shot) => String(shot.rightsStatus).includes('review')) ? 'review-required' : (visualShots[0]?.rightsStatus ?? 'review-required'),
      edit: editDefaults(scene, visualShots[0])
    };
  });
  return {
    format: 'visual-asset-hub-documentary-timeline', version: 2, generatedAt, timingMode: 'exact-word-alignment-with-editorial-subshots',
    scriptSha256, audioSha256, durationSeconds, audio: '02-AUDIO/voiceover.mp3', exportTarget: nextFinalVideoPath(projectDirectory),
    sceneCount: scenes.length, shotCount: scenes.reduce((sum, scene) => sum + scene.shotCount, 0), scenes
  };
}

export function buildEditPlanV2({project, timeline, generatedAt}) {
  return {
    format: 'visual-asset-hub-documentary-edit-plan', version: 2, generatedAt, projectTitle: project.title ?? '',
    rules: {scriptIsLocked: true, audioIsLocked: true, doNotGuessSceneTimings: true, preserveTimelineBoundaries: true, allowEditorialShotChangesInsideLockedScene: true, targetShotLengthSeconds: [3.5, 7], missingVisualPolicy: 'stop-and-report', unreviewedRightsPolicy: 'flag-before-publication', imageMotion: 'subtle-documentary-pan-or-zoom', defaultTransition: 'cut', music: 'not-required-by-handoff'},
    scenes: timeline.scenes.map((scene) => ({
      sceneId: scene.sceneId, startSeconds: scene.startSeconds, endSeconds: scene.endSeconds, durationSeconds: scene.durationSeconds, speechSection: scene.speechSection,
      visualPath: scene.visualPath, visualType: scene.visualType, visualShots: scene.visualShots,
      shotTimingInstruction: 'Distribute selected shots inside this locked semantic scene. Do not move the semantic scene start/end.',
      motion: scene.edit.motion, transitionIn: scene.edit.transitionIn,
      notes: scene.visualShots.length ? [] : ['MISSING_LOCAL_VISUAL_SHOTS']
    }))
  };
}

export function buildAntigravityHandoffV2({project, timeline, generatedAt, projectDirectory}) {
  const missingVisuals = [];
  for (const scene of timeline.scenes) {
    if (!scene.visualShots.length) missingVisuals.push(`${scene.sceneId}:no-shots`);
    for (const shot of scene.visualShots) if (!localVisualExists(projectDirectory, shot.visualPath)) missingVisuals.push(`${scene.sceneId}:${shot.shotId}`);
  }
  return {
    format: 'visual-asset-hub-antigravity-handoff', version: 2, generatedAt, projectTitle: project.title ?? '', mode: 'technical-assembly-multi-shot',
    inputs: {script: '01-SCRIPT/script.txt', audio: '02-AUDIO/voiceover.mp3', visualsRoot: '03-VISUALS', sources: '04-SOURCES/sources.txt', licenses: '04-SOURCES/licenses.csv', wordTimings: '05-PROJECT/word-timings.json', timeline: '05-PROJECT/timeline.json', editPlan: '05-PROJECT/edit-plan.json'},
    gates: {exactTimingAlignmentRequired: true, scriptAndAudioHashesMustMatchPhase3State: true, allSemanticSceneBoundariesLocked: true, missingLocalVisuals: missingVisuals, canRender: missingVisuals.length === 0, publicationStillRequiresRightsReview: true},
    render: {aspectRatio: '16:9', width: 1920, height: 1080, fps: 30, audioPath: '02-AUDIO/voiceover.mp3', target: timeline.exportTarget, neverOverwriteExistingFinal: true, multiShot: true},
    youtubeExportFiles: {title: '06-EXPORT/youtube-title.txt', description: '06-EXPORT/youtube-description.txt', tags: '06-EXPORT/youtube-tags.txt', thumbnailText: '06-EXPORT/thumbnail-text.txt'},
    projectDirectory: path.resolve(projectDirectory)
  };
}

function localShotsForScene(scene) {
  const localShots = Array.isArray(scene.localShots) ? scene.localShots : [];
  if (localShots.length) return localShots.filter((shot) => shot?.relativePath).map((shot, index) => ({shotId: shot.shotId || `SHOT-${String(index + 1).padStart(2, '0')}`, visualPath: shot.relativePath, visualType: shot.mediaType || mediaTypeFromPath(shot.relativePath), provider: shot.provider || null, candidateKey: shot.candidateKey || null, role: shot.role || null, rightsStatus: shot.reviewStatus || 'review-required'}));
  if (scene.localPrimaryFile) return [{shotId: 'SHOT-01', visualPath: scene.localPrimaryFile, visualType: mediaTypeFromPath(scene.localPrimaryFile), provider: null, candidateKey: scene.recommendedPrimary ?? null, role: 'legacy-primary', rightsStatus: selectedRightsStatus(scene)}];
  return [];
}

function editDefaults(scene, firstShot) {
  const type = firstShot?.visualType ?? null;
  return {transitionIn: scene.sequence === 1 ? 'none' : 'cut', motion: type === 'image' ? 'subtle-documentary-pan-or-zoom' : type === 'video' ? 'source-motion' : 'missing-visual', sceneTimingLocked: true};
}
function selectedRightsStatus(scene) { const key = scene.recommendedPrimary ?? scene.selectedPrimary; const candidate = (scene.candidates ?? []).find((item) => item.key === key); return candidate?.reviewStatus ?? 'review-required'; }
function mediaTypeFromPath(value) { const ext = path.extname(String(value ?? '')).toLowerCase(); if (['.mp4','.webm','.mov','.m4v'].includes(ext)) return 'video'; if (['.jpg','.jpeg','.png','.webp','.avif','.tif','.tiff'].includes(ext)) return 'image'; return null; }
function localVisualExists(projectDirectory, relativePath) { if (!relativePath) return false; const root = path.resolve(projectDirectory); const file = path.resolve(root, relativePath); if (!file.startsWith(`${root}${path.sep}`)) return false; try { const stat = fs.statSync(file); return stat.isFile() && stat.size > 0; } catch { return false; } }
function resolveTimingInput(projectDirectory, supplied) { const candidates = []; if (supplied) candidates.push(path.resolve(supplied)); candidates.push(path.join(projectDirectory, '05-PROJECT', 'word-timings-input.json')); candidates.push(path.join(projectDirectory, '05-PROJECT', 'word-timings.json')); const found = candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()); if (!found) throw new Error('Echte Wort-Timings fehlen. Phase 3 erfindet keine Sekunden.'); return found; }
function nextFinalVideoPath(projectDirectory) { const dir = path.join(projectDirectory, '06-EXPORT'); fs.mkdirSync(dir, {recursive: true}); let version = 1; while (fs.existsSync(path.join(dir, `final-v${version}.mp4`))) version += 1; return `06-EXPORT/final-v${version}.mp4`; }
async function sha256File(file) { const hash = createHash('sha256'); await new Promise((resolve, reject) => { const stream = fs.createReadStream(file); stream.on('data', (chunk) => hash.update(chunk)); stream.on('end', resolve); stream.on('error', reject); }); return hash.digest('hex'); }
function toProjectRelativeOrAbsolute(projectDirectory, file) { const relative = path.relative(projectDirectory, file); return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative.split(path.sep).join('/') : path.resolve(file); }
function requireDirectory(value) { if (!value) throw new Error('projectDirectory fehlt.'); const directory = path.resolve(value); if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`Doku-Projekt nicht gefunden: ${directory}`); return directory; }
function requireFile(file, label) { if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size <= 0) throw new Error(`${label} fehlt oder ist leer: ${file}`); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
