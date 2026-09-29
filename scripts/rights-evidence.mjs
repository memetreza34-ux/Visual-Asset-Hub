import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const [command='snapshot',...rest]=process.argv.slice(2);
const args=parseArgs(rest);
if(command==='help'||args.help){help();process.exit(0);}
if(!['snapshot','check'].includes(command))fail(`Unbekannter Befehl: ${command}`);
const assetId=String(args.asset||'').trim();
if(!assetId)fail('--asset ist erforderlich.');
const catalog=readJson(path.join(root,'catalog','assets.json'));
const asset=catalog.assets?.find((item)=>item.id===assetId);
if(!asset)fail(`Asset nicht gefunden: ${assetId}`);
const evidenceFile=path.join(root,asset.rights?.evidencePath||`catalog/rights-evidence/${assetId}.json`);
const captureDir=path.join(root,'.local-storage','rights-evidence',assetId,'source-capture');

if(command==='check'){
  if(!fs.existsSync(evidenceFile))fail(`Rights-Evidence fehlt: ${relative(evidenceFile)}`);
  const evidence=readJson(evidenceFile),errors=[];
  if(evidence.assetId!==asset.id)errors.push('assetId stimmt nicht überein.');
  if(asset.sha256&&evidence.assetSha256!==asset.sha256)errors.push('Asset-SHA stimmt nicht überein.');
  if(canonical(evidence.sourceUrl)!==canonical(asset.rights?.sourceUrl))errors.push('sourceUrl stimmt nicht mit dem Katalog überein.');
  if(evidence.licenseStatus!==asset.rights?.licenseStatus)errors.push('licenseStatus stimmt nicht mit dem Katalog überein.');
  if(evidence.licenseCode!==(asset.rights?.licenseCode||null))errors.push('licenseCode stimmt nicht mit dem Katalog überein.');
  if(errors.length){errors.forEach((item)=>console.error(`- ${item}`));fail('Rights-Evidence ist veraltet oder inkonsistent.');}
  console.log(`Rights-Evidence OK: ${asset.id} · ${relative(evidenceFile)}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});
const checkedAt=asset.rights?.checkedAt||new Date().toISOString();
const evidence={
  version:2,
  assetId:asset.id,
  assetSha256:asset.sha256||null,
  generatedAt:new Date().toISOString(),
  checkedAt,
  sourceName:asset.rights?.sourceName||null,
  sourceUrl:asset.rights?.sourceUrl||null,
  licenseStatus:asset.rights?.licenseStatus||'unknown',
  licenseCode:asset.rights?.licenseCode||null,
  licenseVersion:asset.rights?.licenseVersion||null,
  licenseUrl:asset.rights?.licenseUrl||null,
  commercialUse:asset.rights?.commercialUse??null,
  derivativesAllowed:asset.rights?.derivativesAllowed??null,
  shareAlike:asset.rights?.shareAlike??null,
  attributionRequired:asset.rights?.attributionRequired===true,
  attributionText:asset.rights?.attributionText||null,
  usageScopes:asset.rights?.usageScopes||[],
  expiresAt:asset.rights?.expiresAt||null,
  rightsNotes:asset.rights?.notes||null,
  sourceCapture:null,
  policy:{snapshotIsAuditRecordNotLegalOpinion:true,sourceCaptureDoesNotGrantRights:true,eventIdentityRemainsSeparateReview:true,persistentJsonTrackedWithCatalog:true}
};

if(args.capture==='true'&&evidence.sourceUrl){
  fs.mkdirSync(captureDir,{recursive:true});
  const result=spawnSync(process.execPath,['scripts/article-capture.mjs','--url',evidence.sourceUrl,'--output-dir',captureDir,'--full-page','true'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(result.status===0){evidence.sourceCapture={status:'captured-local',directory:relative(captureDir),metadata:relative(path.join(captureDir,'capture.json')),screenshot:relative(path.join(captureDir,'page.png'))};}
  else{evidence.sourceCapture={status:'capture-failed',error:clean(result.stderr||result.stdout||'capture failed')};if(args.requireCapture==='true')fail(`Quellen-Capture fehlgeschlagen: ${evidence.sourceCapture.error}`);}
}

evidence.fingerprint=crypto.createHash('sha256').update(JSON.stringify({assetId:evidence.assetId,assetSha256:evidence.assetSha256,sourceUrl:evidence.sourceUrl,licenseStatus:evidence.licenseStatus,licenseCode:evidence.licenseCode,licenseUrl:evidence.licenseUrl,commercialUse:evidence.commercialUse,derivativesAllowed:evidence.derivativesAllowed,shareAlike:evidence.shareAlike,attributionRequired:evidence.attributionRequired,attributionText:evidence.attributionText,usageScopes:evidence.usageScopes,checkedAt:evidence.checkedAt})).digest('hex');
fs.writeFileSync(evidenceFile,`${JSON.stringify(evidence,null,2)}\n`);
console.log(`Rights-Evidence: ${relative(evidenceFile)}`);
if(evidence.sourceCapture?.status==='capture-failed')console.warn('WARN Quellen-Capture fehlgeschlagen; persistenter Metadaten-Snapshot wurde trotzdem gespeichert.');

function canonical(value){if(!value)return null;try{const url=new URL(value);url.hash='';return url.toString().replace(/\/$/,'')}catch{return String(value)}}
function clean(value){return String(value||'').trim().slice(0,2000)}
function relative(file){return path.relative(root,file).split(path.sep).join('/')}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(error){fail(`JSON ungültig: ${relative(file)} – ${error.message}`)}}
function parseArgs(values){const out={};for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--'))fail(`Unbekannt: ${token}`);const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(key==='help'){out.help=true;continue}const next=values[i+1];if(!next||next.startsWith('--'))fail(`Wert für ${token} fehlt.`);out[key]=next;i++}return out}
function fail(message){console.error(message);process.exit(1)}
function help(){console.log(`Rights Evidence v2\n\n  npm run rights:evidence -- snapshot --asset VAH-XXXXXXXX\n  npm run rights:evidence -- snapshot --asset VAH-XXXXXXXX --capture true\n  npm run rights:evidence -- check --asset VAH-XXXXXXXX\n\nDer kleine Audit-Datensatz liegt dauerhaft unter catalog/rights-evidence/. Große Quellseiten-Screenshots bleiben unter .local-storage/. Evidence ist kein automatischer Rechtsnachweis.`)}
