import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const taxonomyPath = path.join(root, 'catalog/taxonomy.json');
const catalogPath = path.join(root, 'catalog/assets.json');
const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
if (args.help) { printHelp(); process.exit(0); }

const required = ['type','category','subject','action','shot','title','description','tags','style','movement','license','source','scopes'];
const missing = required.filter((key) => !args[key]);
if (missing.length) fail(`Fehlende Argumente: ${missing.join(', ')}`);
for (const [value, options, label] of [[args.type,taxonomy.assetTypes,'type'],[args.category,taxonomy.categories,'category'],[args.shot,taxonomy.shotTypes,'shot'],[args.style,taxonomy.styles,'style'],[args.movement,taxonomy.cameraMovements,'movement'],[args.license,taxonomy.licenseStatuses,'license']]) assertMember(value,options,label);

const storageKind = args.storage || (args.externalUrl ? 'external' : 'git-lfs');
assertMember(storageKind,['repository','git-lfs','external'],'storage');
let sourceFile, extension, analysis;
if (storageKind === 'external') {
  if (!args.externalUrl) fail('Externer Speicher benötigt --external-url.');
  extension = slugExtension(args.extension || 'mp4');
} else {
  if (!args.file) fail('Lokaler Import benötigt --file.');
  sourceFile = path.resolve(args.file);
  if (!fs.existsSync(sourceFile) || !fs.statSync(sourceFile).isFile()) fail('Quelldatei wurde nicht gefunden.');
  extension = slugExtension(path.extname(sourceFile).slice(1));
  analysis = analyze(sourceFile);
}
const orientation = args.orientation || analysis?.orientation;
if (!orientation) fail('Ausrichtung konnte nicht automatisch erkannt werden. Nutze --orientation.');
assertMember(orientation,taxonomy.orientations,'orientation');
const subject=slug(args.subject), action=slug(args.action), tags=uniqueList(args.tags).map(slug), aliases=uniqueList(args.aliases||''), secondaryCategories=uniqueList(args.secondaryCategories||''), usageScopes=uniqueList(args.scopes);
if(tags.length<2) fail('Mindestens zwei Tags sind erforderlich.');
for(const c of secondaryCategories) assertMember(c,taxonomy.categories,'secondary-categories');
for(const s of usageScopes) assertMember(s,taxonomy.usageScopes,'scopes');

if (analysis?.sha256 && catalog.assets.some((a)=>a.sha256===analysis.sha256)) fail('Dieses Asset ist bereits im Katalog vorhanden (identischer SHA-256).');
const prefix=taxonomy.typePrefixes[args.type], base=`${prefix}-${args.category}-${subject}-${action}-${args.shot}-${orientation}`, sequence=nextSequence(catalog.assets,base), filename=`${base}-${String(sequence).padStart(4,'0')}.${extension}`, id=createAssetId(new Set(catalog.assets.map(a=>a.id))), assetPath=`assets/${args.type}/${args.category}/${filename}`, now=new Date().toISOString(), status=args.status||(args.license==='unknown'?'inbox':'review');
assertMember(status,taxonomy.lifecycleStatuses,'status');
const technical = analysis?.technical || {};
const asset=compact({id,filename,title:args.title.trim(),description:args.description.trim(),type:args.type,category:args.category,secondaryCategories,tags,searchAliases:aliases,subject,action,orientation,shotType:args.shot,cameraMovement:args.movement,style:args.style,status,qualityRating:numberBetween(args.quality||'3',1,5,'quality'),technical:compact({width:technical.width,height:technical.height,durationSeconds:technical.durationSeconds,fps:technical.fps,codec:technical.codec,hasAudio:technical.hasAudio,alphaChannel:technical.alphaChannel}),storage:storageKind==='external'?compact({kind:storageKind,externalUrl:args.externalUrl,previewPath:args.preview}):compact({kind:storageKind,path:assetPath,previewPath:analysis?.previewPath||args.preview}),rights:compact({licenseStatus:args.license,sourceName:args.source.trim(),sourceUrl:args.sourceUrl,licenseUrl:args.licenseUrl,usageScopes,attributionRequired:args.attributionRequired==='true',attributionText:args.attributionText,expiresAt:args.expires,notes:args.rightsNotes}),createdAt:args.createdAt||now,importedAt:now,createdBy:args.createdBy,sha256:analysis?.sha256,notes:args.notes});
const previousCatalog=fs.readFileSync(catalogPath,'utf8'), nextCatalog={...catalog,updatedAt:now,assets:[...catalog.assets,asset].sort((a,b)=>a.id.localeCompare(b.id))};
console.log(JSON.stringify({id,filename,target:storageKind==='external'?args.externalUrl:assetPath,status,autoAnalyzed:Boolean(analysis)},null,2));
if(args.dryRun==='true') process.exit(0);
let copiedPath,copied=false;
try { if(sourceFile){copiedPath=path.join(root,...assetPath.split('/'));fs.mkdirSync(path.dirname(copiedPath),{recursive:true});if(path.resolve(sourceFile)!==path.resolve(copiedPath)){fs.copyFileSync(sourceFile,copiedPath,fs.constants.COPYFILE_EXCL);copied=true;}} fs.writeFileSync(catalogPath,`${JSON.stringify(nextCatalog,null,2)}\n`); runNode('scripts/validate-catalog.mjs'); runNode('scripts/build-index.mjs'); console.log(`Asset ${id} wurde analysiert und sicher aufgenommen.`); }
catch(error){fs.writeFileSync(catalogPath,previousCatalog);if(copied&&copiedPath&&fs.existsSync(copiedPath))fs.rmSync(copiedPath,{force:true});fail(`Import wurde zurückgerollt: ${error.message||String(error)}`);}

