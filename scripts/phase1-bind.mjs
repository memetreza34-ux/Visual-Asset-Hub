import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const [commandRaw,...rest]=process.argv.slice(2);
const command=commandRaw||'auto';
const args=parseArgs(rest);
if(command==='help'||args.help){help();process.exit(0);}
const projectId=slug(args.project||'');
if(!projectId)fail('--project ist erforderlich.');
const projectDir=path.join(root,'projects',projectId);
const catalog=readJson(path.join(root,'catalog','assets.json'));
const materialization=readOptional(path.join(projectDir,'materialization.json'));
const qc=readOptional(path.join(projectDir,'visual-qc.json'));
const shotPlan=readJson(path.join(projectDir,'shot-plan.json'));
const bindingFile=path.join(projectDir,'beat-bindings.json');
const bindings=fs.existsSync(bindingFile)?readJson(bindingFile):{version:2,projectId,generatedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),beats:[]};

if(command==='auto')autoBind();else if(command==='set')setBinding();else if(command==='check')checkBindings();else if(command==='show')process.stdout.write(`${JSON.stringify(bindings,null,2)}\n`);else fail(`Unbekannter Befehl: ${command}`);

function autoBind(){
  if(!materialization)fail('materialization.json fehlt. Erst phase1:materialize ausführen.');
  if(!qc)fail('visual-qc.json fehlt. Erst visual:qc ausführen.');
  let added=0;
  for(const shot of shotPlan.shots||[]){
    if(bindingFor(shot.id)?.assetId)continue;
    const beat=materialization.beats?.find((item)=>item.id===shot.id);
    if(!beat)continue;
    const qcBeat=qc.beats?.find((item)=>item.id===shot.id);
    const candidateId=qcBeat?.bestCandidateId||beat.selectedCandidateId;
    if(!candidateId)continue;
    const candidate=beat.candidates?.find((item)=>item.candidateId===candidateId);
    if(!candidate)continue;
    const qcCandidate=qcBeat?.candidates?.find((item)=>item.candidateId===candidateId);
    if(!qcCandidate||qcCandidate.status==='blocked'||Number(qcCandidate.score||0)<Number(qc.policy?.minimumScore||70))continue;
    const asset=candidate.catalogAssetId?catalog.assets.find((item)=>item.id===candidate.catalogAssetId):findCatalogAssetForCandidate(candidate);
    if(!asset||!assetReady(asset))continue;
    upsert({
      beatId:shot.id,assetId:asset.id,candidateId,phase1ReferenceCandidateId:beat.selectedCandidateId||null,sourceUrl:candidate.sourceUrl||asset.rights?.sourceUrl||null,qcScore:qcCandidate.score,qcStatus:qcCandidate.status,status:'bound-approved-asset',boundAt:new Date().toISOString(),bindingMode:candidate.catalogAssetId?'auto-local-library':'auto-source-match',manualReviewed:false,localReuse:candidate.catalogAssetId?true:false
    });
    added++;
  }
  save();
  console.log(`Auto-Bind: ${added} neue Bindings. ${bindings.beats.filter((x)=>x.assetId).length}/${shotPlan.shots.length} Shots gebunden.`);
  console.log('Nicht gebundene Shots benötigen Import/Review oder phase1:bind set.');
}

function setBinding(){
  const beatId=String(args.beat||'').trim(),assetId=String(args.asset||'').trim();
  if(!beatId||!assetId)fail('set benötigt --beat und --asset.');
  if(!(shotPlan.shots||[]).some((item)=>item.id===beatId))fail(`Shot unbekannt: ${beatId}`);
  const asset=catalog.assets.find((item)=>item.id===assetId);
  if(!asset)fail(`Asset nicht gefunden: ${assetId}`);
  validateReady(asset);
  const qcBeat=qc?.beats?.find((item)=>item.id===beatId),beat=materialization?.beats?.find((item)=>item.id===beatId),sourceUrl=asset.rights?.sourceUrl||null;
  const candidate=beat?.candidates?.find((item)=>item.catalogAssetId===assetId||(canonical(item.sourceUrl)&&canonical(item.sourceUrl)===canonical(sourceUrl)));
  const qcCandidate=candidate?qcBeat?.candidates?.find((item)=>item.candidateId===candidate.candidateId):null;
  if(qcCandidate?.status==='blocked'&&args.force!=='true')fail(`QC blockiert ${candidate.candidateId}. Nur nach bewusster Prüfung mit --force true überschreiben.`);
  upsert({beatId,assetId,candidateId:candidate?.candidateId||null,sourceUrl,qcScore:qcCandidate?.score??null,qcStatus:qcCandidate?.status??null,status:'bound-approved-asset',boundAt:new Date().toISOString(),bindingMode:'explicit',manualReviewed:true,forcedAgainstQc:qcCandidate?.status==='blocked'&&args.force==='true'});
  save();
  console.log(`${beatId} → ${assetId} gebunden (explizite redaktionelle Freigabe).`);
}

