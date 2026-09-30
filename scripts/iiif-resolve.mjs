import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args=parseArgs(process.argv.slice(2));
if(args.help){help();process.exit(0);}
const url=String(args.url||'').trim();
if(!url)fail('--url ist erforderlich.');
const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'Visual-Asset-Hub/0.19 IIIF resolver'}});
if(!response.ok)fail(`IIIF-Abruf fehlgeschlagen (${response.status}).`);
const payload=await response.json();
const assets=resolveIiif(payload,url);
if(!assets.length)fail('Kein nutzbares IIIF-Bild im Manifest/info.json gefunden.');
const report={version:1,generatedAt:new Date().toISOString(),source:url,policy:{resolverOnly:true,rightsMustBeReviewedSeparately:true,iiifDoesNotGrantReuseRights:true},assets};
const text=`${JSON.stringify(report,null,2)}\n`;
if(args.output){const out=path.resolve(args.output);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text);console.log(`IIIF-Report: ${out}`);}else process.stdout.write(text);

function resolveIiif(data,source){
  if(isImageService(data))return[serviceAsset(data,source)];
  const out=[];
  walk(data,(node)=>{
    const service=extractService(node);
    if(service)out.push(serviceAsset(service,source,node));
    else if(isDirectImage(node))out.push(directAsset(node,source));
  });
  return dedupe(out,(item)=>item.downloads?.[0]?.url).slice(0,100);
}
function serviceAsset(service,source,node={}){
  const id=service.id||service['@id'];
  const width=num(service.width)||num(node.width),height=num(service.height)||num(node.height);
  const imageUrl=`${String(id).replace(/\/$/,'')}/full/max/0/default.jpg`;
  return{provider:'iiif',provider_id:String(id),type:'image',title:label(node)||label(service)||'IIIF image',description:null,source_url:source,creator:null,creator_url:null,width,height,duration_seconds:null,orientation:orientation(width,height),preview_url:imageUrl,tags:[],downloads:[{quality:'iiif-max',url:imageUrl,width,height,size:null,file_type:'image/jpeg',preview_url:imageUrl}],rights:{license_status:'unknown',license_code:'IIIF-rights-review',license_url:null,attribution_required:false,attribution_text:null,suggested_scopes:['internal-only'],suggested_status:'review',warning:'IIIF is a delivery standard, not a reuse license. Read rights/requiredStatement metadata from the source manifest and verify before publication.'}};
}
function directAsset(node,source){const id=node.id||node['@id'];const width=num(node.width),height=num(node.height);return{provider:'iiif',provider_id:String(id),type:'image',title:label(node)||'IIIF image',description:null,source_url:source,creator:null,creator_url:null,width,height,duration_seconds:null,orientation:orientation(width,height),preview_url:id,tags:[],downloads:[{quality:'direct',url:id,width,height,size:null,file_type:node.format||'image/jpeg',preview_url:id}],rights:{license_status:'unknown',license_code:'IIIF-rights-review',license_url:null,attribution_required:false,suggested_scopes:['internal-only'],suggested_status:'review',warning:'Direct IIIF image found. Reuse rights must be verified from the manifest/source.'}};}
function extractService(node){if(!node||typeof node!=='object')return null;const values=[];if(node.service)values.push(...(Array.isArray(node.service)?node.service:[node.service]));if(node.services)values.push(...(Array.isArray(node.services)?node.services:[node.services]));return values.find(isImageService)||null;}
function isImageService(node){if(!node||typeof node!=='object')return false;const id=node.id||node['@id'];const type=String(node.type||node['@type']||'');const profile=String(node.profile||'');return Boolean(id)&&(type.includes('ImageService')||profile.includes('iiif.io/api/image')||/\/iiif\//i.test(String(id)));}
function isDirectImage(node){if(!node||typeof node!=='object')return false;const id=node.id||node['@id'];const type=String(node.type||node['@type']||'').toLowerCase();const format=String(node.format||'').toLowerCase();return Boolean(id)&&(type==='image'||type.endsWith(':image')||format.startsWith('image/'))&&!extractService(node);}
function walk(value,visit,seen=new Set()){if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);visit(value);for(const child of Array.isArray(value)?value:Object.values(value))walk(child,visit,seen);}
function label(node){const value=node?.label;if(typeof value==='string')return value;if(Array.isArray(value))return value.find(Boolean)||null;if(value&&typeof value==='object'){for(const arr of Object.values(value))if(Array.isArray(arr)&&arr[0])return String(arr[0]);}return null;}
function dedupe(values,key){const seen=new Set();return values.filter((item)=>{const k=key(item);if(!k||seen.has(k))return false;seen.add(k);return true;});}
function orientation(w,h){w=Number(w||0);h=Number(h||0);if(!w||!h)return null;if(w===h)return'square';return w>h?'horizontal':'vertical';}
function num(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function parseArgs(values){const out={};for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--'))fail(`Unbekannt: ${token}`);const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(key==='help'){out.help=true;continue;}const next=values[i+1];if(!next||next.startsWith('--'))fail(`Wert für ${token} fehlt.`);out[key]=next;i++;}return out;}
function fail(message){console.error(message);process.exit(1);}
function help(){console.log(`IIIF Resolver\n\n  npm run iiif:resolve -- --url <manifest-or-info.json>\n  npm run iiif:resolve -- --url <manifest> --output ./iiif.json\n\nExtrahiert hochauflösende Bild-URLs aus IIIF Presentation/Image APIs. IIIF selbst ist keine Lizenz; Rechte bleiben Review-Pflicht.`);}
