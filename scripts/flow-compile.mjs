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

  console.log(`Flow Production V2: ${result.production_plan.image_count} finale KI-Bilder geplant.`);
  console.log('Cover: Bild 01, exakt 3 Kandidaten, danach STOP bis Nutzerauswahl.');
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
  console.log(`
Google Flow Production Compiler V2

Kompiliert einen AI-first Visual Plan in einen verbindlichen Google-Flow-Produktionsprompt.

Beispiel:
  npm run flow:compile -- \\
    --plan .local-storage/visual-plans/SESSION/visual-plan.json \\
    --title "Wie KI Büroarbeit verändert" \\
    --cover-text "KI ERSETZT BÜROJOBS?"

Optionen:
  --plan <pfad>          visual-plan.json aus npm run visual:plan
  --title <text>         Videotitel
  --cover-text <text>    exakter deutscher Cover-Text; Pflicht
  --style-lock <json>    optionaler projektspezifischer Style Lock
  --world-lock <json>    optionaler videospezifischer World Lock
  --block-size <1-10>    QC-Blockgröße nach dem Cover; Standard: 5
  --output-dir <pfad>    Ausgabeordner; Standard: FLOW-Unterordner beim Plan
  --help                 Hilfe anzeigen

Ausgabe:
  google-flow-master-prompt.txt
  flow-production-plan.json
  flow-generation-queue.json

Verbindliche Produktionslogik:
  Stage 1: genau drei Bild-01-Coverkandidaten, danach STOP und Nutzerauswahl.
  Stage 2: Bild 02–NN strikt einzeln generieren, warten, QC, umbenennen, dann weiter.
  5er-Blöcke sind nur QC-Checkpoints, niemals parallele Generationen.
`);
}
