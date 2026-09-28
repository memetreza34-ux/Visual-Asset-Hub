import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import {PROVIDERS} from './lib/providers/index.mjs';
import {loadDotEnv, searchWithCache} from './lib/source-utils.mjs';

const root = process.cwd();
const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
loadDotEnv(path.join(root, '.env'));

if (!command || command === 'help' || args.help) {
  help();
  process.exit(command ? 0 : 1);
}

if (command === 'phase1-plan') phase1Plan();
else if (command === 'phase1-discover') await phase1Discover();
else if (command === 'phase1-check') phase1Check();
else if (command === 'voiceover-attach') voiceoverAttach();
else if (command === 'phase3-check') phase3Check();
else fail(`Unbekannter Befehl: ${command}`);

function phase1Plan() {
  const projectId = requiredProject();
  const mode = workflowMode(projectId);
  if (mode !== 'editorial') fail('phase1-plan ist für Editorial-v0.13-Projekte mit visual-plan.json gedacht.');
  ensureShotPlan(projectId, true);
  console.log(`Editorial Shot-Plan bereit: projects/${projectId}/shot-plan.json`);
}

async function phase1Discover() {
  const projectId = requiredProject();
  const mode = workflowMode(projectId);
  if (mode === 'editorial') {
    console.log('Editorial-v0.13 nutzt archive-first Research vor dem Voiceover.');
    console.log(`Nutze visual-plan.json + documentary:research / research:discover und danach: npm run youtube:workflow -- phase1-plan --project ${projectId}`);
    return;
  }
  await legacyPhase1Discover(projectId);
}

function phase1Check() {
  const projectId = requiredProject();
  const mode = workflowMode(projectId);
  const result = mode === 'editorial' ? validateEditorialPhase1(projectId, {autoPlan: true}) : validateLegacyPhase1(projectId);
  if (result.errors.length) {
    result.errors.forEach((error) => console.error(`- ${error}`));
    fail(`Phase 1 NICHT fertig (${result.errors.length} Fehler).`);
  }
  if (mode === 'editorial') {
    console.log(`Phase 1 OK: ${result.summary.beats} Visual-Beats · ${result.summary.external} externe/archivierte Lösungen · ${result.summary.internal} interne/abgeleitete Lösungen.`);
    console.log('Voiceover darf jetzt angehängt werden. Phase 3 darf die Story/Visual-Entscheidungen nicht neu erfinden.');
  } else {
    console.log(`Phase 1 OK: ${result.summary.scenes} Szenen · ${result.summary.requiredShots} Pflicht-Shots freigegeben · ${result.summary.optionalShots} optionale Shots.`);
  }
}

function voiceoverAttach() {
  const projectId = requiredProject();
  const mode = workflowMode(projectId);
  const phase1 = mode === 'editorial' ? validateEditorialPhase1(projectId, {autoPlan: true}) : validateLegacyPhase1(projectId);
  if (phase1.errors.length) fail('Voiceover wird nicht akzeptiert, solange Phase 1 nicht vollständig freigegeben ist. Erst: npm run youtube:workflow -- phase1-check --project <id>');
  if (!args.file) fail('--file ist erforderlich. Es wird ausschließlich deine vorhandene MP3/WAV/M4A/AAC/FLAC-Datei benutzt.');
  const source = path.resolve(args.file);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`Voiceover-Datei fehlt: ${source}`);
  const ext = path.extname(source).toLowerCase();
  if (!['.mp3', '.wav', '.m4a', '.aac', '.flac'].includes(ext)) fail('Voiceover muss MP3, WAV, M4A, AAC oder FLAC sein.');
  const durationSeconds = probeDuration(source);
  const audioDir = projectPath(projectId, 'audio');
  fs.mkdirSync(audioDir, {recursive: true});
  const target = path.join(audioDir, `voiceover-master${ext}`);
  fs.copyFileSync(source, target);
  const sha256 = sha256File(target);

  const projectFile = projectPath(projectId, 'project.json');
  const project = readJson(projectFile);
  project.voiceover = {
    path: relative(target), durationSeconds, sha256,
    source: 'user-provided', generatedByPipeline: false,
    attachedAt: new Date().toISOString()
  };
  project.status = 'voiceover-ready';
  project.workflow = {
    ...(project.workflow || {}),
    phase1Research: project.workflow?.phase1Research || 'complete',
    phase1Script: project.workflow?.phase1Script || 'complete',
    phase1Visuals: 'complete-locked',
    phase1ShotPlan: mode === 'editorial' ? 'complete' : project.workflow?.phase1ShotPlan,
    phase2Voiceover: 'complete-user-audio',
    phase3TimingAndAssembly: 'ready',
    phase4Render: 'pending'
  };
  const artifacts = new Set(project.phase1Artifacts || []);
  if (mode === 'editorial') artifacts.add('shot-plan.json');
  project.phase1Artifacts = [...artifacts];
  fs.writeFileSync(projectFile, `${JSON.stringify(project, null, 2)}\n`);
  console.log(`Voiceover übernommen: ${relative(target)}`);
  console.log(`${durationSeconds.toFixed(3)}s · SHA-256 ${sha256}`);
  console.log('Es wurde KEINE Stimme erzeugt oder ersetzt.');
}

