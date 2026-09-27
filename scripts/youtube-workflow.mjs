import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { PROVIDERS } from './lib/providers/index.mjs';
import { loadDotEnv, searchWithCache } from './lib/source-utils.mjs';

const root = process.cwd();
const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
loadDotEnv(path.join(root, '.env'));

if (!command || command === 'help' || args.help) {
  help();
  process.exit(command ? 0 : 1);
}

if (command === 'phase1-discover') await phase1Discover();
else if (command === 'phase1-check') phase1Check();
else if (command === 'voiceover-attach') voiceoverAttach();
else if (command === 'phase3-check') phase3Check();
else fail(`Unbekannter Befehl: ${command}`);

async function phase1Discover() {
  const projectId = requiredProject();
  const plan = readProjectJson(projectId, 'visual-plan-v2.json');
  const shortlistPath = projectPath(projectId, 'asset-shortlist.json');
  const shortlist = fs.existsSync(shortlistPath)
    ? readJson(shortlistPath)
    : { version: 2, projectId, phase: 1, status: 'needs-review', scenes: [] };
  const providers = String(args.providers || 'pexels,pixabay,openverse')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const perQuery = integer(args.perQuery || '4', 1, 12, 'per-query');

  for (const provider of providers) if (!PROVIDERS[provider]) fail(`Unbekannter Provider: ${provider}`);

  for (const scene of plan.scenes) {
    let sceneEntry = shortlist.scenes.find((item) => item.id === scene.id);
    if (!sceneEntry) {
      sceneEntry = { id: scene.id, shots: [] };
      shortlist.scenes.push(sceneEntry);
    }

    for (const shot of scene.shots) {
      let shotEntry = sceneEntry.shots.find((item) => item.id === shot.id);
      if (!shotEntry) {
        shotEntry = { id: shot.id, visualType: shot.visualType, status: 'needs-review', selectedCandidateId: null, candidates: [] };
        sceneEntry.shots.push(shotEntry);
      }

      if (['custom-graphic', 'motion-graphic', 'screen-recording'].includes(shot.visualType) && shot.discoveryMode === 'internal') {
        const id = `internal-${scene.id}-${shot.id}`;
        shotEntry.candidates = [{
          candidateId: id,
          provider: 'internal-remotion',
          type: shot.visualType,
          title: shot.description,
          sourceUrl: null,
          previewUrl: null,
          relevanceScore: 10,
          matchReason: 'Visual wurde in Phase 1 exakt für die Aussage definiert; kein zufälliges Stockmaterial nötig.',
          rights: { licenseStatus: 'owned', usageScopes: ['youtube'] }
        }];
        shotEntry.selectedCandidateId = id;
        shotEntry.status = 'approved';
        continue;
      }

      const seen = new Set(shotEntry.candidates.map((candidate) => `${candidate.provider}:${candidate.providerId}`));
      const allowedProviders = providers.filter((provider) => (shot.preferredSources || providers).includes(provider));
      for (const provider of allowedProviders) {
        const type = shot.mediaType || (provider === 'openverse' ? 'image' : 'video');
        if (!PROVIDERS[provider].types.includes(type)) continue;
        if (PROVIDERS[provider].requiresKey && !process.env[PROVIDERS[provider].requiresKey]) {
          console.warn(`SKIP ${provider}: ${PROVIDERS[provider].requiresKey} fehlt.`);
          continue;
        }
        for (const query of (shot.queries || []).slice(0, 3)) {
          try {
            const result = await searchWithCache({
              root, provider, type, query,
              orientation: plan.format === 'horizontal' ? 'horizontal' : plan.format,
              page: 1, perPage: perQuery, locale: 'de-DE', language: 'de', refresh: args.refresh === 'true'
            });
            for (const asset of result.assets.slice(0, perQuery)) {
              const key = `${provider}:${asset.provider_id}`;
              if (seen.has(key)) continue;
              seen.add(key);
              shotEntry.candidates.push({
                candidateId: `${provider}-${asset.provider_id}`,
                provider,
                providerId: String(asset.provider_id),
                type: asset.type,
                title: asset.title,
                creator: asset.creator || null,
                sourceUrl: asset.source_url,
                previewUrl: asset.preview_url || null,
                width: asset.width || null,
                height: asset.height || null,
                durationSeconds: asset.duration_seconds || null,
                relevanceScore: null,
                matchReason: null,
                rights: asset.rights || null,
                discoveredByQuery: query
              });
            }
          } catch (error) {
            console.warn(`WARN ${scene.id}/${shot.id}/${provider}: ${error.message}`);
          }
        }
      }
    }
  }

  shortlist.generatedAt = new Date().toISOString();
  shortlist.status = requiredShotsApproved(plan, shortlist) ? 'approved' : 'needs-review';
  fs.writeFileSync(shortlistPath, `${JSON.stringify(shortlist, null, 2)}\n`);
  console.log(`Phase-1-Shortlist aktualisiert: ${relative(shortlistPath)}`);
  console.log(shortlist.status === 'approved' ? 'Alle Pflicht-Visuals aus Phase 1 sind freigegeben.' : 'Kandidaten gefunden. Vor Voiceover müssen alle Pflicht-Shots bewertet und ausgewählt werden.');
}

