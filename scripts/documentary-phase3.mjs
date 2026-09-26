import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  alignFinalScriptToTimings,
  anchorScenesToFinalScript,
  applyWordTimingsToScenes,
  sha256Text
} from './lib/documentary-timing-aligner.mjs';

export async function buildDocumentaryPhase3({
  projectDirectory,
  wordTimingsFile,
  timingSource = 'external-word-timestamps'
} = {}) {
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
  if (scenePlan.scriptSha256 && scenePlan.scriptSha256 !== scriptSha256) {
    throw new Error('script.txt wurde nach Phase 1 verändert. Phase 1 muss mit dem finalen Skript neu erzeugt werden.');
  }

  const timingInputFile = resolveTimingInput(projectDir, wordTimingsFile);
  const timingInput = readJson(timingInputFile);
  const aligned = alignFinalScriptToTimings(script, {
    ...timingInput,
    source: timingInput.source ?? timingSource
  });
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
    validity: {
      scriptSha256,
      audioSha256,
      invalidIfScriptChanges: true,
      invalidIfAudioChanges: true
    }
  };

  const timeline = buildTimeline({
    project,
    timedScenes,
    scriptSha256,
    audioSha256,
    durationSeconds: wordTimings.durationSeconds,
    generatedAt,
    projectDirectory: projectDir
  });
  const editPlan = buildEditPlan({ project, timeline, generatedAt });
  const handoff = buildAntigravityHandoff({ project, timeline, generatedAt, projectDirectory: projectDir });

  const projectDirOut = path.join(projectDir, '05-PROJECT');
  fs.mkdirSync(projectDirOut, { recursive: true });
  writeJson(path.join(projectDirOut, 'word-timings.json'), wordTimings);
  writeJson(path.join(projectDirOut, 'timeline.json'), timeline);
  writeJson(path.join(projectDirOut, 'edit-plan.json'), editPlan);
  writeJson(path.join(projectDirOut, 'antigravity-handoff.json'), handoff);

  const updatedScenePlan = {
    ...scenePlan,
    timing: 'exact-final-voiceover-word-alignment',
    scriptSha256,
    audioSha256,
    phase3PreparedAt: generatedAt,
    scenes: timedScenes
  };
  writeJson(scenesFile, updatedScenePlan);

  const phase3State = {
    format: 'visual-asset-hub-documentary-phase3-state',
    version: 1,
    status: 'ready-for-editor',
    generatedAt,
    scriptSha256,
    audioSha256,
    timingSource: wordTimings.source,
    timingAlignment: wordTimings.alignment,
    sceneCount: timedScenes.length,
    durationSeconds: wordTimings.durationSeconds,
    files: {
      script: '01-SCRIPT/script.txt',
      audio: '02-AUDIO/voiceover.mp3',
      scenes: '05-PROJECT/scenes.json',
      wordTimings: '05-PROJECT/word-timings.json',
      timeline: '05-PROJECT/timeline.json',
      editPlan: '05-PROJECT/edit-plan.json',
      antigravityHandoff: '05-PROJECT/antigravity-handoff.json',
      exportTarget: timeline.exportTarget
    }
  };
  writeJson(path.join(projectDirOut, 'phase3-state.json'), phase3State);

  return { projectDirectory: projectDir, wordTimings, timeline, editPlan, handoff, phase3State };
}

export function buildTimeline({ project, timedScenes, scriptSha256, audioSha256, durationSeconds, generatedAt, projectDirectory }) {
  const exportTarget = nextFinalVideoPath(projectDirectory);
  return {
    format: 'visual-asset-hub-documentary-timeline',
    version: 1,
    generatedAt,
    timingMode: 'exact-word-alignment',
    scriptSha256,
    audioSha256,
    durationSeconds,
    audio: '02-AUDIO/voiceover.mp3',
    exportTarget,
    sceneCount: timedScenes.length,
    scenes: timedScenes.map((scene) => ({
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
      visualPath: scene.localPrimaryFile ?? null,
      visualType: mediaTypeFromPath(scene.localPrimaryFile),
      rightsStatus: selectedRightsStatus(scene),
      edit: editDefaults(scene)
    }))
  };
}

export function buildEditPlan({ project, timeline, generatedAt }) {
  return {
    format: 'visual-asset-hub-documentary-edit-plan',
    version: 1,
    generatedAt,
    projectTitle: project.title ?? '',
    rules: {
      scriptIsLocked: true,
      audioIsLocked: true,
      doNotGuessTimings: true,
      preserveTimelineBoundaries: true,
      missingVisualPolicy: 'stop-and-report',
      unreviewedRightsPolicy: 'flag-before-publication',
      imageMotion: 'subtle-documentary-pan-or-zoom',
      defaultTransition: 'cut',
      music: 'not-required-by-handoff'
    },
    scenes: timeline.scenes.map((scene) => ({
      sceneId: scene.sceneId,
      startSeconds: scene.startSeconds,
      endSeconds: scene.endSeconds,
      durationSeconds: scene.durationSeconds,
      speechSection: scene.speechSection,
      visualPath: scene.visualPath,
      visualType: scene.visualType,
      motion: scene.edit.motion,
      transitionIn: scene.edit.transitionIn,
      sourceInSeconds: null,
      sourceOutSeconds: null,
      sourceTrimInstruction: scene.visualType === 'video'
        ? 'Choose the strongest relevant portion inside the local source clip; do not change the scene timing.'
        : null,
      notes: scene.visualPath ? [] : ['MISSING_LOCAL_PRIMARY_VISUAL']
    }))
  };
}