function phase3Check() {
  const projectId = requiredProject();
  const project = readProjectJson(projectId, 'project.json');
  if (!project.voiceover?.path || project.voiceover?.source !== 'user-provided') fail('Keine echte, vom Nutzer gelieferte Voiceover-Datei im Projekt.');
  const audioPath = path.join(root, project.voiceover.path);
  if (!fs.existsSync(audioPath)) fail(`Voiceover-Datei fehlt: ${project.voiceover.path}`);
  const timings = readProjectJson(projectId, 'timings.json');
  const mode = workflowMode(projectId);
  const errors = [];
  let expectedIds = [];
  if (mode === 'editorial') {
    const shotPlan = readProjectJson(projectId, 'shot-plan.json');
    expectedIds = (shotPlan.shots || []).map((shot) => shot.id);
  } else {
    const script = readProjectJson(projectId, 'scene-script.json');
    expectedIds = (script.scenes || []).map((scene) => scene.id);
  }
  const spans = timings.beats || timings.scenes || [];
  if (!Array.isArray(spans) || spans.length !== expectedIds.length) errors.push(`timings.json muss exakt ${expectedIds.length} Zeitspannen enthalten.`);
  const expected = new Set(expectedIds);
  let lastEnd = 0;
  for (const timing of spans) {
    if (!expected.has(timing.id)) errors.push(`Unbekannte Timing-ID: ${timing.id}`);
    if (!Number.isFinite(timing.start) || !Number.isFinite(timing.end) || timing.start < 0 || timing.end <= timing.start) errors.push(`${timing.id}: ungültige Start-/Endzeit.`);
    if (timing.start + 0.05 < lastEnd) errors.push(`${timing.id}: Timings überlappen.`);
    lastEnd = Math.max(lastEnd, timing.end || 0);
  }
  const delta = Math.abs(lastEnd - project.voiceover.durationSeconds);
  if (delta > 1.0) errors.push(`Timeline endet ${delta.toFixed(2)}s von der echten Voiceover-Länge entfernt.`);
  if (errors.length) { errors.forEach((error) => console.error(`- ${error}`)); fail('Phase 3 ist nicht renderbereit.'); }
  console.log(`Phase 3 OK: ${spans.length} Beats folgen deiner Voiceover-Datei (${project.voiceover.durationSeconds.toFixed(2)}s).`);
}