function phase1Check() {
  const projectId = requiredProject();
  const { errors, summary } = validatePhase1(projectId);
  if (errors.length) {
    errors.forEach((error) => console.error(`- ${error}`));
    fail(`Phase 1 NICHT fertig (${errors.length} Fehler).`);
  }
  console.log(`Phase 1 OK: ${summary.scenes} Szenen · ${summary.requiredShots} Pflicht-Shots freigegeben · ${summary.optionalShots} optionale Shots.`);
}

function voiceoverAttach() {
  const projectId = requiredProject();
  const { errors } = validatePhase1(projectId);
  if (errors.length) fail('Voiceover wird nicht akzeptiert, solange Phase 1 nicht vollständig freigegeben ist. Erst: npm run youtube:workflow -- phase1-check --project <id>');
  if (!args.file) fail('--file ist erforderlich. Es wird ausschließlich deine vorhandene MP3/WAV/M4A-Datei benutzt.');
  const source = path.resolve(args.file);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`Voiceover-Datei fehlt: ${source}`);
  const ext = path.extname(source).toLowerCase();
  if (!['.mp3', '.wav', '.m4a', '.aac', '.flac'].includes(ext)) fail('Voiceover muss MP3, WAV, M4A, AAC oder FLAC sein.');
  const durationSeconds = probeDuration(source);
  const audioDir = projectPath(projectId, 'audio');
  fs.mkdirSync(audioDir, { recursive: true });
  const target = path.join(audioDir, `voiceover-master${ext}`);
  fs.copyFileSync(source, target);
  const sha256 = sha256File(target);

  const projectFile = projectPath(projectId, 'project.json');
  const project = readJson(projectFile);
  project.voiceover = {
    path: relative(target),
    durationSeconds,
    sha256,
    source: 'user-provided',
    generatedByPipeline: false,
    attachedAt: new Date().toISOString()
  };
  project.status = 'voiceover-ready';
  project.workflow = {
    ...(project.workflow || {}),
    phase1Visuals: 'complete',
    phase2Voiceover: 'complete-user-audio',
    phase3TimingAndAssembly: 'ready',
    phase4Render: 'pending'
  };
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
  const script = readProjectJson(projectId, 'scene-script.json');
  const errors = [];
  if (!Array.isArray(timings.scenes) || timings.scenes.length !== script.scenes.length) errors.push('timings.json muss exakt eine Zeitspanne pro Skript-Szene enthalten.');
  const scriptIds = new Set(script.scenes.map((scene) => scene.id));
  let lastEnd = 0;
  for (const timing of timings.scenes || []) {
    if (!scriptIds.has(timing.id)) errors.push(`Unbekannte Timing-Szene: ${timing.id}`);
    if (!Number.isFinite(timing.start) || !Number.isFinite(timing.end) || timing.start < 0 || timing.end <= timing.start) errors.push(`${timing.id}: ungültige Start-/Endzeit.`);
    if (timing.start + 0.05 < lastEnd) errors.push(`${timing.id}: Timings überlappen.`);
    lastEnd = Math.max(lastEnd, timing.end || 0);
  }
  const delta = Math.abs(lastEnd - project.voiceover.durationSeconds);
  if (delta > 1.0) errors.push(`Timeline endet ${delta.toFixed(2)}s von der echten Voiceover-Länge entfernt.`);
  if (errors.length) { errors.forEach((e) => console.error(`- ${e}`)); fail('Phase 3 ist nicht renderbereit.'); }
  console.log(`Phase 3 OK: Timeline folgt deiner Voiceover-Datei (${project.voiceover.durationSeconds.toFixed(2)}s).`);
}

