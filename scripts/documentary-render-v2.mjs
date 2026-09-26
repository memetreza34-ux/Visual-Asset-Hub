import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {validateDocumentaryPhase3V2} from './documentary-phase3-validate-v2.mjs';
import {createDocumentaryPublishPackage} from './documentary-publish.mjs';

export const DOCUMENTARY_RENDER_V2 = Object.freeze({compositionId: 'DocumentaryV2', fps: 30, width: 1920, height: 1080, codec: 'h264', audioCodec: 'aac'});

export function buildRenderPropsV2({timeline, editPlan, fps = DOCUMENTARY_RENDER_V2.fps} = {}) {
  if (!timeline || !Array.isArray(timeline.scenes) || !timeline.scenes.length) throw new Error('timeline.json enthält keine Szenen.');
  if (!Number.isFinite(Number(timeline.durationSeconds)) || Number(timeline.durationSeconds) <= 0) throw new Error('timeline.json enthält keine gültige Videodauer.');
  const ordered = [...timeline.scenes].sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0));
  const editByScene = new Map((editPlan?.scenes ?? []).map((scene) => [scene.sceneId, scene]));
  const totalFrames = Math.max(1, Math.ceil(Number(timeline.durationSeconds) * fps));
  const boundaries = [0];
  for (let index = 1; index < ordered.length; index += 1) {
    const frame = Math.round(Number(ordered[index].startSeconds) * fps);
    if (!Number.isFinite(frame) || frame <= boundaries[index - 1] || frame >= totalFrames) throw new Error(`Szenengrenze ${ordered[index].sceneId} kann nicht eindeutig abgebildet werden.`);
    boundaries.push(frame);
  }
  boundaries.push(totalFrames);

  const shots = [];
  for (let sceneIndex = 0; sceneIndex < ordered.length; sceneIndex += 1) {
    const scene = ordered[sceneIndex];
    const edit = editByScene.get(scene.sceneId) ?? {};
    const startFrame = boundaries[sceneIndex];
    const sceneFrames = boundaries[sceneIndex + 1] - startFrame;
    const supplied = Array.isArray(scene.visualShots) && scene.visualShots.length ? scene.visualShots : scene.visualPath ? [{shotId: 'SHOT-01', visualPath: scene.visualPath, visualType: scene.visualType}] : [];
    if (!supplied.length) throw new Error(`${scene.sceneId} hat keine Visual-Shots.`);
    const maxUsefulShots = Math.max(1, Math.floor(sceneFrames / Math.max(1, Math.round(fps * 2.5))));
    const activeShots = supplied.slice(0, Math.min(supplied.length, maxUsefulShots));
    const frameAllocations = distributeFrames(sceneFrames, activeShots.length);
    let offset = 0;
    for (let shotIndex = 0; shotIndex < activeShots.length; shotIndex += 1) {
      const shot = activeShots[shotIndex];
      const mediaType = shot.visualType || mediaTypeFromPath(shot.visualPath);
      if (!['image', 'video'].includes(mediaType)) throw new Error(`${scene.sceneId}/${shot.shotId}: nicht unterstützter Visual-Typ.`);
      const durationInFrames = frameAllocations[shotIndex];
      shots.push({
        sceneId: scene.sceneId,
        shotId: shot.shotId || `SHOT-${String(shotIndex + 1).padStart(2, '0')}`,
        startFrame: startFrame + offset,
        durationInFrames,
        mediaType,
        sourcePath: shot.visualPath,
        mediaFile: null,
        trimBeforeFrames: 0,
        trimAfterFrames: null,
        motion: mediaType === 'image' ? 'subtle-documentary-pan-or-zoom' : 'source-motion',
        transitionIn: shotIndex === 0 ? String(edit.transitionIn ?? scene.edit?.transitionIn ?? (sceneIndex === 0 ? 'none' : 'cut')) : 'cut',
        overlayText: shotIndex === 0 ? normalizeOverlayText(edit.overlayText ?? null) : null,
        loopVideo: true,
        provider: shot.provider ?? null,
        candidateKey: shot.candidateKey ?? null
      });
      offset += durationInFrames;
    }
  }
  return {audioFile: 'audio/voiceover.mp3', shots, totalFrames, fps};
}

