import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const [command,...rest]=process.argv.slice(2);
const args=parseArgs(rest);
const projectId=args.project?slug(args.project):null;
if(!command||command==='help'||args.help){help();process.exit(command?0:1);}
if(command==='phase1-plan')phase1Plan();
else if(command==='phase1-materialize')phase1Materialize();
else if(command==='phase1-quality')runProjectScript('scripts/phase1-quality-pass.mjs');
else if(command==='phase1-check')phase1Check(true);
else if(command==='voiceover-attach')voiceoverAttach();
else if(command==='voiceover-align')runProjectScript('scripts/align-voiceover.mjs');
else if(command==='phase3-prepare')runProjectScript('scripts/phase3-prepare.mjs');
else if(command==='phase3-check')phase3Check();
else fail(`Unbekannter Workflow-v3-Befehl: ${command}`);

function phase1Plan(){requireProject();const visualPlan=projectPath('visual-plan.json');if(!fs.existsSync(visualPlan))fail('visual-plan.json fehlt.');const values=['scripts/beat-planner.mjs','--plan',visualPlan,'--output',projectPath('shot-plan.json')];if(args.styleProfile)values.push('--style-profile',path.resolve(args.styleProfile));runNode(values);}
function phase1Materialize(){requireProject();const values=['scripts/phase1-materialize.mjs','--project',projectId,...forwardArgs(new Set(['project']))];if(!('downloadTop' in args))values.push('--download-top','1');runNode(values);console.log('Workflow v3: Als Nächstes phase1-quality → visual:qc → Katalog/Review + Rights-Evidence → phase1:bind → phase1-check.');}

