import assert from 'node:assert/strict';
import test from 'node:test';
import {searchNasaSvs} from '../scripts/lib/providers/nasa-svs.mjs';
import {searchNps} from '../scripts/lib/providers/nps.mjs';
import {searchDvids} from '../scripts/lib/providers/dvids.mjs';
import {searchMet} from '../scripts/lib/providers/met.mjs';

function json(body,status=200){return{ok:status>=200&&status<300,status,async json(){return body;}};}

test('NASA SVS normalizes direct downloadable video while keeping page review',async()=>{
  const calls=[];
  const fetchImpl=async(url)=>{
    calls.push(String(url));
    if(String(url).includes('/api/search/'))return json({count:1,results:[{id:12345,title:'Volcanic Lightning Visualization',url:'https://svs.gsfc.nasa.gov/12345/'}]});
    return json({description:'NASA visualization',media:[{id:'m1',media_type:'Movie',url:'https://svs.gsfc.nasa.gov/vis/a000000/a012300/a012345/movie_1920x1080.mp4',filename:'movie_1920x1080.mp4',width:1920,height:1080},{id:'i1',media_type:'Image',url:'https://svs.gsfc.nasa.gov/vis/a000000/a012300/a012345/frame.jpg',width:1920,height:1080}]});
  };
  const result=await searchNasaSvs({query:'volcanic lightning',type:'video',perPage:5,fetchImpl});
  assert.equal(result.provider,'nasa-svs');
  assert.equal(result.assets.length,1);
  assert.equal(result.assets[0].type,'video');
  assert.equal(result.assets[0].downloads[0].url.endsWith('.mp4'),true);
  assert.equal(result.assets[0].rights.license_status,'public-domain');
  assert.equal(result.assets[0].rights.suggested_status,'review');
  assert.match(result.assets[0].rights.warning,/third-party|credits|music/i);
  assert.equal(calls.length,2);
});

test('NPS gallery asset uses public-domain metadata but still requires concrete review',async()=>{
  let auth=null;
  const fetchImpl=async(_url,options)=>{
    auth=options.headers.Authorization;
    return json({total:'1',data:[{id:'abc',title:'Yellowstone geyser',description:'Geyser eruption',credit:'NPS / Jane Doe',permalinkUrl:'https://www.nps.gov/media/photo/gallery-item.htm?id=abc',tags:['geyser','yellowstone'],fileInfo:{url:'https://www.nps.gov/common/uploads/structured_data/geyser.jpg',widthPixels:3000,heightPixels:2000,fileSizeKb:1500,fileType:'image/jpeg'},constraintsInfo:{constraint:'Public Domain',grantingRights:'Full'}}]});
  };
  const result=await searchNps({apiKey:'TEST-NPS',query:'yellowstone geyser',type:'image',fetchImpl});
  assert.equal(auth,'TEST-NPS');
  assert.equal(result.assets.length,1);
  const asset=result.assets[0];
  assert.equal(asset.provider,'nps');
  assert.equal(asset.downloads[0].width,3000);
  assert.equal(asset.rights.license_status,'public-domain');
  assert.equal(asset.rights.suggested_status,'review');
});

test('NPS ambiguous rights stay unknown instead of being auto-approved',async()=>{
  const fetchImpl=async()=>json({total:'1',data:[{id:'restricted',title:'Third party photo',fileInfo:{url:'https://www.nps.gov/photo.jpg',widthPixels:1600,heightPixels:900},constraintsInfo:{constraint:'Copyrighted third-party material',grantingRights:'Limited'}}]});
  const result=await searchNps({apiKey:'TEST-NPS',query:'historic photo',type:'image',fetchImpl});
  assert.equal(result.assets[0].rights.license_status,'unknown');
  assert.equal(result.assets[0].rights.suggested_scopes[0],'internal-only');
});

test('DVIDS returns direct HD files but keeps government media in review',async()=>{
  const calls=[];
  const fetchImpl=async(url)=>{
    calls.push(String(url));
    if(String(url).includes('/search?'))return json({page_info:{total_results:1},results:[{id:'999',type:'video',title:'Aircraft training',url:'https://www.dvidshub.net/video/999/aircraft-training'}]});
    return json({results:{id:'999',type:'video',title:'Aircraft training',description:'Official training B-roll',url:'https://www.dvidshub.net/video/999/aircraft-training',credit:'U.S. Air Force',thumbnail:'https://example.test/thumb.jpg',files:[{src:'https://download.dvidshub.net/media/video/999/1080.mp4',width:1920,height:1080,size:12345678,bitrate:8000,type:'video/mp4'}]}});
  };
  const result=await searchDvids({apiKey:'TEST-DVIDS',query:'aircraft training',type:'video',fetchImpl});
  assert.equal(result.assets.length,1);
  const asset=result.assets[0];
  assert.equal(asset.provider,'dvids');
  assert.equal(asset.downloads[0].width,1920);
  assert.equal(asset.downloads[0].url.endsWith('.mp4'),true);
  assert.equal(asset.rights.suggested_status,'review');
  assert.match(asset.rights.warning,/third-party|privacy|trademark/i);
  assert.equal(calls.length,2);
});

test('DVIDS refuses use without API key',async()=>{
  await assert.rejects(()=>searchDvids({query:'aircraft',type:'video',fetchImpl:async()=>json({})}),/DVIDS_API_KEY fehlt/);
});

test('The Met only returns API objects explicitly marked public domain',async()=>{
  const fetchImpl=async(url)=>{
    if(String(url).includes('/search?'))return json({total:2,objectIDs:[1,2]});
    if(String(url).endsWith('/objects/1'))return json({objectID:1,isPublicDomain:true,title:'Historic Map',primaryImage:'https://images.metmuseum.org/CRDImages/map-original.jpg',primaryImageSmall:'https://images.metmuseum.org/CRDImages/map-small.jpg',objectURL:'https://www.metmuseum.org/art/collection/search/1',artistDisplayName:'Unknown',objectDate:'1800'});
    return json({objectID:2,isPublicDomain:false,title:'Copyrighted work',primaryImage:'https://images.metmuseum.org/private.jpg'});
  };
  const result=await searchMet({query:'historic map',type:'image',perPage:10,fetchImpl});
  assert.equal(result.assets.length,1);
  const asset=result.assets[0];
  assert.equal(asset.provider_id,'1');
  assert.equal(asset.rights.license_status,'cc0');
  assert.equal(asset.rights.commercial_use,true);
  assert.equal(asset.downloads[0].quality,'original');
});
