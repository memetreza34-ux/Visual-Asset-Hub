import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const catalog = readJson(path.join(root, 'catalog/assets.json'));

if (!command || command === 'help' || args.help) {
  printHelp();
  process.exit(command ? 0 : 1);
}

if (command === 'create') createProject();
else if (command === 'add') addScene();
else if (command === 'export') exportProject();
else if (command === 'show') showProject();
else fail(`Unbekannter Befehl: ${command}`);

function createProject() {
  const title = String(args.name || args.title || '').trim();
  if (!title) fail('--name ist erforderlich.');
  const id = slug(args.id || title);
  const format = args.format || 'vertical';
  const dimensions = formatDimensions(format);
  const fps = integer(args.fps || '30', 1, 120, 'fps');
  const folder = projectFolder(id);
  const file = path.join(folder, 'project.json');
  if (fs.existsSync(file)) fail(`Projekt existiert bereits: ${id}`);
  fs.mkdirSync(folder, { recursive: true });
  const now = new Date().toISOString();
  const project = {
    version: 1,
    id,
    title,
    format,
    width: dimensions.width,
    height: dimensions.height,
    fps,
    defaultUsageScope: args.scope || 'youtube',
    createdAt: now,
    updatedAt: now,
    scenes: []
  };
  fs.writeFileSync(file, `${JSON.stringify(project, null, 2)}\n`);
  console.log(`Video-Projekt erstellt: projects/${id}/project.json`);
}

function addScene() {
  const id = slugRequired(args.project, '--project');
  const assetId = String(args.asset || '').trim();
  if (!assetId) fail('--asset ist erforderlich.');
  const file = projectFile(id);
  const project = readJson(file);
  const asset = catalog.assets.find((item) => item.id === assetId);
  if (!asset) fail(`Asset nicht gefunden: ${assetId}`);
  const duration = number(args.duration || defaultDuration(asset), 0.2, 3600, 'duration');
  const sceneNumber = project.scenes.length + 1;
  const scene = {
    id: args.sceneId ? slug(args.sceneId) : `scene-${String(sceneNumber).padStart(2, '0')}`,
    title: String(args.sceneTitle || args.title || asset.title).trim(),
    durationSeconds: duration,
    assetId,
    trimStartSeconds: number(args.trimStart || '0', 0, 3600, 'trim-start'),
    fit: args.fit || 'cover',
    notes: args.notes || undefined
  };
  if (!['cover', 'contain'].includes(scene.fit)) fail('--fit muss cover oder contain sein.');
  project.scenes.push(compact(scene));
  project.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify(project, null, 2)}\n`);
  console.log(`${scene.id}: ${assetId} zu ${id} hinzugefügt.`);
}

function exportProject() {
  const id = slugRequired(args.project, '--project');
  const file = projectFile(id);
  const project = readJson(file);
  const scope = args.scope || project.defaultUsageScope || 'youtube';
  const workflowV2 = project.workflowVersion === 2 || project.requireUserVoiceover === true;
  if (workflowV2) validateUserVoiceover(project);

  const resolved = [];
  const attribution = [];
  let cursor = 0;

  for (const [index, scene] of project.scenes.entries()) {
    const asset = catalog.assets.find((item) => item.id === scene.assetId);
    if (!asset) fail(`${scene.id}: Asset ${scene.assetId} fehlt im Katalog.`);
    if (asset.status !== 'approved') fail(`${scene.id}: Asset ${asset.id} ist nicht approved (Status: ${asset.status}).`);
    if (!asset.rights?.usageScopes?.includes(scope)) fail(`${scene.id}: Asset ${asset.id} ist nicht für ${scope} freigegeben.`);
    const source = asset.storage?.kind === 'external' ? asset.storage.externalUrl : asset.storage?.path;
    if (!source) fail(`${scene.id}: Asset ${asset.id} besitzt keine nutzbare Quelle.`);
    const durationSeconds = number(scene.durationSeconds, 0.2, 3600, 'scene duration');
    const fromFrame = Math.round(cursor * project.fps);
    const durationInFrames = Math.max(1, Math.round(durationSeconds * project.fps));
    resolved.push({
      index: index + 1,
      id: scene.id,
      title: scene.title,
      durationSeconds,
      fromFrame,
      durationInFrames,
      trimStartSeconds: scene.trimStartSeconds || 0,
      fit: scene.fit || 'cover',
      notes: scene.notes,
      asset: {
        id: asset.id,
        type: asset.type,
        title: asset.title,
        source,
        preview: asset.storage?.previewPath || null,
        orientation: asset.orientation,
        technical: asset.technical || null
      }
    });
    cursor += durationSeconds;
    if (asset.rights.attributionRequired) attribution.push({
      assetId: asset.id,
      text: asset.rights.attributionText,
      sourceUrl: asset.rights.sourceUrl || null,
      licenseUrl: asset.rights.licenseUrl || null
    });
  }

  const voiceoverDuration = project.voiceover?.durationSeconds || null;
  if (voiceoverDuration) {
    const delta = Math.abs(cursor - voiceoverDuration);
    if (delta > 1.0) fail(`Szenen-Timeline (${round(cursor, 3)}s) stimmt nicht mit Voiceover (${voiceoverDuration}s) überein. Abweichung: ${round(delta, 3)}s.`);
  }
  const totalDurationSeconds = voiceoverDuration || round(cursor, 3);

  const manifest = {
    manifestVersion: 2,
    generatedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      format: project.format,
      width: project.width,
      height: project.height,
      fps: project.fps,
      usageScope: scope,
      workflowVersion: project.workflowVersion || 1,
      totalDurationSeconds: round(totalDurationSeconds, 3),
      totalFrames: Math.round(totalDurationSeconds * project.fps)
    },
    voiceover: project.voiceover ? {
      source: project.voiceover.path,
      durationSeconds: project.voiceover.durationSeconds,
      sha256: project.voiceover.sha256 || null,
      sourceType: project.voiceover.source || 'unknown',
      generatedByPipeline: project.voiceover.generatedByPipeline === true
    } : null,
    scenes: resolved,
    attribution: uniqueAttribution(attribution)
  };
  const target = path.join(projectFolder(id), 'render-manifest.json');
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Render-Manifest: projects/${id}/render-manifest.json`);
  console.log(`${resolved.length} Szenen · ${manifest.project.totalDurationSeconds}s · ${manifest.project.totalFrames} Frames`);
  if (manifest.voiceover) console.log(`Master-Audio: ${manifest.voiceover.source} (${manifest.voiceover.durationSeconds}s)`);
}

