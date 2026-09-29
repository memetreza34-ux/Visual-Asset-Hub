import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const args=parseArgs(process.argv.slice(2));
const taxonomyPath=path.join(root,'catalog/taxonomy.json');
const catalogPath=path.join(root,'catalog/assets.json');
const taxonomy=JSON.parse(fs.readFileSync(taxonomyPath,'utf8'));
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
if(args.help){printHelp();process.exit(0);}

const required=['type','category','subject','action','shot','title','description','tags','style','movement','license','source','scopes'];
const missing=required.filter((key)=>!args[key]);
if(missing.length)fail(`Fehlende Argumente: ${missing.join(', ')}`);
for(const [value,options,label] of [[args.type,taxonomy.assetTypes,'type'],[args.category,taxonomy.categories,'category'],[args.shot,taxonomy.shotTypes,'shot'],[args.style,taxonomy.styles,'style'],[args.movement,taxonomy.cameraMovements,'movement'],[args.license,taxonomy.licenseStatuses,'license']])assertMember(value,options,label);

const storageKind=args.storage||(args.externalUrl?'external':'git-lfs');
assertMember(storageKind,['repository','git-lfs','external'],'storage');
let sourceFile,extension,analysis;
if(storageKind==='external'){
  if(!args.externalUrl)fail('Externer Speicher benötigt --external-url.');
  extension=slugExtension(args.extension||'mp4');
}else{
  if(!args.file)fail('Lokaler Import benötigt --file.');
  sourceFile=path.resolve(args.file);
  if(!fs.existsSync(sourceFile)||!fs.statSync(sourceFile).isFile())fail('Quelldatei wurde nicht gefunden.');
  extension=slugExtension(path.extname(sourceFile).slice(1));
  analysis=analyze(sourceFile);
}
const orientation=args.orientation||analysis?.orientation;
if(!orientation)fail('Ausrichtung konnte nicht automatisch erkannt werden. Nutze --orientation.');
assertMember(orientation,taxonomy.orientations,'orientation');
const subject=slug(args.subject),action=slug(args.action),tags=uniqueList(args.tags).map(slug),aliases=uniqueList(args.aliases||''),secondaryCategories=uniqueList(args.secondaryCategories||''),usageScopes=uniqueList(args.scopes);
if(tags.length<2)fail('Mindestens zwei Tags sind erforderlich.');
for(const c of secondaryCategories)assertMember(c,taxonomy.categories,'secondary-categories');
for(const s of usageScopes)assertMember(s,taxonomy.usageScopes,'scopes');
if(analysis?.sha256&&catalog.assets.some((a)=>a.sha256===analysis.sha256))fail('Dieses Asset ist bereits im Katalog vorhanden (identischer SHA-256).');

const prefix=taxonomy.typePrefixes[args.type];
const base=`${prefix}-${args.category}-${subject}-${action}-${args.shot}-${orientation}`;
const sequence=nextSequence(catalog.assets,base);
const filename=`${base}-${String(sequence).padStart(4,'0')}.${extension}`;
const id=createAssetId(new Set(catalog.assets.map((a)=>a.id)));
const assetPath=`assets/${args.type}/${args.category}/${filename}`;
const now=new Date().toISOString();
const status=args.status||(args.license==='unknown'?'inbox':'review');
assertMember(status,taxonomy.lifecycleStatuses,'status');
const technical=analysis?.technical||{};
const rightsCheckedAt=args.rightsCheckedAt||(status==='approved'?now:undefined);
const evidencePath=args.evidencePath||(status==='approved'?`.local-storage/rights-evidence/${id}/evidence.json`:undefined);
const asset=compact({
  id,filename,title:args.title.trim(),description:args.description.trim(),type:args.type,category:args.category,secondaryCategories,tags,searchAliases:aliases,subject,action,orientation,shotType:args.shot,cameraMovement:args.movement,style:args.style,status,
  qualityRating:numberBetween(args.quality||'3',1,5,'quality'),
  technical:compact({width:technical.width,height:technical.height,durationSeconds:technical.durationSeconds,fps:technical.fps,codec:technical.codec,hasAudio:technical.hasAudio,alphaChannel:technical.alphaChannel}),
  storage:storageKind==='external'?compact({kind:storageKind,externalUrl:args.externalUrl,previewPath:args.preview}):compact({kind:storageKind,path:assetPath,previewPath:analysis?.previewPath||args.preview}),
  rights:compact({
    licenseStatus:args.license,
    licenseCode:args.licenseCode,
    licenseVersion:args.licenseVersion,
    sourceName:args.source.trim(),
    sourceUrl:args.sourceUrl,
    licenseUrl:args.licenseUrl,
    usageScopes,
    commercialUse:optionalBoolean(args.commercialUse,'commercial-use'),
    derivativesAllowed:optionalBoolean(args.derivativesAllowed,'derivatives-allowed'),
    shareAlike:optionalBoolean(args.shareAlike,'share-alike'),
    attributionRequired:args.attributionRequired==='true',
    attributionText:args.attributionText,
    checkedAt:rightsCheckedAt,
    evidencePath,
    expiresAt:args.expires,
    notes:args.rightsNotes
  }),
  createdAt:args.createdAt||now,importedAt:now,createdBy:args.createdBy,sha256:analysis?.sha256,notes:args.notes
});
const previousCatalog=fs.readFileSync(catalogPath,'utf8');
const nextCatalog={...catalog,updatedAt:now,assets:[...catalog.assets,asset].sort((a,b)=>a.id.localeCompare(b.id))};
console.log(JSON.stringify({id,filename,target:storageKind==='external'?args.externalUrl:assetPath,status,autoAnalyzed:Boolean(analysis),rightsEvidence:evidencePath||null},null,2));
if(args.dryRun==='true'){console.log('Dry-Run: keine Dateien verändert.');process.exit(0);}

