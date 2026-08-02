import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const taxonomyPath = path.join(root, 'catalog/taxonomy.json');
const catalogPath = path.join(root, 'catalog/assets.json');
const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

if (args.help) {
  printHelp();
  process.exit(0);
}

const required = ['type', 'category', 'subject', 'action', 'shot', 'orientation', 'title', 'description', 'tags', 'style', 'movement', 'license', 'source', 'scopes'];
const missing = required.filter((key) => !args[key]);
if (missing.length) fail(`Fehlende Argumente: ${missing.join(', ')}`);

assertMember(args.type, taxonomy.assetTypes, 'type');
assertMember(args.category, taxonomy.categories, 'category');
assertMember(args.shot, taxonomy.shotTypes, 'shot');
assertMember(args.orientation, taxonomy.orientations, 'orientation');
assertMember(args.style, taxonomy.styles, 'style');
assertMember(args.movement, taxonomy.cameraMovements, 'movement');
assertMember(args.license, taxonomy.licenseStatuses, 'license');

const storageKind = args.storage || (args.externalUrl ? 'external' : 'git-lfs');
assertMember(storageKind, ['repository', 'git-lfs', 'external'], 'storage');

const subject = slug(args.subject);
const action = slug(args.action);
const tags = uniqueList(args.tags).map(slug);
const aliases = uniqueList(args.aliases || '');
const secondaryCategories = uniqueList(args.secondaryCategories || '');
const usageScopes = uniqueList(args.scopes);
for (const category of secondaryCategories) assertMember(category, taxonomy.categories, 'secondary-categories');
for (const scope of usageScopes) assertMember(scope, taxonomy.usageScopes, 'scopes');
if (tags.length < 2) fail('Mindestens zwei Tags sind erforderlich.');

let sourceFile;
let extension;
if (storageKind === 'external') {
  if (!args.externalUrl) fail('Externer Speicher benötigt --external-url.');
  extension = slugExtension(args.extension || 'mp4');
} else {
  if (!args.file) fail('Repository- oder LFS-Speicher benötigt --file.');
  sourceFile = path.resolve(args.file);
  if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) fail('Quelldatei wurde nicht gefunden.');
  extension = slugExtension(path.extname(sourceFile).slice(1));
}

const prefix = taxonomy.typePrefixes[args.type];
const base = `${prefix}-${args.category}-${subject}-${action}-${args.shot}-${args.orientation}`;
const sequence = nextSequence(catalog.assets, base);
const filename = `${base}-${String(sequence).padStart(4, '0')}.${extension}`;
const id = createAssetId(new Set(catalog.assets.map((asset) => asset.id)));
const assetPath = `assets/${args.type}/${args.category}/${filename}`;
const now = new Date().toISOString();
const status = args.status || (args.license === 'unknown' ? 'inbox' : 'review');
assertMember(status, taxonomy.lifecycleStatuses, 'status');

const asset = {
  id,
  filename,
  title: args.title.trim(),
  description: args.description.trim(),
  type: args.type,
  category: args.category,
  secondaryCategories,
  tags,
  searchAliases: aliases,
  subject,
  action,
  orientation: args.orientation,
  shotType: args.shot,
  cameraMovement: args.movement,
  style: args.style,
  status,
  qualityRating: numberBetween(args.quality || '3', 1, 5, 'quality'),
  technical: compact({
    width: optionalNumber(args.width),
    height: optionalNumber(args.height),
    durationSeconds: optionalNumber(args.duration),
    fps: optionalNumber(args.fps),
    codec: args.codec,
    hasAudio: optionalBoolean(args.hasAudio),
    alphaChannel: optionalBoolean(args.alpha)
  }),
  storage: storageKind === 'external'
    ? compact({ kind: storageKind, externalUrl: args.externalUrl, previewPath: args.preview })
    : compact({ kind: storageKind, path: assetPath, previewPath: args.preview }),
  rights: compact({
    licenseStatus: args.license,
    sourceName: args.source.trim(),
    sourceUrl: args.sourceUrl,
    licenseUrl: args.licenseUrl,
    usageScopes,
    attributionRequired: args.attributionRequired === 'true',
    attributionText: args.attributionText,
    expiresAt: args.expires,
    notes: args.rightsNotes
  }),
  createdAt: args.createdAt || now,
  importedAt: now,
  createdBy: args.createdBy,
  sha256: sourceFile ? sha256(sourceFile) : undefined,
  notes: args.notes
};