function analyze(file){const r=spawnSync(process.execPath,['scripts/analyze-media.mjs','--file',file],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0) fail(`Automatische Medienanalyse fehlgeschlagen: ${(r.stderr||r.stdout).trim()}`);try{return JSON.parse(r.stdout)}catch{fail('Medienanalyse lieferte ungültige Daten.')}}
function runNode(script){const r=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});if(r.status!==0)throw new Error(r.stderr||r.stdout||`${script} fehlgeschlagen`)}
function parseArgs(v){const r={};for(let i=0;i<v.length;i++){const e=v[i];if(!e.startsWith('--'))fail(`Unbekanntes Argument: ${e}`);const k=camel(e.slice(2));if(k==='help'){r.help=true;continue}const val=v[i+1];if(!val||val.startsWith('--'))fail(`Wert für ${e} fehlt.`);r[k]=val;i++}return r}
function nextSequence(a,b){const p=new RegExp(`^${escapeRegExp(b)}-(\\d{4})\\.`),u=a.map(x=>x.filename.match(p)?.[1]).filter(Boolean).map(Number);return u.length?Math.max(...u)+1:1}
function createAssetId(e){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let n=0;n<100;n++){const b=randomBytes(8);let s='';for(let i=0;i<8;i++)s+=a[b[i]%a.length];const id=`VAH-${s}`;if(!e.has(id))return id}fail('Keine eindeutige Asset-ID erzeugbar.')}
function slug(v){const r=v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');if(!r)fail(`Ungültiger Slug: ${v}`);return r}
function uniqueList(v){return[...new Set(v.split(',').map(x=>x.trim()).filter(Boolean))]}
function slugExtension(v){const e=v.toLowerCase().replace(/[^a-z0-9]/g,'');if(!e)fail('Ungültige Dateiendung.');return e}
function compact(v){return Object.fromEntries(Object.entries(v).filter(([,e])=>e!==undefined&&e!==''))}
function numberBetween(v,min,max,l){const n=Number(v);if(!Number.isInteger(n)||n<min||n>max)fail(`${l} muss zwischen ${min} und ${max} liegen.`);return n}
function assertMember(v,o,l){if(!o.includes(v))fail(`${l} ist ungültig: ${v}`)}
function camel(v){return v.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())}
function escapeRegExp(v){return v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function fail(m){console.error(m);process.exit(1)}
function printHelp(){console.log(`Visual Asset Hub Import\n\nLokale Medien werden jetzt automatisch mit ffprobe analysiert. --orientation, --width, --height, --duration, --fps, --codec, --has-audio und --alpha sind für lokale Dateien nicht mehr nötig.\n\nBeispiel:\n npm run asset:add -- --file ./inbox/clip.mp4 --type video --category technology-ai --subject smartphone --action scrolling --shot cu --title "Smartphone" --description "Nahaufnahme beim Scrollen." --tags smartphone,scrolling --style realistic --movement static --license owned --source "Eigene Produktion" --scopes youtube\n`)}