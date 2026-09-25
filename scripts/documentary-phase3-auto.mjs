import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildDocumentaryPhase3 } from './documentary-phase3.mjs';
import { transcribeOpenAIWordTimings } from './lib/openai-word-timings.mjs';

export async function buildAutomaticDocumentaryPhase3({
  projectDirectory,
  wordTimingsFile,
  timingSource,
  openaiApiKey = process.env.OPENAI_API_KEY || readLocalEnvValue('OPENAI_API_KEY'),
  fetchImpl = globalThis.fetch
} = {}) {
  if (!projectDirectory) throw new Error('projectDirectory fehlt.');
  const projectDir = path.resolve(projectDirectory);
  const audioFile = path.join(projectDir, '02-AUDIO', 'voiceover.mp3');
  const inputFile = wordTimingsFile ? path.resolve(wordTimingsFile) : path.join(projectDir, '05-PROJECT', 'word-timings-input.json');
  const explicitTimingFile = Boolean(wordTimingsFile);
  const currentAudioSha256 = fileSha256IfPresent(audioFile);

  let generatedTimings = false;
  let regeneratedBecauseAudioChanged = false;
  let needsAutomaticTiming = !fs.existsSync(inputFile);

  if (!needsAutomaticTiming) {
    const existing = readJson(inputFile);
    if (existing.audioSha256 && currentAudioSha256 && existing.audioSha256 !== currentAudioSha256) {
      if (explicitTimingFile || existing.source !== 'openai-whisper-1-word-timestamps') {
        throw new Error('Die bereitgestellten Wort-Timings gehören zu einer anderen voiceover.mp3. Neue Timings sind erforderlich.');
      }
      needsAutomaticTiming = true;
      regeneratedBecauseAudioChanged = true;
    } else if (!explicitTimingFile && existing.source === 'openai-whisper-1-word-timestamps' && !existing.audioSha256) {
      needsAutomaticTiming = true;
      regeneratedBecauseAudioChanged = true;
    }
  }

  if (needsAutomaticTiming) {
    const result = await transcribeOpenAIWordTimings({
      audioFile,
      apiKey: openaiApiKey,
      language: 'de',
      fetchImpl
    });
    fs.mkdirSync(path.dirname(inputFile), { recursive: true });
    fs.writeFileSync(inputFile, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    generatedTimings = true;
  }

  const phase3 = await buildDocumentaryPhase3({
    projectDirectory: projectDir,
    wordTimingsFile: inputFile,
    timingSource: timingSource || (generatedTimings ? 'openai-whisper-1-word-timestamps' : 'external-word-timestamps')
  });

  const missingLocalVisuals = phase3.timeline.scenes
    .filter((scene) => !localVisualExists(projectDir, scene.visualPath))
    .map((scene) => scene.sceneId);
  phase3.handoff.gates.missingLocalVisuals = missingLocalVisuals;
  phase3.handoff.gates.canRender = missingLocalVisuals.length === 0;
  phase3.phase3State.status = missingLocalVisuals.length === 0 ? 'ready-for-editor' : 'blocked-missing-local-visuals';
  phase3.phase3State.missingLocalVisuals = missingLocalVisuals;
  writeJson(path.join(projectDir, '05-PROJECT', 'antigravity-handoff.json'), phase3.handoff);
  writeJson(path.join(projectDir, '05-PROJECT', 'phase3-state.json'), phase3.phase3State);

  return {
    ...phase3,
    automaticTiming: {
      generated: generatedTimings,
      regeneratedBecauseAudioChanged,
      inputFile: path.relative(projectDir, inputFile).split(path.sep).join('/'),
      source: phase3.wordTimings.source
    }
  };
}

function localVisualExists(projectDirectory, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return false;
  const resolved = path.resolve(projectDirectory, relativePath);
  const root = `${path.resolve(projectDirectory)}${path.sep}`;
  if (!resolved.startsWith(root)) return false;
  try {
    const stat = fs.statSync(resolved);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function fileSha256IfPresent(file) {
  try {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
    return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch {
    return null;
  }
}

function readLocalEnvValue(key, envFile = path.resolve(process.cwd(), '.env')) {
  try {
    if (!fs.existsSync(envFile) || !fs.statSync(envFile).isFile()) return '';
    const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const name = trimmed.slice(0, separator).trim();
      if (name !== key) continue;
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      return value;
    }
  } catch {}
  return '';
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Timing-JSON konnte nicht gelesen werden (${file}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const args = { projectDirectory: '', wordTimingsFile: '', timingSource: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--word-timings') args.wordTimingsFile = argv[++index] ?? '';
    else if (token === '--timing-source') args.timingSource = argv[++index] ?? '';
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = await buildAutomaticDocumentaryPhase3(args);
  process.stdout.write(`Phase 3 vorbereitet: ${result.projectDirectory}\n`);
  process.stdout.write(`Wort-Timings automatisch erzeugt: ${result.automaticTiming.generated ? 'ja' : 'nein'}\n`);
  if (result.automaticTiming.regeneratedBecauseAudioChanged) process.stdout.write('Alte Timings verworfen: voiceover.mp3 wurde geändert.\n');
  process.stdout.write(`Timing-Quelle: ${result.automaticTiming.source}\n`);
  process.stdout.write(`Szenen exakt gemappt: ${result.timeline.sceneCount}\n`);
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
