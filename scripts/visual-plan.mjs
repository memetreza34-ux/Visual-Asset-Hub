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
  const maxWordsPerBeat = integerOption(args['max-words-per-beat'], 16, 8, 40, 'max-words-per-beat');
  const preferMotionBroll = booleanOption(args['motion-broll'], true, 'motion-broll');

  const plan = planAiFirstVisuals({ text, orientation, maxWordsPerBeat, preferMotionBroll });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseDir = args.output
    ? path.dirname(args.output)
    : path.join('.local-storage', 'visual-plans', `${safeSlug(text)}-${timestamp}`);
  const planPath = args.output ?? path.join(baseDir, 'visual-plan.json');
  const aiQueuePath = path.join(baseDir, 'ai-generation-queue.json');
  const realQueuePath = path.join(baseDir, 'real-material-queue.json');
  const sceneCardsPath = path.join(baseDir, 'scene-cards.json');

  const aiAssets = plan.assets.filter((asset) => asset.source_mode === 'ai-generated');
  const primaryAiAssets = aiAssets.filter((asset) => asset.priority !== 'fallback');
  const realAssets = plan.assets.filter((asset) => asset.source_mode === 'stock-or-real');

  await mkdir(baseDir, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await writeFile(aiQueuePath, `${JSON.stringify({
    version: 2,
    strategy: 'ai-first-content-density',
    cover_gate: 'Bild 01 requires exactly three candidates and explicit user selection before the remaining images are generated.',
    generation_rule: 'One image at a time: generate, wait, QC, rename, then continue. Later images are grouped into five-image QC blocks, never parallel batches.',
    count: primaryAiAssets.length,
    fallback_count: aiAssets.length - primaryAiAssets.length,
    assets: aiAssets
  }, null, 2)}\n`, 'utf8');
  await writeFile(realQueuePath, `${JSON.stringify({
    version: 2,
    strategy: 'real-only-when-needed',
    count: realAssets.length,
    assets: realAssets
  }, null, 2)}\n`, 'utf8');
  await writeFile(sceneCardsPath, `${JSON.stringify({
    version: 1,
    count: primaryAiAssets.length,
    cards: primaryAiAssets.map((asset, index) => ({
      image_number: index + 1,
      asset_id: asset.id,
      beat_id: asset.beat_id,
      production_role: asset.production_role,
      scene_card: asset.scene_card
    }))
  }, null, 2)}\n`, 'utf8');

  console.log(`AI-first Visual Plan V2: ${plan.summary.beats} Visual Beats.`);
  console.log(`Primäre KI-Bilder: ${plan.summary.ai_images} (${plan.summary.ai_share_percent} % der primären Visuals).`);
  console.log(`KI-Fallbacks: ${plan.summary.ai_fallbacks}.`);
  console.log(`Reales/Stock-Material: ${plan.summary.real_or_stock_assets}.`);
  console.log(`Plan: ${planPath}`);
  console.log(`Scene Cards: ${sceneCardsPath}`);
  console.log(`KI-Queue: ${aiQueuePath}`);
  console.log(`Real-Queue: ${realQueuePath}`);
  console.log('Nächster Schritt für Google Flow: npm run flow:compile -- --plan <visual-plan.json> --title "..." --cover-text "..."');
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
AI-first Visual Planner V2

Plant möglichst viele VERWENDBARE KI-Bilder durch dichtere Story-Beats statt ungenutzter
Mehrfachvarianten desselben Beats. Echtes Material wird nur angefordert, wenn Authentizität
oder echte Bewegung klar besser ist.

Beispiele:
  npm run visual:plan -- "Immer mehr Unternehmen automatisieren Büroarbeit mit KI."
  npm run visual:plan -- --file ./script.txt --orientation horizontal --max-words-per-beat 14

Optionen:
  --text <text>                 Sprechertext; alternativ Positionswert
  --file <pfad>                 Textdatei mit Skript/Sprechertext
  --orientation <wert>          horizontal, vertical oder square; Standard: horizontal
  --max-words-per-beat <8-40>   Bilddichte; Standard: 16. Kleinere Zahl = mehr echte Story-Bilder
  --motion-broll <true|false>   echte B-Roll für starke Bewegung bevorzugen; Standard: true
  --output <pfad>               optionaler Pfad für visual-plan.json
  --help                        Hilfe anzeigen

Ausgabe:
  visual-plan.json
  scene-cards.json
  ai-generation-queue.json
  real-material-queue.json

Wichtig:
  Bild 01 ist Cover + Opening. Mehrfachvarianten gibt es automatisch nur für das Cover
  (im Flow-Compiler exakt drei Kandidaten), nicht für jede normale Szene.
`);
}
