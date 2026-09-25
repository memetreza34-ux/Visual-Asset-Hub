import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createDocumentaryProject, syncDocumentaryPhase1 } from './documentary-project.mjs';
import { createDocumentaryVisualPlan } from './documentary-visual-plan.mjs';

export function buildDocumentaryPhase1({
  root = process.cwd(),
  title,
  script,
  outputRoot,
  segmentation = 'auto',
  depth = 'deep',
  mediaPreference = 'mixed',
  overwrite = false
} = {}) {
  const plan = createDocumentaryVisualPlan({
    title,
    script,
    segmentation,
    depth,
    mediaPreference,
    orientation: 'horizontal'
  });

  const created = createDocumentaryProject({
    root,
    outputRoot,
    title: plan.title,
    script: plan.script,
    overwrite
  });

  const phase1 = syncDocumentaryPhase1(created.projectDirectory, plan);
  return {
    projectDirectory: created.projectDirectory,
    project: created.project,
    plan,
    phase1
  };
}

function parseArgs(argv) {
  const args = {
    title: '',
    scriptFile: '',
    outputRoot: undefined,
    segmentation: 'auto',
    depth: 'deep',
    mediaPreference: 'mixed',
    overwrite: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--title') args.title = argv[++index] ?? '';
    else if (token === '--script-file') args.scriptFile = argv[++index] ?? '';
    else if (token === '--output-root') args.outputRoot = argv[++index] ?? '';
    else if (token === '--segmentation') args.segmentation = argv[++index] ?? 'auto';
    else if (token === '--depth') args.depth = argv[++index] ?? 'deep';
    else if (token === '--media') args.mediaPreference = argv[++index] ?? 'mixed';
    else if (token === '--overwrite') args.overwrite = true;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.title) throw new Error('Pflichtargument fehlt: --title');
  if (!args.scriptFile) throw new Error('Pflichtargument fehlt: --script-file');
  return args;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const scriptFile = path.resolve(args.scriptFile);
  if (!fs.existsSync(scriptFile)) throw new Error(`Skriptdatei nicht gefunden: ${scriptFile}`);
  const script = fs.readFileSync(scriptFile, 'utf8');
  const result = buildDocumentaryPhase1({
    title: args.title,
    script,
    outputRoot: args.outputRoot,
    segmentation: args.segmentation,
    depth: args.depth,
    mediaPreference: args.mediaPreference,
    overwrite: args.overwrite
  });
  process.stdout.write(`Doku Phase 1 erstellt: ${result.projectDirectory}\n`);
  process.stdout.write(`Szenen: ${result.phase1.scenes.length}\n`);
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
