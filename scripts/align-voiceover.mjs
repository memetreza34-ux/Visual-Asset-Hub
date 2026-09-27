import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help || !args.project) { help(); process.exit(args.help ? 0 : 1); }

const projectId = slug(args.project);
const projectDir = path.join(root, 'projects', projectId);
const project = readJson(path.join(projectDir, 'project.json'));
const script = readJson(path.join(projectDir, 'scene-script.json'));
if (!project.voiceover?.path || project.voiceover.source !== 'user-provided') fail('Keine vom Nutzer gelieferte Voiceover-Datei im Projekt.');
const audio = path.join(root, project.voiceover.path);
if (!fs.existsSync(audio)) fail(`Voiceover fehlt: ${project.voiceover.path}`);
const model = path.resolve(args.model || process.env.WHISPER_CPP_MODEL || '');
if (!model || !fs.existsSync(model)) fail('whisper.cpp-Modell fehlt. Nutze --model <pfad> oder WHISPER_CPP_MODEL.');
const binary = args.binary || process.env.WHISPER_CPP_BINARY || 'whisper-cli';
const outputBase = path.join(projectDir, '.alignment', 'whisper');
fs.mkdirSync(path.dirname(outputBase), { recursive: true });

const result = spawnSync(binary, ['-m', model, '-f', audio, '-l', project.language || 'de', '-ojf', '-of', outputBase, '-np'], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
});
if (result.status !== 0) fail(`whisper.cpp fehlgeschlagen. ${(result.stderr || result.stdout || '').trim()}`);
const whisperJson = `${outputBase}.json`;
if (!fs.existsSync(whisperJson)) fail('whisper.cpp hat keine JSON-Datei erzeugt.');
const raw = readJson(whisperJson);
const segments = normalizeSegments(raw);
if (!segments.length) fail('Keine Whisper-Segmente gefunden.');

const timings = alignScenes(script.scenes || [], segments, project.voiceover.durationSeconds);
const target = path.join(projectDir, 'timings.json');
fs.writeFileSync(target, `${JSON.stringify({
  version: 1,
  projectId,
  source: 'whisper.cpp',
  audio: project.voiceover.path,
  audioDurationSeconds: project.voiceover.durationSeconds,
  generatedAt: new Date().toISOString(),
  scenes: timings
}, null, 2)}\n`);
console.log(`Timings erstellt: ${path.relative(root, target)}`);
console.log(`${timings.length} Szenen · echte Voiceover-Datei bleibt Master-Audio.`);

function normalizeSegments(raw) {
  const items = raw.transcription || raw.segments || [];
  return items.map((item, index) => {
    const start = timestampValue(item.timestamps?.from ?? item.start ?? item.offsets?.from ?? item.t0);
    const end = timestampValue(item.timestamps?.to ?? item.end ?? item.offsets?.to ?? item.t1);
    return { index, text: String(item.text || '').trim(), start, end };
  }).filter((item) => item.text && Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start);
}
function timestampValue(value) {
  if (typeof value === 'number') {
    if (value > 10000) return value / 1000;
    if (Number.isInteger(value) && value > 300) return value / 100;
    return value;
  }
  const text = String(value || '').trim();
  if (!text) return NaN;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const match = text.match(/(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/);
  if (!match) return NaN;
  const hours = Number(match[1] || 0), minutes = Number(match[2] || 0), seconds = Number(match[3] || 0), millis = Number((match[4] || '').padEnd(3, '0') || 0);
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}
function alignScenes(scenes, segments, audioDuration) {
  const result = [];
  let cursor = 0;
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex];
    const targetWords = words(scene.narration);
    const startSegment = cursor;
    let combined = [];
    let bestEnd = cursor;
    let bestScore = -1;
    while (cursor < segments.length) {
      combined.push(...words(segments[cursor].text));
      const score = similarity(targetWords, combined);
      if (score >= bestScore) { bestScore = score; bestEnd = cursor; }
      cursor++;
      if (combined.length >= Math.max(4, targetWords.length * 0.8) && (score >= 0.62 || combined.length >= targetWords.length * 1.35)) break;
    }
    if (bestEnd < startSegment) bestEnd = Math.max(startSegment, cursor - 1);
    cursor = bestEnd + 1;
    const start = sceneIndex === 0 ? 0 : segments[startSegment]?.start ?? result.at(-1)?.end ?? 0;
    let end = segments[bestEnd]?.end ?? start;
    if (sceneIndex === scenes.length - 1) end = audioDuration;
    result.push({
      id: scene.id,
      start: round(start),
      end: round(Math.max(start + 0.05, end)),
      duration: round(Math.max(0.05, end - start)),
      confidence: round(bestScore, 3),
      alignment: 'whisper-segment-greedy'
    });
  }
  for (let i = 1; i < result.length; i++) result[i].start = result[i - 1].end;
  for (const item of result) item.duration = round(item.end - item.start);
  return result;
}
function words(text) { return normalize(text).split(' ').filter(Boolean); }
function normalize(text) { return String(text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9äöüß]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  const counts = new Map();
  for (const word of b) counts.set(word, (counts.get(word) || 0) + 1);
  let matches = 0;
  for (const word of a) { const count = counts.get(word) || 0; if (count > 0) { matches++; counts.set(word, count - 1); } }
  const recall = matches / a.length;
  const precision = matches / b.length;
  return recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision);
}
function parseArgs(values) { const out = {}; for (let i=0;i<values.length;i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekannt: ${token}`); const key = token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()); if (key === 'help') { out.help = true; continue; } const next = values[i+1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); out[key] = next; i++; } return out; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${file}\n${error.message}`); } }
function slug(value) { const s=String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); if(!s) fail('Ungültige Projekt-ID.'); return s; }
function round(value, digits=3) { const f=10**digits; return Math.round(value*f)/f; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Voiceover Alignment via whisper.cpp\n\nVoraussetzungen:\n- echte Nutzer-Voiceover-Datei bereits mit youtube:workflow voiceover-attach übernommen\n- whisper.cpp whisper-cli lokal installiert\n- Modellpfad via --model oder WHISPER_CPP_MODEL\n\nBeispiel:\n  npm run voiceover:align -- --project handy-fokus-2min --model ./models/ggml-small.bin\n\nDer Befehl erzeugt projects/<id>/timings.json. Er erzeugt KEINE Stimme.`); }
