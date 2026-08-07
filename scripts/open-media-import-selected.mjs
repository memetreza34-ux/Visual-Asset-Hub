import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
for (const key of ['input', 'ids', 'category']) if (!args[key]) fail(`--${key} ist erforderlich.`);
const input = JSON.parse(fs.readFileSync(path.resolve(args.input), 'utf8'));
if (!['openverse', 'wikimedia'].includes(input.provider)) fail('Die Suchdatei enthält keine unterstützte offene Medienquelle.');
const provider = input.provider;
const requestedIds = unique(args.ids);
const selected = input.assets.filter((asset) => requestedIds.includes(String(asset.provider_id)));
const missing = requestedIds.filter((id) => !selected.some((asset) => String(asset.provider_id) === id));
if (missing.length) fail(`IDs nicht in der Suchdatei: ${missing.join(', ')}`);

const taxonomy = readJson(path.join(root, 'catalog/taxonomy.json'));
if (!taxonomy.categories.includes(args.category)) fail(`Ungültige Kategorie: ${args.category}`);
const catalogPath = path.join(root, 'catalog/assets.json');
const previousCatalog = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(previousCatalog);
const now = new Date().toISOString();
const scopes = unique(args.scopes || 'organic-social,youtube,website');
const tags = unique(`${args.tags || ''},${provider},open-license`).map(slug).filter(Boolean).slice(0, 40);
const aliases = unique(args.aliases || '');
const quality = integer(args.quality || '3', 1, 5);
const style = args.style || 'realistic';
const existingSources = new Set(catalog.assets.map((asset) => asset.rights?.sourceUrl).filter(Boolean));
const existingIds = new Set(catalog.assets.map((asset) => asset.id));
const plans = [];

for (const source of selected) {
  if (existingSources.has(source.source_url)) continue;
  const licenseStatus = normalizeLicense(source.license);
  if (!taxonomy.licenseStatuses.includes(licenseStatus)) fail(`Nicht unterstützter Lizenzstatus: ${licenseStatus}`);
  const orientation = normalizeOrientation(source.orientation, args.orientation);
  const subject = slug(args.query || input.query || source.title || provider) || provider;
  const base = `img-${args.category}-${subject}-still-image-not-applicable-${orientation}`;
  const filename = `${base}-${String(nextSequence([...catalog.assets, ...plans.map((p) => p.asset)], base)).padStart(4, '0')}.${extensionFromUrl(source.files?.original, 'jpg')}`;
  const creator = source.creator || `Unbekannter ${provider === 'wikimedia' ? 'Wikimedia' : 'Openverse'}-Urheber`;
  const attributionRequired = ['cc-by', 'cc-by-sa'].includes(licenseStatus);
  const sourceName = provider === 'wikimedia' ? 'Wikimedia Commons' : 'Openverse';
  const licenseUrl = source.license_url || licenseFallback(licenseStatus);
  const asset = {
    id: createAssetId(existingIds),
    filename,
    title: truncate(source.title || `${args.query || input.query} – ${sourceName}`, 160),
    description: truncate(`Offen lizenziertes Bild von ${sourceName} zum Thema „${args.query || input.query}“. Urheber: ${creator}. Lizenz und Motiv wurden automatisch vorgefiltert; Personen, Marken und Einsatzkontext müssen vor Freigabe geprüft werden.`, 1500),
    type: 'image',
    category: args.category,
    tags: tags.length >= 2 ? tags : [...tags, 'stock-media'],
    searchAliases: aliases,
    subject,
    action: 'still-image',
    orientation,
    shotType: 'not-applicable',
    cameraMovement: 'static',
    style,
    status: 'review',
    qualityRating: quality,
    technical: compact({ width: source.width, height: source.height, codec: extensionFromUrl(source.files?.original, 'jpg') }),
    storage: {
      kind: 'external',
      externalUrl: source.files?.original,
      previewUrl: source.preview_url || source.files?.medium || source.files?.original
    },
    rights: {
      licenseStatus,
      sourceName,
      sourceUrl: source.source_url,
      licenseUrl,
      usageScopes: scopes,
      attributionRequired,
      attributionText: source.attribution_text || `${creator} / ${sourceName}`,
      notes: `Offene Lizenz aus ${sourceName}-Metadaten übernommen. Vor Freigabe Original-Quellseite, Urheberangabe, Lizenzversion sowie erkennbare Personen und Marken erneut prüfen.`
    },
    createdAt: now,
    importedAt: now,
    createdBy: args['created-by'] || `${provider}-selected-import`,
    notes: `${sourceName} Asset-ID ${source.provider_id}. Aus Suche „${args.query || input.query}“ importiert; Status bleibt bis zur Sichtprüfung auf review.`
  };
  existingIds.add(asset.id);
  existingSources.add(source.source_url);
  plans.push({ asset });
}