export function prepareDocumentaryRenderV2({projectDirectory} = {}) {
  if (!projectDirectory) throw new Error('projectDirectory fehlt.');
  const root = path.resolve(projectDirectory);
  const validation = validateDocumentaryPhase3V2({projectDirectory: root, writeReport: true});
  if (!validation.readyToRender) throw new Error(`Render blockiert:\n- ${validation.errors.join('\n- ')}`);
  const timeline = readJson(path.join(root, '05-PROJECT', 'timeline.json'));
  const editPlan = readJson(path.join(root, '05-PROJECT', 'edit-plan.json'));
  const handoff = readJson(path.join(root, '05-PROJECT', 'antigravity-handoff.json'));
  const renderProps = buildRenderPropsV2({timeline, editPlan});
  const publicDir = path.join(root, '05-PROJECT', 'remotion-public');
  fs.rmSync(publicDir, {recursive: true, force: true});
  fs.mkdirSync(path.join(publicDir, 'audio'), {recursive: true});
  fs.mkdirSync(path.join(publicDir, 'visuals'), {recursive: true});
  const audioSource = safeProjectFile(root, timeline.audio || '02-AUDIO/voiceover.mp3', 'Voiceover');
  fs.copyFileSync(audioSource, path.join(publicDir, 'audio', 'voiceover.mp3'));

  renderProps.shots = renderProps.shots.map((shot, index) => {
    const source = safeProjectFile(root, shot.sourcePath, `${shot.sceneId}/${shot.shotId} Visual`);
    const extension = path.extname(source).toLowerCase();
    if (!extension) throw new Error(`${shot.sceneId}/${shot.shotId}: Visual-Datei hat keine Dateiendung.`);
    const stagedName = `${String(index + 1).padStart(3, '0')}${extension}`;
    const stagedRelative = `visuals/${stagedName}`;
    fs.copyFileSync(source, path.join(publicDir, 'visuals', stagedName));
    const {sourcePath, ...publicShot} = shot;
    return {...publicShot, mediaFile: stagedRelative};
  });

  const totalFrames = renderProps.totalFrames;
  delete renderProps.totalFrames;
  delete renderProps.fps;
  const propsFile = path.join(root, '05-PROJECT', 'render-props.json');
  writeJson(propsFile, renderProps);
  const outputRelative = String(timeline.exportTarget || handoff.render?.target || '').trim();
  const outputFile = safeProjectOutput(root, outputRelative);
  if (fs.existsSync(outputFile)) throw new Error(`${outputRelative} existiert bereits. Phase 3 neu erzeugen.`);
  fs.mkdirSync(path.dirname(outputFile), {recursive: true});

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const entryPoint = path.join(repoRoot, 'remotion', 'documentary-v2', 'index.tsx');
  const commandArgs = ['render', entryPoint, DOCUMENTARY_RENDER_V2.compositionId, outputFile, `--props=${propsFile}`, `--public-dir=${publicDir}`, `--duration=${totalFrames}`, `--fps=${DOCUMENTARY_RENDER_V2.fps}`, `--width=${DOCUMENTARY_RENDER_V2.width}`, `--height=${DOCUMENTARY_RENDER_V2.height}`, `--codec=${DOCUMENTARY_RENDER_V2.codec}`, `--audio-codec=${DOCUMENTARY_RENDER_V2.audioCodec}`, '--pixel-format=yuv420p', '--color-space=bt709', '--x264-preset=medium', '--overwrite=false'];
  const plan = {
    format: 'visual-asset-hub-documentary-render-plan', version: 2, preparedAt: new Date().toISOString(), engine: 'remotion', compositionId: DOCUMENTARY_RENDER_V2.compositionId,
    width: DOCUMENTARY_RENDER_V2.width, height: DOCUMENTARY_RENDER_V2.height, fps: DOCUMENTARY_RENDER_V2.fps, durationInFrames: totalFrames, durationSeconds: timeline.durationSeconds,
    codec: DOCUMENTARY_RENDER_V2.codec, audioCodec: DOCUMENTARY_RENDER_V2.audioCodec, propsFile: '05-PROJECT/render-props.json', publicDir: '05-PROJECT/remotion-public', output: outputRelative,
    semanticSceneCount: timeline.sceneCount, shotCount: renderProps.shots.length, preflight: validation
  };
  writeJson(path.join(root, '05-PROJECT', 'render-plan.json'), plan);
  return {root, repoRoot, timeline, renderProps, propsFile, publicDir, outputFile, outputRelative, entryPoint, commandArgs, plan};
}