function phase1Check(print=false){
  requireProject();
  const errors=[],warnings=[];
  const required=['project.json','research.json','voiceover-script.txt','visual-plan.json','shot-plan.json','materialization.json','phase1-quality.json','visual-qc.json','beat-bindings.json'];
  for(const file of required)if(!fs.existsSync(projectPath(file)))errors.push(`Projektdatei fehlt: ${file}`);
  if(errors.length)return finish(errors,warnings,{shots:0,beats:0,localReady:0,rightsEvidenceReady:0},print);
  const project=readJson(projectPath('project.json'));
  const visual=readJson(projectPath('visual-plan.json'));
  const shots=readJson(projectPath('shot-plan.json'));
  const materialization=readJson(projectPath('materialization.json'));
  const quality=readJson(projectPath('phase1-quality.json'));
  const qc=readJson(projectPath('visual-qc.json'));
  const bindings=readJson(projectPath('beat-bindings.json'));
  const catalog=readJson(path.join(root,'catalog','assets.json'));
  if(Number(project.workflowVersion||0)<3)warnings.push('Projekt verwendet workflowVersion < 3; der v3-Controller wendet trotzdem die strengen Gates an.');
  if(project.requireUserVoiceover!==true)errors.push('requireUserVoiceover muss true sein.');
  if(!Array.isArray(visual.beats)||!visual.beats.length)errors.push('visual-plan.json enthält keine Beats.');
  if(!Array.isArray(shots.shots)||!shots.shots.length)errors.push('shot-plan.json enthält keine Shots.');
  if(quality.policy?.qualityFeedsVisualQc!==true)errors.push('phase1-quality.json ist nicht als v3 Quality-Pass markiert.');
  if(!qc.sourceQuality)errors.push('visual-qc.json wurde ohne phase1-quality.json erzeugt. Reihenfolge: phase1-quality vor visual:qc.');

  const beatIds=new Set((visual.beats||[]).map((beat)=>beat.id));
  const materialById=new Map((materialization.beats||[]).map((item)=>[item.id,item]));
  const qcById=new Map((qc.beats||[]).map((item)=>[item.id,item]));
  const bindingById=new Map((bindings.beats||[]).map((item)=>[item.beatId,item]));
  let localReady=0,rightsEvidenceReady=0;
  const checkedAssets=new Set();

  for(const shot of shots.shots||[]){
    const beatId=shot.beatId||shot.id;
    if(!beatIds.has(beatId))errors.push(`${shot.id}: unbekannte beatId ${beatId}.`);
    if(!shot.renderer?.presentation||!shot.renderer?.transition)errors.push(`${shot.id}: Renderer-Spezifikation fehlt.`);
    if(shot.qualityGate?.requireRightsReview!==true)errors.push(`${shot.id}: Rechte-Gate fehlt.`);
    const material=materialById.get(shot.id);
    if(!material?.selectedCandidateId)errors.push(`${shot.id}: Materializer hat keinen Kandidaten ausgewählt.`);
    if(String(material?.status||'').startsWith('blocked'))errors.push(`${shot.id}: Materialisierung blockiert (${material.status}).`);
    const binding=bindingById.get(shot.id);
    if(!binding?.assetId){errors.push(`${shot.id}: kein Produktionsasset gebunden.`);continue;}
    const asset=catalog.assets?.find((item)=>item.id===binding.assetId);
    if(!asset){errors.push(`${shot.id}: Asset ${binding.assetId} fehlt im Katalog.`);continue;}
    if(asset.status!=='approved')errors.push(`${shot.id}: Asset ${asset.id} ist nicht approved.`);
    if(!asset.rights?.usageScopes?.includes('youtube'))errors.push(`${shot.id}: Asset ${asset.id} ist nicht für YouTube freigegeben.`);
    if(['unknown','restricted','editorial-only'].includes(asset.rights?.licenseStatus))errors.push(`${shot.id}: Asset ${asset.id} hat nicht ausreichende Publish-Rechte (${asset.rights?.licenseStatus}).`);
    if(asset.rights?.commercialUse===false)errors.push(`${shot.id}: Asset ${asset.id} verbietet kommerzielle Nutzung.`);
    if(!asset.rights?.sourceUrl)warnings.push(`${shot.id}: Asset ${asset.id} besitzt keine sourceUrl.`);
    if(asset.storage?.kind==='external')errors.push(`${shot.id}: Asset ${asset.id} ist nur extern gespeichert. Workflow v3 verlangt lokale Materialisierung vor Phase 2.`);
    else{
      const storagePath=asset.storage?.path;
      if(!storagePath)errors.push(`${shot.id}: lokaler Asset-Pfad fehlt.`);
      else{const absolute=path.join(root,storagePath);if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())errors.push(`${shot.id}: lokal gebundene Datei fehlt: ${storagePath}`);else localReady++;}
    }
    if(!checkedAssets.has(asset.id)){
      checkedAssets.add(asset.id);
      if(checkRightsEvidence(asset,errors,warnings))rightsEvidenceReady++;
    }
    if(['auto-source-match','auto-local-library'].includes(binding.bindingMode)){
      const qcBeat=qcById.get(shot.id);
      const qcCandidate=qcBeat?.candidates?.find((item)=>item.candidateId===binding.candidateId);
      const minimum=Number(qc.policy?.minimumScore||70);
      if(!qcCandidate)errors.push(`${shot.id}: Auto-Binding ohne QC-Kandidat.`);
      else if(qcCandidate.status==='blocked'||!Number.isFinite(qcCandidate.score)||qcCandidate.score<minimum)errors.push(`${shot.id}: Auto-Binding besteht QC nicht.`);
    }else if(binding.bindingMode==='explicit'&&binding.manualReviewed!==true)errors.push(`${shot.id}: explizites Binding wurde nicht als manuell geprüft markiert.`);
  }
  return finish(errors,warnings,{beats:visual.beats?.length||0,shots:shots.shots?.length||0,localReady,rightsEvidenceReady},print);
}

