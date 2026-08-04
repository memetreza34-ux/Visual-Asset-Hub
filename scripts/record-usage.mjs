import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') { help(); process.exit(0); }
for (const key of ['asset', 'project', 'platform']) if (!args[key]) fail(`--${key} ist erforderlich.`);
const project = slug(args.project);
const platforms = ['tiktok','instagram','youtube','facebook','snapchat','website','app','presentation','client-work','other'];
if (!platforms.includes(args.platform)) fail(`Ungültige Plattform: ${args.platform}`);
if (args.url) safeUrl(args.url);

const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/assets.json'), 'utf8'));
const asset = catalog.assets.find((item) => item.id === args.asset);
if (!asset) fail(`Asset nicht gefunden: ${args.asset}`);
if (asset.status !== 'approved' && args['allow-unapproved'] !== 'true') fail(`Asset ist ${asset.status}. Nutzung erst nach Freigabe dokumentieren.`);
const usagePath = path.join(root, 'catalog/usage.json');
const previous = fs.existsSync(usagePath) ? fs.readFileSync(usagePath, 'utf8') : null;
const usage = previous ? JSON.parse(previous) : { version: 1, updatedAt: new Date(0).toISOString(), uses: [] };
const duplicate = usage.uses.some((item) => item.assetId === asset.id && item.project === project && (item.contentUrl || '') === (args.url || ''));
if (duplicate && args['allow-duplicate'] !== 'true') fail('Diese Nutzung ist bereits dokumentiert.');
const usedAt = args.date ? new Date(args.date).toISOString() : new Date().toISOString();
const entry = {
  id: `USE-${randomBytes(6).toString('hex').toUpperCase()}`,
  assetId: asset.id,
  project,
  projectTitle: args.title?.trim() || args.project.trim(),
  platform: args.platform,
  contentUrl: args.url || '',
  usedAt,
  notes: args.notes?.trim() || ''
};
console.log(JSON.stringify(entry, null, 2));
if (args['dry-run'] === 'true') { console.log('Dry-Run: keine Dateien verändert.'); process.exit(0); }
try {
  usage.updatedAt = new Date().toISOString();
  usage.uses = [...usage.uses, entry];
  fs.writeFileSync(usagePath, `${JSON.stringify(usage, null, 2)}\n`);
  run('scripts/validate-operations.mjs');
  run('scripts/build-index.mjs');
  console.log(`Nutzung ${entry.id} gespeichert.`);
} catch (error) {
  if (previous === null) fs.rmSync(usagePath, { force: true }); else fs.writeFileSync(usagePath, previous);
  fail(`Nutzung zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
}

function run(script) { const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }); if (result.status !== 0) throw new Error(result.stderr || result.stdout); if (result.stdout) process.stdout.write(result.stdout); }
function parseArgs(values) { const result = {}; for (let i=0;i<values.length;i+=1){const token=values[i];if(!token.startsWith('--'))fail(`Unbekanntes Argument: ${token}`);const[key,inline]=token.slice(2).split('=',2);const next=values[i+1];result[key]=inline??(next&&!next.startsWith('--')?values[++i]:'true');}return result; }
function slug(value) { const result=String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); if(!result)fail('Projektname ist ungültig.'); return result; }
function safeUrl(value) { try { const url=new URL(value); if(!['http:','https:'].includes(url.protocol))throw new Error(); } catch { fail('--url muss eine gültige HTTP(S)-URL sein.'); } }
function fail(message){console.error(message);process.exit(1);}
function help(){console.log(`Asset-Nutzung dokumentieren.\n\nBeispiel:\n  npm run usage:add -- --asset VAH-XXXXXXXX --project elektro-klar-reel-01 --platform tiktok --url https://...`);}
