import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const check=(file)=>spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});

test('production JavaScript entrypoints parse',()=>{
  for(const file of [
    'scripts/analyze-media.mjs','scripts/add-asset.mjs','scripts/source-search.mjs','scripts/source-grab.mjs','scripts/documentary-research.mjs','scripts/research-discover.mjs','scripts/article-capture.mjs','scripts/reference-style.mjs','scripts/visual-qc.mjs','scripts/clip-find.mjs','scripts/beat-planner.mjs','scripts/phase1-materialize.mjs','scripts/phase1-bind.mjs','scripts/phase1-quality-pass.mjs','scripts/rights-evidence.mjs','scripts/phase3-prepare.mjs','scripts/video-project.mjs','scripts/youtube-workflow-v3.mjs','scripts/align-voiceover.mjs','scripts/open-source-toolchain.mjs','scripts/serve.mjs','scripts/lib/providers/index.mjs','scripts/lib/providers/nasa.mjs','scripts/lib/providers/noaa.mjs','scripts/lib/providers/usgs.mjs','scripts/lib/providers/nara.mjs','scripts/lib/providers/smithsonian.mjs','scripts/lib/providers/europeana.mjs'
  ]){
    const result=check(file);
    assert.equal(result.status,0,`${file}\n${result.stderr||result.stdout}`);
  }
});

test('package exposes production workflow v0.18',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.version,'0.18.0');
  assert.equal(pkg.scripts['youtube:workflow'],'node scripts/youtube-workflow-v3.mjs');
  assert.equal(pkg.scripts['phase3:prepare'],'node scripts/phase3-prepare.mjs');
  assert.equal(pkg.scripts['rights:evidence'],'node scripts/rights-evidence.mjs');
  assert.equal(pkg.scripts['phase1:materialize'],'node scripts/phase1-materialize.mjs');
  assert.equal(pkg.scripts['phase1:quality'],'node scripts/phase1-quality-pass.mjs');
});

test('workflow v3 blocks phase 2 until local assets, QC, bindings and rights evidence are ready',()=>{
  const source=read('scripts/youtube-workflow-v3.mjs');
  assert.match(source,/phase1-quality\.json/);
  assert.match(source,/visual-qc\.json/);
  assert.match(source,/beat-bindings\.json/);
  assert.match(source,/evidencePath/);
  assert.match(source,/Rights-Evidence-Datei fehlt/);
  assert.match(source,/auto-local-library/);
  assert.match(source,/Voiceover blockiert/);
  assert.match(source,/generatedByPipeline:false/);
});

test('beat planner supports multiple real-media shots per narration beat',()=>{
  const planner=read('scripts/beat-planner.mjs');
  assert.match(planner,/multiShotPerBeat: true/);
  assert.match(planner,/flatMap/);
  assert.match(planner,/beatId:/);
  assert.match(planner,/shotCountFor/);
  assert.match(planner,/beat\.shots/);
  assert.match(planner,/syntheticExplainerGraphics: false/);
});

test('phase1 materializer checks approved local library before remote providers',()=>{
  const source=read('scripts/phase1-materialize.mjs');
  assert.match(source,/localApprovedLibraryFirst:true/);
  assert.match(source,/localLibraryCandidates/);
  assert.match(source,/remoteSearchSkippedWhenStrongLocalMatch:true/);
  assert.match(source,/selected-local-approved/);
  assert.match(source,/local-existing/);
  assert.match(source,/alwaysSearch/);
});

test('quality and visual QC accept local reuse without auto-blocking intentional repeats',()=>{
  const quality=read('scripts/phase1-quality-pass.mjs');
  const qc=read('scripts/visual-qc.mjs');
  assert.match(quality,/local-existing/);
  assert.match(quality,/reusedLocalAssets/);
  assert.match(qc,/intentionalReuseIsSignalNotAutomaticBlock:true/);
  assert.match(qc,/local-approved-library/);
  assert.match(qc,/intentional-reuse:/);
});

test('rights evidence is an audit record, not automatic legal approval',()=>{
  const evidence=read('scripts/rights-evidence.mjs');
  const importer=read('scripts/add-asset.mjs');
  const validator=read('scripts/validate-catalog.mjs');
  assert.match(evidence,/snapshotIsAuditRecordNotLegalOpinion:true/);
  assert.match(evidence,/sourceCaptureDoesNotGrantRights:true/);
  assert.match(evidence,/fingerprint/);
  assert.match(importer,/rights-evidence\.mjs/);
  assert.match(importer,/commercialUse/);
  assert.match(validator,/cc-by-nc/);
  assert.match(validator,/rights\.checkedAt/);
  assert.match(validator,/rights\.evidencePath/);
});

test('voiceover alignment targets editorial visual beats',()=>{
  const source=read('scripts/align-voiceover.mjs');
  assert.match(source,/visual-plan\.json/);
  assert.match(source,/narrationAnchor/);
  assert.match(source,/whisper-anchor-sequential/);
  assert.match(source,/generatedVoiceForbidden: true/);
});

test('phase3 prepare stays deterministic and local-only',()=>{
  const source=read('scripts/phase3-prepare.mjs');
  assert.match(source,/networkAllowed: false/);
  assert.match(source,/phase1AssetsOnly: true/);
  assert.match(source,/groupByBeat/);
  assert.match(source,/targetWeight/);
  assert.match(source,/externes Asset ist in Phase 3 verboten/);
  assert.match(source,/phase3-handoff\.json/);
});

test('renderer follows focus/motion and rejects v3 remote runtime sources',()=>{
  const renderer=read('renderer/src/AssetVideo.tsx');
  assert.match(renderer,/motionTransform/);
  assert.match(renderer,/objectPosition/);
  assert.match(renderer,/scene\.focus/);
  assert.match(renderer,/networkAllowed !== false/);
  assert.match(renderer,/refuses remote runtime asset/);
  assert.doesNotMatch(renderer,/hash\(scene\.id\)/);
});

test('official provider layer remains archive-first',()=>{
  const providers=read('scripts/lib/providers/index.mjs');
  for(const name of ['nasa','noaa','usgs','nara','smithsonian','library-of-congress','europeana','wikimedia','internet-archive','openverse','pexels','pixabay'])assert.match(providers,new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(providers,/tier: 'official-archive'/);
  assert.match(providers,/tier: 'stock-fallback'/);
});

test('open-source quality toolbox remains optional and real-media-first',()=>{
  const source=read('scripts/open-source-toolchain.mjs');
  assert.match(source,/optionalToolsNeverBlockNormalWorkflow: true/);
  assert.match(source,/heavyAiToolsDefaultOff: true/);
  assert.match(source,/remotionSyntheticExplainers: false/);
  assert.match(source,/Trafilatura/);
  assert.match(source,/sqlite-vec/);
  assert.match(source,/OpenCLIP/);
  assert.match(source,/WhisperX/);
});