function validateUserVoiceover(project) {
  if (!project.voiceover?.path) fail('Workflow v2 verlangt eine echte Voiceover-Datei. Nutze zuerst youtube:workflow voiceover-attach.');
  if (project.voiceover.source !== 'user-provided') fail('Workflow v2 akzeptiert nur eine vom Nutzer gelieferte Voiceover-Datei.');
  if (project.voiceover.generatedByPipeline === true) fail('Workflow v2 verbietet automatisch erzeugte Ersatzstimmen.');
  if (!Number.isFinite(project.voiceover.durationSeconds) || project.voiceover.durationSeconds <= 0) fail('Voiceover-Dauer fehlt oder ist ungültig.');
  const source = path.join(root, project.voiceover.path);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`Voiceover-Datei fehlt: ${project.voiceover.path}`);
}

function showProject() {
  const id = slugRequired(args.project, '--project');
  process.stdout.write(`${JSON.stringify(readJson(projectFile(id)), null, 2)}\n`);
}

function defaultDuration(asset) {
  const duration = asset.technical?.durationSeconds;
  if (typeof duration === 'number' && duration > 0) return String(Math.min(duration, 8));
  return asset.type === 'image' ? '4' : '5';
}
function formatDimensions(format) {
  if (format === 'vertical') return { width: 1080, height: 1920 };
  if (format === 'horizontal') return { width: 1920, height: 1080 };
  if (format === 'square') return { width: 1080, height: 1080 };
  fail('--format muss vertical, horizontal oder square sein.');
}
function projectFolder(id) { return path.join(root, 'projects', id); }
function projectFile(id) { const file = path.join(projectFolder(id), 'project.json'); if (!fs.existsSync(file)) fail(`Projekt nicht gefunden: ${id}`); return file; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${file}\n${error.message}`); } }
function parseArgs(values) { const result = {}; for (let i=0;i<values.length;i++) { const token=values[i]; if(!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()); if(key==='help'){result.help=true;continue;} const next=values[i+1]; if(!next||next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key]=next;i++; } return result; }
function slugRequired(value,label){if(!value)fail(`${label} ist erforderlich.`);return slug(value);}
function slug(value){const result=String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');if(!result)fail('Ungültige ID.');return result;}
function integer(value,min,max,label){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)fail(`${label} muss zwischen ${min} und ${max} liegen.`);return n;}
function number(value,min,max,label){const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)fail(`${label} muss zwischen ${min} und ${max} liegen.`);return n;}
function round(value,digits){const f=10**digits;return Math.round(value*f)/f;}
function compact(value){return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined&&item!==''));}
function uniqueAttribution(items){const seen=new Set();return items.filter((item)=>{const key=`${item.assetId}|${item.text}`;if(seen.has(key))return false;seen.add(key);return true;});}
function fail(message){console.error(message);process.exit(1);}
function printHelp(){console.log(`Visual Asset Hub – Video-Projekte\n\nErstellen:\n  npm run video:project -- create --name "Erstes Video" --format vertical --scope youtube\n\nAsset als Szene hinzufügen:\n  npm run video:project -- add --project erstes-video --asset VAH-XXXXXXXX --duration 6\n\nFür Renderer exportieren:\n  npm run video:project -- export --project erstes-video\n\nAnzeigen:\n  npm run video:project -- show --project erstes-video\n\nWorkflow-v2-Projekte verlangen eine vom Nutzer gelieferte Voiceover-Datei. Der Export blockiert Ersatzstimmen, nicht-approved Assets und fehlende Nutzungsrechte.`);}
