import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { analyzePilotReadiness } from './lib/pilot-readiness.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  if (!args['visual-plan']) throw new Error('--visual-plan ist erforderlich.');
  if (!args['production-plan']) throw new Error('--production-plan ist erforderlich.');
  const visualPlanPath = path.resolve(args['visual-plan']);
  const productionPlanPath = path.resolve(args['production-plan']);
  const visualPlan = readJson(visualPlanPath);
  const productionPlan = readJson(productionPlanPath);
  const targetDurationSeconds = args['target-duration'] ? Number(args['target-duration']) : undefined;
  const result = analyzePilotReadiness({ visualPlan, productionPlan, targetDurationSeconds });
  const output = path.resolve(args.output ?? path.join(path.dirname(productionPlanPath), 'pilot-readiness.json'));
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`Pilot-Status: ${result.status}`);
  console.log(`Bilddichte: ${result.metrics.primary_visuals_per_100_seconds} Visuals / 100s.`);
  console.log(`Intro: ca. ${result.metrics.estimated_intro_visual_starts} Visual-Starts in den ersten 10s.`);
  for (const warning of result.warnings) console.log(`WARNUNG: ${warning}`);
  for (const error of result.errors) console.error(`FEHLER: ${error}`);
  console.log(`Report: ${relative(output)}`);
  if (args.strict === 'true' && result.status !== 'ready-for-asset-pilot') process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Datei nicht gefunden: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = argv[i + 1];
    args[key] = inline ?? (next && !next.startsWith('--') ? argv[++i] : 'true');
  }
  return args;
}

function relative(file) {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}

function help() {
  console.log(`\n2-Minuten-Pilot Readiness Check\n\nBeispiel:\n  npm run pilot:check -- \\\n    --visual-plan .local-storage/pipeline/visual-plan.json \\\n    --production-plan .local-storage/pipeline/flow/flow-production-plan.json \\\n    --target-duration 120 \\\n    --strict true\n\nPrüft u. a.:\n  - genau drei Cover-Kandidaten\n  - Cover aus Gesamtthema/Story-Spine\n  - Cover-Hold <= 2.2s\n  - ausreichende Bilddichte\n  - mindestens vier Visual-Starts in den ersten ~10s\n  - keine überlangen geplanten Beats\n`);
}
