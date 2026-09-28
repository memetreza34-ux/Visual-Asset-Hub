import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
if (!command || command === 'help' || args.help) { help(); process.exit(command ? 0 : 1); }
const projectId = args.project ? slug(args.project) : null;
const editorial = projectId && fs.existsSync(projectPath(projectId, 'visual-plan.json'));
if (!editorial) delegateLegacy();

if (command === 'phase1-plan') phase1Plan();
else if (command === 'phase1-materialize') runScript('scripts/phase1-materialize.mjs', forwardArgs(['project']));
else if (command === 'phase1-check') phase1Check(true);
else if (command === 'voiceover-attach') voiceoverAttach();
else if (command === 'phase3-check') phase3Check();
else if (command === 'phase1-discover') {
  console.log('Editorial v0.14: Discovery/Materialisierung ist archive-first.');
  console.log(`1) npm run beat:plan -- --plan projects/${projectId}/visual-plan.json`);
  console.log(`2) npm run phase1:materialize -- --project ${projectId} --download-top 1`);
  console.log(`3) npm run visual:qc -- --project ${projectId}`);
  console.log(`4) Inbox prüfen/importieren → npm run phase1:bind -- auto --project ${projectId}`);
} else fail(`Unbekannter Editorial-Befehl: ${command}`);

function phase1Plan() {
  requireProject();
  const plan = projectPath(projectId, 'visual-plan.json');
  if (!fs.existsSync(plan)) fail('visual-plan.json fehlt.');
  const values = ['scripts/beat-planner.mjs', '--plan', plan, '--output', projectPath(projectId, 'shot-plan.json')];
  if (args.styleProfile) values.push('--style-profile', path.resolve(args.styleProfile));
  runNode(values);
  console.log(`Shot-Plan bereit: projects/${projectId}/shot-plan.json`);
}

function phase1Check(print = false) {
  requireProject();
  const errors = [];
  const warnings = [];
  const required = ['project.json','research.json','voiceover-script.txt','visual-plan.json','shot-plan.json','materialization.json','visual-qc.json','beat-bindings.json'];
  for (const file of required) if (!fs.existsSync(projectPath(projectId, file))) errors.push(`Projektdatei fehlt: ${file}`);
  if (errors.length) return finishPhase1(errors, warnings, null, print);

  const project = readJson(projectPath(projectId, 'project.json'));
  const visualPlan = readJson(projectPath(projectId, 'visual-plan.json'));
  const shotPlan = readJson(projectPath(projectId, 'shot-plan.json'));
  const materialization = readJson(projectPath(projectId, 'materialization.json'));
  const qc = readJson(projectPath(projectId, 'visual-qc.json'));
  const bindings = readJson(projectPath(projectId, 'beat-bindings.json'));
  const catalog = readJson(path.join(root, 'catalog', 'assets.json'));

  if (project.workflowVersion !== 2 || project.requireUserVoiceover !== true) errors.push('Editorial-Projekt muss workflowVersion=2 und requireUserVoiceover=true setzen.');
  if (!Array.isArray(visualPlan.beats) || !visualPlan.beats.length) errors.push('visual-plan.json enthält keine Beats.');
  if (!Array.isArray(shotPlan.shots) || shotPlan.shots.length !== visualPlan.beats.length) errors.push('shot-plan.json muss exakt einen Shot pro Visual-Beat enthalten.');

  const shotById = new Map((shotPlan.shots || []).map((item) => [item.id, item]));
  const matById = new Map((materialization.beats || []).map((item) => [item.id, item]));
  const qcById = new Map((qc.beats || []).map((item) => [item.id, item]));
  const bindingById = new Map((bindings.beats || []).map((item) => [item.beatId, item]));
  let autoBound = 0;
  let explicitBound = 0;

  for (const beat of visualPlan.beats || []) {
    const shot = shotById.get(beat.id);
    if (!shot) { errors.push(`${beat.id}: fehlt im shot-plan.`); continue; }
    if (!shot.renderer?.presentation || !shot.renderer?.transition) errors.push(`${beat.id}: Renderer-Spezifikation fehlt.`);
    if (!Array.isArray(shot.mediaPriority) || !shot.mediaPriority.length) errors.push(`${beat.id}: Medienpriorität fehlt.`);
    if (shot.qualityGate?.requireRightsReview !== true) errors.push(`${beat.id}: Rechte-Gate fehlt.`);

    const material = matById.get(beat.id);
    if (!material?.selectedCandidateId) errors.push(`${beat.id}: Materializer hat keinen konkreten Kandidaten ausgewählt.`);
    if (material?.status?.startsWith('blocked')) errors.push(`${beat.id}: Materializer-Status ${material.status}.`);

    const binding = bindingById.get(beat.id);
    if (!binding?.assetId) { errors.push(`${beat.id}: kein echtes Asset gebunden.`); continue; }
    const asset = catalog.assets.find((item) => item.id === binding.assetId);
    if (!asset) { errors.push(`${beat.id}: gebundenes Asset ${binding.assetId} fehlt im Katalog.`); continue; }
    if (asset.status !== 'approved') errors.push(`${beat.id}: Asset ${asset.id} ist nicht approved.`);
    if (!asset.rights?.usageScopes?.includes('youtube')) errors.push(`${beat.id}: Asset ${asset.id} ist nicht für YouTube freigegeben.`);
    if (['unknown','restricted'].includes(asset.rights?.licenseStatus)) errors.push(`${beat.id}: Asset ${asset.id} hat ${asset.rights.licenseStatus}-Rechte.`);

    if (binding.bindingMode === 'auto-source-match') {
      autoBound++;
      const qcBeat = qcById.get(beat.id);
      const qcCandidate = qcBeat?.candidates?.find((item) => item.candidateId === binding.candidateId);
      if (!qcCandidate) errors.push(`${beat.id}: Auto-Binding ohne passenden Visual-QC-Eintrag.`);
      else {
        if (qcCandidate.status === 'blocked') errors.push(`${beat.id}: Visual-QC blockiert Auto-Binding.`);
        const minimum = Number(qc.policy?.minimumScore || 70);
        if (!Number.isFinite(qcCandidate.score) || qcCandidate.score < minimum) errors.push(`${beat.id}: QC-Score ${qcCandidate.score ?? 'fehlt'} < ${minimum}.`);
      }
    } else if (binding.bindingMode === 'explicit') {
      explicitBound++;
      if (binding.manualReviewed !== true) errors.push(`${beat.id}: explizites Binding ist nicht als redaktionell geprüft markiert.`);
      if (binding.forcedAgainstQc) warnings.push(`${beat.id}: QC-Block wurde explizit überschrieben.`);
    } else errors.push(`${beat.id}: unbekannter Binding-Modus.`);
  }

  for (const shot of shotPlan.shots || []) if (!(visualPlan.beats || []).some((beat) => beat.id === shot.id)) errors.push(`${shot.id}: Shot ohne Visual-Beat.`);
  const summary = { beats: visualPlan.beats?.length || 0, bound: bindings.beats?.filter((x) => x.assetId).length || 0, autoBound, explicitBound };
  return finishPhase1(errors, warnings, summary, print);
}