console.log(JSON.stringify(plans.map(({ asset }) => ({ id: asset.id, source: asset.rights.sourceUrl, license: asset.rights.licenseStatus, title: asset.title })), null, 2));
if (args['dry-run'] === 'true') {
  console.log('Dry-Run: keine Dateien verändert.');
  process.exit(0);
}

try {
  const nextCatalog = {
    ...catalog,
    updatedAt: now,
    assets: [...catalog.assets, ...plans.map((plan) => plan.asset)].sort((a, b) => a.id.localeCompare(b.id))
  };
  fs.writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
  run('scripts/validate-catalog.mjs');
  run('scripts/validate-operations.mjs');
  run('scripts/build-index.mjs');
  console.log(`${plans.length} ${sourceLabel(provider)}-Bilder als review importiert.`);
} catch (error) {
  fs.writeFileSync(catalogPath, previousCatalog);
  fail(`Import zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
}

function sourceLabel(value) { return value === 'wikimedia' ? 'Wikimedia-Commons' : 'Openverse'; }
function normalizeLicense(value) {
  const license = String(value || '').toLowerCase();
  if (['public-domain', 'cc0', 'cc-by', 'cc-by-sa'].includes(license)) return license;
  if (license === 'pdm') return 'public-domain';
  if (license === 'by') return 'cc-by';
  if (license === 'by-sa') return 'cc-by-sa';
  throw new Error(`Nicht freigegebene Lizenz: ${value}`);
}
function licenseFallback(status) {
  if (status === 'cc0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (status === 'public-domain') return 'https://creativecommons.org/publicdomain/mark/1.0/';
  if (status === 'cc-by') return 'https://creativecommons.org/licenses/by/4.0/';
  if (status === 'cc-by-sa') return 'https://creativecommons.org/licenses/by-sa/4.0/';
  return '';
}
function normalizeOrientation(value, fallback) {
  if (['vertical', 'horizontal', 'square'].includes(value)) return value;
  if (value === 'portrait') return 'vertical';
  if (value === 'landscape') return 'horizontal';
  if (fallback === 'portrait') return 'vertical';
  if (fallback === 'landscape') return 'horizontal';
  if (['vertical', 'horizontal', 'square'].includes(fallback)) return fallback;
  return 'mixed';
}
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const [key, inline] = token.slice(2).split('=', 2); const next = values[i + 1]; result[key] = inline ?? (next && !next.startsWith('--') ? values[++i] : 'true'); } return result; }
function unique(value) { return [...new Set(String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean))]; }
function slug(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90); }
function integer(value, min, max) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) fail(`Zahl muss zwischen ${min} und ${max} liegen.`); return number; }
function extensionFromUrl(value, fallback) { try { return path.extname(new URL(value).pathname).slice(1).toLowerCase().replace('jpeg', 'jpg') || fallback; } catch { return fallback; } }
function nextSequence(assets, base) { const pattern = new RegExp(`^${escapeRegExp(base)}-(\\d{4})\\.`); const used = assets.map((a) => a.filename.match(pattern)?.[1]).filter(Boolean).map(Number); return used.length ? Math.max(...used) + 1 : 1; }
function createAssetId(existing) { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (let attempt = 0; attempt < 100; attempt += 1) { const bytes = randomBytes(8); let suffix = ''; for (let i = 0; i < 8; i += 1) suffix += alphabet[bytes[i] % alphabet.length]; const id = `VAH-${suffix}`; if (!existing.has(id)) return id; } throw new Error('Keine eindeutige Asset-ID erzeugbar.'); }
function compact(value) { return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== '' && entry !== null)); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function truncate(value, max) { const text = String(value); return text.length <= max ? text : `${text.slice(0, max - 1)}…`; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function run(script) { const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }); if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} fehlgeschlagen.`); if (result.stdout) process.stdout.write(result.stdout); }
function fail(message) { console.error(message); process.exit(1); }
