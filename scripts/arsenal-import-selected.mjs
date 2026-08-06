import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (!args.input) fail('--input ist erforderlich.');
if (!args.ids) fail('--ids ist erforderlich.');
const sourcePath = path.resolve(root, args.input);
if (!fs.existsSync(sourcePath)) fail(`Suchdatei fehlt: ${args.input}`);
const wrapper = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const job = wrapper.arsenalJob;
const result = wrapper.result;
if (!job || !result || !Array.isArray(result.assets)) fail('Die Datei ist kein gültiges Arsenal-Suchergebnis.');
const provider = wrapper.provider ?? result.provider ?? 'pexels';
if (!['pexels', 'pixabay'].includes(provider)) fail(`Nicht unterstützte Quelle: ${provider}`);

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-arsenal-import-'));
const tempInput = path.join(tempDirectory, `${provider}-result.json`);
fs.writeFileSync(tempInput, `${JSON.stringify(result, null, 2)}\n`);
const importer = provider === 'pixabay' ? 'scripts/pixabay-import-selected.mjs' : 'scripts/pexels-import-selected.mjs';
const childArgs = [
  importer,
  '--input', tempInput,
  '--ids', args.ids,
  '--category', job.category,
  '--orientation', job.orientation,
  '--query', job.query,
  '--tags', [...new Set(job.tags ?? [])].join(','),
  '--aliases', [job.channelLabel, job.collectionLabel, job.collection].filter(Boolean).join(','),
  '--scopes', args.scopes ?? 'organic-social,youtube,website',
  '--quality', args.quality ?? '3',
  '--created-by', args['created-by'] ?? `arsenal-${provider}-selected-import`
];
if (args.style) childArgs.push('--style', args.style);
if (args.shot) childArgs.push('--shot', args.shot);
if (args.movement) childArgs.push('--movement', args.movement);
if (args['dry-run'] === 'true') childArgs.push('--dry-run', 'true');

console.log(`Quelle: ${provider === 'pixabay' ? 'Pixabay' : 'Pexels'}`);
console.log(`Kanal: ${job.channelLabel} · Sammlung: ${job.collectionLabel}`);
console.log(`Kategorie: ${job.category} · Tags: ${(job.tags ?? []).join(', ')}`);
if (job.reviewNotes) console.log(`Review-Hinweis: ${job.reviewNotes}`);
const run = spawnSync(process.execPath, childArgs, { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 8 * 1024 * 1024 });
fs.rmSync(tempDirectory, { recursive: true, force: true });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const [key, inline] = token.slice(2).split('=', 2); const next = values[i + 1]; result[key] = inline ?? (next && !next.startsWith('--') ? values[++i] : 'true'); } return result; }
function fail(message) { console.error(message); process.exit(1); }