function validatePhase1(projectId) {
  const script = readProjectJson(projectId, 'scene-script.json');
  const plan = readProjectJson(projectId, 'visual-plan-v2.json');
  const shortlist = readProjectJson(projectId, 'asset-shortlist.json');
  const errors = [];
  const planById = new Map((plan.scenes || []).map((scene) => [scene.id, scene]));
  const shortlistById = new Map((shortlist.scenes || []).map((scene) => [scene.id, scene]));
  let requiredShots = 0;
  let optionalShots = 0;
  for (const scene of script.scenes || []) {
    const visualScene = planById.get(scene.id);
    if (!visualScene) { errors.push(`${scene.id}: Visual-Plan fehlt.`); continue; }
    if (!visualScene.visualIntent) errors.push(`${scene.id}: visualIntent fehlt.`);
    if (!Array.isArray(visualScene.noGo) || visualScene.noGo.length === 0) errors.push(`${scene.id}: No-Go-Liste fehlt.`);
    if (!Array.isArray(visualScene.shots) || visualScene.shots.length === 0) { errors.push(`${scene.id}: keine Shots geplant.`); continue; }
    const shortlistScene = shortlistById.get(scene.id);
    for (const shot of visualScene.shots) {
      const required = shot.priority !== 'optional';
      if (required) requiredShots++; else optionalShots++;
      if (!shot.description || !shot.visualType) errors.push(`${scene.id}/${shot.id}: Shot unvollständig.`);
      const selected = shortlistScene?.shots?.find((item) => item.id === shot.id);
      if (!selected || selected.status !== 'approved' || !selected.selectedCandidateId) {
        if (required) errors.push(`${scene.id}/${shot.id}: kein in Phase 1 freigegebener Pflicht-Kandidat.`);
        continue;
      }
      const candidate = selected.candidates?.find((item) => item.candidateId === selected.selectedCandidateId);
      if (!candidate) {
        errors.push(`${scene.id}/${shot.id}: ausgewählter Kandidat existiert nicht.`);
        continue;
      }
      if (candidate.provider !== 'internal-remotion') {
        if (!Number.isFinite(candidate.relevanceScore) || candidate.relevanceScore < 8) errors.push(`${scene.id}/${shot.id}: externer Kandidat muss Relevanz >= 8/10 haben.`);
        if (!candidate.matchReason) errors.push(`${scene.id}/${shot.id}: Begründung für die Auswahl fehlt.`);
      }
    }
  }
  return { errors, summary: { scenes: script.scenes?.length || 0, requiredShots, optionalShots } };
}

function requiredShotsApproved(plan, shortlist) {
  const shortlistByScene = new Map((shortlist.scenes || []).map((scene) => [scene.id, scene]));
  for (const scene of plan.scenes || []) {
    const shortlistScene = shortlistByScene.get(scene.id);
    for (const shot of scene.shots || []) {
      if (shot.priority === 'optional') continue;
      const selected = shortlistScene?.shots?.find((item) => item.id === shot.id);
      if (!selected || selected.status !== 'approved' || !selected.selectedCandidateId) return false;
      const candidate = selected.candidates?.find((item) => item.candidateId === selected.selectedCandidateId);
      if (!candidate) return false;
      if (candidate.provider !== 'internal-remotion' && (!Number.isFinite(candidate.relevanceScore) || candidate.relevanceScore < 8 || !candidate.matchReason)) return false;
    }
  }
  return true;
}
function requiredProject() { if (!args.project) fail('--project ist erforderlich.'); return slug(args.project); }
function projectPath(projectId, file) { return path.join(root, 'projects', projectId, file); }
function readProjectJson(projectId, file) { const target = projectPath(projectId, file); if (!fs.existsSync(target)) fail(`Projektdatei fehlt: ${relative(target)}`); return readJson(target); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON ungültig: ${relative(file)} – ${error.message}`); } }
function probeDuration(file) { const result = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1', file], { encoding:'utf8' }); if (result.status !== 0) fail(`ffprobe konnte die Voiceover-Datei nicht lesen: ${(result.stderr || '').trim()}`); const value = Number(result.stdout.trim()); if (!Number.isFinite(value) || value <= 0) fail('Voiceover-Dauer ist ungültig.'); return Math.round(value * 1000) / 1000; }
function sha256File(file) { const hash = crypto.createHash('sha256'); hash.update(fs.readFileSync(file)); return hash.digest('hex'); }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function slug(value) { const result = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); if (!result) fail('Ungültige Projekt-ID.'); return result; }
function integer(value,min,max,label){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)fail(`${label} muss zwischen ${min} und ${max} liegen.`);return n;}
function parseArgs(values){const result={};for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--'))fail(`Unbekanntes Argument: ${token}`);const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(key==='help'){result.help=true;continue;}const next=values[i+1];if(!next||next.startsWith('--'))fail(`Wert für ${token} fehlt.`);result[key]=next;i++;}return result;}
function fail(message){console.error(message);process.exit(1);}
function help(){console.log(`YouTube Workflow v2\n\nPhase 1 – echte Visuals VOR der Stimme:\n  npm run youtube:workflow -- phase1-discover --project <id>\n  npm run youtube:workflow -- phase1-check --project <id>\n\nPhase 2 – ausschließlich deine Voiceover-Datei:\n  npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav\n\nPhase 3 – nur Timing/Assembly, KEINE neue Visual-Suche:\n  npm run youtube:workflow -- phase3-check --project <id>\n\nRegeln:\n- Pflicht-Visuals werden vor der Stimme gewählt; optionale Ergänzungs-B-Rolls blockieren Phase 2 nicht.\n- Externe Pflicht-Visuals müssen bereits in Phase 1 gewählt und mit >=8/10 Relevanz bewertet sein.\n- Voiceover wird niemals erzeugt oder ersetzt.\n- Phase 3 darf keine neuen Stock-Entscheidungen treffen.`);}