function validateEditorialPhase1(projectId, {autoPlan = false} = {}) {
  const errors = [];
  const requiredFiles = ['project.json', 'research.json', 'voiceover-script.txt', 'visual-plan.json'];
  for (const file of requiredFiles) if (!fs.existsSync(projectPath(projectId, file))) errors.push(`Projektdatei fehlt: ${file}`);
  if (errors.length) return {errors, summary: {beats: 0, external: 0, internal: 0}};
  if (autoPlan) ensureShotPlan(projectId, false);
  if (!fs.existsSync(projectPath(projectId, 'shot-plan.json'))) {
    errors.push('shot-plan.json fehlt. Nutze phase1-plan / beat:plan.');
    return {errors, summary: {beats: 0, external: 0, internal: 0}};
  }

  const project = readProjectJson(projectId, 'project.json');
  const plan = readProjectJson(projectId, 'visual-plan.json');
  const shots = readProjectJson(projectId, 'shot-plan.json');
  if (!Array.isArray(plan.beats) || plan.beats.length === 0) errors.push('visual-plan.json enthält keine Beats.');
  if (!Array.isArray(shots.shots) || shots.shots.length === 0) errors.push('shot-plan.json enthält keine Shots.');
  const byId = new Map((shots.shots || []).map((shot) => [shot.id, shot]));
  let external = 0;
  let internal = 0;

  for (const beat of plan.beats || []) {
    const shot = byId.get(beat.id);
    if (!shot) { errors.push(`${beat.id}: fehlt in shot-plan.json.`); continue; }
    if (!beat.narrationAnchor) errors.push(`${beat.id}: narrationAnchor fehlt.`);
    if (!beat.visual || !beat.visualType) errors.push(`${beat.id}: Visual-Intent/VisualType unvollständig.`);
    if (!shot.renderer?.presentation || !shot.renderer?.transition) errors.push(`${beat.id}: Renderer-Spezifikation unvollständig.`);
    if (!Array.isArray(shot.mediaPriority) || shot.mediaPriority.length === 0) errors.push(`${beat.id}: Medienpriorität fehlt.`);
    if (shot.qualityGate?.requireRightsReview !== true) errors.push(`${beat.id}: Rechte-Gate fehlt.`);

    const externalIntent = requiresExternalMedia(beat.visualType, beat.visual);
    const hasSource = Boolean(beat.sourceUrl) || (Array.isArray(beat.sources) && beat.sources.length > 0);
    const hasPreprocess = Array.isArray(shot.preprocess) && shot.preprocess.length > 0;
    if (externalIntent) {
      external++;
      if (!hasSource) errors.push(`${beat.id}: externer/archivierter Visual-Beat hat noch keine konkrete Quelle.`);
    } else {
      internal++;
      if (!hasSource && !hasPreprocess && shot.renderer.presentation === 'auto') errors.push(`${beat.id}: weder Quelle noch klarer interner/abgeleiteter Produktionsschritt definiert.`);
    }
  }
  for (const shot of shots.shots || []) if (!(plan.beats || []).some((beat) => beat.id === shot.id)) errors.push(`${shot.id}: Shot existiert ohne Phase-1-Beat.`);
  if (project.requireUserVoiceover !== true && project.workflowVersion === 2) errors.push('Workflow-v2-Projekt muss requireUserVoiceover=true setzen.');
  return {errors, summary: {beats: plan.beats?.length || 0, external, internal}};
}

