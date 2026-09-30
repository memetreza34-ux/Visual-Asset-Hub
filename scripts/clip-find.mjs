import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const profilePath = path.resolve(args.profile || '');
const query = String(args.query || '').trim();
if (!profilePath || !fs.existsSync(profilePath)) fail('--profile style-profile.json fehlt.');
if (!query) fail('--query fehlt.');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const minSeconds = number(args.minSeconds, 1.2);
const maxSeconds = number(args.maxSeconds, 12);
const top = integer(args.top || '8', 1, 50, 'top');
const scenes = (profile.scenes || []).filter((scene) => scene.sampleFrame && Number(scene.durationSeconds) >= minSeconds && Number(scene.durationSeconds) <= maxSeconds);
if (!scenes.length) fail('Keine Shot-Frames im gewünschten Dauerbereich. Erzeuge das Profil zuerst mit reference:style und erhöhe ggf. --max-frames.');

const frames = scenes.map((scene) => resolveStoredPath(scene.sampleFrame));
const python = detectPython();
if (!python) fail('OpenCLIP fehlt. Installiere kostenlos: python3 -m pip install open_clip_torch pillow');
const outputDir = path.resolve(args.outputDir || path.join(root, '.local-storage', 'subclip-find', safeName(query)));
fs.mkdirSync(outputDir, { recursive: true });
const matchPath = path.join(outputDir, 'visual-match.json');
const run = spawnSync(python, [
  'scripts/visual-match.py', '--query', query, '--images', ...frames,
  '--output', matchPath,
  '--model', args.model || 'ViT-B-32',
  '--pretrained', args.pretrained || 'laion2b_s34b_b79k'
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
if (run.status !== 0) fail((run.stderr || run.stdout || 'OpenCLIP fehlgeschlagen.').trim());

const matches = JSON.parse(fs.readFileSync(matchPath, 'utf8')).results || [];
const scoreByFrame = new Map(matches.filter((item) => item.clipSimilarity !== null).map((item) => [path.resolve(item.file), item]));
const ranked = scenes.map((scene) => {
  const frame = resolveStoredPath(scene.sampleFrame);
  const match = scoreByFrame.get(frame);
  return {
    sceneId: scene.id,
    startSeconds: scene.startSeconds,
    endSeconds: scene.endSeconds,
    durationSeconds: scene.durationSeconds,
    sampleFrame: scene.sampleFrame,
    clipSimilarity: match?.clipSimilarity ?? null,
    relativeScore: match?.relativeScore ?? null,
    sourceFile: profile.sourceFile
  };
}).filter((item) => item.clipSimilarity !== null).sort((a, b) => b.clipSimilarity - a.clipSimilarity).slice(0, top);

const extracted = [];
if (args.extract === 'true') {
  if (!hasBinary('ffmpeg')) fail('FFmpeg fehlt für --extract true.');
  const source = resolveStoredPath(profile.sourceFile);
  if (!fs.existsSync(source)) fail(`Quellvideo aus Profil nicht gefunden: ${source}`);
  const clipDir = path.join(outputDir, 'clips');
  fs.mkdirSync(clipDir, { recursive: true });
  for (const item of ranked) {
    const target = path.join(clipDir, `${item.sceneId}-${safeName(query).slice(0, 30)}.mp4`);
    const result = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', String(item.startSeconds), '-i', source,
      '-t', String(item.durationSeconds), '-an',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-pix_fmt', 'yuv420p', target
    ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.status === 0 && fs.existsSync(target)) {
      item.extractedClip = relative(target);
      extracted.push(item.extractedClip);
    }
  }
}

const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  query,
  sourceProfile: relative(profilePath),
  sourceFile: profile.sourceFile,
  durationFilter: { minSeconds, maxSeconds },
  policy: {
    semanticRanking: 'OpenCLIP frame/text similarity',
    proofOfEventIdentity: false,
    note: 'Top-Treffer müssen weiterhin gegen Quelle/Ereignis geprüft werden. OpenCLIP entscheidet nicht über Faktizität oder Rechte.'
  },
  candidates: ranked,
  extracted
};
const output = path.join(outputDir, 'subclip-candidates.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Subclip-Suche: „${query}“`);
for (const [index, item] of ranked.entries()) console.log(`${index + 1}. ${Number(item.clipSimilarity).toFixed(4)} · ${item.startSeconds}s–${item.endSeconds}s · ${item.durationSeconds}s`);
console.log(`Report: ${relative(output)}`);

function resolveStoredPath(value) { return path.isAbsolute(String(value)) ? String(value) : path.resolve(root, String(value)); }
function detectPython() { for (const command of ['python3', 'python']) { const result = spawnSync(command, ['-c', 'import open_clip, torch, PIL; print("ok")'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); if (result.status === 0) return command; } return null; }
function hasBinary(command) { return spawnSync(command, ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).status === 0; }
function relative(file) { const value = path.relative(root, file); return value.startsWith('..') ? file : value.split(path.sep).join('/'); }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'subclip'; }
function number(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function integer(value, min, max, label) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Clip Finder – PySceneDetect + OpenCLIP\n\n1. Shot-Profil erzeugen:\n   npm run reference:style -- --file ./archive-video.mp4 --max-frames 120\n\n2. Besten Ausschnitt für einen Beat suchen:\n   npm run clip:find -- --profile .local-storage/reference-style/archive-video/style-profile.json --query "satellite lying damaged on factory floor"\n\nOptional:\n   --min-seconds 1.2\n   --max-seconds 12\n   --top 8\n   --extract true\n\nMit --extract true werden die Top-Shots als stumme MP4-Kandidaten ausgeschnitten.`); }
