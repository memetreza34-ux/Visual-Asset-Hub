import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.file) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const source = path.resolve(args.file);
if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`Datei nicht gefunden: ${source}`);

assertBinary('ffprobe');
const probe = run('ffprobe', [
  '-v', 'error',
  '-print_format', 'json',
  '-show_format',
  '-show_streams',
  source
]);

let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  fail('ffprobe lieferte keine gültigen JSON-Metadaten.');
}

const video = data.streams?.find((stream) => stream.codec_type === 'video');
const audio = data.streams?.find((stream) => stream.codec_type === 'audio');
const width = positiveInt(video?.width);
const height = positiveInt(video?.height);
const durationSeconds = positiveNumber(data.format?.duration ?? video?.duration);
const fps = parseRate(video?.avg_frame_rate || video?.r_frame_rate);
const orientation = detectOrientation(width, height);
const alphaChannel = detectAlpha(video?.pix_fmt);
const sha256 = hashFile(source);

const result = compact({
  file: path.relative(root, source).split(path.sep).join('/'),
  filename: path.basename(source),
  extension: path.extname(source).slice(1).toLowerCase(),
  sizeBytes: fs.statSync(source).size,
  sha256,
  mediaType: video ? 'video' : audio ? 'audio' : 'unknown',
  orientation,
  technical: compact({
    width,
    height,
    durationSeconds: round(durationSeconds, 3),
    fps: round(fps, 3),
    codec: video?.codec_name,
    pixelFormat: video?.pix_fmt,
    hasAudio: Boolean(audio),
    alphaChannel
  })
});

if (video && args.preview !== 'false') {
  assertBinary('ffmpeg');
  const previewPath = path.resolve(args.output || defaultPreviewPath(source, sha256));
  const relativePreview = path.relative(root, previewPath).split(path.sep).join('/');
  if (!relativePreview.startsWith('previews/') || relativePreview.includes('..')) {
    fail('Preview-Ausgabe muss innerhalb von previews/ liegen.');
  }
  fs.mkdirSync(path.dirname(previewPath), { recursive: true });
  const seek = durationSeconds && durationSeconds > 0 ? Math.min(durationSeconds * 0.25, Math.max(durationSeconds - 0.05, 0)) : 0;
  run('ffmpeg', [
    '-y', '-v', 'error',
    '-ss', String(seek),
    '-i', source,
    '-frames:v', '1',
    '-vf', 'scale=960:-2:force_original_aspect_ratio=decrease',
    previewPath
  ]);
  result.previewPath = relativePreview;
}

const json = `${JSON.stringify(result, null, 2)}\n`;
if (args.json) {
  const target = path.resolve(args.json);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, json);
}
process.stdout.write(json);

function assertBinary(binary) {
  const check = spawnSync(binary, ['-version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (check.error?.code === 'ENOENT') fail(`${binary} wurde nicht gefunden. Installiere FFmpeg und stelle sicher, dass ${binary} im PATH liegt.`);
  if (check.status !== 0) fail(`${binary} konnte nicht ausgeführt werden.`);
}

function run(binary, values) {
  const result = spawnSync(binary, values, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) fail(`${binary}: ${result.error.message}`);
  if (result.status !== 0) fail(result.stderr?.trim() || `${binary} ist fehlgeschlagen.`);
  return result;
}

function defaultPreviewPath(file, hash) {
  const base = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'asset';
  return path.join(root, 'previews', `${base}-${hash.slice(0, 10)}.jpg`);
}

function hashFile(file) {
  const hash = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, bytesRead));
    return hash.digest('hex');
  } finally {
    fs.closeSync(fd);
  }
}

function detectOrientation(width, height) {
  if (!width || !height) return undefined;
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

function detectAlpha(pixelFormat) {
  if (!pixelFormat) return undefined;
  return /(^|[^a-z])(rgba|argb|bgra|abgr|yuva|gbrap)/i.test(pixelFormat);
}

function parseRate(value) {
  if (!value || value === '0/0') return undefined;
  const [a, b] = String(value).split('/').map(Number);
  if (!Number.isFinite(a)) return undefined;
  if (b === undefined) return a;
  return Number.isFinite(b) && b !== 0 ? a / b : undefined;
}

function positiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function round(value, digits) {
  if (value === undefined) return undefined;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function parseArgs(values) {
  const result = {};
  for (let i = 0; i < values.length; i += 1) {
    const token = values[i];
    if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'help') {
      result.help = true;
      continue;
    }
    const value = values[i + 1];
    if (!value || value.startsWith('--')) fail(`Wert für ${token} fehlt.`);
    result[key] = value;
    i += 1;
  }
  return result;
}

function printHelp() {
  console.log(`Visual Asset Hub Medienanalyse\n\nVerwendung:\n  npm run media:analyze -- --file ./inbox/clip.mp4\n\nOptionen:\n  --file <pfad>       Zu analysierende Mediendatei\n  --preview false     Keine Vorschau erzeugen\n  --output <pfad>     Zielpfad der JPG-Vorschau unter previews/\n  --json <pfad>       Analyse zusätzlich als JSON speichern\n  --help              Hilfe anzeigen\n\nBenötigt FFmpeg (ffmpeg + ffprobe) im PATH.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
