import path from 'node:path';
import process from 'node:process';
import { PROVIDERS } from './lib/providers/index.mjs';
import { chooseDownload, downloadAsset, loadDotEnv, searchWithCache, writeSourceMetadata } from './lib/source-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
loadDotEnv(path.join(root, '.env'));
if (args.help) { help(); process.exit(0); }

const provider = String(args.provider || 'wikimedia').toLowerCase();
if (!PROVIDERS[provider]) fail(`Provider unbekannt: ${provider}`);
const type = args.type || (provider === 'openverse' ? 'image' : 'video');
const query = (args.query || args._.join(' ')).trim();
if (!query) fail('Suchbegriff fehlt.');
const pick = integer(args.pick || '1', 1, 200, 'pick');
const perPage = Math.max(pick, integer(args.perPage || '20', 1, provider === 'pixabay' ? 200 : 100, 'per-page'));
const maxDimension = integer(args.maxDimension || '1920', 480, 7680, 'max-dimension');

try {
  const result = await searchWithCache({
    root,
    provider,
    type,
    query,
    orientation: args.orientation,
    page: integer(args.page || '1', 1, 100000, 'page'),
    perPage,
    locale: args.locale || 'de-DE',
    language: args.language || 'de',
    refresh: args.refresh === 'true'
  });
  const asset = result.assets[pick - 1];
  if (!asset) fail(`Treffer ${pick} existiert nicht. Gefunden: ${result.assets.length}.`);
  const download = chooseDownload(asset, maxDimension);
  if (!download) fail('Für dieses Asset wurde keine Download-Datei gefunden.');

  console.log(`${provider}: ${asset.title}`);
  console.log(`Creator: ${asset.creator || 'unbekannt'}`);
  console.log(`Quelle: ${asset.source_url || 'unbekannt'}`);
  console.log(`Lizenz: ${asset.rights?.license_code || asset.rights?.license_status || 'unbekannt'}`);
  if (asset.rights?.warning) console.warn(`RECHTE-HINWEIS: ${asset.rights.warning}`);
  if (['unknown', 'restricted'].includes(asset.rights?.license_status)) {
    console.warn('Dieses Asset wird nur in die Review-Inbox geladen und darf nicht automatisch für YouTube freigegeben werden.');
  }

  const downloaded = await downloadAsset({ root, asset, download, provider });
  writeSourceMetadata({ root, downloaded, asset, provider, query });
  console.log(`Gespeichert: ${downloaded.relativePath}`);
  console.log('Quellenmetadaten wurden gespeichert. Danach: npm run inbox:scan oder Browser → Inbox neu scannen.');
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
function fail(message) { console.error(message); process.exit(1); }
function help() {
  console.log(`Visual Asset Hub – Asset in Inbox laden\n\nKostenlos / Archiv zuerst:\n  npm run source:grab -- "Apollo 11" --provider wikimedia --type image --pick 1\n  npm run source:grab -- "historic news film" --provider internet-archive --type video --pick 2\n  npm run source:grab -- "historic map" --provider openverse --type image --pick 3\n\nStock-Fallback:\n  npm run source:grab -- "factory automation" --provider pexels --type video\n\nProvider:\n  wikimedia | internet-archive | openverse | pexels | pixabay\n\nStandardprovider: wikimedia. Unklare/restriktive Rechte bleiben im Review und werden nicht automatisch für YouTube freigegeben.`);
}