export function buildAntigravityHandoff({ project, timeline, generatedAt, projectDirectory }) {
  const missingVisuals = timeline.scenes.filter((scene) => !scene.visualPath).map((scene) => scene.sceneId);
  return {
    format: 'visual-asset-hub-antigravity-handoff',
    version: 1,
    generatedAt,
    projectTitle: project.title ?? '',
    mode: 'technical-assembly-only',
    inputs: {
      script: '01-SCRIPT/script.txt',
      audio: '02-AUDIO/voiceover.mp3',
      visualsRoot: '03-VISUALS',
      sources: '04-SOURCES/sources.txt',
      licenses: '04-SOURCES/licenses.csv',
      wordTimings: '05-PROJECT/word-timings.json',
      timeline: '05-PROJECT/timeline.json',
      editPlan: '05-PROJECT/edit-plan.json'
    },
    gates: {
      exactTimingAlignmentRequired: true,
      scriptAndAudioHashesMustMatchPhase3State: true,
      allSceneBoundariesLocked: true,
      missingLocalVisuals: missingVisuals,
      canRender: missingVisuals.length === 0,
      publicationStillRequiresRightsReview: true
    },
    render: {
      aspectRatio: '16:9',
      width: 1920,
      height: 1080,
      fps: 30,
      audioPath: '02-AUDIO/voiceover.mp3',
      target: timeline.exportTarget,
      neverOverwriteExistingFinal: true
    },
    youtubeExportFiles: {
      title: '06-EXPORT/youtube-title.txt',
      description: '06-EXPORT/youtube-description.txt',
      tags: '06-EXPORT/youtube-tags.txt',
      thumbnailText: '06-EXPORT/thumbnail-text.txt'
    },
    projectDirectory: path.resolve(projectDirectory)
  };
}

function editDefaults(scene) {
  const type = mediaTypeFromPath(scene.localPrimaryFile);
  return {
    transitionIn: scene.sequence === 1 ? 'none' : 'cut',
    motion: type === 'image' ? 'subtle-documentary-pan-or-zoom' : type === 'video' ? 'source-motion' : 'missing-visual',
    sceneTimingLocked: true
  };
}

function selectedRightsStatus(scene) {
  const key = scene.recommendedPrimary ?? scene.selectedPrimary;
  const candidate = (scene.candidates ?? []).find((item) => item.key === key);
  return candidate?.reviewStatus ?? scene.localVisuals?.find((item) => item.role === 'primary')?.reviewStatus ?? 'review-required';
}

function mediaTypeFromPath(value) {
  const ext = path.extname(String(value ?? '')).toLowerCase();
  if (['.mp4', '.webm', '.mov', '.m4v'].includes(ext)) return 'video';
  if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'].includes(ext)) return 'image';
  return null;
}

function resolveTimingInput(projectDirectory, supplied) {
  const candidates = [];
  if (supplied) candidates.push(path.resolve(supplied));
  candidates.push(path.join(projectDirectory, '05-PROJECT', 'word-timings-input.json'));
  candidates.push(path.join(projectDirectory, '05-PROJECT', 'word-timings.json'));
  const found = candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
  if (!found) {
    throw new Error('Echte Wort-Timings fehlen. Lege 05-PROJECT/word-timings-input.json ab oder nutze --word-timings <datei>. Phase 3 erfindet keine Sekunden.');
  }
  return found;
}

function nextFinalVideoPath(projectDirectory) {
  const exportDirectory = path.join(projectDirectory, '06-EXPORT');
  fs.mkdirSync(exportDirectory, { recursive: true });
  let version = 1;
  while (fs.existsSync(path.join(exportDirectory, `final-v${version}.mp4`))) version += 1;
  return `06-EXPORT/final-v${version}.mp4`;
}

async function sha256File(file) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

function toProjectRelativeOrAbsolute(projectDirectory, file) {
  const relative = path.relative(projectDirectory, file);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return relative.split(path.sep).join('/');
  return path.resolve(file);
}

function requireDirectory(value) {
  if (!value) throw new Error('projectDirectory fehlt.');
  const directory = path.resolve(value);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`Doku-Projekt nicht gefunden: ${directory}`);
  return directory;
}

function requireFile(file, label) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size <= 0) {
    throw new Error(`${label} fehlt oder ist leer: ${file}`);
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`JSON konnte nicht gelesen werden (${file}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const args = { projectDirectory: '', wordTimingsFile: '', timingSource: 'external-word-timestamps' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--word-timings') args.wordTimingsFile = argv[++index] ?? '';
    else if (token === '--timing-source') args.timingSource = argv[++index] ?? 'external-word-timestamps';
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = await buildDocumentaryPhase3(args);
  process.stdout.write(`Phase 3 vorbereitet: ${result.projectDirectory}\n`);
  process.stdout.write(`Exakte Wort-Timings: ${result.wordTimings.words.length}\n`);
  process.stdout.write(`Szenen exakt gemappt: ${result.timeline.sceneCount}\n`);
  process.stdout.write(`Videodauer: ${result.timeline.durationSeconds}s\n`);
  process.stdout.write(`Antigravity renderbereit: ${result.handoff.gates.canRender ? 'ja' : 'nein'}\n`);
  if (result.handoff.gates.missingLocalVisuals.length) {
    process.stdout.write(`Fehlende lokale Visuals: ${result.handoff.gates.missingLocalVisuals.join(', ')}\n`);
  }
  process.stdout.write(`Exportziel: ${result.timeline.exportTarget}\n`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    await runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
