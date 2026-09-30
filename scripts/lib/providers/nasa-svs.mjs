const API='https://svs.gsfc.nasa.gov/api';

export async function searchNasaSvs({query,type='video',page=1,perPage=20,fetchImpl=fetch}){
  if(!query?.trim())throw new Error('NASA-SVS-Suche benötigt einen Suchbegriff.');
  if(!['image','video'].includes(type))throw new Error('NASA SVS unterstützt image oder video.');
  const limit=clamp(perPage,1,30),offset=(Math.max(1,Number(page)||1)-1)*limit;
  const params=new URLSearchParams({search:query.trim(),limit:String(limit),offset:String(offset)});
  const response=await fetchImpl(`${API}/search/?${params}`,{headers:headers()});
  if(!response.ok)throw new Error(`NASA-SVS-Suche fehlgeschlagen (${response.status}).`);
  const payload=await response.json();
  const assets=[];
  for(const result of payload.results||[]){
    if(assets.length>=limit)break;
    try{
      const detailResponse=await fetchImpl(`${API}/${encodeURIComponent(result.id)}/`,{headers:headers()});
      if(!detailResponse.ok)continue;
      const detail=await detailResponse.json();
      const media=collectMedia(detail).filter((item)=>matchesType(item,type));
      for(const item of media){
        if(assets.length>=limit)break;
        const url=item.url||item.href;
        if(!url)continue;
        assets.push({
          provider:'nasa-svs',provider_id:`${result.id}:${item.id||item.filename||assets.length}`,type,
          title:item.title||result.title||item.filename||`NASA SVS ${result.id}`,
          description:item.alt_text||item.caption||result.description||detail.description||null,
          source_url:result.url||`https://svs.gsfc.nasa.gov/${result.id}/`,creator:'NASA Scientific Visualization Studio',creator_url:'https://svs.gsfc.nasa.gov/',
          width:numberOrNull(item.width),height:numberOrNull(item.height),duration_seconds:null,orientation:orientation(item.width,item.height),
          preview_url:type==='image'?url:(detail.main_image?.url||firstImage(detail)||null),
          tags:unique([...(detail.keywords||[]),...(detail.missions||[]),result.result_type]).slice(0,30),
          downloads:[{quality:quality(item),url,width:numberOrNull(item.width),height:numberOrNull(item.height),size:null,file_type:mime(url,type),preview_url:null}],
          rights:{license_status:'public-domain',license_code:'NASA-SVS-public-domain-review',license_url:'https://svs.gsfc.nasa.gov/help/',attribution_required:false,attribution_text:'Courtesy NASA Scientific Visualization Studio',suggested_scopes:['internal-only'],suggested_status:'review',warning:'NASA SVS states its content is public domain unless otherwise noted. Verify the concrete page for third-party credits, music, logos, trademarks or other exceptions before publication.'}
        });
      }
    }catch{
      // A single visualization page must not block the whole provider search.
    }
  }
  return{provider:'nasa-svs',query:query.trim(),type,page:Math.max(1,Number(page)||1),per_page:limit,total_results:Number(payload.count)||null,assets};
}

function collectMedia(value,out=[]){
  if(!value||typeof value!=='object')return out;
  if((value.media_type||value.type)&&value.url&&['Image','Movie','Frames'].includes(value.media_type))out.push(value);
  if(value.media&&typeof value.media==='object')collectMedia(value.media,out);
  for(const child of Array.isArray(value)?value:Object.values(value))if(child&&typeof child==='object'&&child!==value.media)collectMedia(child,out);
  return dedupe(out,(item)=>item.url);
}
function matchesType(item,type){const media=String(item.media_type||'').toLowerCase();return type==='video'?media==='movie':media==='image';}
function firstImage(detail){return collectMedia(detail).find((item)=>String(item.media_type).toLowerCase()==='image')?.url||null;}
function quality(item){const pixels=Number(item.width||0)*Number(item.height||0);if(pixels>=8_000_000)return'4k/high-res';if(pixels>=2_000_000)return'hd';return item.filename||'archive';}
function mime(url,type){const clean=String(url||'').toLowerCase().split('?')[0];if(clean.endsWith('.mp4'))return'video/mp4';if(clean.endsWith('.webm'))return'video/webm';if(clean.endsWith('.mov'))return'video/quicktime';if(clean.endsWith('.png'))return'image/png';if(clean.endsWith('.tif')||clean.endsWith('.tiff'))return'image/tiff';return type==='video'?'video/mp4':'image/jpeg';}
function orientation(w,h){w=Number(w||0);h=Number(h||0);if(!w||!h)return null;if(w===h)return'square';return w>h?'horizontal':'vertical';}
function numberOrNull(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function unique(values){return[...new Set(values.filter(Boolean).map(String))];}
function dedupe(values,key){const seen=new Set();return values.filter((item)=>{const k=key(item);if(!k||seen.has(k))return false;seen.add(k);return true;});}
function headers(){return{'User-Agent':'Visual-Asset-Hub/0.19 documentary research',Accept:'application/json'};}
function clamp(value,min,max){const n=Number(value)||min;return Math.min(max,Math.max(min,Math.trunc(n)));}
