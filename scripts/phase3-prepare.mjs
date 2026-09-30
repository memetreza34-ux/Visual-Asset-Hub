import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const projectId = slug(args.project || '');
if (!projectId) fail('--project ist erforderlich.');
const dir = path.join(root, 'projects', projectId);

const projectFile = path.join(dir, 'project.json');
const project = readJson(projectFile);
const shotPlan = readJson(path.join(dir, 'shot-plan.json'));
const timings = readJson(path.join(dir, 'timings.json'));
const bindings = readJson(path.join(dir, 'beat-bindings.json'));
const catalog = readJson(path.join(root, 'catalog', 'assets.json'));

if (!project.voiceover?.path || project.voiceover.source !== 'user-provided' || project.voiceover.generatedByPipeline === true) fail('Phase 3 benötigt die echte Nutzer-Voiceover als Masterspur.');
if (!fs.existsSync(path.join(root, project.voiceover.path))) fail(`Voiceover-Datei fehlt: ${project.voiceover.path}`);
if (!Array.isArray(shotPlan.shots) || !shotPlan.shots.length) fail('shot-plan.json enthält keine Shots.');

const timingItems = timings.beats || timings.scenes || [];
if (!Array.isArray(timingItems) || !timingItems.length) fail('timings.json enthält keine Zeitspannen.');
const timingById = new Map(timingItems.map((item) => [item.id, item]));
const bindingsByShot = new Map((bindings.beats || []).map((item) => [item.beatId, item]));
const shotsByBeat = groupByBeat(shotPlan.shots);
const timeline = [];

for (const [beatId, shots] of shotsByBeat.entries()) {
  const beatTiming = timingById.get(beatId);
  const hasShotTimings = shots.every((shot) => timingById.has(shot.id));
  if (hasShotTimings) {
    for (const shot of shots) timeline.push(resolveShot(shot, timingById.get(shot.id)));
    continue;
  }
  if (!beatTiming) fail(`${beatId}: kein Beat-Timing vorhanden.`);
  const start = number(beatTiming.start, `${beatId}.start`);
  const end = number(beatTiming.end, `${beatId}.end`);
  if (end <= start) fail(`${beatId}: Timing ungültig.`);
  const beatDuration = end - start;
  if (beatDuration / shots.length < 0.2) fail(`${beatId}: ${shots.length} Shots sind für ${beatDuration.toFixed(2)}s zu viele. Phase 1 muss die Shot-Anzahl reduzieren.`);

  const weights = shots.map((shot) => targetWeight(shot));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || shots.length;
  let cumulativeWeight = 0;
  let cursor = start;
  for (let index = 0; index < shots.length; index++) {
    cumulativeWeight += weights[index];
    const shotEnd = index === shots.length - 1 ? end : start + beatDuration * (cumulativeWeight / totalWeight);
    timeline.push(resolveShot(shots[index], {start: cursor, end: shotEnd, confidence: beatTiming.confidence ?? null}));
    cursor = shotEnd;
  }
}

timeline.sort((a, b) => a.start - b.start || a.order - b.order);
validateTimeline(timeline, project.voiceover.durationSeconds);

const handoff = {
  version: 3,
  generatedAt: new Date().toISOString(),
  projectId,
  voiceover: project.voiceover,
  policy: {
    networkAllowed: false,
    phase1AssetsOnly: true,
    randomReplacementBroll: false,
    syntheticExplainerGraphics: false,
    remotionRole: 'assembly-only',
    voiceoverIsMasterTimeline: true
  },
  shots: timeline.map(({order, ...shot}) => shot)
};
const handoffFile = path.join(dir, 'phase3-handoff.json');
fs.writeFileSync(handoffFile, `${JSON.stringify(handoff, null, 2)}\n`);

project.workflowVersion = 3;
project.scenes = timeline.map((shot) => ({
  id: shot.id,
  beatId: shot.beatId,
  title: shot.title,
  durationSeconds: round(shot.end - shot.start),
  assetId: shot.assetId,
  trimStartSeconds: shot.trimStartSeconds || 0,
  fit: shot.renderer.fit || 'cover',
  presentation: shot.renderer.presentation || 'auto',
  transition: shot.renderer.transition || 'cut',
  overlays: shot.overlays || [],
  motion: shot.renderer.motion || undefined,
  focus: shot.renderer.focus || undefined,
  notes: `Phase3 v3 · ${shot.beatId} · local-only`
}));
project.status = 'phase3-prepared';
project.workflow = {...(project.workflow || {}), phase3TimingAndAssembly: 'prepared-local-only', phase4Render: 'ready'};
fs.writeFileSync(projectFile, `${JSON.stringify(project, null, 2)}\n`);

