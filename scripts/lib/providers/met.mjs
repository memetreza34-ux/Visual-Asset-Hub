const API='https://collectionapi.metmuseum.org/public/collection/v1';

export async function searchMet({query,type='image',page=1,perPage=20,fetchImpl=fetch}){
  if(type!=='image')throw new Error('The Met Provider unterstützt nur Bilder.');
  if(!query?.trim())throw new Error('The-Met-Suche benötigt einen Suchbegriff.');
  const searchParams=new URLSearchParams({hasImages:'true',q:query.trim()});
  const response=await fetchImpl(`${API}/search?${searchParams}`,{headers:headers()});
  if(!response.ok)throw new Error(`The-Met-Suche fehlgeschlagen (${response.status}).`);
  const payload=await response.json();
  const ids=Array.isArray(payload.objectIDs)?payload.objectIDs:[];
  const limit=clamp(perPage,1,30),safePage=Math.max(1,Number(page)||1),start=(safePage-1)*limit;
  const selected=ids.slice(start,start+limit);
  const assets=[];
  for(const id of selected){
    try{
      const detailResponse=await fetchImpl(`${API}/objects/${encodeURIComponent(id)}`,{headers:headers()});
      if(!detailResponse.ok)continue;
      const item=await detailResponse.json();
      if(item.isPublicDomain!==true||!item.primaryImage)continue;
      assets.push({
        provider:'met',provider_id:String(item.objectID||id),type:'image',title:item.title||`The Met ${id}`,
        description:[item.artistDisplayName,item.objectDate,item.medium,item.culture].filter(Boolean).join(' · ')||null,
        source_url:item.objectURL||`https://www.metmuseum.org/art/collection/search/${id}`,
        creator:item.artistDisplayName||'The Metropolitan Museum of Art',creator_url:item.artistWikidata_URL||'https://www.metmuseum.org/',
        width:null,height:null,duration_seconds:null,orientation:null,preview_url:item.primaryImageSmall||item.primaryImage,
        tags:[...(item.tags||[]).map((x)=>x?.term).filter(Boolean),item.department,item.classification,item.objectName].filter(Boolean).slice(0,30),
        downloads:[{quality:'original',url:item.primaryImage,width:null,height:null,size:null,file_type:'image/jpeg',preview_url:item.primaryImageSmall||null}],
        rights:{license_status:'cc0',license_code:'CC0-1.0',license_version:'1.0',license_url:'https://www.metmuseum.org/about-the-met/policies-and-documents/open-access',commercial_use:true,derivatives_allowed:true,share_alike:false,attribution_required:false,attribution_text:`The Metropolitan Museum of Art, Open Access`,suggested_scopes:['youtube','website','organic-social','paid-ads','client-work'],suggested_status:'approved',warning:'Only objects whose API record reports isPublicDomain=true and exposes a primary image are returned.'}
      });
    }catch{}
  }
  return{provider:'met',query:query.trim(),type:'image',page:safePage,per_page:limit,total_results:Number(payload.total)||ids.length,assets};
}
function headers(){return{'User-Agent':'Visual-Asset-Hub/0.19 documentary research',Accept:'application/json'};}
function clamp(value,min,max){const n=Number(value)||min;return Math.min(max,Math.max(min,Math.trunc(n)));}