function checkRightsEvidence(asset,errors,warnings){
  if(!asset.rights?.checkedAt){errors.push(`Asset ${asset.id}: rights.checkedAt fehlt.`);return false;}
  if(!asset.rights?.evidencePath){errors.push(`Asset ${asset.id}: rights.evidencePath fehlt.`);return false;}
  const file=path.join(root,asset.rights.evidencePath);
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){errors.push(`Asset ${asset.id}: Rights-Evidence-Datei fehlt: ${asset.rights.evidencePath}`);return false;}
  let evidence;
  try{evidence=JSON.parse(fs.readFileSync(file,'utf8'));}catch{errors.push(`Asset ${asset.id}: Rights-Evidence ist ungültiges JSON.`);return false;}
  if(evidence.assetId!==asset.id)errors.push(`Asset ${asset.id}: Evidence assetId stimmt nicht.`);
  if(asset.sha256&&evidence.assetSha256!==asset.sha256)errors.push(`Asset ${asset.id}: Evidence SHA-256 stimmt nicht.`);
  if(evidence.licenseStatus!==asset.rights.licenseStatus)errors.push(`Asset ${asset.id}: Evidence licenseStatus ist veraltet.`);
  if(canonical(evidence.sourceUrl)!==canonical(asset.rights.sourceUrl))errors.push(`Asset ${asset.id}: Evidence sourceUrl ist veraltet.`);
  if(!evidence.checkedAt)errors.push(`Asset ${asset.id}: Evidence checkedAt fehlt.`);
  if(!evidence.sourceCapture&&asset.rights?.sourceUrl)warnings.push(`Asset ${asset.id}: keine archivierte Quellseiten-Aufnahme; Metadaten-Evidence ist vorhanden.`);
  return !errors.some((item)=>item.startsWith(`Asset ${asset.id}:`));
}

