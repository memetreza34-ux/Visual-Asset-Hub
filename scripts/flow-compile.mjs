import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildFlowProduction,
  defaultStyleLock,
  defaultWorldLock
} from './lib/flow-production.mjs';

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

  const result = buildFlowProduction(plan, { title, coverText, styleLock, worldLock, blockSize });
  fs.mkdirSync(outputDir, { recursive: true });

  const promptFile = path.join(outputDir, 'google-flow-master-prompt.txt');
  const productionFile = path.join(outputDir, 'flow-production-plan.json');
  const queueFile = path.join(outputDir, 'flow-generation-queue.json');
  fs.writeFileSync(promptFile, `${result.master_prompt.trim()}\n`, 'utf8');
  fs.writeFileSync(productionFile, `${JSON.stringify(result.production_plan, null, 2)}\n`, 'utf8');
  fs.writeFileSync(queueFile, `${JSON.stringify(result.generation_queue, null, 2)}\n`, 'utf8');

  console.log(`Flow Production V3: ${result.production_plan.image_count} finale KI-Bilder geplant.`);
  console.log('Cover: Bild 01, exakt 3 verwandte Kandidaten, danach STOP bis Nutzerauswahl.');
  console.log('Nach der Auswahl: flow:select-cover aktiviert Bild 01.png als Referenz für Stage 2.');
  console.log(`Stage 2: Einzelgenerierung mit ${blockSize}er-QC-Blöcken.`);
  console.log(`Master Prompt: ${relative(promptFile)}`);
  console.log(`Production Plan: ${relative(productionFile)}`);
  console.log(`Generation Queue: ${relative(queueFile)}`);
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
  console.log(`\nGoogle Flow Production Compiler V3\n\nKompiliert einen AI-first Visual Plan in einen verbindlichen Google-Flow-Produktionsprompt.\n\nBeispiel:\n  npm run flow:compile -- \\\n    --plan .local-storage/visual-plans/SESSION/visual-plan.json \\\n    --title "Wie KI Büroarbeit verändert" \\\n    --cover-text "KI ERSETZT BÜROJOBS?"\n\nOptionen:\n  --plan <pfad>          visual-plan.json aus npm run visual:plan\n  --title <text>         Videotitel\n  --cover-text <text>    exakter deutscher Cover-Text; Pflicht\n  --style-lock <json>    optionaler projektspezifischer Style Lock\n  --world-lock <json>    optionaler videospezifischer World Lock\n  --block-size <1-10>    QC-Blockgröße nach dem Cover; Standard: 5\n  --output-dir <pfad>    Ausgabeordner; Standard: FLOW-Unterordner beim Plan\n  --help                 Hilfe anzeigen\n\nDanach zwingend Cover auswählen:\n  npm run flow:select-cover -- --production-plan <flow-production-plan.json> --candidate <A|B|C> --reference "Bild 01.png"\n`);
}
