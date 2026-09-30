import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help || !args.project) { help(); process.exit(args.help ? 0 : 1); }

const projectId = slug(args.project);
const projectDir = path.join(root, 'projects', projectId);
const project = readJson(path.join(projectDir, 'project.json'));
if (!project.voiceover?.path || project.voiceover.source !== 'user-provided' || project.voiceover.generatedByPipeline === true) fail('Keine vom Nutzer gelieferte Voiceover-Datei im Projekt.');
const audio = path.join(root, project.voiceover.path);
if (!fs.existsSync(audio)) fail(`Voiceover fehlt: ${project.voiceover.path}`);

const targets = alignmentTargets(projectDir);
if (!targets.length) fail('Keine Szenen/Visual-Beats zum Ausrichten gefunden.');
const model = path.resolve(args.model || process.env.WHISPER_CPP_MODEL || '');
if (!model || !fs.existsSync(model)) fail('whisper.cpp-Modell fehlt. Nutze --model <pfad> oder WHISPER_CPP_MODEL.');
const binary = args.binary || process.env.WHISPER_CPP_BINARY || 'whisper-cli';
const outputBase = path.join(projectDir, '.alignment', 'whisper');
fs.mkdirSync(path.dirname(outputBase), {recursive: true});

const result = spawnSync(binary, ['-m', model, '-f', audio, '-l', project.language || 'de', '-ojf', '-of', outputBase, '-np'], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
});
if (result.status !== 0) fail(`whisper.cpp fehlgeschlagen. ${(result.stderr || result.stdout || '').trim()}`);
const whisperJson = `${outputBase}.json`;
if (!fs.existsSync(whisperJson)) fail('whisper.cpp hat keine JSON-Datei erzeugt.');
const raw = readJson(whisperJson);
const segments = normalizeSegments(raw);
if (!segments.length) fail('Keine Whisper-Segmente gefunden.');

const aligned = alignTargets(targets, segments, project.voiceover.durationSeconds);
const editorial = targets[0]?.kind === 'beat';
const payload = {
  version: 3,
  projectId,
  source: 'whisper.cpp',
  audio: project.voiceover.path,
  audioDurationSeconds: project.voiceover.durationSeconds,
  generatedAt: new Date().toISOString(),
  policy: {
    voiceoverIsMaster: true,
    generatedVoiceForbidden: true,
    alignmentIsTimingAidNotScriptRewrite: true
  },
  [editorial ? 'beats' : 'scenes']: aligned
};
const target = path.join(projectDir, 'timings.json');
fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Timings erstellt: ${path.relative(root, target)}`);
console.log(`${aligned.length} ${editorial ? 'Beats' : 'Szenen'} · echte Voiceover-Datei bleibt Master-Audio.`);

function alignmentTargets(dir) {
  const visual = path.join(dir, 'visual-plan.json');
  if (fs.existsSync(visual)) {
    const plan = readJson(visual);
    return (plan.beats || []).map((beat, index) => ({
      id: beat.id || `beat-${String(index + 1).padStart(2, '0')}`,
      text: beat.narrationAnchor || beat.narration || '',
      kind: 'beat'
    })).filter((item) => item.text);
  }
  const sceneScript = path.join(dir, 'scene-script.json');
  if (fs.existsSync(sceneScript)) {
    const script = readJson(sceneScript);
    return (script.scenes || []).map((scene, index) => ({
      id: scene.id || `scene-${String(index + 1).padStart(2, '0')}`,
      text: scene.narration || '',
      kind: 'scene'
    })).filter((item) => item.text);
  }
  return [];
}

function normalizeSegments(raw) {
  const items = raw.transcription || raw.segments || [];
  return items.map((item, index) => {
    const start = timestampValue(item.timestamps?.from ?? item.start ?? item.offsets?.from ?? item.t0);
    const end = timestampValue(item.timestamps?.to ?? item.end ?? item.offsets?.to ?? item.t1);
    return {index, text: String(item.text || '').trim(), start, end};
  }).filter((item) => item.text && Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start);
}

function alignTargets(targets, segments, audioDuration) {
  const result = [];
  let cursor = 0;
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
    const target = targets[targetIndex];
    const targetWords = words(target.text);
    const startSegment = Math.min(cursor, segments.length - 1);
    let combined = [];
    let bestEnd = startSegment;
    let bestScore = -1;
    let localCursor = startSegment;

    while (localCursor < segments.length) {
      combined.push(...words(segments[localCursor].text));
      const score = similarity(targetWords, combined);
      if (score >= bestScore) { bestScore = score; bestEnd = localCursor; }
      localCursor++;
      const enough = combined.length >= Math.max(3, targetWords.length * 0.75);
      if (enough && (score >= 0.58 || combined.length >= Math.max(6, targetWords.length * 1.7))) break;
    }

    const start = targetIndex === 0 ? 0 : (result.at(-1)?.end ?? segments[startSegment]?.start ?? 0);
    let end = segments[bestEnd]?.end ?? start + 0.1;
    if (targetIndex < targets.length - 1) {
      const nextAnchor = targets[targetIndex + 1];
      const nextHit = findNextAnchor(nextAnchor.text, segments, Math.max(bestEnd + 1, startSegment));
      if (nextHit != null && segments[nextHit]?.start > start) end = segments[nextHit].start;
    } else {
      end = audioDuration;
    }
    end = Math.max(start + 0.05, Math.min(audioDuration, end));
    result.push({
      id: target.id,
      start: round(start),
      end: round(end),
      duration: round(end - start),
      confidence: round(Math.max(0, bestScore), 3),
      alignment: 'whisper-anchor-sequential'
    });
    cursor = Math.max(bestEnd + 1, startSegment + 1);
  }

  for (let index = 1; index < result.length; index++) result[index].start = result[index - 1].end;
  if (result.length) result[result.length - 1].end = round(audioDuration);
  for (const item of result) item.duration = round(item.end - item.start);
  return result;
}

function findNextAnchor(text, segments, from) {
  const target = words(text);
  if (!target.length) return null;
  let best = null;
  let bestScore = 0;
  for (let i = from; i < Math.min(segments.length, from + 8); i++) {
    const score = similarity(target, words(segments[i].text));
    if (score > bestScore) { bestScore = score; best = i; }
    if (score >= 0.72) return i;
  }
  return bestScore >= 0.45 ? best : null;
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
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) + Number((match[4] || '').padEnd(3, '0') || 0) / 1000;
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
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekannt: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { out.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); out[key] = next; i++; } return out; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${file}\n${error.message}`); } }
function slug(value) { const s = String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); if (!s) fail('Ungültige Projekt-ID.'); return s; }
function round(value, digits = 3) { const f = 10 ** digits; return Math.round(value * f) / f; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Voiceover Alignment v3 via whisper.cpp\n\n  npm run voiceover:align -- --project <id> --model ./models/ggml-small.bin\n\nEditorial-Projekte mit visual-plan.json werden automatisch auf narrationAnchor-Beats ausgerichtet. Klassische Projekte mit scene-script.json bleiben unterstützt. Erzeugt ausschließlich timings.json; keine Stimme wird erzeugt oder verändert.`); }
