import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { searchPexels } from './lib/pexels.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
loadDotEnv(path.join(root, '.env'));
const planPath = path.resolve(root, args.plan ?? 'reports/arsenal-plan.json');
const outputRoot = path.resolve(root, args.output ?? '.local-storage/arsenal-search');
const execute = args.execute === 'true';
const maxJobs = positiveInteger(args['max-jobs'], 20, 'max-jobs');
const delayMs = nonNegativeInteger(args.delay, 500, 'delay');
const force = args.force === 'true';

if (!fs.existsSync(planPath)) fail(`Plan fehlt: ${path.relative(root, planPath)}. Zuerst npm run arsenal:plan ausführen.`);
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const jobs = (plan.jobs ?? []).slice(0, maxJobs);
if (!jobs.length) fail('Der Plan enthält keine Suchaufträge.');

console.log(`Vorbereitet: ${jobs.length} von ${plan.jobs.length} Suchaufträgen.`);
console.log(`Ausgabe: ${path.relative(root, outputRoot)}`);
if (!execute) {
  console.log('Dry-Run: Es werden keine API-Anfragen gesendet. Mit --execute true starten.');
  for (const job of jobs) console.log(`- ${job.id}: ${job.query} · ${job.type} · ${job.orientation} · ${job.perPage}`);
  process.exit(0);
}
if (!process.env.PEXELS_API_KEY) fail('PEXELS_API_KEY fehlt in .env oder Umgebung.');

fs.mkdirSync(outputRoot, { recursive: true });
const results = [];
for (let index = 0; index < jobs.length; index += 1) {
  const job = jobs[index];
  const directory = path.join(outputRoot, job.channel, job.collection);
  const file = path.join(directory, `${job.id}.json`);
  if (!force && fs.existsSync(file)) {
    console.log(`[${index + 1}/${jobs.length}] Übersprungen: ${job.id}`);
    results.push({ id: job.id, status: 'skipped', file: path.relative(root, file) });
    continue;
  }
  try {
    const response = await searchPexels({
      apiKey: process.env.PEXELS_API_KEY,
      query: job.query,
      type: job.type,
      orientation: job.orientation,
      locale: 'de-DE',
      page: 1,
      perPage: job.perPage
    });
    fs.mkdirSync(directory, { recursive: true });
    const payload = {
      arsenalJob: job,
      searchedAt: new Date().toISOString(),
      result: response
    };
    fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`[${index + 1}/${jobs.length}] ${job.id}: ${response.assets.length} Treffer`);
    results.push({ id: job.id, status: 'success', count: response.assets.length, file: path.relative(root, file) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${index + 1}/${jobs.length}] ${job.id}: ${message}`);
    results.push({ id: job.id, status: 'failed', error: message });
    if (args['continue-on-error'] !== 'true') break;
  }
  if (index < jobs.length - 1 && delayMs > 0) await delay(delayMs);
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  plan: path.relative(root, planPath),
  requestedJobs: jobs.length,
  successful: results.filter((entry) => entry.status === 'success').length,
  skipped: results.filter((entry) => entry.status === 'skipped').length,
  failed: results.filter((entry) => entry.status === 'failed').length,
  totalAssets: results.reduce((sum, entry) => sum + (entry.count ?? 0), 0),
  results
};
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Fertig: ${manifest.successful} erfolgreich, ${manifest.skipped} übersprungen, ${manifest.failed} fehlgeschlagen, ${manifest.totalAssets} Treffer gespeichert.`);
if (manifest.failed) process.exitCode = 1;

function loadDotEnv(file) { if (!fs.existsSync(file)) return; for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) { const line = raw.trim(); if (!line || line.startsWith('#')) continue; const separator = line.indexOf('='); if (separator < 1) continue; const key = line.slice(0, separator).trim(); let value = line.slice(separator + 1).trim(); if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); process.env[key] ??= value; } }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const [key, inline] = token.slice(2).split('=', 2); const next = values[i + 1]; result[key] = inline ?? (next && !next.startsWith('--') ? values[++i] : 'true'); } return result; }
function positiveInteger(value, fallback, label) { if (value === undefined) return fallback; const number = Number(value); if (!Number.isInteger(number) || number < 1) fail(`${label} muss eine positive Ganzzahl sein.`); return number; }
function nonNegativeInteger(value, fallback, label) { if (value === undefined) return fallback; const number = Number(value); if (!Number.isInteger(number) || number < 0) fail(`${label} muss eine nichtnegative Ganzzahl sein.`); return number; }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function fail(message) { console.error(message); process.exit(1); }
