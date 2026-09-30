import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const url = args.url || args._[0];
if (!url) fail('YouTube-/Video-URL fehlt.');
if (!/^https?:\/\//i.test(url)) fail('Referenz muss eine http(s)-URL sein.');

const cli = detectYtDlp();
if (!cli) fail('yt-dlp fehlt. Kostenlos installieren: macOS `brew install yt-dlp` oder `pipx install yt-dlp`. Es wird kein API-Key benötigt.');

const result = run(cli, ['--skip-download', '--dump-single-json', '--no-warnings', '--no-playlist', url]);
if (result.status !== 0) fail(`Referenz konnte nicht gelesen werden: ${(result.stderr || result.stdout || '').trim()}`);
let raw;
try { raw = JSON.parse(result.stdout); } catch { fail('yt-dlp hat keine gültigen JSON-Metadaten geliefert.'); }

const id = String(raw.id || 'reference');
const folder = path.join(root, '.local-storage', 'references', safeName(`${raw.extractor_key || 'video'}-${id}`));
fs.mkdirSync(folder, { recursive: true });

const report = {
  version: 1,
  inspectedAt: new Date().toISOString(),
  inputUrl: url,
  policy: {
    purpose: 'reference-analysis-only',
    mediaDownloaded: false,
    autoReuseAllowed: false,
    note: 'Metadaten/Untertitel helfen bei Stil- und Struktur-Analyse. Fremdes Videomaterial wird nicht automatisch als Produktionsasset übernommen.'
  },
  video: {
    id,
    title: raw.title || null,
    channel: raw.channel || raw.uploader || null,
    channelId: raw.channel_id || raw.uploader_id || null,
    webpageUrl: raw.webpage_url || url,
    durationSeconds: number(raw.duration),
    uploadDate: raw.upload_date || null,
    viewCount: number(raw.view_count),
    likeCount: number(raw.like_count),
    thumbnail: raw.thumbnail || null,
    description: String(raw.description || '').slice(0, 5000) || null,
    chapters: Array.isArray(raw.chapters) ? raw.chapters.map((chapter) => ({
      title: chapter.title || null,
      start: number(chapter.start_time),
      end: number(chapter.end_time)
    })) : [],
    subtitleLanguages: Object.keys(raw.subtitles || {}),
    automaticCaptionLanguages: Object.keys(raw.automatic_captions || {})
  }
};

if (args.captions !== 'false') {
  const captionDir = path.join(folder, 'captions');
  fs.mkdirSync(captionDir, { recursive: true });
  const template = path.join(captionDir, '%(id)s.%(language)s.%(ext)s');
  const captions = run(cli, [
    '--skip-download', '--no-playlist', '--no-warnings',
    '--write-subs', '--write-auto-subs',
    '--sub-langs', args.languages || 'de.*,de,en.*,en',
    '--sub-format', 'vtt',
    '--output', template,
    url
  ]);
  report.captions = {
    requested: true,
    commandSucceeded: captions.status === 0,
    files: listFiles(captionDir).map((file) => path.relative(root, file).split(path.sep).join('/')),
    warning: captions.status === 0 ? null : String(captions.stderr || captions.stdout || '').trim().slice(0, 1500)
  };
}

const output = path.join(folder, 'reference.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Referenz analysiert: ${report.video.title || id}`);
console.log(`Dauer: ${report.video.durationSeconds ?? '?'}s · Kanal: ${report.video.channel || '?'}`);
console.log(`Kapitel: ${report.video.chapters.length} · Captions: ${report.captions?.files?.length || 0}`);
console.log(`Report: ${path.relative(root, output)}`);
console.log('Es wurde KEIN Referenzvideo heruntergeladen.');

function detectYtDlp() {
  for (const candidate of [
    { command: 'yt-dlp', prefix: [] },
    { command: 'python3', prefix: ['-m', 'yt_dlp'] },
    { command: 'python', prefix: ['-m', 'yt_dlp'] }
  ]) {
    const check = spawnSync(candidate.command, [...candidate.prefix, '--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (check.status === 0) return candidate;
  }
  return null;
}
function run(cli, values) { return spawnSync(cli.command, [...cli.prefix, ...values], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 }); }
function listFiles(dir) { return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join(dir, entry.name)) : []; }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'reference'; }
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Reference Video Inspector (yt-dlp, kostenlos)\n\n  npm run reference:inspect -- "https://youtu.be/VIDEO_ID"\n\nStandard:\n- lädt KEIN Video herunter\n- liest Titel, Kanal, Dauer, Kapitel, Thumbnail-URL und Metadaten\n- lädt verfügbare Untertitel/Auto-Captions als VTT für Struktur-/Timinganalyse\n\nOptionen:\n  --captions false\n  --languages "de.*,de,en.*,en"\n\nBenötigt lokal yt-dlp. Kein API-Key.`); }
