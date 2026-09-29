import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const catalog = readJson(path.join(root, 'catalog/assets.json'));
const PRESENTATIONS = ['auto', 'vertical-blur', 'contain', 'article', 'document', 'map', 'freeze-frame', 'headline'];

if (!command || command === 'help' || args.help) { printHelp(); process.exit(command ? 0 : 1); }
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
  fs.mkdirSync(folder, {recursive: true});
  const now = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify({version: 1,id,title,format,width: dimensions.width,height: dimensions.height,fps,defaultUsageScope: args.scope || 'youtube',createdAt: now,updatedAt: now,scenes: []}, null, 2)}\n`);
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
  const presentation = args.presentation || 'auto';
  const transition = args.transition || 'cut';
  if (!PRESENTATIONS.includes(presentation)) fail(`--presentation muss ${PRESENTATIONS.join(', ')} sein.`);
  if (!['cut','fade'].includes(transition)) fail('--transition muss cut oder fade sein.');
  const scene = compact({
    id: args.sceneId ? slug(args.sceneId) : `scene-${String(project.scenes.length + 1).padStart(2, '0')}`,
    beatId: args.beatId || undefined,
    title: String(args.sceneTitle || args.title || asset.title).trim(),
    durationSeconds: duration,
    assetId,
    trimStartSeconds: number(args.trimStart || '0', 0, 3600, 'trim-start'),
    fit: args.fit || 'cover',
    presentation,
    transition,
    motion: args.motion || undefined,
    focus: focusFromArgs(args),
    overlays: buildOverlays(args),
    notes: args.notes || undefined
  });
  if (!['cover','contain'].includes(scene.fit)) fail('--fit muss cover oder contain sein.');
  project.scenes.push(scene);
  project.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify(project, null, 2)}\n`);
  console.log(`${scene.id}: ${assetId} zu ${id} hinzugefügt · ${presentation}.`);
}