function voiceoverAttach(){requireProject();const gate=phase1Check(false);if(gate.errors.length){gate.errors.forEach((item)=>console.error(`- ${item}`));fail('Voiceover blockiert: Phase 1 muss lokal materialisiert, qualitativ geprüft, rechtegeprüft, evidenzgesichert und gebunden sein.');}if(!args.file)fail('--file ist erforderlich.');const source=path.resolve(args.file);if(!fs.existsSync(source)||!fs.statSync(source).isFile())fail(`Voiceover-Datei fehlt: ${source}`);const ext=path.extname(source).toLowerCase();if(!['.mp3','.wav','.m4a','.aac','.flac'].includes(ext))fail('Voiceover muss MP3, WAV, M4A, AAC oder FLAC sein.');const durationSeconds=probeDuration(source);const audioDir=projectPath('audio');fs.mkdirSync(audioDir,{recursive:true});const target=path.join(audioDir,`voiceover-master${ext}`);fs.copyFileSync(source,target);const projectFile=projectPath('project.json'),project=readJson(projectFile);project.workflowVersion=3;project.voiceover={path:relative(target),durationSeconds,sha256:sha256File(target),source:'user-provided',generatedByPipeline:false,attachedAt:new Date().toISOString()};project.status='voiceover-ready';project.workflow={...(project.workflow||{}),phase1:'locked-local-assets-with-rights-evidence',phase2Voiceover:'complete-user-audio',phase3TimingAndAssembly:'ready'};fs.writeFileSync(projectFile,`${JSON.stringify(project,null,2)}\n`);console.log(`Voiceover übernommen: ${relative(target)} · ${durationSeconds.toFixed(3)}s`);}
function phase3Check(){requireProject();const project=readJson(projectPath('project.json'));if(!project.voiceover?.path||project.voiceover.source!=='user-provided'||project.voiceover.generatedByPipeline===true)fail('Keine gültige Nutzer-Voiceover als Masterspur.');for(const file of ['timings.json','phase3-handoff.json','render-manifest.json'])if(!fs.existsSync(projectPath(file)))fail(`${file} fehlt. Zuerst voiceover-align und phase3-prepare ausführen.`);const timings=readJson(projectPath('timings.json')),handoff=readJson(projectPath('phase3-handoff.json')),spans=timings.beats||timings.scenes||[],lastEnd=spans.reduce((max,item)=>Math.max(max,Number(item.end||0)),0),delta=Math.abs(lastEnd-project.voiceover.durationSeconds);if(delta>1)fail(`Timings weichen ${delta.toFixed(2)}s von der Voiceover-Länge ab.`);if(!Array.isArray(handoff.shots)||!handoff.shots.length)fail('phase3-handoff.json enthält keine Shots.');if(handoff.policy?.networkAllowed!==false)fail('Phase3-Handoff muss networkAllowed=false setzen.');console.log(`Phase 3 OK: ${handoff.shots.length} Shots · Netzwerk AUS · Nutzer-Voiceover ist Master.`);}
function finish(errors,warnings,summary,print){if(print)warnings.forEach((item)=>console.warn(`WARN ${item}`));if(print&&errors.length)errors.forEach((item)=>console.error(`- ${item}`));if(print&&errors.length)fail(`Phase 1 NICHT fertig (${errors.length} Fehler).`);if(print)console.log(`Phase 1 v3 OK: ${summary.beats} Beats · ${summary.shots} Shots · ${summary.localReady} lokale Shot-Bindings · ${summary.rightsEvidenceReady} Rights-Evidence-Akten.`);return{errors,warnings,summary}}
function runProjectScript(script){requireProject();runNode([script,'--project',projectId,...forwardArgs(new Set(['project']))])}
function runNode(values){const result=spawnSync(process.execPath,values,{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status??1)}
function forwardArgs(exclude=new Set()){const out=[];for(const [key,value] of Object.entries(args)){if(exclude.has(key)||key==='help')continue;out.push(`--${key.replace(/[A-Z]/g,(c)=>`-${c.toLowerCase()}`)}`,String(value))}return out}
function requireProject(){if(!projectId)fail('--project ist erforderlich.')}
function projectPath(file){return path.join(root,'projects',projectId,file)}
function canonical(value){if(!value)return null;try{const url=new URL(value);url.hash='';return url.toString().replace(/\/$/,'')}catch{return String(value)}}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(error){fail(`JSON ungültig: ${relative(file)} – ${error.message}`)}}
function probeDuration(file){const r=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'});if(r.status!==0)fail('ffprobe konnte Voiceover nicht lesen.');const n=Number(r.stdout.trim());if(!Number.isFinite(n)||n<=0)fail('Voiceover-Dauer ungültig.');return Math.round(n*1000)/1000}
function sha256File(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
function relative(file){return path.relative(root,file).split(path.sep).join('/')}
function slug(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function parseArgs(values){const out={};for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--'))fail(`Unbekanntes Argument: ${token}`);const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(key==='help'){out.help=true;continue}const next=values[i+1];if(!next||next.startsWith('--'))fail(`Wert für ${token} fehlt.`);out[key]=next;i++}return out}
function fail(message){console.error(message);process.exit(1)}
function help(){console.log(`Visual Asset Hub – YouTube Workflow v3.1\n\nPhase 1:\n  npm run youtube:workflow -- phase1-plan --project <id>\n  npm run youtube:workflow -- phase1-materialize --project <id>\n  npm run youtube:workflow -- phase1-quality --project <id>\n  npm run visual:qc -- --project <id>\n  # Assets prüfen/importieren; approved Import erzeugt Rights-Evidence\n  npm run phase1:bind -- auto --project <id>\n  npm run youtube:workflow -- phase1-check --project <id>\n\nPhase 2:\n  npm run youtube:workflow -- voiceover-attach --project <id> --file <audio>\n\nPhase 3:\n  npm run youtube:workflow -- voiceover-align --project <id> --model <whisper-model>\n  npm run youtube:workflow -- phase3-prepare --project <id>\n  npm run youtube:workflow -- phase3-check --project <id>\n\nPhase 1 verlangt lokale Assets + QC + Rights-Evidence. Phase 3 hat keinen Netzwerkzugriff.`)}