function finishPhase1(errors, warnings, summary, print) {
  if (print) warnings.forEach((item) => console.warn(`WARN ${item}`));
  if (print && errors.length) errors.forEach((item) => console.error(`- ${item}`));
  if (print && errors.length) fail(`Phase 1 NICHT fertig (${errors.length} Fehler).`);
  if (print) console.log(`Phase 1 v0.14 OK: ${summary.beats} Beats · ${summary.bound} echte Assets gebunden · ${summary.autoBound} automatisch nach QC · ${summary.explicitBound} explizit geprüft.`);
  return { errors, warnings, summary };
}

function voiceoverAttach() {
  requireProject();
  const gate = phase1Check(false);
  if (gate.errors.length) {
    gate.errors.forEach((item) => console.error(`- ${item}`));
    fail('Voiceover blockiert: Phase 1 besitzt noch nicht für jeden Beat ein freigegebenes, gebundenes Produktionsasset.');
  }
  if (!args.file) fail('--file ist erforderlich.');
  const source = path.resolve(args.file);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`Voiceover-Datei fehlt: ${source}`);
  const ext = path.extname(source).toLowerCase();
  if (!['.mp3','.wav','.m4a','.aac','.flac'].includes(ext)) fail('Voiceover muss MP3, WAV, M4A, AAC oder FLAC sein.');
  const durationSeconds = probeDuration(source);
  const audioDir = projectPath(projectId, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  const target = path.join(audioDir, `voiceover-master${ext}`);
  fs.copyFileSync(source, target);
  const projectFile = projectPath(projectId, 'project.json');
  const project = readJson(projectFile);
  project.voiceover = {
    path: relative(target),
    durationSeconds,
    sha256: sha256File(target),
    source: 'user-provided',
    generatedByPipeline: false,
    attachedAt: new Date().toISOString()
  };
  project.status = 'voiceover-ready';
  project.workflow = {
    ...(project.workflow || {}),
    phase1Research: 'complete',
    phase1Script: 'complete',
    phase1Visuals: 'complete-materialized',
    phase1ShotPlan: 'complete',
    phase1Materialization: 'complete',
    phase1Bindings: 'complete',
    phase2Voiceover: 'complete-user-audio',
    phase3TimingAndAssembly: 'ready',
    phase4Render: 'pending'
  };
  const artifacts = new Set(project.phase1Artifacts || []);
  ['shot-plan.json','materialization.json','visual-qc.json','beat-bindings.json'].forEach((x) => artifacts.add(x));
  project.phase1Artifacts = [...artifacts];
  fs.writeFileSync(projectFile, `${JSON.stringify(project, null, 2)}\n`);
  console.log(`Voiceover übernommen: ${relative(target)}`);
  console.log(`${durationSeconds.toFixed(3)}s · SHA-256 ${project.voiceover.sha256}`);
  console.log('Diese Audiodatei ist die Master-Timeline. Keine Ersatzstimme wurde erzeugt.');
}

