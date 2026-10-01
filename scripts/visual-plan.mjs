import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { planAiFirstVisuals } from './lib/ai-visual-planner.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  const text = await resolveInput(args);
  if (!text.trim()) throw new Error('Kein Text übergeben.');

  const orientation = String(args.orientation ?? 'horizontal').toLowerCase();
  const imagesPerBeat = integerOption(args['images-per-beat'], 4, 1, 6, 'images-per-beat');
  const maxWordsPerBeat = integerOption(args['max-words-per-beat'], 24, 8, 60, 'max-words-per-beat');
  const preferMotionBroll = booleanOption(args['motion-broll'], true, 'motion-broll');

  const plan = planAiFirstVisuals({
    text,
    orientation,
    imagesPerBeat,
    maxWordsPerBeat,
    preferMotionBroll
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseDir = args.output
    ? path.dirname(args.output)
    : path.join('.local-storage', 'visual-plans', `${safeSlug(text)}-${timestamp}`);
  const planPath = args.output ?? path.join(baseDir, 'visual-plan.json');
  const aiQueuePath = path.join(baseDir, 'ai-generation-queue.json');
  const realQueuePath = path.join(baseDir, 'real-material-queue.json');

  await mkdir(baseDir, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await writeFile(aiQueuePath, `${JSON.stringify({
    version: 1,
    strategy: 'ai-first',
    count: plan.summary.ai_images,
    assets: plan.assets.filter((asset) => asset.source_mode === 'ai-generated')
  }, null, 2)}\n`, 'utf8');
  await writeFile(realQueuePath, `${JSON.stringify({
    version: 1,
    strategy: 'real-only-when-needed',
    count: plan.summary.real_or_stock_assets,
    assets: plan.assets.filter((asset) => asset.source_mode === 'stock-or-real')
  }, null, 2)}\n`, 'utf8');

  console.log(`AI-first Visual Plan: ${plan.summary.beats} Visual Beats.`);
  console.log(`Geplant: ${plan.summary.planned_assets} Assets.`);
  console.log(`KI-Bilder: ${plan.summary.ai_images} (${plan.summary.ai_share_percent} %).`);
  console.log(`Reales/Stock-Material: ${plan.summary.real_or_stock_assets}.`);
  console.log(`Plan: ${planPath}`);
  console.log(`KI-Queue: ${aiQueuePath}`);
  console.log(`Real-Queue: ${realQueuePath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

async function resolveInput(args) {
  if (args.file) {
    if (!existsSync(args.file)) throw new Error(`Datei nicht gefunden: ${args.file}`);
    return readFile(args.file, 'utf8');
  }
  return String(args.text ?? '').trim();
}

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    const next = argv[index + 1];
    const value = inlineValue ?? (next && !next.startsWith('--') ? argv[++index] : 'true');
    args[rawKey] = value;
  }
  args.text ??= positional.join(' ');
  return args;
}

function integerOption(value, fallback, min, max, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
  }
  return number;
}

function booleanOption(value, fallback, name) {
  if (value === undefined) return fallback;
  const normalized = String(value).toLowerCase();
  if (!['true', 'false'].includes(normalized)) throw new Error(`${name} muss true oder false sein.`);
  return normalized === 'true';
}

function safeSlug(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'visual-plan';
}

function help() {
  console.log(`
AI-first Visual Planner

Erzeugt möglichst viele realistische KI-Bild-Prompts und fordert echtes Material
nur dann an, wenn Authentizität oder echte Bewegung einen klaren Vorteil haben.

Beispiele:
  npm run visual:plan -- "Immer mehr Unternehmen automatisieren Büroarbeit mit KI."
  npm run visual:plan -- --file ./script.txt --orientation vertical --images-per-beat 5

Optionen:
  --text <text>                Sprechertext; alternativ Positionswert
  --file <pfad>                Textdatei mit Skript/Sprechertext
  --orientation <wert>         horizontal, vertical oder square; Standard: horizontal
  --images-per-beat <1-6>      KI-Shot-Varianten pro generierbarem Beat; Standard: 4
  --max-words-per-beat <8-60>  maximale Beat-Länge; Standard: 24
  --motion-broll <true|false>  echte B-Roll für starke Bewegung bevorzugen; Standard: true
  --output <pfad>              optionaler Pfad für visual-plan.json
  --help                       Hilfe anzeigen

Ausgabe:
  visual-plan.json
  ai-generation-queue.json
  real-material-queue.json
`);
}
