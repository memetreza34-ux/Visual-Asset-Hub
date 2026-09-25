import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {validateDocumentaryPhase3} from './documentary-phase3-validate.mjs';
import {createDocumentaryPublishPackage} from './documentary-publish.mjs';

export const DOCUMENTARY_RENDER = Object.freeze({
  compositionId: 'Documentary',
  fps: 30,
  width: 1920,
  height: 1080,
  codec: 'h264',
  audioCodec: 'aac'
});

export function buildRenderProps({timeline, editPlan, fps = DOCUMENTARY_RENDER.fps} = {}) {
  if (!timeline || !Array.isArray(timeline.scenes) || !timeline.scenes.length) throw new Error('timeline.json enthält keine Szenen.');
  if (!Number.isFinite(Number(timeline.durationSeconds)) || Number(timeline.durationSeconds) <= 0) throw new Error('timeline.json enthält keine gültige Videodauer.');
  const ordered = [...timeline.scenes].sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0));
  const editByScene = new Map((editPlan?.scenes ?? []).map((scene) => [scene.sceneId, scene]));
  const totalFrames = Math.max(1, Math.ceil(Number(timeline.durationSeconds) * fps));
  const boundaries = [0];

  for (let index = 1; index < ordered.length; index += 1) {
    const frame = Math.round(Number(ordered[index].startSeconds) * fps);
    if (!Number.isFinite(frame) || frame <= boundaries[index - 1] || frame >= totalFrames) {
      throw new Error(`Szenengrenze ${ordered[index].sceneId} kann bei ${fps} fps nicht eindeutig abgebildet werden.`);
    }
    boundaries.push(frame);
  }
  boundaries.push(totalFrames);

  const scenes = ordered.map((scene, index) => {
    const edit = editByScene.get(scene.sceneId) ?? {};
    const startFrame = boundaries[index];
    const endFrame = boundaries[index + 1];
    const durationInFrames = endFrame - startFrame;
    if (durationInFrames < 1) throw new Error(`${scene.sceneId} hat weniger als einen Frame Dauer.`);
    const mediaType = scene.visualType;
    if (mediaType !== 'image' && mediaType !== 'video') throw new Error(`${scene.sceneId} hat keinen unterstützten Visual-Typ.`);
    const sourceInSeconds = finiteNonNegative(edit.sourceInSeconds) ?? 0;
    const sourceOutSeconds = finiteNonNegative(edit.sourceOutSeconds);
    if (sourceOutSeconds !== null && sourceOutSeconds <= sourceInSeconds) {
      throw new Error(`${scene.sceneId}: sourceOutSeconds muss größer als sourceInSeconds sein.`);
    }
    return {
      sceneId: scene.sceneId,
      sequence: scene.sequence,
      startFrame,
      durationInFrames,
      mediaType,
      sourcePath: scene.visualPath,
      mediaFile: null,
      trimBeforeFrames: Math.round(sourceInSeconds * fps),
      trimAfterFrames: sourceOutSeconds === null ? null : Math.round(sourceOutSeconds * fps),
      motion: String(edit.motion ?? scene.edit?.motion ?? (mediaType === 'image' ? 'subtle-documentary-pan-or-zoom' : 'source-motion')),
      transitionIn: String(edit.transitionIn ?? scene.edit?.transitionIn ?? (index === 0 ? 'none' : 'cut')),
      overlayText: normalizeOverlayText(edit.overlayText ?? null),
      loopVideo: edit.loopVideo !== false
    };
  });

  return {
    audioFile: 'audio/voiceover.mp3',
    scenes,
    totalFrames,
    fps
  };
}

