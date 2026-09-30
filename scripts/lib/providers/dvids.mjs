const API='https://api.dvidshub.net';

export async function searchDvids({apiKey,query,type='video',page=1,perPage=20,fetchImpl=fetch}){
  if(!apiKey)throw new Error('DVIDS_API_KEY fehlt. Kostenlosen API-Zugang bei DVIDS registrieren.');
  if(!query?.trim())throw new Error('DVIDS-Suche benötigt einen Suchbegriff.');
  if(!['image','video'].includes(type))throw new Error('DVIDS unterstützt image oder video.');
  const limit=clamp(perPage,1,50),safePage=Math.max(1,Number(page)||1);
  const params=new URLSearchParams({q:query.trim(),type,max_results:String(limit),page:String(safePage),short_description_length:'300',thumb_width:'640',api_key:apiKey});
  if(type==='video')params.set('hd','1');
  const response=await fetchImpl(`${API}/search?${params}`,{headers:headers()});
  if(!response.ok)throw new Error(`DVIDS-Suche fehlgeschlagen (${response.status}).`);
  const payload=await response.json();
  const assets=[];
  for(const result of payload.results||[]){
    if(result.type!==type||!result.id)continue;
    let detail=result;
    try{
      const detailParams=new URLSearchParams({id:String(result.id),api_key:apiKey});
      const detailResponse=await fetchImpl(`${API}/asset?${detailParams}`,{headers:headers()});
      if(detailResponse.ok){const body=await detailResponse.json();detail=body.results||result;}
    }catch{}
    const downloads=type==='video'
      ?(detail.files||[]).map((file)=>({quality:file.width&&file.height?`${file.width}x${file.height}`:`${file.bitrate||''}kbps`,url:file.src,width:num(file.width),height:num(file.height),size:num(file.size),file_type:file.type||'video/mp4',preview_url:null})).filter((file)=>file.url)
      :detail.image?[{quality:'original',url:detail.image,width:num(detail.dimensions?.width||detail.width),height:num(detail.dimensions?.height||detail.height),size:null,file_type:'image/jpeg',preview_url:null}]:[];
    const credit=Array.isArray(detail.credit)?detail.credit.map((x)=>x?.name||x).filter(Boolean).join(', '):(detail.credit||result.credit||detail.unit_name||'DVIDS');
    assets.push({
      provider:'dvids',provider_id:String(detail.id||result.id),type,title:detail.title||result.title||String(result.id),description:detail.description||result.short_description||null,
      source_url:detail.url||result.url,creator:credit,creator_url:null,width:type==='image'?num(detail.dimensions?.width||detail.width):largest(downloads,'width'),height:type==='image'?num(detail.dimensions?.height||detail.height):largest(downloads,'height'),duration_seconds:num(detail.duration||result.duration),orientation:orientation(detail.aspect_ratio,downloads),preview_url:preview(detail,result),
      tags:splitKeywords(detail.keywords||result.keywords),downloads,
      rights:{license_status:'licensed',license_code:'DVIDS-government-media-review',license_url:'https://www.dvidshub.net/about/copyright',commercial_use:true,attribution_required:true,attribution_text:`Courtesy DVIDS${credit?` / ${credit}`:''}`,suggested_scopes:['internal-only'],suggested_status:'review',warning:'Most U.S. government employee works are not copyright-protected in the U.S., but DVIDS explicitly warns that some assets may contain third-party IP, privacy/publicity rights, trademarks, insignia and non-endorsement requirements. Review the concrete asset before YouTube publication.'}
    });
  }
  return{provider:'dvids',query:query.trim(),type,page:safePage,per_page:limit,total_results:Number(payload.page_info?.total_results)||null,assets};
}

function preview(detail,result){const value=detail.thumbnail;if(typeof value==='string')return value;if(value?.url)return value.url;return detail.image||result.thumbnail||null;}
function splitKeywords(value){if(Array.isArray(value))return value.map(String).filter(Boolean).slice(0,30);return String(value||'').split(',').map((x)=>x.trim()).filter(Boolean).slice(0,30);}
function largest(files,key){const values=files.map((x)=>Number(x[key]||0)).filter(Boolean);return values.length?Math.max(...values):null;}
function orientation(aspect,downloads){const text=String(aspect||'').toLowerCase();if(text.includes('portrait'))return'vertical';if(text.includes('square'))return'square';if(text.includes('16:9')||text.includes('landscape'))return'horizontal';const best=downloads.sort((a,b)=>(b.width||0)-(a.width||0))[0];if(!best?.width||!best?.height)return null;return best.width===best.height?'square':best.width>best.height?'horizontal':'vertical';}
function num(value){const n=Number(value);return Number.isFinite(n)&&n>0?n:null;}
function headers(){return{'User-Agent':'Visual-Asset-Hub/0.19 documentary research',Accept:'application/json'};}
function clamp(value,min,max){const n=Number(value)||min;return Math.min(max,Math.max(min,Math.trunc(n)));}