const cleanAsset = compact(asset);
const previousCatalog = fs.readFileSync(catalogPath, 'utf8');
const nextCatalog = {
  ...catalog,
  updatedAt: now,
  assets: [...catalog.assets, cleanAsset].sort((a, b) => a.id.localeCompare(b.id))
};

console.log(JSON.stringify({ id, filename, target: storageKind === 'external' ? args.externalUrl : assetPath, status }, null, 2));
if (args.dryRun === 'true') {
  console.log('Dry-Run: keine Dateien verändert.');
  process.exit(0);
}

let copiedPath;
let copiedByScript = false;
try {
  if (sourceFile) {
    copiedPath = path.join(root, ...assetPath.split('/'));
    fs.mkdirSync(path.dirname(copiedPath), { recursive: true });
    if (path.resolve(sourceFile) !== path.resolve(copiedPath)) {
      fs.copyFileSync(sourceFile, copiedPath, fs.constants.COPYFILE_EXCL);
      copiedByScript = true;
    }
  }
  fs.writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);

  const validation = spawnSync(process.execPath, ['scripts/validate-catalog.mjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (validation.status !== 0) {
    throw new Error(validation.stderr || validation.stdout || 'Katalogprüfung fehlgeschlagen.');
  }
  const index = spawnSync(process.execPath, ['scripts/build-index.mjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (index.status !== 0) throw new Error(index.stderr || index.stdout || 'Indexerstellung fehlgeschlagen.');

  console.log(`Asset ${id} wurde sicher aufgenommen.`);
} catch (error) {
  fs.writeFileSync(catalogPath, previousCatalog);
  if (copiedByScript && copiedPath && fs.existsSync(copiedPath)) fs.rmSync(copiedPath, { force: true });
  fail(`Import wurde zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const entry = values[index];
    if (!entry.startsWith('--')) fail(`Unbekanntes Argument: ${entry}`);
    const key = camel(entry.slice(2));
    if (key === 'help') {
      result.help = true;
      continue;
    }
    const value = values[index + 1];
    if (!value || value.startsWith('--')) fail(`Wert für ${entry} fehlt.`);
    result[key] = value;
    index += 1;
  }
  return result;
}

function nextSequence(assets, base) {
  const pattern = new RegExp(`^${escapeRegExp(base)}-(\\d{4})\\.`);
  const used = assets
    .map((asset) => asset.filename.match(pattern)?.[1])
    .filter(Boolean)
    .map(Number);
  return used.length ? Math.max(...used) + 1 : 1;
}

function createAssetId(existing) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = randomBytes(8);
    let suffix = '';
    for (let index = 0; index < 8; index += 1) suffix += alphabet[bytes[index] % alphabet.length];
    const id = `VAH-${suffix}`;
    if (!existing.has(id)) return id;
  }
  fail('Es konnte keine eindeutige Asset-ID erzeugt werden.');
}

function slug(value) {
  const result = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!result) fail(`Ungültiger Slug-Wert: ${value}`);
  return result;
}

function uniqueList(value) {
  return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

function slugExtension(value) {
  const extension = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!extension) fail('Ungültige Dateiendung.');
  return extension;
}

function sha256(file) {
  const hash = createHash('sha256');
  const descriptor = fs.openSync(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
    return hash.digest('hex');
  } finally {
    fs.closeSync(descriptor);
  }
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== ''));
}

function optionalNumber(value) {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) fail(`Ungültige Zahl: ${value}`);
  return number;
}

function numberBetween(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`);
  return number;
}

function optionalBoolean(value) {
  if (value === undefined) return undefined;
  if (!['true', 'false'].includes(value)) fail(`Boolean muss true oder false sein: ${value}`);
  return value === 'true';
}

function assertMember(value, options, label) {
  if (!options.includes(value)) fail(`${label} ist ungültig: ${value}`);
}

function camel(value) {
  return value.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Visual Asset Hub Import\n\nBeispiel:\n  npm run asset:add -- \\\n    --file ./inbox/clip.mp4 \\\n    --type video --category technology-ai \\\n    --subject smartphone --action scrolling \\\n    --shot cu --orientation vertical \\\n    --title "Person scrollt am Smartphone" \\\n    --description "Nahaufnahme einer Hand beim Scrollen durch eine App." \\\n    --tags smartphone,scrolling,social-media \\\n    --style realistic --movement handheld \\\n    --license owned --source "Eigene Produktion" \\\n    --scopes organic-social,youtube,website\n\nMit --dry-run true werden nur ID, Name und Ziel berechnet.`);
}