export function prepareDocumentaryRender({projectDirectory} = {}) {
  if (!projectDirectory) throw new Error('projectDirectory fehlt.');
  const root = path.resolve(projectDirectory);
  const validation = validateDocumentaryPhase3({projectDirectory: root, writeReport: true});
  if (!validation.readyToRender) {
    throw new Error(`Render blockiert:\n- ${validation.errors.join('\n- ')}`);
  }

  const timeline = readJson(path.join(root, '05-PROJECT', 'timeline.json'));
  const editPlan = readJson(path.join(root, '05-PROJECT', 'edit-plan.json'));
  const handoff = readJson(path.join(root, '05-PROJECT', 'antigravity-handoff.json'));
  const renderProps = buildRenderProps({timeline, editPlan});
  const publicDir = path.join(root, '05-PROJECT', 'remotion-public');
  fs.rmSync(publicDir, {recursive: true, force: true});
  fs.mkdirSync(path.join(publicDir, 'audio'), {recursive: true});
  fs.mkdirSync(path.join(publicDir, 'visuals'), {recursive: true});

  const audioSource = safeProjectFile(root, timeline.audio || '02-AUDIO/voiceover.mp3', 'Voiceover');
  fs.copyFileSync(audioSource, path.join(publicDir, 'audio', 'voiceover.mp3'));

  renderProps.scenes = renderProps.scenes.map((scene, index) => {
    const source = safeProjectFile(root, scene.sourcePath, `${scene.sceneId} Visual`);
    const extension = path.extname(source).toLowerCase();
    if (!extension) throw new Error(`${scene.sceneId}: Visual-Datei hat keine Dateiendung.`);
    const stagedName = `${String(index + 1).padStart(3, '0')}${extension}`;
    const stagedRelative = `visuals/${stagedName}`;
    fs.copyFileSync(source, path.join(publicDir, 'visuals', stagedName));
    const {sourcePath, ...publicScene} = scene;
    return {...publicScene, mediaFile: stagedRelative};
  });

  delete renderProps.totalFrames;
  delete renderProps.fps;
  const propsFile = path.join(root, '05-PROJECT', 'render-props.json');
  writeJson(propsFile, renderProps);

  const durationInFrames = Math.max(1, Math.ceil(Number(timeline.durationSeconds) * DOCUMENTARY_RENDER.fps));
  const outputRelative = String(timeline.exportTarget || handoff.render?.target || '').trim();
  const outputFile = safeProjectOutput(root, outputRelative);
  if (fs.existsSync(outputFile)) throw new Error(`${outputRelative} existiert bereits. Phase 3 neu erzeugen, um die nächste final-vN-Version zu wählen.`);
  fs.mkdirSync(path.dirname(outputFile), {recursive: true});

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const entryPoint = path.join(repoRoot, 'remotion', 'documentary', 'index.tsx');
  const commandArgs = [
    'render',
    entryPoint,
    DOCUMENTARY_RENDER.compositionId,
    outputFile,
    `--props=${propsFile}`,
    `--public-dir=${publicDir}`,
    `--duration=${durationInFrames}`,
    `--fps=${DOCUMENTARY_RENDER.fps}`,
    `--width=${DOCUMENTARY_RENDER.width}`,
    `--height=${DOCUMENTARY_RENDER.height}`,
    `--codec=${DOCUMENTARY_RENDER.codec}`,
    `--audio-codec=${DOCUMENTARY_RENDER.audioCodec}`,
    '--pixel-format=yuv420p',
    '--color-space=bt709',
    '--x264-preset=medium',
    '--overwrite=false'
  ];

  const plan = {
    format: 'visual-asset-hub-documentary-render-plan',
    version: 1,
    preparedAt: new Date().toISOString(),
    engine: 'remotion',
    compositionId: DOCUMENTARY_RENDER.compositionId,
    width: DOCUMENTARY_RENDER.width,
    height: DOCUMENTARY_RENDER.height,
    fps: DOCUMENTARY_RENDER.fps,
    durationInFrames,
    durationSeconds: timeline.durationSeconds,
    codec: DOCUMENTARY_RENDER.codec,
    audioCodec: DOCUMENTARY_RENDER.audioCodec,
    propsFile: '05-PROJECT/render-props.json',
    publicDir: '05-PROJECT/remotion-public',
    output: outputRelative,
    sceneCount: renderProps.scenes.length,
    preflight: validation,
    command: {
      binary: 'node',
      cliPackage: '@remotion/cli',
      args: commandArgs.map((arg) => makePortable(root, repoRoot, arg))
    }
  };
  writeJson(path.join(root, '05-PROJECT', 'render-plan.json'), plan);
  return {root, repoRoot, timeline, renderProps, propsFile, publicDir, outputFile, outputRelative, entryPoint, commandArgs, plan};
}