function checkBindings(){
  const errors=[],warnings=[];
  for(const shot of shotPlan.shots||[]){
    const binding=bindingFor(shot.id);
    if(!binding?.assetId){errors.push(`${shot.id}: kein Asset gebunden.`);continue;}
    const asset=catalog.assets.find((item)=>item.id===binding.assetId);
    if(!asset){errors.push(`${shot.id}: Asset ${binding.assetId} fehlt im Katalog.`);continue;}
    if(asset.status!=='approved')errors.push(`${shot.id}: Asset ${asset.id} ist ${asset.status}, nicht approved.`);
    if(!asset.rights?.usageScopes?.includes('youtube'))errors.push(`${shot.id}: Asset ${asset.id} ist nicht für youtube freigegeben.`);
    if(['unknown','restricted','editorial-only'].includes(asset.rights?.licenseStatus))errors.push(`${shot.id}: Asset ${asset.id} hat ${asset.rights.licenseStatus}-Rechte.`);
    if(['auto-source-match','auto-local-library'].includes(binding.bindingMode)){
      if(!Number.isFinite(binding.qcScore)||binding.qcScore<Number(qc?.policy?.minimumScore||70))errors.push(`${shot.id}: Auto-Binding hat keinen ausreichenden QC-Score.`);
      if(binding.qcStatus==='blocked')errors.push(`${shot.id}: Auto-Binding wurde von Visual-QC blockiert.`);
    }
    if(binding.bindingMode==='explicit'&&binding.manualReviewed!==true)errors.push(`${shot.id}: explizites Binding ist nicht als redaktionell geprüft markiert.`);
    if(binding.forcedAgainstQc)warnings.push(`${shot.id}: QC-Block wurde bewusst überschrieben.`);
  }
  if(warnings.length)warnings.forEach((item)=>console.warn(`WARN ${item}`));
  if(errors.length){errors.forEach((item)=>console.error(`- ${item}`));fail(`Phase-1-Binding NICHT fertig (${errors.length} Fehler).`);}
  console.log(`Phase-1-Binding OK: ${shotPlan.shots.length} Shots besitzen approved YouTube-Assets.`);
}

function findCatalogAssetForCandidate(candidate){const targetUrl=canonical(candidate.sourceUrl);if(!targetUrl)return null;const exact=catalog.assets.filter((asset)=>canonical(asset.rights?.sourceUrl)===targetUrl);if(exact.length===1)return exact[0];if(exact.length>1)return exact.find(assetReady)||exact[0];return null}
function assetReady(asset){return asset.status==='approved'&&asset.rights?.usageScopes?.includes('youtube')&&!['unknown','restricted','editorial-only'].includes(asset.rights?.licenseStatus)&&asset.storage?.kind!=='external'&&Boolean(asset.storage?.path)}
function validateReady(asset){if(asset.status!=='approved')fail(`Asset ${asset.id} ist nicht approved.`);if(!asset.rights?.usageScopes?.includes('youtube'))fail(`Asset ${asset.id} ist nicht für youtube freigegeben.`);if(['unknown','restricted','editorial-only'].includes(asset.rights?.licenseStatus))fail(`Asset ${asset.id} hat ${asset.rights.licenseStatus}-Rechte.`);if(asset.storage?.kind==='external'||!asset.storage?.path)fail(`Asset ${asset.id} ist nicht lokal materialisiert.`)}
function upsert(value){const index=bindings.beats.findIndex((item)=>item.beatId===value.beatId);if(index>=0)bindings.beats[index]={...bindings.beats[index],...value};else bindings.beats.push(value);bindings.beats.sort((a,b)=>String(a.beatId).localeCompare(String(b.beatId)))}
function bindingFor(beatId){return bindings.beats.find((item)=>item.beatId===beatId)}
function save(){bindings.version=2;bindings.updatedAt=new Date().toISOString();fs.writeFileSync(bindingFile,`${JSON.stringify(bindings,null,2)}\n`)}
function canonical(value){try{const url=new URL(value);url.hash='';for(const key of [...url.searchParams.keys()])if(/^(utm_|fbclid|gclid)/i.test(key))url.searchParams.delete(key);return url.toString().replace(/\/$/,'')}catch{return null}}
function readOptional(file){return fs.existsSync(file)?readJson(file):null}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(error){fail(`JSON ungültig: ${path.relative(root,file)} – ${error.message}`)}}
function safeName(value){return String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)}
function slug(value){return safeName(value)}
function parseArgs(values){const result={};for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--'))fail(`Unbekanntes Argument: ${token}`);const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(key==='help'){result.help=true;continue}const next=values[i+1];if(!next||next.startsWith('--'))fail(`Wert für ${token} fehlt.`);result[key]=next;i++}return result}
function fail(message){console.error(message);process.exit(1)}
function help(){console.log(`Phase-1 Asset Binding v2\n\n  npm run phase1:bind -- auto --project <id>\n  npm run phase1:bind -- set --project <id> --beat b03-s01 --asset VAH-XXXXXXXX\n  npm run phase1:bind -- check --project <id>\n\nAuto-Binding unterstützt sowohl frisch importierte Provider-Treffer als auch approved lokale Bibliotheksassets.`)}
