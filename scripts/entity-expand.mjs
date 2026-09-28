import process from 'node:process';
import { expandEntityQuery } from './lib/wikidata.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const query = String(args.query || args._.join(' ')).trim();
if (!query) fail('Suchbegriff fehlt.');
try {
  const result = await expandEntityQuery(query, { limit: Number(args.limit || 3) });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Entity Expand – Wikidata\n\n  npm run entity:expand -- "Mars Climate Orbiter"\n\nLiefert kostenlos und ohne API-Key alternative Namen, deutsche/englische Labels, Aliase und Wikipedia-Titel für bessere Archiv-Suchanfragen.`); }
