const API='https://developer.nps.gov/api/v1';

export async function searchNps({apiKey,query,type='image',page=1,perPage=20,fetchImpl=fetch}){
  if(!apiKey)throw new Error('NPS_API_KEY fehlt. Der National Park Service stellt kostenlose API-Keys bereit.');
  if(!query?.trim())throw new Error('NPS-Suche benötigt einen Suchbegriff.');
  if(!['image','video'].includes(type))throw new Error('NPS unterstützt image oder video.');
  const limit=clamp(perPage,1,50),safePage=Math.max(1,Number(page)||1),start=(safePage-1)*limit;
  const endpoint=type==='video'?'multimedia/videos':'multimedia/galleries/assets';
  const params=new URLSearchParams({q:query.trim(),limit:String(limit),start:String(start)});
  const response=await fetchImpl(`${API}/${endpoint}?${params}`,{headers:{Authorization:apiKey,Accept:'application/json','User-Agent':'Visual-Asset-Hub/0.19 documentary research'}});
  if(!response.ok)throw new Error(`NPS-Suche fehlgeschlagen (${response.status}).`);
  const payload=await response.json();
  const assets=(payload.data||[]).map((item)=>normalize(item,type)).filter(Boolean);
  return{provider:'nps',query:query.trim(),type,page:safePage,per_page:limit,total_results:Number(payload.total)||null,assets};
}

function normalize(item,type){
  const constraint=String(item.constraintsInfo?.constraint||'').trim();
  const granting=String(item.constraintsInfo?.grantingRights||'').trim();
  const publicDomain=/public\s*domain/i.test(constraint)||(/full/i.test(granting)&&!/copyright|restricted/i.test(constraint));
  const rights=publicDomain?{
    license_status:'public-domain',license_code:'NPS-public-domain-review',license_url:'https://www.nps.gov/aboutus/disclaimer.htm',commercial_use:true,derivatives_allowed:true,attribution_required:true,attribution_text:`Courtesy National Park Service${item.credit?` / ${item.credit}`:''}`,suggested_scopes:['internal-only'],suggested_status:'review',warning:'NPS metadata marks this asset as public domain/full rights, but the concrete item must still be checked for third-party credits, people/privacy, trademarks and endorsement concerns.'
  }:{
    license_status:'unknown',license_code:'NPS-rights-review',license_url:'https://www.nps.gov/aboutus/disclaimer.htm',attribution_required:true,attribution_text:`Courtesy National Park Service${item.credit?` / ${item.credit}`:''}`,suggested_scopes:['internal-only'],suggested_status:'review',warning:`NPS rights metadata is not clearly public domain (${constraint||'no constraint'} / ${granting||'no grantingRights'}). Review required.`
  };
  if(type==='video'){
    const downloads=(item.versions||[]).map((v)=>({quality:v.widthPixels&&v.heightPixels?`${v.widthPixels}x${v.heightPixels}`:'nps-video',url:v.url,width:num(v.widthPixels),height:num(v.heightPixels),size:num(v.fileSizeKb)?num(v.fileSizeKb)*1024:null,file_type:v.fileType||'video/mp4',preview_url:item.splashImage?.url||null})).filter((v)=>v.url);
    if(!item.id||!downloads.length)return null;
    return{provider:'nps',provider_id:String(item.id),type:'video',title:item.title||String(item.id),description:item.description||item.descriptiveTranscript||null,source_url:item.permalinkUrl||null,creator:item.credit||'National Park Service',creator_url:'https://www.nps.gov/',width:max(downloads,'width'),height:max(downloads,'height'),duration_seconds:num(item.durationMs)?num(item.durationMs)/1000:null,orientation:orientation(max(downloads,'width'),max(downloads,'height')),preview_url:item.splashImage?.url||null,tags:(item.tags||[]).map(String).slice(0,30),downloads,rights};
  }
  const file=item.fileInfo||{};
  if(!item.id||!file.url)return null;
  return{provider:'nps',provider_id:String(item.id),type:'image',title:item.title||item.altText||String(item.id),description:item.description||item.altText||null,source_url:item.permalinkUrl||null,creator:item.credit||'National Park Service',creator_url:'https://www.nps.gov/',width:num(file.widthPixels),height:num(file.heightPixels),duration_seconds:null,orientation:orientation(file.widthPixels,file.heightPixels),preview_url:file.url,tags:(item.tags||[]).map(String).slice(0,30),downloads:[{quality:'original',url:file.url,width:num(file.widthPixels),height:num(file.heightPixels),size:num(file.fileSizeKb)?num(file.fileSizeKb)*1024:null,file_type:file.fileType||'image/jpeg',preview_url:file.url}],rights};
}
function max(values,key){const nums=values.map((x)=>Number(x[key]||0)).filter(Boolean);return nums.length?Math.max(...nums):null;}
function orientation(w,h){w=Number(w||0);h=Number(h||0);if(!w||!h)return null;if(w===h)return'square';return w>h?'horizontal':'vertical';}
function num(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function clamp(value,min,max){const n=Number(value)||min;return Math.min(max,Math.max(min,Math.trunc(n)));}
