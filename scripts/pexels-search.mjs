import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { searchPexels } from './lib/pexels.mjs';

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
  args.query ??= positional.join(' ');
  return args;
}

async function loadDotEnv(filePath = '.env') {
  if (!existsSync(filePath)) return;
  const content = await readFile(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

function safeSlug(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'search';
}

function help() {
  console.log(`
Pexels nach kostenlosen Fotos oder Videos durchsuchen.

Beispiele:
  npm run pexels:search -- "Person arbeitet am Laptop" --type video --orientation vertical
  npm run pexels:search -- --query "Berlin skyline" --type photo --per-page 20

Optionen:
  --query <text>          Suchbegriff; alternativ erster Positionswert
  --type <video|photo>    Standard: video
  --orientation <wert>    vertical, horizontal, portrait, landscape oder square
  --size <wert>           large, medium oder small
  --locale <wert>         Standard: de-DE
  --page <zahl>           Standard: 1
  --per-page <zahl>       1 bis 80, Standard: 15
  --output <pfad>         Optionaler JSON-Ausgabepfad
  --help                  Hilfe anzeigen

Der Befehl lädt keine Originaldateien herunter. Er speichert nur Suchergebnisse
und Quellenangaben lokal unter .local-storage/.
`);
}

await loadDotEnv();
const args = parseArgs(process.argv.slice(2));

if (args.help === 'true') {
  help();
  process.exit(0);
}

const query = args.query?.trim();
if (!query) {
  help();
  process.exitCode = 1;
} else {
  try {
    const result = await searchPexels({
      apiKey: process.env.PEXELS_API_KEY,
      query,
      type: args.type ?? 'video',
      orientation: args.orientation,
      size: args.size,
      locale: args.locale ?? 'de-DE',
      page: Number(args.page ?? 1),
      perPage: Number(args['per-page'] ?? 15)
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = args.output ?? path.join(
      '.local-storage',
      'pexels-search',
      `${safeSlug(query)}-${result.type}-${timestamp}.json`
    );

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

    console.log(`Pexels: ${result.assets.length} ${result.type === 'video' ? 'Videos' : 'Fotos'} gefunden.`);
    console.log(`Gespeichert: ${outputPath}`);
    console.log('Es wurden keine Originaldateien heruntergeladen.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