export async function renderDocumentary({projectDirectory, dryRun = false} = {}) {
  const prepared = prepareDocumentaryRender({projectDirectory});
  if (dryRun) return {...prepared, rendered: false};

  const remotionCli = resolveRemotionCli(prepared.repoRoot);
  const startedAt = new Date().toISOString();
  await spawnAndWait(process.execPath, [remotionCli, ...prepared.commandArgs], prepared.repoRoot);
  if (!isNonEmptyFile(prepared.outputFile)) throw new Error(`Remotion meldete Erfolg, aber ${prepared.outputRelative} fehlt oder ist leer.`);

  const outputStat = fs.statSync(prepared.outputFile);
  const outputSha256 = fileSha256(prepared.outputFile);
  const finishedAt = new Date().toISOString();
  const publish = createDocumentaryPublishPackage({projectDirectory: prepared.root, overwrite: false});
  const result = {
    format: 'visual-asset-hub-documentary-render-result',
    version: 1,
    engine: 'remotion',
    startedAt,
    finishedAt,
    output: prepared.outputRelative,
    outputBytes: outputStat.size,
    outputSha256,
    durationSeconds: prepared.timeline.durationSeconds,
    width: DOCUMENTARY_RENDER.width,
    height: DOCUMENTARY_RENDER.height,
    fps: DOCUMENTARY_RENDER.fps,
    sceneCount: prepared.renderProps.scenes.length,
    publishSource: publish.state.source
  };
  writeJson(path.join(prepared.root, '05-PROJECT', 'render-result.json'), result);

  const stateFile = path.join(prepared.root, '05-PROJECT', 'phase3-state.json');
  const state = readJson(stateFile);
  writeJson(stateFile, {
    ...state,
    status: 'rendered',
    renderedAt: finishedAt,
    finalVideo: {
      path: prepared.outputRelative,
      bytes: outputStat.size,
      sha256: outputSha256
    },
    publishFilesReady: true
  });
  return {...prepared, rendered: true, result, publish};
}

function resolveRemotionCli(repoRoot) {
  const packageFile = path.join(repoRoot, 'node_modules', '@remotion', 'cli', 'package.json');
  if (!fs.existsSync(packageFile)) {
    throw new Error('Remotion ist nicht installiert. Im Repo einmal `npm install` ausführen und den Render erneut starten.');
  }
  const packageJson = readJson(packageFile);
  const bin = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.remotion;
  if (!bin) throw new Error('@remotion/cli enthält keinen ausführbaren `remotion`-Eintrag.');
  const cli = path.resolve(path.dirname(packageFile), bin);
  if (!isNonEmptyFile(cli)) throw new Error(`Remotion-CLI wurde nicht gefunden: ${cli}`);
  return cli;
}

function spawnAndWait(binary, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {cwd, stdio: 'inherit', windowsHide: true, shell: false});
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Remotion-Render fehlgeschlagen${signal ? ` (${signal})` : ''}: Exit-Code ${code ?? 'unbekannt'}.`));
    });
  });
}

function safeProjectFile(root, relativePath, label) {
  const file = safeProjectPath(root, relativePath);
  if (!file || !isNonEmptyFile(file)) throw new Error(`${label} fehlt oder liegt außerhalb des Projektordners: ${relativePath}`);
  return file;
}

function safeProjectOutput(root, relativePath) {
  const file = safeProjectPath(root, relativePath);
  if (!file) throw new Error(`Ungültiges Exportziel: ${relativePath}`);
  const expectedExport = path.join(path.resolve(root), '06-EXPORT') + path.sep;
  if (!file.startsWith(expectedExport)) throw new Error('Exportziel muss innerhalb von 06-EXPORT liegen.');
  return file;
}

function safeProjectPath(root, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved === resolvedRoot || !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  return resolved;
}

function finiteNonNegative(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

function normalizeOverlayText(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 90) : null;
}

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function fileSha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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

function makePortable(projectRoot, repoRoot, value) {
  if (typeof value !== 'string') return value;
  const normalized = value.split(path.sep).join('/');
  const project = path.resolve(projectRoot).split(path.sep).join('/');
  const repo = path.resolve(repoRoot).split(path.sep).join('/');
  return normalized.replaceAll(project, '<PROJECT>').replaceAll(repo, '<REPO>');
}

function parseArgs(argv) {
  const args = {projectDirectory: '', dryRun: false};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--dry-run') args.dryRun = true;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

async function runCli() {
  const result = await renderDocumentary(parseArgs(process.argv.slice(2)));
  if (!result.rendered) {
    process.stdout.write(`Render vorbereitet (Dry Run): ${result.outputRelative}\n`);
    process.stdout.write(`Szenen: ${result.renderProps.scenes.length}\n`);
    return;
  }
  process.stdout.write(`Fertiges Video: ${result.result.output}\n`);
  process.stdout.write(`SHA-256: ${result.result.outputSha256}\n`);
  process.stdout.write('YouTube-Exportdateien: bereit\n');
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
