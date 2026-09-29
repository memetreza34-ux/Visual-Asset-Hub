import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

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
    downloads.push({beatId: beat.id, candidateId: item.candidateId, file, relativeFile: item.file});
  }
}
const unique = [...new Map(downloads.map((item) => [`${item.beatId}:${item.candidateId}:${item.relativeFile}`, item])).values()];
const report = {
  version: 2,
  projectId,
  generatedAt: new Date().toISOString(),
  policy: {
    defaultPassIsLightweight: true,
    deepToolsOptIn: true,
    qualityFeedsVisualQc: true,
    qualityDoesNotGrantRights: true,
    qualityDoesNotProveEventIdentity: true,
    remotionSyntheticExplainers: false
  },
  assets: [],
  deep: null
};

for (const [index, item] of unique.entries()) {
  console.log(`[${index + 1}/${unique.length}] ${item.relativeFile}`);
  const entry = {beatId:item.beatId,candidateId:item.candidateId,file:item.relativeFile};
  entry.mediaQc = toolboxJson(['media-qc','--file',item.file]);
  entry.technicalScore = technicalScore(entry.mediaQc);
  if (isImage(item.file)) {
    const quality = toolboxJson(['image-quality','--file',item.file]);
    entry.imageQuality = quality.error ? {skipped:true,reason:quality.error} : quality;
    entry.imageQualityScore = quality.error ? null : imageQualityScore(quality);
  } else {
    entry.imageQualityScore = null;
  }
  entry.qualityScore = combinedQuality(entry.technicalScore, entry.imageQualityScore);
  report.assets.push(entry);
}

if (args.deep === 'true') {
  const images = unique.filter((item) => isImage(item.file));
  const deep = {enabled:true,assetMemory:[],visualDedupe:null};
  for (const item of images) {
    const result = toolboxJson(['asset-memory-index','--file',item.file,'--id',item.candidateId || item.relativeFile]);
    deep.assetMemory.push(result.error ? {file:item.relativeFile,skipped:true,reason:result.error} : result);
  }
  if (images.length >= 2) {
    const dedupe = toolboxJson(['visual-dedupe','--images',images.map((item) => item.file).join(',')]);
    deep.visualDedupe = dedupe.error ? {skipped:true,reason:dedupe.error} : dedupe;
  }
  report.deep = deep;
}

report.summary = {
  downloadedAssets: unique.length,
  imageAssets: unique.filter((item) => isImage(item.file)).length,
  videoAssets: unique.filter((item) => isVideo(item.file)).length,
  scoredAssets: report.assets.filter((item) => Number.isFinite(item.qualityScore)).length,
  averageQualityScore: average(report.assets.map((item) => item.qualityScore).filter(Number.isFinite)),
  deepMode: args.deep === 'true'
};

const output = path.resolve(args.output || path.join(projectDir, 'phase1-quality.json'));
fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Phase-1-Quality: ${relative(output)}`);
console.log('Der Quality-Score ist nur ein Bild-/Techniksignal. Rechte und Ereignisidentität bleiben separate Gates.');

function technicalScore(payload) {
  if (!payload || payload.error) return null;
  const streams = payload.media?.track || payload.streams || [];
  const video = Array.isArray(streams) ? streams.find((item) => item['@type'] === 'Video' || item.codec_type === 'video') : null;
  const width = Number(video?.Width || video?.width || 0);
  const height = Number(video?.Height || video?.height || 0);
  const longest = Math.max(width, height);
  if (!longest) return 55;
  if (longest >= 3840) return 100;
  if (longest >= 1920) return 92;
  if (longest >= 1280) return 80;
  if (longest >= 960) return 65;
  if (longest >= 720) return 52;
  return 30;
}
function imageQualityScore(payload) {
  const scores = payload?.scores || {};
  const values = [];
  if (Number.isFinite(scores.brisque)) values.push(clamp(100 - scores.brisque, 0, 100));
  if (Number.isFinite(scores.niqe)) values.push(clamp(105 - scores.niqe * 9, 0, 100));
  if (Number.isFinite(scores.musiq)) values.push(clamp(scores.musiq, 0, 100));
  return values.length ? Math.round(average(values)) : null;
}
function combinedQuality(technical, imageQuality) {
  if (Number.isFinite(technical) && Number.isFinite(imageQuality)) return Math.round(technical * 0.45 + imageQuality * 0.55);
  if (Number.isFinite(imageQuality)) return Math.round(imageQuality);
  if (Number.isFinite(technical)) return Math.round(technical);
  return null;
}
function toolboxJson(values) {
  const result = spawnSync(process.execPath, ['scripts/open-source-toolchain.mjs', ...values], {cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if (result.status !== 0) return {error: clean(result.stderr || result.stdout || 'Tool fehlgeschlagen.')};
  try { return JSON.parse(result.stdout); } catch { return {output:clean(result.stdout)}; }
}
function isImage(file) { return /\.(png|jpe?g|webp|avif|tiff?|gif)$/i.test(file); }
function isVideo(file) { return /\.(mp4|webm|mov|mkv|m4v|ogv|mpg|mpeg)$/i.test(file); }
function average(values) { return values.length ? Math.round((values.reduce((sum,value)=>sum+Number(value),0) / values.length) * 100) / 100 : null; }
function clamp(value,min,max) { return Math.max(min,Math.min(max,value)); }
function clean(value) { return String(value || '').trim().slice(0,4000); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(error){ fail(`JSON ungültig: ${file}\n${error.message}`); } }
function relative(file) { const rel=path.relative(root,file); return rel.startsWith('..') ? file : rel.split(path.sep).join('/'); }
function slug(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function parseArgs(values) { const out={}; for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--'))fail(`Unbekannt: ${token}`);const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());const next=values[i+1];if(!next||next.startsWith('--')){out[key]='true';continue;}out[key]=next;i++;}return out; }
function help() { console.log(`Phase-1 Quality Pass v2\n\n  npm run phase1:quality -- --project <id>\n  npm run phase1:quality -- --project <id> --deep true\n\nErzeugt projects/<id>/phase1-quality.json. Der normalisierte Quality-Score fließt in visual:qc ein. Deep Mode ergänzt Asset-Memory und DINOv2-Dublettenprüfung.`); }
function fail(message) { console.error(message); process.exit(1); }
