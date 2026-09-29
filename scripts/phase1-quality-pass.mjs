import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const projectId = slug(args.project || '');
if (!projectId) fail('--project fehlt.');
const projectDir = path.join(root, 'projects', projectId);
const materializationFile = path.join(projectDir, 'materialization.json');
if (!fs.existsSync(materializationFile)) fail(`materialization.json fehlt für ${projectId}. Zuerst phase1:materialize ausführen.`);

const materialization = readJson(materializationFile);
const downloads = [];
for (const beat of materialization.beats || []) {
  for (const item of beat.downloads || []) {
    if (item.status !== 'downloaded' || !item.file) continue;
    const file = path.resolve(root, item.file);
    if (!fs.existsSync(file)) continue;
    downloads.push({ beatId: beat.id, candidateId: item.candidateId, file, relativeFile: item.file });
  }
}

const unique = [...new Map(downloads.map((item) => [item.relativeFile, item])).values()];
const report = {
  version: 1,
  projectId,
  generatedAt: new Date().toISOString(),
  policy: {
    defaultPassIsLightweight: true,
    deepToolsOptIn: true,
    qualityDoesNotGrantRights: true,
    qualityDoesNotProveEventIdentity: true,
    remotionSyntheticExplainers: false
  },
  assets: [],
  deep: null
};

for (const [index, item] of unique.entries()) {
  console.log(`[${index + 1}/${unique.length}] ${item.relativeFile}`);
  const entry = { beatId: item.beatId, candidateId: item.candidateId, file: item.relativeFile };
  entry.mediaQc = toolboxJson(['media-qc', '--file', item.file]);
  if (isImage(item.file)) {
    const quality = toolboxJson(['image-quality', '--file', item.file]);
    entry.imageQuality = quality.error ? { skipped: true, reason: quality.error } : quality;
  }
  report.assets.push(entry);
}

if (args.deep === 'true') {
  const images = unique.filter((item) => isImage(item.file));
  const deep = { enabled: true, assetMemory: [], visualDedupe: null };
  for (const item of images) {
    const result = toolboxJson(['asset-memory-index', '--file', item.file, '--id', item.candidateId || item.relativeFile]);
    deep.assetMemory.push(result.error ? { file: item.relativeFile, skipped: true, reason: result.error } : result);
  }
  if (images.length >= 2) {
    const dedupe = toolboxJson(['visual-dedupe', '--images', images.map((item) => item.file).join(',')]);
    deep.visualDedupe = dedupe.error ? { skipped: true, reason: dedupe.error } : dedupe;
  }
  report.deep = deep;
}

report.summary = {
  downloadedAssets: unique.length,
  imageAssets: unique.filter((item) => isImage(item.file)).length,
  videoAssets: unique.filter((item) => isVideo(item.file)).length,
  deepMode: args.deep === 'true'
};

const output = path.resolve(args.output || path.join(root, '.local-storage', 'phase1-quality', `${projectId}.json`));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Phase-1-QC: ${relative(output)}`);
console.log('Rechte- und Event-Review bleiben separat verpflichtend.');

function toolboxJson(values) {
  const result = spawnSync(process.execPath, ['scripts/open-source-toolchain.mjs', ...values], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) return { error: clean(result.stderr || result.stdout || 'Tool fehlgeschlagen.') };
  try { return JSON.parse(result.stdout); }
  catch { return { output: clean(result.stdout) }; }
}
function isImage(file) { return /\.(png|jpe?g|webp|avif|tiff?|gif)$/i.test(file); }
function isVideo(file) { return /\.(mp4|webm|mov|mkv|m4v|ogv|mpg|mpeg)$/i.test(file); }
function clean(value) { return String(value || '').trim().slice(0, 4000); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON ungültig: ${file}\n${error.message}`); } }
function relative(file) { const rel = path.relative(root, file); return rel.startsWith('..') ? file : rel.split(path.sep).join('/'); }
function slug(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekannt: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); const next = values[i + 1]; if (!next || next.startsWith('--')) { out[key] = 'true'; continue; } out[key] = next; i++; } return out; }
function help() { console.log(`Phase-1 Quality Pass\n\nNormal:\n  npm run phase1:quality -- --project <id>\n\nMit schweren optionalen Modellen:\n  npm run phase1:quality -- --project <id> --deep true\n\nNormal prüft Technik + pyiqa falls vorhanden. Deep ergänzt sqlite-vec/OpenCLIP Asset-Memory und DINOv2-Dublettenprüfung. Rechteprüfung bleibt separat.`); }
function fail(message) { console.error(message); process.exit(1); }
