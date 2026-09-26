import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createDocumentaryProject, syncDocumentaryPhase1 } from './documentary-project.mjs';
import { createDocumentaryVisualPlan } from './documentary-visual-plan.mjs';
import { researchDocumentaryProjectV4 } from './documentary-research-v4.mjs';
import { materializeDocumentaryVisualsV2 } from './documentary-materialize-v2.mjs';

export function buildDocumentaryPhase1({
  root = process.cwd(),
  title,
  script,
  category = 'sonstiges',
  slug,
  outputRoot,
  segmentation = 'auto',
  depth = 'deep',
  mediaPreference = 'mixed',
  overwrite = false
} = {}) {
  const plan = createDocumentaryVisualPlan({title, script, segmentation, depth, mediaPreference, orientation: 'horizontal'});
  const created = createDocumentaryProject({root, outputRoot, category, slug, title: plan.title, script: plan.script, overwrite});
  const phase1 = syncDocumentaryPhase1(created.projectDirectory, plan);
  return {projectDirectory: created.projectDirectory, project: created.project, plan, phase1};
}

export async function buildAndResearchDocumentaryPhase1(options = {}) {
  const built = buildDocumentaryPhase1(options);
  const research = await researchDocumentaryProjectV4({
    projectDirectory: built.projectDirectory,
    perPage: options.perPage,
    maxTasksPerScene: options.maxTasksPerScene,
    alternatives: options.alternatives,
    openaiApiKey: options.openaiApiKey,
    visionModel: options.visionModel,
    visionCandidates: options.visionCandidates
  });
  return {...built, research};
}

export async function buildCompleteDocumentaryPhase1(options = {}) {
  const researched = await buildAndResearchDocumentaryPhase1(options);
  const materialization = await materializeDocumentaryVisualsV2({
    projectDirectory: researched.projectDirectory,
    includeAlternatives: Boolean(options.materializeAlternatives),
    overwrite: Boolean(options.overwriteMedia),
    maxBytes: options.maxMediaBytes
  });
  return {...researched, materialization};
}

function parseArgs(argv) {
  const args = {title: '', category: 'sonstiges', slug: undefined, scriptFile: '', outputRoot: undefined, segmentation: 'auto', depth: 'deep', mediaPreference: 'mixed', overwrite: false, research: false, complete: false, materializeAlternatives: false, overwriteMedia: false, maxMediaBytes: undefined, perPage: undefined, maxTasksPerScene: undefined, alternatives: undefined, visionModel: undefined, visionCandidates: undefined};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--title') args.title = argv[++index] ?? '';
    else if (token === '--category') args.category = argv[++index] ?? 'sonstiges';
    else if (token === '--slug') args.slug = argv[++index] ?? undefined;
    else if (token === '--script-file') args.scriptFile = argv[++index] ?? '';
    else if (token === '--output-root') args.outputRoot = argv[++index] ?? '';
    else if (token === '--segmentation') args.segmentation = argv[++index] ?? 'auto';
    else if (token === '--depth') args.depth = argv[++index] ?? 'deep';
    else if (token === '--media') args.mediaPreference = argv[++index] ?? 'mixed';
    else if (token === '--overwrite') args.overwrite = true;
    else if (token === '--research') args.research = true;
    else if (token === '--complete') { args.complete = true; args.research = true; }
    else if (token === '--materialize-alternatives') { args.materializeAlternatives = true; args.complete = true; args.research = true; }
    else if (token === '--overwrite-media') args.overwriteMedia = true;
    else if (token === '--max-media-mb') args.maxMediaBytes = Number(argv[++index]) * 1024 * 1024;
    else if (token === '--per-page') args.perPage = Number(argv[++index]);
    else if (token === '--max-tasks') args.maxTasksPerScene = Number(argv[++index]);
    else if (token === '--alternatives') args.alternatives = Number(argv[++index]);
    else if (token === '--vision-model') args.visionModel = argv[++index] ?? undefined;
    else if (token === '--vision-candidates') args.visionCandidates = Number(argv[++index]);
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.title) throw new Error('Pflichtargument fehlt: --title');
  if (!args.scriptFile) throw new Error('Pflichtargument fehlt: --script-file');
  validateOptionalInteger(args.perPage, 3, 20, '--per-page');
  validateOptionalInteger(args.maxTasksPerScene, 1, 30, '--max-tasks');
  validateOptionalInteger(args.alternatives, 0, 8, '--alternatives');
  validateOptionalInteger(args.visionCandidates, 2, 10, '--vision-candidates');
  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const scriptFile = path.resolve(args.scriptFile);
  if (!fs.existsSync(scriptFile)) throw new Error(`Skriptdatei nicht gefunden: ${scriptFile}`);
  const script = fs.readFileSync(scriptFile, 'utf8');
  const buildOptions = {...args, script};
  const result = args.complete ? await buildCompleteDocumentaryPhase1(buildOptions) : args.research ? await buildAndResearchDocumentaryPhase1(buildOptions) : buildDocumentaryPhase1(buildOptions);
  process.stdout.write(`Doku Phase 1 erstellt: ${result.projectDirectory}\n`);
  process.stdout.write(`Szenen: ${result.phase1.scenes.length}\n`);
  if (result.research) {
    process.stdout.write(`Shots: ${result.research.summary.totalShots ?? 0}\n`);
    process.stdout.write(`Video-Shots: ${result.research.summary.videoShots ?? 0}\n`);
    process.stdout.write(`Bild-Shots: ${result.research.summary.imageShots ?? 0}\n`);
    process.stdout.write(`Vision-geprüfte Szenen: ${result.research.summary.visionCheckedScenes ?? 0}\n`);
    process.stdout.write(`Quality-blocked Szenen: ${result.research.summary.qualityBlockedScenes ?? 0}\n`);
  }
  if (result.materialization) {
    process.stdout.write(`Lokale Shots: ${result.materialization.summary.shotFiles ?? 0}\n`);
    process.stdout.write(`Lokale B-Roll-Videos: ${result.materialization.summary.videoFiles ?? 0}\n`);
    process.stdout.write(`Download-Fehler: ${result.materialization.summary.failed}\n`);
  }
}

function validateOptionalInteger(value, min, max, label) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try { await runCli(); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
