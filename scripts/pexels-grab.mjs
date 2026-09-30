import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { searchPexels } from './lib/pexels.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
loadDotEnv(path.join(root, '.env'));

if (args.help) { printHelp(); process.exit(0); }
const query = (args.query || args._.join(' ')).trim();
if (!query) fail('Suchbegriff fehlt. Nutze --help für Beispiele.');
const type = args.type || 'video';
if (!['video', 'photo'].includes(type)) fail('--type muss video oder photo sein.');
const pick = integer(args.pick || '1', 1, 80, 'pick');
const perPage = Math.max(pick, integer(args.perPage || '12', 1, 80, 'per-page'));
const maxDimension = integer(args.maxDimension || '1920', 480, 7680, 'max-dimension');

const result = await searchPexels({
  apiKey: process.env.PEXELS_API_KEY,
  query,
  type,
  orientation: args.orientation,
  locale: args.locale || 'de-DE',
  page: integer(args.page || '1', 1, 100000, 'page'),
  perPage
});

if (!result.assets.length) fail('Pexels hat keine passenden Assets gefunden.');
if (!result.assets[pick - 1]) fail(`Auswahl ${pick} existiert nicht. Gefunden wurden ${result.assets.length} Assets.`);
const asset = result.assets[pick - 1];
const chosen = chooseDownload(asset, maxDimension);
if (!chosen?.url) fail('Für dieses Asset wurde keine geeignete Download-Datei gefunden.');

const extension = extensionFor(chosen.url, chosen.fileType, type);
const filename = uniqueInboxName(`pexels-${type === 'video' ? 'video' : 'photo'}-${asset.provider_id}.${extension}`);
const target = path.join(root, 'inbox', filename);
const tmp = `${target}.part`;
fs.mkdirSync(path.dirname(target), { recursive: true });

console.log(`Pexels: ${asset.title}`);
console.log(`Creator: ${asset.creator || 'unbekannt'}`);
console.log(`Download: ${chosen.width || '?'}×${chosen.height || '?'} ${chosen.quality || ''}`.trim());

const response = await fetch(chosen.url, { headers: { 'User-Agent': 'Visual-Asset-Hub/0.6', Accept: '*/*' }, redirect: 'follow' });
if (!response.ok || !response.body) fail(`Download fehlgeschlagen (${response.status}).`);
const length = Number(response.headers.get('content-length') || 0);
const maxBytes = 600 * 1024 * 1024;
if (length > maxBytes) fail('Download ist größer als 600 MB und wurde aus Sicherheitsgründen abgebrochen.');
try {
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(tmp, { flags: 'wx' }));
  const size = fs.statSync(tmp).size;
  if (!size) throw new Error('Heruntergeladene Datei ist leer.');
  if (size > maxBytes) throw new Error('Heruntergeladene Datei überschreitet 600 MB.');
  fs.renameSync(tmp, target);
} catch (error) {
  if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
  fail(error instanceof Error ? error.message : String(error));
}

const metadataDir = path.join(root, '.local-storage', 'inbox-source');
fs.mkdirSync(metadataDir, { recursive: true });
const attributionText = `${type === 'video' ? 'Video' : 'Photo'} by ${asset.creator || 'Pexels contributor'} on Pexels`;
const metadata = {
  provider: 'pexels',
  providerId: asset.provider_id,
  searchQuery: query,
  title: asset.title,
  sourceName: asset.creator ? `Pexels — ${asset.creator}` : 'Pexels',
  sourceUrl: asset.source_url,
  creator: asset.creator,
  creatorUrl: asset.creator_url,
  licenseStatus: 'licensed',
  licenseUrl: 'https://www.pexels.com/license/',
  attributionRequired: false,
  attributionText,
  suggestedScopes: ['organic-social', 'youtube', 'website', 'paid-ads'],
  downloadedAt: new Date().toISOString(),
  downloadedFile: `inbox/${filename}`
};
fs.writeFileSync(path.join(metadataDir, `${filename}.json`), `${JSON.stringify(metadata, null, 2)}\n`);

console.log(`Gespeichert: inbox/${filename}`);
console.log('Quellenmetadaten gespeichert. Nächster Schritt: npm run inbox:scan oder Browser → Inbox neu scannen.');

function chooseDownload(asset, maxDimension) {
  if (asset.type === 'image') {
    const files = asset.files || {};
    const url = maxDimension <= 1920 ? files.large2x || files.large || files.original : files.original || files.large2x || files.large;
    return { url, width: asset.width, height: asset.height, quality: 'image', fileType: 'image/jpeg' };
  }
  const candidates = (asset.files || []).filter((file) => file.url && String(file.file_type || '').includes('mp4'));
  if (!candidates.length) return null;
  const fitting = candidates.filter((file) => Math.max(file.width || 0, file.height || 0) <= maxDimension && Math.max(file.width || 0, file.height || 0) >= 720);
  const pool = fitting.length ? fitting : candidates;
  return [...pool].sort((a, b) => scoreVideo(b, maxDimension) - scoreVideo(a, maxDimension))[0];
}
function scoreVideo(file, maxDimension) {
  const width = file.width || 0, height = file.height || 0, longest = Math.max(width, height);
  const oversizePenalty = longest > maxDimension ? (longest - maxDimension) * 1000000 : 0;
  const qualityBonus = file.quality === 'hd' ? 1000000000000 : 0;
  return qualityBonus + width * height - oversizePenalty;
}
function extensionFor(url, fileType, type) {
  if (String(fileType || '').includes('mp4')) return 'mp4';
  try {
    const ext = path.extname(new URL(url).pathname).slice(1).toLowerCase();
    if (/^[a-z0-9]{2,5}$/.test(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {}
  return type === 'video' ? 'mp4' : 'jpg';
}
function uniqueInboxName(base) {
  const folder = path.join(root, 'inbox');
  fs.mkdirSync(folder, { recursive: true });
  const ext = path.extname(base), stem = path.basename(base, ext);
  let name = base, index = 2;
  while (fs.existsSync(path.join(folder, name))) name = `${stem}-${index++}${ext}`;
  return name;
}
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('='); if (at < 1) continue;
    const key = line.slice(0, at).trim(); let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}
function parseArgs(values) {
  const result = { _: [] };
  for (let i = 0; i < values.length; i++) {
    const token = values[i];
    if (!token.startsWith('--')) { result._.push(token); continue; }
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'help') { result.help = true; continue; }
    const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`);
    result[key] = next; i++;
  }
  return result;
}
function integer(value, min, max, label) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function fail(message) { console.error(message); process.exit(1); }
function printHelp() {
  console.log(`Visual Asset Hub – Pexels gezielt in die Inbox laden\n\nBeispiele:\n  npm run pexels:grab -- "office worker laptop" --orientation vertical\n  npm run pexels:grab -- "Berlin skyline" --type photo --pick 3\n\nOptionen:\n  --query <text>             Suchbegriff\n  --type <video|photo>       Standard: video\n  --orientation <wert>       vertical, horizontal oder square\n  --pick <n>                 Welches Suchergebnis laden, Standard: 1\n  --per-page <n>             Suchergebnisse, Standard: 12\n  --max-dimension <px>       Video-Zielgröße, Standard: 1920\n  --page <n>                 Pexels-Ergebnisseite\n  --locale <wert>            Standard: de-DE\n\nBenötigt PEXELS_API_KEY in .env.`);
}
