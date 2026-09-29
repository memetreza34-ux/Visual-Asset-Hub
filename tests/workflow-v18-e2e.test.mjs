import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const repo=process.cwd();
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);}
function run(cwd,args){return spawnSync(process.execPath,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});}

test('offline v3 gate reaches a local-only multi-shot render manifest',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vah-v18-e2e-'));
  try{
    fs.symlinkSync(path.join(repo,'scripts'),path.join(tmp,'scripts'),'dir');
    const projectId='offline-e2e';
    const projectDir=path.join(tmp,'projects',projectId);
    const assetId='VAH-ABCDEFGH';
    const assetRel='assets/image/science-engineering/img-science-engineering-volcano-erupting-ls-horizontal-0001.jpg';
    const assetFile=path.join(tmp,assetRel);
    fs.mkdirSync(path.dirname(assetFile),{recursive:true});
    fs.writeFileSync(assetFile,'offline fixture media');
    const audioRel=`projects/${projectId}/audio/voiceover-master.wav`;
    const audioFile=path.join(tmp,audioRel);
    fs.mkdirSync(path.dirname(audioFile),{recursive:true});
    fs.writeFileSync(audioFile,'offline fixture audio');
    const checkedAt='2026-09-29T18:00:00.000Z';
    const sourceUrl='https://example.org/public-domain-volcano';
    const evidenceRel=`catalog/rights-evidence/${assetId}.json`;
    writeJson(path.join(tmp,evidenceRel),{
      version:2,assetId,assetSha256:null,generatedAt:checkedAt,checkedAt,sourceName:'Fixture Archive',sourceUrl,licenseStatus:'public-domain',licenseCode:'public-domain',licenseVersion:null,licenseUrl:null,commercialUse:true,derivativesAllowed:true,shareAlike:false,attributionRequired:false,attributionText:null,usageScopes:['youtube'],sourceCapture:null,policy:{snapshotIsAuditRecordNotLegalOpinion:true,persistentJsonTrackedWithCatalog:true}
    });
    writeJson(path.join(tmp,'catalog','assets.json'),{
      catalogVersion:1,updatedAt:checkedAt,assets:[{
        id:assetId,filename:path.basename(assetRel),title:'Fixture volcano lightning',description:'Offline fixture for the workflow integration test.',type:'image',category:'science-engineering',secondaryCategories:[],tags:['volcano','lightning'],searchAliases:['volcanic lightning'],subject:'volcano',action:'erupting',orientation:'horizontal',shotType:'ls',cameraMovement:'static',style:'documentary',status:'approved',qualityRating:5,technical:{width:1920,height:1080},storage:{kind:'git-lfs',path:assetRel},rights:{licenseStatus:'public-domain',licenseCode:'public-domain',sourceName:'Fixture Archive',sourceUrl,usageScopes:['youtube'],commercialUse:true,derivativesAllowed:true,shareAlike:false,attributionRequired:false,checkedAt,evidencePath:evidenceRel},createdAt:checkedAt,importedAt:checkedAt
      }]
    });
    writeJson(path.join(projectDir,'project.json'),{version:3,workflowVersion:3,id:projectId,title:'Offline E2E',format:'horizontal',width:1920,height:1080,fps:30,language:'de',defaultUsageScope:'youtube',requireUserVoiceover:true,status:'phase1-ready',scenes:[]});
    writeJson(path.join(projectDir,'research.json'),{version:1,projectId});
    fs.writeFileSync(path.join(projectDir,'voiceover-script.txt'),'Ein kurzer Offline Test.\n');
    writeJson(path.join(projectDir,'visual-plan.json'),{version:3,projectId,beats:[{id:'b01',narrationAnchor:'Ein kurzer Offline Test',visualType:'image',visual:'volcano lightning'}]});
    const shots=[
      {id:'b01-s01',beatId:'b01',narrationAnchor:'Ein kurzer Offline Test',visualIntent:'wide volcano lightning',editorialVisualType:'image',targetDurationSeconds:[1,3],renderer:{presentation:'auto',transition:'cut',fit:'cover',motion:'subtle documentary push/pan'},qualityGate:{requireRightsReview:true}},
      {id:'b01-s02',beatId:'b01',narrationAnchor:'Ein kurzer Offline Test',visualIntent:'tight volcano lightning crop',editorialVisualType:'image',targetDurationSeconds:[1,3],renderer:{presentation:'auto',transition:'cut',fit:'cover',motion:'subtle documentary push/pan'},qualityGate:{requireRightsReview:true}}
    ];
    writeJson(path.join(projectDir,'shot-plan.json'),{version:3,projectId,shots});
    const materialBeat=(id)=>({id,beatId:'b01',selectedCandidateId:`local-${assetId}`,status:'selected-local-approved',candidates:[{candidateId:`local-${assetId}`,catalogAssetId:assetId,provider:'local-library',providerTier:'local-approved',editorialScore:98,sourceUrl,rights:{license_status:'public-domain'}}],downloads:[{candidateId:`local-${assetId}`,status:'local-existing',file:assetRel,catalogAssetId:assetId}]});
    writeJson(path.join(projectDir,'materialization.json'),{version:5,projectId,beats:shots.map((shot)=>materialBeat(shot.id))});
    writeJson(path.join(projectDir,'phase1-quality.json'),{version:3,projectId,policy:{qualityFeedsVisualQc:true},assets:shots.map((shot)=>({beatId:shot.id,candidateId:`local-${assetId}`,file:assetRel,sourceStatus:'local-existing',qualityScore:90}))});
    const qcBeat=(id)=>({id,beatId:'b01',bestCandidateId:`local-${assetId}`,status:'qc-candidate-ready-for-editorial-review',candidates:[{candidateId:`local-${assetId}`,catalogAssetId:assetId,sourceStatus:'local-existing',file:assetRel,score:95,status:'review-event-identity'}]});
    writeJson(path.join(projectDir,'visual-qc.json'),{version:3,projectId,sourceQuality:'projects/offline-e2e/phase1-quality.json',policy:{minimumScore:70},beats:shots.map((shot)=>qcBeat(shot.id))});
    writeJson(path.join(projectDir,'beat-bindings.json'),{version:2,projectId,beats:shots.map((shot)=>({beatId:shot.id,assetId,candidateId:`local-${assetId}`,qcScore:95,qcStatus:'review-event-identity',status:'bound-approved-asset',bindingMode:'auto-local-library',manualReviewed:false}))});

    const phase1=run(tmp,['scripts/youtube-workflow-v3.mjs','phase1-check','--project',projectId]);
    assert.equal(phase1.status,0,phase1.stderr||phase1.stdout);
    assert.match(phase1.stdout,/Phase 1 v3 OK/);
    assert.match(phase1.stdout,/Rights-Evidence-Akten/);

    const project=JSON.parse(fs.readFileSync(path.join(projectDir,'project.json'),'utf8'));
    project.voiceover={path:audioRel,durationSeconds:4,sha256:null,source:'user-provided',generatedByPipeline:false};
    writeJson(path.join(projectDir,'project.json'),project);
    writeJson(path.join(projectDir,'timings.json'),{version:2,projectId,source:'fixture',audio:audioRel,audioDurationSeconds:4,beats:[{id:'b01',start:0,end:4,duration:4,confidence:1}]});

    const prepare=run(tmp,['scripts/phase3-prepare.mjs','--project',projectId]);
    assert.equal(prepare.status,0,prepare.stderr||prepare.stdout);
    const handoff=JSON.parse(fs.readFileSync(path.join(projectDir,'phase3-handoff.json'),'utf8'));
    const manifest=JSON.parse(fs.readFileSync(path.join(projectDir,'render-manifest.json'),'utf8'));
    assert.equal(handoff.policy.networkAllowed,false);
    assert.equal(handoff.shots.length,2);
    assert.equal(handoff.shots[0].beatId,'b01');
    assert.equal(handoff.shots[0].end,2);
    assert.equal(handoff.shots[1].start,2);
    assert.equal(handoff.shots[1].end,4);
    assert.equal(manifest.policy.networkAllowed,false);
    assert.equal(manifest.scenes.length,2);
    assert.ok(manifest.scenes.every((scene)=>!/^https?:\/\//i.test(scene.asset.source)));
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
