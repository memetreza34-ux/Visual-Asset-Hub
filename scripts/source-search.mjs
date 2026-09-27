import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PROVIDERS } from './lib/providers/index.mjs';
import { loadDotEnv, searchWithCache } from './lib/source-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
loadDotEnv(path.join(root, '.env'));
if (args.help) { help(); process.exit(0); }

const provider = String(args.provider || 'wikimedia').toLowerCase();
if (!PROVIDERS[provider]) fail(`Provider unbekannt: ${provider}`);
const type = args.type || (provider === 'openverse' ? 'image' : 'video');
const query = (args.query || args._.join(' ')).trim();
if (!query) fail('Suchbegriff fehlt.');
const perPage = integer(args.perPage || '20', 1, provider === 'pixabay' ? 200 : 100, 'per-page');
const page = integer(args.page || '1', 1, 100000, 'page');

try {
  const result = await searchWithCache({
    root,
    provider,
    type,
    query,
    orientation: args.orientation,
    page,
    perPage,
    locale: args.locale || 'de-DE',
    language: args.language || 'de',
    refresh: args.refresh === 'true'
  });
  const outputDir = path.join(root, '.local-storage', 'source-search');
  fs.mkdirSync(outputDir, { recursive: true });
  const output = path.join(outputDir, `${provider}-${safeName(query)}-${Date.now()}.json`);
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`${provider}: ${result.assets.length} Treffer für „${query}“${result.cache?.hit ? ' (Cache)' : ''}.`);
  result.assets.slice(0, 20).forEach((asset, index) => {
    const dims = asset.width && asset.height ? `${asset.width}×${asset.height}` : '?';
    const creator = asset.creator ? ` · ${asset.creator}` : '';
    const rights = asset.rights?.license_code || asset.rights?.license_status || 'unknown';
    console.log(`${String(index + 1).padStart(2, ' ')}. ${asset.title} · ${dims} · ${asset.orientation || '?'} · ${rights}${creator}`);
  });
  console.log(`\nGespeichert: ${path.relative(root, output)}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function parseArgs(values) {
  const result = { _: [] };
  for (let i = 0; i < values.length; i++) {
    const token = values[i];
    if (!token.startsWith('--')) { result._.push(token); continue; }
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'help') { result.help = true; continue; }
    const next = values[i + 1];
    if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`);
    result[key] = next; i++;
  }
  return result;
}
function integer(value, min, max, label) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'search'; }
function fail(message) { console.error(message); process.exit(1); }
function help() {
  console.log(`Visual Asset Hub – Quellenübergreifende Suche\n\nKostenlose Beispiele:\n  npm run source:search -- "Apollo 11" --provider wikimedia --type video\n  npm run source:search -- "historic factory accident" --provider internet-archive --type video\n  npm run source:search -- "circuit board" --provider openverse --type image\n\nStock-Fallbacks:\n  npm run source:search -- "factory automation" --provider pexels --type video\n  npm run source:search -- "electrical technician" --provider pixabay --type video\n\nProvider:\n  wikimedia         Videos + Bilder, ohne API-Key, Archiv/Originalmaterial bevorzugt\n  internet-archive  Videos + Bilder, ohne API-Key, Rechte je Item prüfen\n  openverse         Bilder, ohne API-Key\n  pexels            Videos + Bilder, benötigt PEXELS_API_KEY\n  pixabay           Videos + Bilder, benötigt PIXABAY_API_KEY\n\nStandardprovider ist wikimedia. Für Doku-Recherche über mehrere Archive nutze documentary:research.`);
}
