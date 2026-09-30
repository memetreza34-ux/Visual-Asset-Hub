import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
if (!hasBinary('ffmpeg')) fail('FFmpeg fehlt.');

const catalog = readJson(path.join(root, 'catalog/assets.json'));
let parent = null;
let sourceFile = null;
if (args.asset) {
  parent = catalog.assets.find((item) => item.id === args.asset);
  if (!parent) fail(`Asset nicht gefunden: ${args.asset}`);
  const source = parent.storage?.path;
  if (!source) fail('Frame-Extraktion unterstützt aktuell nur lokale Katalog-Assets.');
  sourceFile = safeRepoFile(source);
} else if (args.file) {
  sourceFile = path.resolve(args.file);
  if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) fail(`Datei nicht gefunden: ${args.file}`);
} else fail('--asset oder --file ist erforderlich.');

const at = number(args.at || '0', 0, 86400, 'at');
const label = safeName(args.name || parent?.title || path.basename(sourceFile, path.extname(sourceFile)));
const outputDir = args.toInbox === 'false' ? path.join(root, '.local-storage', 'frames') : path.join(root, 'inbox');
fs.mkdirSync(outputDir, {recursive: true});
const output = path.join(outputDir, `${parent ? `${parent.id.toLowerCase()}-` : ''}${label}-frame-${timeName(at)}.jpg`);

const result = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-ss', String(at), '-i', sourceFile,
  '-frames:v', '1', '-vf', "scale='min(1920,iw)':-2", '-q:v', '2', output
], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
if (result.status !== 0 || !fs.existsSync(output)) fail((result.stderr || result.stdout || 'Frame-Extraktion fehlgeschlagen.').trim());

if (args.toInbox !== 'false') writeMetadata(output, parent, at);
console.log(`Freeze-Frame: ${relative(output)}`);
console.log(`Zeitpunkt: ${at}s${parent ? ` · Parent ${parent.id}` : ''}`);

function writeMetadata(file, asset, seconds) {
  const dir = path.join(root, '.local-storage', 'inbox-source');
  fs.mkdirSync(dir, {recursive: true});
  const rights = asset?.rights || {};
  const metadata = {
    provider: 'derived-frame',
    providerId: asset?.id || path.basename(sourceFile),
    upstreamProvider: rights.sourceName || null,
    searchQuery: `freeze frame ${seconds}s`,
    title: asset ? `${asset.title} – Freeze Frame ${seconds}s` : `Freeze Frame ${seconds}s`,
    description: asset ? `Aus ${asset.id} bei ${seconds}s extrahiertes Standbild.` : `Lokales Standbild bei ${seconds}s.`,
    tags: [...new Set([...(asset?.tags || []), 'freeze-frame', 'derived-frame'])].slice(0, 30),
    sourceName: asset ? `Derived from ${asset.id} · ${rights.sourceName || 'source'}` : 'Lokale Datei – Rechte prüfen',
    sourceUrl: rights.sourceUrl || null,
    creator: asset?.createdBy || null,
    licenseStatus: rights.licenseStatus || 'unknown',
    licenseCode: rights.licenseStatus ? `inherits-${rights.licenseStatus}` : 'unknown',
    licenseUrl: rights.licenseUrl || null,
    attributionRequired: Boolean(rights.attributionRequired),
    attributionText: rights.attributionText || null,
    suggestedScopes: Array.isArray(rights.usageScopes) && rights.usageScopes.length ? rights.usageScopes : ['internal-only'],
    suggestedStatus: 'review',
    rightsWarning: asset
      ? `Abgeleitetes Standbild aus ${asset.id}. Dieselben Quellen-/Lizenzbedingungen wie beim Parent-Asset anwenden und vor Nutzung erneut prüfen.`
      : 'Quelldatei ist nicht katalogisiert. Rechte müssen vollständig geprüft werden.',
    downloadedAt: new Date().toISOString(),
    downloadedFile: relative(file)
  };
  fs.writeFileSync(path.join(dir, `${path.basename(file)}.json`), `${JSON.stringify(compact(metadata), null, 2)}\n`);
}

function safeRepoFile(source) { const file = path.resolve(root, source); const prefix = `${root}${path.sep}`; if (!file.startsWith(prefix)) fail('Asset liegt außerhalb des Repositories.'); if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`Asset-Datei fehlt: ${source}`); return file; }
function hasBinary(command) { return spawnSync(command, ['-version'], {encoding: 'utf8', stdio: ['ignore','pipe','pipe']}).status === 0; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${error.message}`); } }
function number(value, min, max, label) { const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'frame'; }
function timeName(value) { return String(Math.round(value * 1000) / 1000).replace('.', '-'); }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function compact(value) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')); }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Freeze Frame Extractor\n\nAus Katalog-Asset:\n  npm run frame:extract -- --asset VAH-XXXXXXXX --at 12.4\n\nAus lokaler Datei:\n  npm run frame:extract -- --file ./clip.mp4 --at 12.4\n\nStandard: Standbild landet in inbox/ und erbt bei Katalog-Assets Quellen-/Lizenzmetadaten, bleibt aber Status review.\nOption: --to-inbox false`); }