function exportProject() {
  const id = slugRequired(args.project, '--project');
  const project = readJson(projectFile(id));
  const scope = args.scope || project.defaultUsageScope || 'youtube';
  const workflowProtected = Number(project.workflowVersion || 0) >= 2 || project.requireUserVoiceover === true;
  if (workflowProtected) validateUserVoiceover(project);
  if (!Array.isArray(project.scenes) || !project.scenes.length) fail('Projekt enthält keine Szenen. Zuerst phase3:prepare ausführen.');

  const resolved = [];
  const attribution = [];
  let cursor = 0;
  for (const [index, scene] of project.scenes.entries()) {
    const asset = catalog.assets.find((item) => item.id === scene.assetId);
    if (!asset) fail(`${scene.id}: Asset ${scene.assetId} fehlt im Katalog.`);
    if (asset.status !== 'approved') fail(`${scene.id}: Asset ${asset.id} ist nicht approved (Status: ${asset.status}).`);
    if (!asset.rights?.usageScopes?.includes(scope)) fail(`${scene.id}: Asset ${asset.id} ist nicht für ${scope} freigegeben.`);
    if (Number(project.workflowVersion || 0) >= 3 && asset.storage?.kind === 'external') fail(`${scene.id}: Workflow v3 verbietet externe Laufzeit-Assets. Erst lokal materialisieren.`);
    const source = asset.storage?.kind === 'external' ? asset.storage.externalUrl : asset.storage?.path;
    if (!source) fail(`${scene.id}: Asset ${asset.id} besitzt keine nutzbare Quelle.`);
    if (asset.storage?.kind !== 'external') {
      const absolute = path.join(root, source);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`${scene.id}: lokale Asset-Datei fehlt: ${source}`);
    }
    const durationSeconds = number(scene.durationSeconds, 0.2, 3600, 'scene duration');
    const fromFrame = Math.round(cursor * project.fps);
    const durationInFrames = Math.max(1, Math.round(durationSeconds * project.fps));
    const presentation = PRESENTATIONS.includes(scene.presentation) ? scene.presentation : 'auto';
    const transition = ['cut','fade'].includes(scene.transition) ? scene.transition : 'cut';
    resolved.push({
      index: index + 1,
      id: scene.id,
      beatId: scene.beatId || null,
      title: scene.title,
      durationSeconds,
      fromFrame,
      durationInFrames,
      trimStartSeconds: scene.trimStartSeconds || 0,
      fit: scene.fit || 'cover',
      presentation,
      transition,
      motion: normalizeMotion(scene.motion),
      focus: normalizeFocus(scene.focus),
      overlays: normalizeOverlays(scene.overlays),
      notes: scene.notes,
      asset: {id: asset.id,type: asset.type,title: asset.title,source,preview: asset.storage?.previewPath || null,orientation: asset.orientation,technical: asset.technical || null}
    });
    cursor += durationSeconds;
    if (asset.rights.attributionRequired) attribution.push({assetId: asset.id,text: asset.rights.attributionText,sourceUrl: asset.rights.sourceUrl || null,licenseUrl: asset.rights.licenseUrl || null});
  }

  const voiceoverDuration = project.voiceover?.durationSeconds || null;
  if (voiceoverDuration) {
    const delta = Math.abs(cursor - voiceoverDuration);
    if (delta > 1.0) fail(`Szenen-Timeline (${round(cursor, 3)}s) stimmt nicht mit Voiceover (${voiceoverDuration}s) überein. Abweichung: ${round(delta, 3)}s.`);
  }
  const totalDurationSeconds = voiceoverDuration || round(cursor, 3);
  const manifest = {
    manifestVersion: 4,
    generatedAt: new Date().toISOString(),
    policy: Number(project.workflowVersion || 0) >= 3 ? {networkAllowed: false, phase1AssetsOnly: true, syntheticExplainers: false} : undefined,
    project: {id: project.id,title: project.title,format: project.format,width: project.width,height: project.height,fps: project.fps,usageScope: scope,workflowVersion: project.workflowVersion || 1,totalDurationSeconds: round(totalDurationSeconds, 3),totalFrames: Math.round(totalDurationSeconds * project.fps)},
    voiceover: project.voiceover ? {source: project.voiceover.path,durationSeconds: project.voiceover.durationSeconds,sha256: project.voiceover.sha256 || null,sourceType: project.voiceover.source || 'unknown',generatedByPipeline: project.voiceover.generatedByPipeline === true} : null,
    scenes: resolved,
    attribution: uniqueAttribution(attribution)
  };
  const target = path.join(projectFolder(id), 'render-manifest.json');
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Render-Manifest: projects/${id}/render-manifest.json`);
  console.log(`${resolved.length} Szenen · ${manifest.project.totalDurationSeconds}s · ${manifest.project.totalFrames} Frames`);
}

function buildOverlays(values) {
  const result = [];
  if (values.label) result.push({kind: 'label', text: values.label, position: 'top-left'});
  if (values.headline) result.push({kind: 'headline', text: values.headline, subtext: values.subheadline || undefined, position: 'center'});
  if (values.numberText) result.push({kind: 'number', text: values.numberText, subtext: values.numberSubtext || undefined, position: 'bottom-left'});
  if (values.callout) result.push({kind: 'callout', text: values.callout, position: 'point', x: percent(values.calloutX, 50), y: percent(values.calloutY, 50)});
  if (values.sourceLabel) result.push({kind: 'source', text: values.sourceLabel, position: 'bottom-right'});
  return result;
}
function normalizeOverlays(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({kind: ['label','headline','number','callout','source'].includes(item?.kind) ? item.kind : 'label',text: String(item?.text || '').trim().slice(0,180),subtext: item?.subtext ? String(item.subtext).trim().slice(0,180) : undefined,position: item?.position || undefined,x: item?.x === undefined ? undefined : percent(item.x,50),y: item?.y === undefined ? undefined : percent(item.y,50)})).filter((item) => item.text);
}
function normalizeFocus(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x ?? value.focusX), y = Number(value.y ?? value.focusY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y))};
}
function focusFromArgs(values) {
  if (values.focusX === undefined && values.focusY === undefined) return undefined;
  return normalizeFocus({x: values.focusX ?? 50, y: values.focusY ?? 50});
}
function normalizeMotion(value) {
  if (!value) return null;
  if (typeof value === 'string') return {type: motionType(value), description: value.slice(0, 240)};
  if (typeof value !== 'object') return null;
  const type = ['static','push','pull','pan-left','pan-right','pan-up','pan-down'].includes(value.type) ? value.type : motionType(value.description || '');
  return {type, scaleFrom: finite(value.scaleFrom), scaleTo: finite(value.scaleTo), description: value.description ? String(value.description).slice(0,240) : undefined};
}
function motionType(value) { const text = String(value).toLowerCase(); if (/static|hold/.test(text)) return 'static'; if (/pull|zoom out/.test(text)) return 'pull'; if (/left/.test(text)) return 'pan-left'; if (/right/.test(text)) return 'pan-right'; if (/up/.test(text)) return 'pan-up'; if (/down/.test(text)) return 'pan-down'; return 'push'; }
function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
function validateUserVoiceover(project) {
  if (!project.voiceover?.path) fail('Workflow verlangt eine echte Nutzer-Voiceover-Datei. Nutze youtube:workflow voiceover-attach.');
  if (project.voiceover.source !== 'user-provided') fail('Es wird nur die vom Nutzer gelieferte Voiceover akzeptiert.');
  if (project.voiceover.generatedByPipeline === true) fail('Automatisch erzeugte Ersatzstimmen sind verboten.');
  if (!Number.isFinite(project.voiceover.durationSeconds) || project.voiceover.durationSeconds <= 0) fail('Voiceover-Dauer fehlt oder ist ungültig.');
  const source = path.join(root, project.voiceover.path);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`Voiceover-Datei fehlt: ${project.voiceover.path}`);
}
function showProject() { const id = slugRequired(args.project, '--project'); process.stdout.write(`${JSON.stringify(readJson(projectFile(id)), null, 2)}\n`); }
function defaultDuration(asset) { const duration = asset.technical?.durationSeconds; if (typeof duration === 'number' && duration > 0) return String(Math.min(duration, 8)); return asset.type === 'image' ? '4' : '5'; }
function formatDimensions(format) { if (format === 'vertical') return {width:1080,height:1920}; if (format === 'horizontal') return {width:1920,height:1080}; if (format === 'square') return {width:1080,height:1080}; fail('--format muss vertical, horizontal oder square sein.'); }
function projectFolder(id) { return path.join(root, 'projects', id); }
function projectFile(id) { const file = path.join(projectFolder(id), 'project.json'); if (!fs.existsSync(file)) fail(`Projekt nicht gefunden: ${id}`); return file; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${file}\n${error.message}`); } }
function parseArgs(values) { const result = {}; for (let i=0;i<values.length;i++) { const token=values[i]; if(!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()); if(key==='help'){result.help=true;continue;} const next=values[i+1]; if(!next||next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key]=next;i++; } return result; }
function slugRequired(value,label){if(!value)fail(`${label} ist erforderlich.`);return slug(value);}
function slug(value){const result=String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');if(!result)fail('Ungültige ID.');return result;}
function integer(value,min,max,label){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)fail(`${label} muss zwischen ${min} und ${max} liegen.`);return n;}
function number(value,min,max,label){const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)fail(`${label} muss zwischen ${min} und ${max} liegen.`);return n;}
function percent(value,fallback){const n=value===undefined||value===null||value===''?fallback:Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):fallback;}
function round(value,digits){const f=10**digits;return Math.round(value*f)/f;}
function compact(value){return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined&&item!==''&&!(Array.isArray(item)&&item.length===0)));}
function uniqueAttribution(items){const seen=new Set();return items.filter((item)=>{const key=`${item.assetId}|${item.text}`;if(seen.has(key))return false;seen.add(key);return true;});}
function fail(message){console.error(message);process.exit(1);}
function printHelp(){console.log(`Visual Asset Hub – Video-Projekte\n\nFür Workflow v3 wird project.scenes normalerweise automatisch durch phase3:prepare erzeugt. Focal Point/Motion können als focus + motion im Projekt mitgeführt werden. Workflow v3 exportiert ausschließlich lokale, approved YouTube-Assets.`);}
