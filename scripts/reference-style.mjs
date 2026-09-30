import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }

const input = path.resolve(args.file || args._[0] || '');
if (!input || !fs.existsSync(input) || !fs.statSync(input).isFile()) fail('Referenz-MP4 fehlt oder wurde nicht gefunden. Nutze --file <video.mp4>.');

const python = detectPython();
if (!python) fail('Python 3 mit PySceneDetect fehlt. Installiere kostenlos: python3 -m pip install "scenedetect[opencv]"');
if (!hasBinary('ffmpeg')) fail('FFmpeg fehlt.');

const base = safeName(path.basename(input, path.extname(input)));
const outputDir = path.resolve(args.outputDir || path.join(root, '.local-storage', 'reference-style', base));
const framesDir = path.join(outputDir, 'frames');
fs.mkdirSync(framesDir, { recursive: true });
const profilePath = path.join(outputDir, 'style-profile.json');

const py = spawnSync(python.command, [
  ...python.prefix,
  'scripts/reference-style.py',
  '--file', input,
  '--output', profilePath,
  '--threshold', String(number(args.threshold, 27)),
  '--min-scene-seconds', String(number(args.minSceneSeconds, 0.45))
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
if (py.status !== 0) fail((py.stderr || py.stdout || 'PySceneDetect-Analyse fehlgeschlagen.').trim());

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const maxFrames = integer(args.maxFrames || '60', 1, 200, 'max-frames');
const selected = evenlySample(profile.scenes || [], maxFrames);
const frameMap = new Map();
for (const scene of selected) {
  const frameName = `${scene.id}.jpg`;
  const target = path.join(framesDir, frameName);
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(scene.midpointSeconds), '-i', input,
    '-frames:v', '1', '-vf', "scale='min(960,iw)':-2", '-q:v', '3', target
  ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status === 0 && fs.existsSync(target)) frameMap.set(scene.id, relative(target));
}

profile.generatedAt = new Date().toISOString();
profile.sourceFile = relative(input);
profile.sampledFrames = frameMap.size;
profile.scenes = (profile.scenes || []).map((scene) => ({ ...scene, sampleFrame: frameMap.get(scene.id) || null }));
profile.editingProfile = buildEditingProfile(profile.stats || {});
profile.policy = {
  purpose: 'reference-style-analysis',
  copyBrandingOrCopyrightedMedia: false,
  note: 'Shot-Rhythmus und Layoutmuster duerfen als Produktionsreferenz dienen. Referenzmaterial selbst wird nicht automatisch als Asset uebernommen.'
};
fs.writeFileSync(profilePath, `${JSON.stringify(profile, null, 2)}\n`);

console.log(`Reference Style analysiert: ${path.basename(input)}`);
console.log(`Shots: ${profile.stats?.shotCount ?? 0} · Cuts/min: ${profile.stats?.cutsPerMinute ?? 0} · Median: ${profile.stats?.medianShotSeconds ?? '?'}s`);
console.log(`Sample-Frames: ${frameMap.size}`);
console.log(`Profil: ${relative(profilePath)}`);

function buildEditingProfile(stats) {
  const median = Number(stats.medianShotSeconds || 0);
  const cuts = Number(stats.cutsPerMinute || 0);
  return {
    pace: cuts >= 18 ? 'very-fast' : cuts >= 11 ? 'fast' : cuts >= 6 ? 'medium' : 'slow',
    targetVisualSeconds: median > 0 ? roundRange(Math.max(1.5, median * 0.65), Math.max(2.5, median * 1.35)) : [3, 6],
    recommendedInsertSeconds: median > 0 ? roundRange(Math.max(1, median * 0.3), Math.max(1.8, median * 0.7)) : [1.5, 3.5],
    hardCutBias: true,
    note: 'Diese Werte beschreiben nur den Schnittrhythmus. Bildtypen/Layouts werden in einer spaeteren Klassifikationsstufe ergaenzt.'
  };
}
function evenlySample(items, limit) {
  if (items.length <= limit) return items;
  const out = [];
  for (let i = 0; i < limit; i++) out.push(items[Math.round(i * (items.length - 1) / (limit - 1))]);
  return [...new Map(out.map((item) => [item.id, item])).values()];
}
function detectPython() {
  for (const command of ['python3', 'python']) {
    const result = spawnSync(command, ['-c', 'import scenedetect; print(scenedetect.__version__)'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.status === 0) return { command, prefix: [] };
  }
  return null;
}
function hasBinary(command) { return spawnSync(command, ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).status === 0; }
function relative(file) { const value = path.relative(root, file); return value.startsWith('..') ? file : value.split(path.sep).join('/'); }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'reference'; }
function number(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function integer(value, min, max, label) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function roundRange(a, b) { return [Math.round(a * 10) / 10, Math.round(b * 10) / 10]; }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert fuer ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Reference Style Analyzer\n\n  npm run reference:style -- --file ./reference.mp4\n\nKostenlos/lokal:\n- PySceneDetect erkennt Schnitte\n- FFmpeg speichert representative Frames\n- erzeugt style-profile.json mit Shot-Laengen, Cuts/min und Editing-Empfehlungen\n\nOptionen:\n  --threshold 27\n  --min-scene-seconds 0.45\n  --max-frames 60\n  --output-dir <ordner>\n\nBenötigt: Python 3 + scenedetect[opencv] + FFmpeg.`); }