function ensureShotPlan(projectId, force) {
  const target = projectPath(projectId, 'shot-plan.json');
  if (fs.existsSync(target) && !force) return;
  const plan = projectPath(projectId, 'visual-plan.json');
  if (!fs.existsSync(plan)) fail('visual-plan.json fehlt.');
  const values = ['scripts/beat-planner.mjs', '--plan', plan, '--output', target];
  const style = args.styleProfile ? path.resolve(args.styleProfile) : null;
  if (style) values.push('--style-profile', style);
  const result = spawnSync(process.execPath, values, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  if (result.status !== 0) fail(`Shot-Plan konnte nicht erzeugt werden: ${(result.stderr || result.stdout || '').trim()}`);
}

function requiresExternalMedia(typeValue, visualValue) {
  const value = `${typeValue || ''} ${visualValue || ''}`.toLowerCase();
  if (/official-document|archive-image|archive-video|archive-before-after|real-media|real damage|actual |exact /.test(value)) return true;
  if (/photo-plus|two-image|comparison/.test(value)) return true;
  return false;
}

async function legacyPhase1Discover(projectId) {
  const plan = readProjectJson(projectId, 'visual-plan-v2.json');
  const shortlistPath = projectPath(projectId, 'asset-shortlist.json');
  const shortlist = fs.existsSync(shortlistPath) ? readJson(shortlistPath) : {version: 2, projectId, phase: 1, status: 'needs-review', scenes: []};
  const providers = String(args.providers || 'wikimedia,internet-archive,openverse,pexels,pixabay').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const perQuery = integer(args.perQuery || '4', 1, 12, 'per-query');
  for (const provider of providers) if (!PROVIDERS[provider]) fail(`Unbekannter Provider: ${provider}`);
  for (const scene of plan.scenes || []) {
    let sceneEntry = shortlist.scenes.find((item) => item.id === scene.id);
    if (!sceneEntry) { sceneEntry = {id: scene.id, shots: []}; shortlist.scenes.push(sceneEntry); }
    for (const shot of scene.shots || []) {
      let shotEntry = sceneEntry.shots.find((item) => item.id === shot.id);
      if (!shotEntry) { shotEntry = {id: shot.id, visualType: shot.visualType, status: 'needs-review', selectedCandidateId: null, candidates: []}; sceneEntry.shots.push(shotEntry); }
      if (['custom-graphic','motion-graphic','screen-recording'].includes(shot.visualType) && shot.discoveryMode === 'internal') {
        const id = `internal-${scene.id}-${shot.id}`;
        shotEntry.candidates = [{candidateId: id, provider: 'internal-remotion', type: shot.visualType, title: shot.description, sourceUrl: null, previewUrl: null, relevanceScore: 10, matchReason: 'Phase-1-intern definiert.', rights: {licenseStatus: 'owned', usageScopes: ['youtube']}}];
        shotEntry.selectedCandidateId = id; shotEntry.status = 'approved'; continue;
      }
      const seen = new Set(shotEntry.candidates.map((candidate) => `${candidate.provider}:${candidate.providerId}`));
      const allowedProviders = providers.filter((provider) => (shot.preferredSources || providers).includes(provider));
      for (const provider of allowedProviders) {
        const type = shot.mediaType || (provider === 'openverse' ? 'image' : 'video');
        if (!PROVIDERS[provider].types.includes(type)) continue;
        if (PROVIDERS[provider].requiresKey && !process.env[PROVIDERS[provider].requiresKey]) continue;
        for (const query of (shot.queries || []).slice(0, 3)) {
          try {
            const result = await searchWithCache({root, provider, type, query, orientation: plan.format === 'horizontal' ? 'horizontal' : plan.format, page: 1, perPage: perQuery, locale: 'de-DE', language: 'de', refresh: args.refresh === 'true'});
            for (const asset of result.assets.slice(0, perQuery)) {
              const key = `${provider}:${asset.provider_id}`; if (seen.has(key)) continue; seen.add(key);
              shotEntry.candidates.push({candidateId: `${provider}-${asset.provider_id}`, provider, providerId: String(asset.provider_id), type: asset.type, title: asset.title, creator: asset.creator || null, sourceUrl: asset.source_url, previewUrl: asset.preview_url || null, width: asset.width || null, height: asset.height || null, durationSeconds: asset.duration_seconds || null, relevanceScore: null, matchReason: null, rights: asset.rights || null, discoveredByQuery: query});
            }
          } catch (error) { console.warn(`WARN ${scene.id}/${shot.id}/${provider}: ${error.message}`); }
        }
      }
    }
  }
  shortlist.generatedAt = new Date().toISOString();
  shortlist.status = legacyRequiredShotsApproved(plan, shortlist) ? 'approved' : 'needs-review';
  fs.writeFileSync(shortlistPath, `${JSON.stringify(shortlist, null, 2)}\n`);
  console.log(`Legacy Phase-1-Shortlist aktualisiert: ${relative(shortlistPath)}`);
}

function validateLegacyPhase1(projectId) {
  const script = readProjectJson(projectId, 'scene-script.json');
  const plan = readProjectJson(projectId, 'visual-plan-v2.json');
  const shortlist = readProjectJson(projectId, 'asset-shortlist.json');
  const errors = [];
  const planById = new Map((plan.scenes || []).map((scene) => [scene.id, scene]));
  const shortlistById = new Map((shortlist.scenes || []).map((scene) => [scene.id, scene]));
  let requiredShots = 0, optionalShots = 0;
  for (const scene of script.scenes || []) {
    const visualScene = planById.get(scene.id);
    if (!visualScene) { errors.push(`${scene.id}: Visual-Plan fehlt.`); continue; }
    const shortlistScene = shortlistById.get(scene.id);
    for (const shot of visualScene.shots || []) {
      const required = shot.priority !== 'optional'; if (required) requiredShots++; else optionalShots++;
      const selected = shortlistScene?.shots?.find((item) => item.id === shot.id);
      if (!selected || selected.status !== 'approved' || !selected.selectedCandidateId) { if (required) errors.push(`${scene.id}/${shot.id}: kein freigegebener Pflicht-Kandidat.`); continue; }
      const candidate = selected.candidates?.find((item) => item.candidateId === selected.selectedCandidateId);
      if (!candidate) errors.push(`${scene.id}/${shot.id}: ausgewählter Kandidat existiert nicht.`);
      else if (candidate.provider !== 'internal-remotion' && (!Number.isFinite(candidate.relevanceScore) || candidate.relevanceScore < 8 || !candidate.matchReason)) errors.push(`${scene.id}/${shot.id}: externer Kandidat benötigt Relevanz >= 8/10 + Begründung.`);
    }
  }
  return {errors, summary: {scenes: script.scenes?.length || 0, requiredShots, optionalShots}};
}

function legacyRequiredShotsApproved(plan, shortlist) {
  const byScene = new Map((shortlist.scenes || []).map((scene) => [scene.id, scene]));
  for (const scene of plan.scenes || []) for (const shot of scene.shots || []) {
    if (shot.priority === 'optional') continue;
    const selected = byScene.get(scene.id)?.shots?.find((item) => item.id === shot.id);
    if (!selected || selected.status !== 'approved' || !selected.selectedCandidateId) return false;
    const candidate = selected.candidates?.find((item) => item.candidateId === selected.selectedCandidateId);
    if (!candidate) return false;
    if (candidate.provider !== 'internal-remotion' && (!Number.isFinite(candidate.relevanceScore) || candidate.relevanceScore < 8 || !candidate.matchReason)) return false;
  }
  return true;
}

function workflowMode(projectId) {
  if (fs.existsSync(projectPath(projectId, 'visual-plan.json'))) return 'editorial';
  if (fs.existsSync(projectPath(projectId, 'visual-plan-v2.json'))) return 'legacy';
  fail(`Kein unterstützter Visual-Plan in projects/${projectId}/ gefunden.`);
}
function requiredProject() { if (!args.project) fail('--project ist erforderlich.'); return slug(args.project); }
function projectPath(projectId, file) { return path.join(root, 'projects', projectId, file); }
function readProjectJson(projectId, file) { const target = projectPath(projectId, file); if (!fs.existsSync(target)) fail(`Projektdatei fehlt: ${relative(target)}`); return readJson(target); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON ungültig: ${relative(file)} – ${error.message}`); } }
function probeDuration(file) { const result = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1', file], {encoding:'utf8'}); if (result.status !== 0) fail(`ffprobe konnte die Voiceover-Datei nicht lesen: ${(result.stderr || '').trim()}`); const value = Number(result.stdout.trim()); if (!Number.isFinite(value) || value <= 0) fail('Voiceover-Dauer ist ungültig.'); return Math.round(value * 1000) / 1000; }
function sha256File(file) { const hash = crypto.createHash('sha256'); hash.update(fs.readFileSync(file)); return hash.digest('hex'); }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function slug(value) { const result = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); if (!result) fail('Ungültige Projekt-ID.'); return result; }
function integer(value,min,max,label){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)fail(`${label} muss zwischen ${min} und ${max} liegen.`);return n;}
function parseArgs(values){const result={};for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--'))fail(`Unbekanntes Argument: ${token}`);const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(key==='help'){result.help=true;continue;}const next=values[i+1];if(!next||next.startsWith('--'))fail(`Wert für ${token} fehlt.`);result[key]=next;i++;}return result;}
function fail(message){console.error(message);process.exit(1);}
function help(){console.log(`YouTube Workflow v0.13\n\nEditorial Phase 1:\n  npm run youtube:workflow -- phase1-plan --project <id>\n  npm run youtube:workflow -- phase1-check --project <id>\n\nVoiceover (nur Nutzerdatei):\n  npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav\n\nNach Timing:\n  npm run youtube:workflow -- phase3-check --project <id>\n\nEditorial-v0.13 erwartet research.json + voiceover-script.txt + visual-plan.json + shot-plan.json. Fehlt shot-plan.json beim Check, wird er automatisch aus Phase 1 erzeugt. Legacy visual-plan-v2/asset-shortlist bleibt kompatibel.`);}