export async function renderDocumentaryV2({projectDirectory, dryRun = false} = {}) {
  const prepared = prepareDocumentaryRenderV2({projectDirectory});
  if (dryRun) return {...prepared, rendered: false};
  const remotionCli = resolveRemotionCli(prepared.repoRoot);
  const startedAt = new Date().toISOString();
  await spawnAndWait(process.execPath, [remotionCli, ...prepared.commandArgs], prepared.repoRoot);
  if (!isNonEmptyFile(prepared.outputFile)) throw new Error(`Remotion meldete Erfolg, aber ${prepared.outputRelative} fehlt oder ist leer.`);
  const outputStat = fs.statSync(prepared.outputFile);
  const outputSha256 = fileSha256(prepared.outputFile);
  const finishedAt = new Date().toISOString();
  const publish = createDocumentaryPublishPackage({projectDirectory: prepared.root, overwrite: false});
  const result = {format: 'visual-asset-hub-documentary-render-result', version: 2, engine: 'remotion', startedAt, finishedAt, output: prepared.outputRelative, outputBytes: outputStat.size, outputSha256, durationSeconds: prepared.timeline.durationSeconds, width: DOCUMENTARY_RENDER_V2.width, height: DOCUMENTARY_RENDER_V2.height, fps: DOCUMENTARY_RENDER_V2.fps, semanticSceneCount: prepared.timeline.sceneCount, shotCount: prepared.renderProps.shots.length, publishSource: publish.state.source};
  writeJson(path.join(prepared.root, '05-PROJECT', 'render-result.json'), result);
  const stateFile = path.join(prepared.root, '05-PROJECT', 'phase3-state.json');
  const state = readJson(stateFile);
  writeJson(stateFile, {...state, status: 'rendered', renderedAt: finishedAt, finalVideo: {path: prepared.outputRelative, bytes: outputStat.size, sha256: outputSha256}, publishFilesReady: true});
  return {...prepared, rendered: true, result, publish};
}

function distributeFrames(total, count) { const base = Math.floor(total / count); const remainder = total - base * count; return Array.from({length: count}, (_, index) => base + (index < remainder ? 1 : 0)); }
function mediaTypeFromPath(value) { const ext = path.extname(String(value ?? '')).toLowerCase(); if (['.mp4','.webm','.mov','.m4v'].includes(ext)) return 'video'; if (['.jpg','.jpeg','.png','.webp','.avif','.tif','.tiff'].includes(ext)) return 'image'; return null; }
function resolveRemotionCli(repoRoot) { const packageFile = path.join(repoRoot, 'node_modules', '@remotion', 'cli', 'package.json'); if (!fs.existsSync(packageFile)) throw new Error('Remotion ist nicht installiert. Im Repo `npm install` ausführen.'); const packageJson = readJson(packageFile); const bin = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.remotion; if (!bin) throw new Error('@remotion/cli enthält keinen remotion-Eintrag.'); const cli = path.resolve(path.dirname(packageFile), bin); if (!isNonEmptyFile(cli)) throw new Error(`Remotion-CLI wurde nicht gefunden: ${cli}`); return cli; }
function spawnAndWait(binary, args, cwd) { return new Promise((resolve, reject) => { const child = spawn(binary, args, {cwd, stdio: 'inherit', windowsHide: true, shell: false}); child.on('error', reject); child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Remotion-Render fehlgeschlagen${signal ? ` (${signal})` : ''}: Exit-Code ${code ?? 'unbekannt'}.`))); }); }
function safeProjectFile(root, relativePath, label) { const file = safeProjectPath(root, relativePath); if (!file || !isNonEmptyFile(file)) throw new Error(`${label} fehlt oder liegt außerhalb des Projektordners: ${relativePath}`); return file; }
function safeProjectOutput(root, relativePath) { const file = safeProjectPath(root, relativePath); if (!file) throw new Error(`Ungültiges Exportziel: ${relativePath}`); const expected = path.join(path.resolve(root), '06-EXPORT') + path.sep; if (!file.startsWith(expected)) throw new Error('Exportziel muss innerhalb von 06-EXPORT liegen.'); return file; }
function safeProjectPath(root, relativePath) { if (!relativePath || typeof relativePath !== 'string') return null; const resolvedRoot = path.resolve(root); const resolved = path.resolve(resolvedRoot, relativePath); if (resolved === resolvedRoot || !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null; return resolved; }
function normalizeOverlayText(value) { const text = String(value ?? '').replace(/\s+/g, ' ').trim(); return text ? text.slice(0, 90) : null; }
function isNonEmptyFile(file) { try { const stat = fs.statSync(file); return stat.isFile() && stat.size > 0; } catch { return false; } }
function fileSha256(file) { return createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function parseArgs(argv) { const args = {projectDirectory: '', dryRun: false}; for (let index = 0; index < argv.length; index += 1) { const token = argv[index]; if (token === '--project') args.projectDirectory = argv[++index] ?? ''; else if (token === '--dry-run') args.dryRun = true; else throw new Error(`Unbekanntes Argument: ${token}`); } if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project'); return args; }
async function runCli() { const result = await renderDocumentaryV2(parseArgs(process.argv.slice(2))); if (!result.rendered) { process.stdout.write(`Render V2 vorbereitet: ${result.outputRelative}\n`); process.stdout.write(`Shots: ${result.renderProps.shots.length}\n`); return; } process.stdout.write(`Fertiges Video: ${result.result.output}\n`); process.stdout.write(`Shots gerendert: ${result.result.shotCount}\n`); process.stdout.write('YouTube-Exportdateien: bereit\n'); }
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) { try { await runCli(); } catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; } }