const exported = spawnSync(process.execPath, ['scripts/video-project.mjs', 'export', '--project', projectId], {cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe']});
if (exported.status !== 0) fail(`Render-Manifest konnte nicht erzeugt werden: ${(exported.stderr || exported.stdout || '').trim()}`);
process.stdout.write(exported.stdout || '');
console.log(`Phase3-Handoff: ${relative(handoffFile)}`);
console.log(`${timeline.length} Shots · ${new Set(timeline.map((shot) => shot.beatId)).size} Beats · Netzwerkzugriff in Phase 3: AUS`);

function resolveShot(shot, timing) {
  const binding = bindingsByShot.get(shot.id);
  if (!binding?.assetId) fail(`${shot.id}: kein Phase-1-Binding.`);
  const asset = catalog.assets?.find((item) => item.id === binding.assetId);
  if (!asset) fail(`${shot.id}: Asset ${binding.assetId} fehlt im Katalog.`);
  if (asset.status !== 'approved' || !asset.rights?.usageScopes?.includes('youtube')) fail(`${shot.id}: Asset ${asset.id} ist nicht publish-ready.`);
  if (asset.storage?.kind === 'external') fail(`${shot.id}: externes Asset ist in Phase 3 verboten. Erst lokal materialisieren.`);
  const localPath = asset.storage?.path;
  if (!localPath || !fs.existsSync(path.join(root, localPath))) fail(`${shot.id}: lokale Datei fehlt: ${localPath || 'kein Pfad'}`);
  return {
    order: shotPlan.shots.findIndex((item) => item.id === shot.id),
    id: shot.id,
    beatId: shot.beatId || shot.id,
    title: asset.title || shot.visualIntent || shot.id,
    start: round(number(timing.start, `${shot.id}.start`)),
    end: round(number(timing.end, `${shot.id}.end`)),
    assetId: asset.id,
    localSource: localPath,
    sourceUrl: asset.rights?.sourceUrl || binding.sourceUrl || null,
    attribution: asset.rights?.attributionText || null,
    trimStartSeconds: Number(shot.trimStartSeconds || 0),
    renderer: {
      presentation: shot.renderer?.presentation || 'auto',
      transition: shot.renderer?.transition || 'cut',
      fit: shot.renderer?.fit || 'cover',
      motion: shot.renderer?.motion || 'subtle documentary push/pan',
      focus: shot.renderer?.focus || null
    },
    overlays: Array.isArray(shot.overlays) ? shot.overlays : [],
    alignmentConfidence: timing.confidence ?? null
  };
}
function groupByBeat(shots) { const map = new Map(); for (const shot of shots) { const id = shot.beatId || shot.id; if (!map.has(id)) map.set(id, []); map.get(id).push(shot); } return map; }
function targetWeight(shot) { const value = shot.targetDurationSeconds; if (Array.isArray(value) && value.length >= 2) return Math.max(0.1, (Number(value[0]) + Number(value[1])) / 2); const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 1; }
function validateTimeline(items, audioDuration) {
  if (!items.length) fail('Leere Phase-3-Timeline.');
  let last = 0;
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) fail(`Doppelte Shot-ID: ${item.id}`);
    ids.add(item.id);
    if (item.start + 0.05 < last) fail(`${item.id}: Timeline überlappt.`);
    if (item.end - item.start < 0.19) fail(`${item.id}: Shot ist kürzer als 0.2s.`);
    last = item.end;
  }
  const delta = Math.abs(last - Number(audioDuration || 0));
  if (delta > 1) fail(`Shot-Timeline endet ${delta.toFixed(2)}s von der Voiceover-Länge entfernt.`);
}
function number(value, label) { const n = Number(value); if (!Number.isFinite(n)) fail(`${label} ungültig.`); return n; }
function round(value) { return Math.round(Number(value) * 1000) / 1000; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${relative(file)} – ${error.message}`); } }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function slug(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function parseArgs(values) { const out = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekannt: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { out.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); out[key] = next; i++; } return out; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Phase 3 Prepare v3\n\n  npm run phase3:prepare -- --project <id>\n\nNimmt Beat-Timings + Multi-Shot-Plan + lokale Phase-1-Bindings und erzeugt phase3-handoff.json + render-manifest.json. Multi-Shots werden exakt proportional innerhalb des echten Voiceover-Beats verteilt; zu viele Shots für einen zu kurzen Beat werden geblockt.`); }
