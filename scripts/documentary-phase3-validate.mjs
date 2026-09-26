import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { sha256Text } from './lib/documentary-timing-aligner.mjs';

export function validateDocumentaryPhase3({ projectDirectory, writeReport = true } = {}) {
  if (!projectDirectory) throw new Error('projectDirectory fehlt.');
  const root = path.resolve(projectDirectory);
  const stateFile = path.join(root, '05-PROJECT', 'phase3-state.json');
  const timelineFile = path.join(root, '05-PROJECT', 'timeline.json');
  const handoffFile = path.join(root, '05-PROJECT', 'antigravity-handoff.json');
  const scriptFile = path.join(root, '01-SCRIPT', 'script.txt');
  const audioFile = path.join(root, '02-AUDIO', 'voiceover.mp3');

  const errors = [];
  const warnings = [];
  for (const [label, file] of [['phase3-state.json', stateFile], ['timeline.json', timelineFile], ['antigravity-handoff.json', handoffFile], ['script.txt', scriptFile], ['voiceover.mp3', audioFile]]) {
    if (!isNonEmptyFile(file)) errors.push(`${label} fehlt oder ist leer.`);
  }

  if (errors.length) return finish({ root, errors, warnings, writeReport });

  const state = readJson(stateFile);
  const timeline = readJson(timelineFile);
  const handoff = readJson(handoffFile);
  const currentScriptSha256 = sha256Text(fs.readFileSync(scriptFile, 'utf8').trim());
  const currentAudioSha256 = createHash('sha256').update(fs.readFileSync(audioFile)).digest('hex');

  if (!state.scriptSha256 || state.scriptSha256 !== currentScriptSha256) {
    errors.push('script.txt stimmt nicht mehr mit dem Phase-3-Stand überein. Phase 3 neu erzeugen.');
  }
  if (!state.audioSha256 || state.audioSha256 !== currentAudioSha256) {
    errors.push('voiceover.mp3 stimmt nicht mehr mit dem Phase-3-Stand überein. Wort-Timings und Phase 3 neu erzeugen.');
  }
  if (timeline.scriptSha256 !== state.scriptSha256 || timeline.audioSha256 !== state.audioSha256) {
    errors.push('timeline.json und phase3-state.json haben unterschiedliche Skript-/Audio-Hashes.');
  }
  if (handoff.gates?.exactTimingAlignmentRequired !== true) {
    errors.push('Antigravity-Handoff verlangt kein exaktes Timing-Alignment.');
  }

  const missingVisuals = [];
  for (const scene of timeline.scenes ?? []) {
    if (!safeLocalFile(root, scene.visualPath)) missingVisuals.push(scene.sceneId ?? `scene-${scene.sequence ?? '?'}`);
  }
  if (missingVisuals.length) errors.push(`Lokale Hauptvisuals fehlen: ${missingVisuals.join(', ')}.`);

  const exportTarget = String(timeline.exportTarget ?? handoff.render?.target ?? '');
  if (!exportTarget) {
    errors.push('Exportziel fehlt.');
  } else {
    const exportFile = safeProjectPath(root, exportTarget);
    if (!exportFile) errors.push('Exportziel liegt außerhalb des Projektordners.');
    else if (fs.existsSync(exportFile)) errors.push(`${exportTarget} existiert bereits. Phase 3 neu erzeugen, damit die nächste Version gewählt wird.`);
  }

  const rightsPending = (timeline.scenes ?? []).filter((scene) => String(scene.rightsStatus ?? '').includes('review')).length;
  if (rightsPending) warnings.push(`${rightsPending} Szene(n) haben noch einen offenen Rechte-/Review-Status. Das blockiert den technischen Render nicht, aber die Veröffentlichung.`);

  return finish({
    root,
    errors,
    warnings,
    writeReport,
    extra: {
      scriptSha256: currentScriptSha256,
      audioSha256: currentAudioSha256,
      sceneCount: Array.isArray(timeline.scenes) ? timeline.scenes.length : 0,
      missingVisuals,
      exportTarget,
      exactTimingAlignment: state.timingAlignment?.status === 'exact'
    }
  });
}

function finish({ root, errors, warnings, writeReport, extra = {} }) {
  const report = {
    format: 'visual-asset-hub-documentary-phase3-validation',
    version: 1,
    validatedAt: new Date().toISOString(),
    readyToRender: errors.length === 0,
    errors,
    warnings,
    ...extra
  };
  if (writeReport) {
    const output = path.join(root, '05-PROJECT', 'phase3-validation.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return report;
}

function safeLocalFile(root, relativePath) {
  const file = safeProjectPath(root, relativePath);
  return Boolean(file && isNonEmptyFile(file));
}

function safeProjectPath(root, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved === resolvedRoot || !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null;
  return resolved;
}

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`JSON konnte nicht gelesen werden (${file}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseArgs(argv) {
  const args = { projectDirectory: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const report = validateDocumentaryPhase3(args);
  process.stdout.write(`Phase-3-Preflight: ${report.readyToRender ? 'RENDERBEREIT' : 'BLOCKIERT'}\n`);
  for (const warning of report.warnings) process.stdout.write(`WARNUNG: ${warning}\n`);
  for (const error of report.errors) process.stderr.write(`FEHLER: ${error}\n`);
  if (!report.readyToRender) process.exitCode = 2;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