function phase3Check() {
  requireProject();
  const project = readJson(projectPath(projectId, 'project.json'));
  if (!project.voiceover?.path || project.voiceover.source !== 'user-provided' || project.voiceover.generatedByPipeline === true) fail('Keine gültige Nutzer-Voiceover als Masterspur.');
  if (!fs.existsSync(path.join(root, project.voiceover.path))) fail(`Voiceover-Datei fehlt: ${project.voiceover.path}`);
  const shotPlan = readJson(projectPath(projectId, 'shot-plan.json'));
  const bindings = readJson(projectPath(projectId, 'beat-bindings.json'));
  const timings = readJson(projectPath(projectId, 'timings.json'));
  const spans = timings.beats || timings.scenes || [];
  const errors = [];
  if (spans.length !== shotPlan.shots.length) errors.push(`timings.json: ${spans.length} Zeitspannen statt ${shotPlan.shots.length}.`);
  const ids = new Set(shotPlan.shots.map((x) => x.id));
  const bindingIds = new Set(bindings.beats.filter((x) => x.assetId).map((x) => x.beatId));
  let lastEnd = 0;
  for (const span of spans) {
    if (!ids.has(span.id)) errors.push(`Unbekannte Timing-ID: ${span.id}`);
    if (!bindingIds.has(span.id)) errors.push(`${span.id}: kein gebundenes Asset.`);
    if (!Number.isFinite(span.start) || !Number.isFinite(span.end) || span.start < 0 || span.end <= span.start) errors.push(`${span.id}: ungültige Zeit.`);
    if (span.start + 0.05 < lastEnd) errors.push(`${span.id}: Timeline überlappt.`);
    lastEnd = Math.max(lastEnd, span.end || 0);
  }
  const delta = Math.abs(lastEnd - project.voiceover.durationSeconds);
  if (delta > 1) errors.push(`Timeline weicht ${delta.toFixed(2)}s von der echten Voiceover-Länge ab.`);
  if (errors.length) { errors.forEach((x) => console.error(`- ${x}`)); fail('Phase 3 ist nicht renderbereit.'); }
  console.log(`Phase 3 OK: ${spans.length} Beats folgen exakt der Nutzer-Voiceover (${project.voiceover.durationSeconds.toFixed(2)}s).`);
}

function delegateLegacy() {
  const result = spawnSync(process.execPath, ['scripts/youtube-workflow.mjs', command, ...rest], { cwd: root, stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
function runScript(script, values) { runNode([script, ...values]); }
function runNode(values) {
  const result = spawnSync(process.execPath, values, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
function forwardArgs(exclude = []) {
  const blocked = new Set(exclude);
  const out = [];
  for (const [key, value] of Object.entries(args)) {
    if (blocked.has(key) || key === 'help') continue;
    out.push(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, String(value));
  }
  out.push('--project', projectId);
  return out;
}
function requireProject() { if (!projectId) fail('--project ist erforderlich.'); }
function projectPath(id, file) { return path.join(root, 'projects', id, file); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON ungültig: ${relative(file)} – ${error.message}`); } }
function probeDuration(file) { const result = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1', file], { encoding: 'utf8' }); if (result.status !== 0) fail(`ffprobe konnte Audio nicht lesen: ${(result.stderr || '').trim()}`); const n = Number(result.stdout.trim()); if (!Number.isFinite(n) || n <= 0) fail('Voiceover-Dauer ungültig.'); return Math.round(n * 1000) / 1000; }
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function slug(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`YouTube Workflow v0.14\n\nEditorial Phase 1:\n  npm run youtube:workflow -- phase1-plan --project <id>\n  npm run youtube:workflow -- phase1-materialize --project <id> --download-top 1\n  npm run visual:qc -- --project <id>\n  npm run phase1:bind -- auto --project <id>\n  npm run youtube:workflow -- phase1-check --project <id>\n\nErst danach:\n  npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav\n\nPhase 3:\n  npm run youtube:workflow -- phase3-check --project <id>\n\nEditorial v0.14 blockiert Voiceover, solange nicht jeder Beat an ein approved YouTube-Asset mit geklärten Rechten gebunden ist. Legacy-Projekte werden automatisch an den alten Workflow delegiert.`); }
