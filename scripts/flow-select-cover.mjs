import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildStage2AfterCoverSelection } from './lib/flow-production.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  if (!args['production-plan']) throw new Error('--production-plan ist erforderlich.');
  if (!args.candidate) throw new Error('--candidate A|B|C ist erforderlich.');
  const planFile = path.resolve(args['production-plan']);
  if (!fs.existsSync(planFile)) throw new Error(`Production Plan nicht gefunden: ${planFile}`);
  const productionPlan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const reference = String(args.reference ?? 'Bild 01.png').trim();
  const outputDir = path.resolve(args['output-dir'] ?? path.dirname(planFile));
  const result = buildStage2AfterCoverSelection(productionPlan, { candidate: args.candidate, reference });
  fs.mkdirSync(outputDir, { recursive: true });

  const selectionFile = path.join(outputDir, 'cover-selection.json');
  const queueFile = path.join(outputDir, 'flow-stage2-queue.json');
  const promptFile = path.join(outputDir, 'google-flow-stage2-prompt.txt');
  fs.writeFileSync(selectionFile, `${JSON.stringify(result.cover_selection, null, 2)}\n`, 'utf8');
  fs.writeFileSync(queueFile, `${JSON.stringify(result.stage_2_queue, null, 2)}\n`, 'utf8');
  fs.writeFileSync(promptFile, `${result.stage_2_prompt.trim()}\n`, 'utf8');

  console.log(`Cover ${result.cover_selection.selected_candidate} ausgewählt.`);
  console.log(`Referenz: ${result.cover_selection.selected_reference}`);
  console.log(`Stage 2 freigeschaltet: ${result.stage_2_queue.jobs.length} Bilder.`);
  console.log(`Selection: ${relative(selectionFile)}`);
  console.log(`Stage-2 Queue: ${relative(queueFile)}`);
  console.log(`Stage-2 Prompt: ${relative(promptFile)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = argv[index + 1];
    args[key] = inline ?? (next && !next.startsWith('--') ? argv[++index] : 'true');
  }
  return args;
}

function relative(file) {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}

function help() {
  console.log(`\nGoogle Flow Cover Selection\n\nEntsperrt Stage 2 erst nach expliziter Auswahl eines der drei Cover.\n\nBeispiel:\n  npm run flow:select-cover -- \\\n    --production-plan .local-storage/visual-plans/SESSION/flow/flow-production-plan.json \\\n    --candidate B \\\n    --reference "Bild 01.png"\n\nOptionen:\n  --production-plan <pfad>  flow-production-plan.json\n  --candidate <A|B|C>       vom Nutzer gewähltes Cover\n  --reference <name/pfad>   gewähltes Cover als Flow-Referenz; Standard: Bild 01.png\n  --output-dir <pfad>       Ausgabeordner; Standard: Ordner des Production Plans\n  --help                    Hilfe\n\nAusgabe:\n  cover-selection.json\n  flow-stage2-queue.json\n  google-flow-stage2-prompt.txt\n`);
}
