import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildFlowProduction,
  defaultStyleLock,
  defaultWorldLock
} from './lib/flow-production.mjs';
import {
  analyzePilotReadiness,
  applyPilotCoverEnhancements
} from './lib/pilot-readiness.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  if (!args.plan) throw new Error('--plan ist erforderlich.');
  if (!args['cover-text']) throw new Error('--cover-text ist erforderlich.');
  const planFile = path.resolve(args.plan);
  if (!fs.existsSync(planFile)) throw new Error(`Visual Plan nicht gefunden: ${planFile}`);

  const plan = readJson(planFile);
  const title = String(args.title ?? 'Untitled Video').trim();
  const coverText = String(args['cover-text']).trim();
  const blockSize = integerOption(args['block-size'], 5, 1, 10, 'block-size');
  const styleLock = args['style-lock'] ? readJson(path.resolve(args['style-lock'])) : defaultStyleLock();
  const worldLock = args['world-lock'] ? readJson(path.resolve(args['world-lock'])) : defaultWorldLock(plan);
  const outputDir = path.resolve(args['output-dir'] ?? path.join(path.dirname(planFile), 'flow'));

  let result = buildFlowProduction(plan, { title, coverText, styleLock, worldLock, blockSize });
  result = applyPilotCoverEnhancements(result, plan, { title, coverText });
  const targetDurationSeconds = args['target-duration'] ? Number(args['target-duration']) : undefined;
  const readiness = analyzePilotReadiness({
    visualPlan: plan,
    productionPlan: result.production_plan,
    targetDurationSeconds
  });

  fs.mkdirSync(outputDir, { recursive: true });
  const promptFile = path.join(outputDir, 'google-flow-master-prompt.txt');
  const productionFile = path.join(outputDir, 'flow-production-plan.json');
  const queueFile = path.join(outputDir, 'flow-generation-queue.json');
  const readinessFile = path.join(outputDir, 'pilot-readiness.json');
  fs.writeFileSync(promptFile, `${result.master_prompt.trim()}\n`, 'utf8');
  fs.writeFileSync(productionFile, `${JSON.stringify(result.production_plan, null, 2)}\n`, 'utf8');
  fs.writeFileSync(queueFile, `${JSON.stringify(result.generation_queue, null, 2)}\n`, 'utf8');
  fs.writeFileSync(readinessFile, `${JSON.stringify(readiness, null, 2)}\n`, 'utf8');

  console.log(`Flow Production V3: ${result.production_plan.image_count} finale KI-Bilder geplant.`);
  console.log('Cover: Bild 01, exakt 3 verwandte Kandidaten, danach STOP bis Nutzerauswahl.');
  console.log('Cover-Strategie: Titel + Cover-Text + gesamte Story-Spine, nicht nur Satz 1.');
  console.log(`Stage 2: Einzelgenerierung mit ${blockSize}er-QC-Blöcken.`);
  console.log(`Pilot-Readiness: ${readiness.status}.`);
  for (const warning of readiness.warnings) console.log(`WARNUNG: ${warning}`);
  for (const error of readiness.errors) console.error(`PILOT-GATE: ${error}`);
  console.log(`Master Prompt: ${relative(promptFile)}`);
  console.log(`Production Plan: ${relative(productionFile)}`);
  console.log(`Generation Queue: ${relative(queueFile)}`);
  console.log(`Pilot Report: ${relative(readinessFile)}`);
  if (args['pilot-strict'] === 'true' && readiness.status !== 'ready-for-asset-pilot') process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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

function integerOption(value, fallback, min, max, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${name} muss zwischen ${min} und ${max} liegen.`);
  return number;
}

function relative(file) {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}

function help() {
  console.log(`\nGoogle Flow Production Compiler V3\n\nKompiliert Visual Plan, Gesamtthema-Cover-Brief und Pilot-Pacing-Gate für Google Flow.\n\nBeispiel:\n  npm run flow:compile -- \\\n    --plan .local-storage/visual-plans/SESSION/visual-plan.json \\\n    --title "Wie KI Büroarbeit verändert" \\\n    --cover-text "KI ERSETZT BÜROJOBS?" \\\n    --target-duration 120 \\\n    --pilot-strict true\n\nOptionen:\n  --plan <pfad>              visual-plan.json\n  --title <text>             Videotitel\n  --cover-text <text>        exakter Cover-Text; Pflicht\n  --target-duration <sek>    Ziel-/echte Videodauer für Pilot-Pacing-Check\n  --pilot-strict <bool>      bei nicht bestandenem Pilot-Gate Exit-Code 1\n  --style-lock <json>        optionaler projektspezifischer Style Lock\n  --world-lock <json>        optionaler videospezifischer World Lock\n  --block-size <1-10>        QC-Blockgröße nach dem Cover; Standard: 5\n  --output-dir <pfad>        Ausgabeordner\n\nAusgabe:\n  google-flow-master-prompt.txt\n  flow-production-plan.json\n  flow-generation-queue.json\n  pilot-readiness.json\n`);
}
