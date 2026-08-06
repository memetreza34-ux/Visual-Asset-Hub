import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const index = readJson('catalog/channels/index.json');
const selectedChannels = String(args.channel ?? 'all').split(',').map((value) => value.trim()).filter(Boolean);
const selectedCollections = String(args.collection ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const selectedVariants = String(args.variant ?? 'all').split(',').map((value) => value.trim()).filter(Boolean);
const maxCollections = positiveInteger(args['max-collections'], Number.MAX_SAFE_INTEGER, 'max-collections');
const output = args.output ?? 'reports/arsenal-plan.json';
const csvOutput = args.csv ?? 'reports/arsenal-plan.csv';
const channels = index.files.map(readJson).filter((channel) => selectedChannels.includes('all') || selectedChannels.includes(channel.id));
const variants = index.variants.filter((variant) => selectedVariants.includes('all') || selectedVariants.includes(variant.id));

if (!channels.length) fail(`Kein Kanal gefunden: ${selectedChannels.join(', ')}`);
if (!variants.length) fail(`Keine Variante gefunden: ${selectedVariants.join(', ')}`);

const jobs = [];
let includedCollections = 0;
for (const channel of channels) {
  for (const collection of channel.collections) {
    if (selectedCollections.length && !selectedCollections.includes(collection.id) && !selectedCollections.includes(`${channel.id}/${collection.id}`)) continue;
    if (includedCollections >= maxCollections) break;
    includedCollections += 1;
    variants.forEach((variant, variantIndex) => {
      const query = collection.queries[variantIndex % collection.queries.length];
      jobs.push({
        id: `${channel.id}-${collection.id}-${variant.id}`,
        channel: channel.id,
        channelLabel: channel.label,
        collection: collection.id,
        collectionLabel: collection.label,
        category: channel.primaryCategory,
        query,
        type: variant.type,
        orientation: variant.orientation,
        perPage: variant.perPage,
        tags: [...new Set([channel.channelTag, `collection-${collection.id}`, ...collection.tags])],
        reviewNotes: collection.reviewNotes ?? '',
        status: 'planned'
      });
    });
  }
}

const plan = {
  version: 1,
  generatedAt: new Date().toISOString(),
  filters: { channels: selectedChannels, collections: selectedCollections, variants: selectedVariants, maxCollections },
  totals: {
    channels: new Set(jobs.map((job) => job.channel)).size,
    collections: new Set(jobs.map((job) => `${job.channel}/${job.collection}`)).size,
    jobs: jobs.length,
    requestedResults: jobs.reduce((sum, job) => sum + job.perPage, 0),
    videos: jobs.filter((job) => job.type === 'video').length,
    photos: jobs.filter((job) => job.type === 'photo').length,
    vertical: jobs.filter((job) => job.orientation === 'vertical').length,
    horizontal: jobs.filter((job) => job.orientation === 'horizontal').length
  },
  goals: index.goals,
  rules: index.rules,
  jobs
};

write(output, `${JSON.stringify(plan, null, 2)}\n`);
write(csvOutput, toCsv(jobs));
console.log(`Arsenal-Plan erzeugt: ${plan.totals.channels} Kanäle, ${plan.totals.collections} Sammlungen, ${plan.totals.jobs} Suchaufträge, bis zu ${plan.totals.requestedResults} Treffer.`);
console.log(`JSON: ${output}`);
console.log(`CSV: ${csvOutput}`);

function toCsv(rows) {
  const columns = ['id','channel','collection','category','query','type','orientation','perPage','tags','reviewNotes'];
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csv(column === 'tags' ? row.tags.join('|') : row[column] ?? '')).join(',')).join('\n')}\n`;
}
function csv(value) { const text = String(value).replaceAll('"', '""'); return `"${text}"`; }
function write(relative, content) { const file = path.resolve(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
function readJson(relative) { try { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); } catch (error) { fail(`Datei konnte nicht gelesen werden: ${relative}\n${error instanceof Error ? error.message : String(error)}`); } }
function positiveInteger(value, fallback, label) { if (value === undefined) return fallback; const number = Number(value); if (!Number.isInteger(number) || number < 1) fail(`${label} muss eine positive Ganzzahl sein.`); return number; }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const [key, inline] = token.slice(2).split('=', 2); const next = values[i + 1]; result[key] = inline ?? (next && !next.startsWith('--') ? values[++i] : 'true'); } return result; }
function fail(message) { console.error(message); process.exit(1); }