let copiedPath,copied=false;
try{
  if(sourceFile){
    copiedPath=path.join(root,...assetPath.split('/'));
    fs.mkdirSync(path.dirname(copiedPath),{recursive:true});
    if(path.resolve(sourceFile)!==path.resolve(copiedPath)){fs.copyFileSync(sourceFile,copiedPath,fs.constants.COPYFILE_EXCL);copied=true;}
  }
  fs.writeFileSync(catalogPath,`${JSON.stringify(nextCatalog,null,2)}\n`);
  runNodeRequired('scripts/validate-catalog.mjs',[]);
  runNodeRequired('scripts/build-index.mjs',[]);
  if(status==='approved'){
    const evidenceArgs=['snapshot','--asset',id];
    if(args.captureRights==='true')evidenceArgs.push('--capture','true');
    runNodeRequired('scripts/rights-evidence.mjs',evidenceArgs);
    tryMemoryIndex(asset,copiedPath||sourceFile);
  }
  console.log(`Asset ${id} wurde analysiert und sicher aufgenommen.`);
}catch(error){
  fs.writeFileSync(catalogPath,previousCatalog);
  if(copied&&copiedPath&&fs.existsSync(copiedPath))fs.rmSync(copiedPath,{force:true});
  fail(`Import wurde zurückgerollt: ${error.message||String(error)}`);
}

function tryMemoryIndex(assetValue,localOriginal){
  if(assetValue.storage?.kind==='external')return;
  let file=localOriginal;
  if(assetValue.type!=='image'){
    const preview=assetValue.storage?.previewPath;
    file=preview?path.join(root,preview):null;
  }
  if(!file||!fs.existsSync(file))return;
  const result=spawnSync(process.execPath,['scripts/open-source-toolchain.mjs','asset-memory-index','--file',file,'--id',assetValue.id,'--title',assetValue.title],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(result.status!==0)console.warn('Asset-Memory optional übersprungen (OpenCLIP/sqlite-vec nicht verfügbar oder Indexierung fehlgeschlagen).');
  else console.log(`Asset-Memory indexiert: ${assetValue.id}`);
}
function analyze(file){const r=spawnSync(process.execPath,['scripts/analyze-media.mjs','--file',file],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0)fail(`Automatische Medienanalyse fehlgeschlagen: ${(r.stderr||r.stdout).trim()}`);try{return JSON.parse(r.stdout)}catch{fail('Medienanalyse lieferte ungültige Daten.')}}
function runNodeRequired(script,values){const r=spawnSync(process.execPath,[script,...values],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0)throw new Error(r.stderr||r.stdout||`${script} fehlgeschlagen`);if(r.stdout?.trim())console.log(r.stdout.trim());}
function parseArgs(v){const r={};for(let i=0;i<v.length;i++){const e=v[i];if(!e.startsWith('--'))fail(`Unbekanntes Argument: ${e}`);const k=camel(e.slice(2));if(k==='help'){r.help=true;continue}const val=v[i+1];if(!val||val.startsWith('--'))fail(`Wert für ${e} fehlt.`);r[k]=val;i++}return r}
function nextSequence(a,b){const p=new RegExp(`^${escapeRegExp(b)}-(\\d{4})\\.`),u=a.map((x)=>x.filename.match(p)?.[1]).filter(Boolean).map(Number);return u.length?Math.max(...u)+1:1}
function createAssetId(e){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let n=0;n<100;n++){const b=randomBytes(8);let s='';for(let i=0;i<8;i++)s+=a[b[i]%a.length];const id=`VAH-${s}`;if(!e.has(id))return id}fail('Keine eindeutige Asset-ID erzeugbar.')}
function slug(v){const r=v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');if(!r)fail(`Ungültiger Slug: ${v}`);return r}
function uniqueList(v){return[...new Set(v.split(',').map((x)=>x.trim()).filter(Boolean))]}
function slugExtension(v){const e=v.toLowerCase().replace(/[^a-z0-9]/g,'');if(!e)fail('Ungültige Dateiendung.');return e}
function compact(v){return Object.fromEntries(Object.entries(v).filter(([,e])=>e!==undefined&&e!==''))}
function numberBetween(v,min,max,l){const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)fail(`${l} muss zwischen ${min} und ${max} liegen.`);return n}
function optionalBoolean(value,label){if(value===undefined)return undefined;if(value==='true')return true;if(value==='false')return false;fail(`${label} muss true oder false sein.`)}
function assertMember(v,o,l){if(!o.includes(v))fail(`${l} ist ungültig: ${v}`)}
function camel(v){return v.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())}
function escapeRegExp(v){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function fail(m){console.error(m);process.exit(1)}
function printHelp(){console.log(`Visual Asset Hub Import v0.18\n\nApproved Assets erzeugen automatisch eine lokale Rights-Evidence-Akte. Optionales Asset-Memory wird best-effort indexiert.\n\nNeue Rights-Felder:\n --license-code cc-by-sa-4.0\n --license-version 4.0\n --commercial-use true|false\n --derivatives-allowed true|false\n --share-alike true|false\n --rights-checked-at <ISO>\n --capture-rights true\n\nBeispiel:\n npm run asset:add -- --file ./inbox/photo.jpg --type image --category science-engineering --subject volcano --action erupting --shot ls --title "Volcano" --description "Eruption with lightning." --tags volcano,lightning --style documentary --movement static --license public-domain --source "USGS" --source-url "https://www.usgs.gov/..." --scopes youtube --status approved`)}
