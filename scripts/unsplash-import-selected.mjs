import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { buildImportPlans } from './pexels-batch-import.mjs';
import { trackUnsplashDownload } from './lib/unsplash.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
for (const key of ['input', 'ids', 'category']) if (!args[key]) fail(`--${key} ist erforderlich.`);
const apiKey = String(process.env.UNSPLASH_ACCESS_KEY || '').trim();
if (!apiKey) fail('UNSPLASH_ACCESS_KEY fehlt für die vorgeschriebene Download-Meldung.');

const input = JSON.parse(fs.readFileSync(path.resolve(args.input), 'utf8'));
if (input.provider !== 'unsplash') fail('Die Suchdatei enthält keine Unsplash-Ergebnisse.');
const requestedIds = unique(args.ids);
const selected = input.assets.filter((asset) => requestedIds.includes(String(asset.provider_id)));
const missing = requestedIds.filter((id) => !selected.some((asset) => String(asset.provider_id) === id));
if (missing.length) fail(`IDs nicht in der Suchdatei: ${missing.join(', ')}`);

const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'catalog/taxonomy.json'), 'utf8'));
if (!taxonomy.categories.includes(args.category)) fail(`Ungültige Kategorie: ${args.category}`);
const catalogPath = path.join(root, 'catalog/assets.json');
const previousCatalog = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(previousCatalog);
const options = {
  query: args.query || input.query,
  type: 'photo',
  category: args.category,
  orientation: args.orientation || 'any',
  count: selected.length,
  tags: args.tags || '',
  aliases: args.aliases || '',
  secondaryCategories: unique(args['secondary-categories'] || ''),
  scopes: unique(args.scopes || 'organic-social,youtube,website'),
  status: 'review',
  style: args.style || 'realistic',
  shot: args.shot,
  movement: args.movement,
  quality: integer(args.quality || '3', 1, 5),
  createdBy: args['created-by'] || 'unsplash-selected-import',
  storePreviews: false
};

const rawPlans = buildImportPlans({ result: { ...input, assets: selected }, catalog, taxonomy, options });
const bySource = new Map(selected.map((asset) => [asset.source_url, asset]));
const plans = rawPlans.map((plan) => transformPlan(plan, bySource.get(plan.asset.rights.sourceUrl), options));
if (plans.length !== selected.length) console.warn(`${selected.length - plans.length} bereits vorhandene Quellen wurden übersprungen.`);
console.log(JSON.stringify(plans.map(({ asset }) => ({ id: asset.id, unsplash: asset.rights.sourceUrl, title: asset.title })), null, 2));
if (args['dry-run'] === 'true') {
  console.log('Dry-Run: keine Download-Meldung gesendet und keine Dateien verändert.');
  process.exit(0);
}

try {
  for (const plan of plans) {
    await trackUnsplashDownload({ apiKey, downloadLocation: plan.downloadLocation });
  }

  const nextCatalog = {
    ...catalog,
    updatedAt: new Date().toISOString(),
    assets: [...catalog.assets, ...plans.map((plan) => plan.asset)].sort((a, b) => a.id.localeCompare(b.id))
  };
  fs.writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
  run('scripts/validate-catalog.mjs');
  run('scripts/validate-operations.mjs');
  run('scripts/build-index.mjs');
  console.log(`${plans.length} ausgewählte Unsplash-Bilder als review importiert; Download-Ereignisse wurden gemeldet.`);
} catch (error) {
  fs.writeFileSync(catalogPath, previousCatalog);
  fail(`Import zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
}

function transformPlan(plan, sourceAsset, options) {
  if (!sourceAsset) throw new Error(`Unsplash-Quelldaten fehlen für ${plan.asset.id}.`);
  if (!sourceAsset.download_location) throw new Error(`download_location fehlt für Unsplash ${sourceAsset.provider_id}.`);
  const creator = sourceAsset.creator || 'Unbekannter Unsplash-Fotograf';
  const creatorLink = sourceAsset.creator_url || 'https://unsplash.com';
  const externalUrl = sourceAsset.files?.medium || sourceAsset.files?.large;
  if (!externalUrl) throw new Error(`Hotlink-URL fehlt für Unsplash ${sourceAsset.provider_id}.`);
  const tags = [...new Set((plan.asset.tags ?? []).filter((tag) => tag !== 'pexels').concat('unsplash'))];

  return {
    downloadLocation: sourceAsset.download_location,
    asset: {
      ...plan.asset,
      title: `${options.query} – Foto von ${creator}`.slice(0, 160),
      description: `Über die offizielle Unsplash API gefundenes Foto zum Thema „${options.query}“. Fotograf: ${creator}. Vor der Freigabe Inhalt, erkennbare Personen, Marken und Einsatzkontext prüfen.`,
      tags,
      storage: {
        kind: 'external',
        externalUrl,
        previewUrl: sourceAsset.preview_url || externalUrl
      },
      rights: {
        licenseStatus: 'licensed',
        sourceName: 'Unsplash',
        sourceUrl: sourceAsset.source_url,
        licenseUrl: 'https://unsplash.com/license',
        usageScopes: options.scopes,
        attributionRequired: true,
        attributionText: `Foto von ${creator} auf Unsplash – ${creatorLink}`,
        notes: 'Unsplash API: Bild-URL wird hotgelinkt; Fotograf und Unsplash müssen sichtbar genannt und verlinkt werden. Download-Ereignis wurde beim Import gemeldet. Marken, Personen und weitere Rechte separat prüfen.'
      },
      createdBy: options.createdBy,
      notes: `Unsplash Asset-ID ${sourceAsset.provider_id}. Aus Suche „${options.query}“ importiert; Status bleibt bis zur Sichtprüfung auf review.`
    }
  };
}

function run(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} fehlgeschlagen.`);
  if (result.stdout) process.stdout.write(result.stdout);
}
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const [key, inline] = token.slice(2).split('=', 2); const next = values[i + 1]; result[key] = inline ?? (next && !next.startsWith('--') ? values[++i] : 'true'); } return result; }
function unique(value) { return [...new Set(String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean))]; }
function integer(value, min, max) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) fail(`Zahl muss zwischen ${min} und ${max} liegen.`); return number; }
function fail(message) { console.error(message); process.exit(1); }
