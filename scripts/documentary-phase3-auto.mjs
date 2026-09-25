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
  openaiApiKey = process.env.OPENAI_API_KEY,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!projectDirectory) throw new Error('projectDirectory fehlt.');
  const projectDir = path.resolve(projectDirectory);
  const inputFile = wordTimingsFile ? path.resolve(wordTimingsFile) : path.join(projectDir, '05-PROJECT', 'word-timings-input.json');

  let generatedTimings = false;
  if (!fs.existsSync(inputFile)) {
    const audioFile = path.join(projectDir, '02-AUDIO', 'voiceover.mp3');
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

  return {
    ...phase3,
    automaticTiming: {
      generated: generatedTimings,
      inputFile: path.relative(projectDir, inputFile).split(path.sep).join('/'),
      source: phase3.wordTimings.source
    }
  };
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
  process.stdout.write(`Timing-Quelle: ${result.automaticTiming.source}\n`);
  process.stdout.write(`Szenen exakt gemappt: ${result.timeline.sceneCount}\n`);
  process.stdout.write(`Antigravity renderbereit: ${result.handoff.gates.canRender ? 'ja' : 'nein'}\n`);
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
