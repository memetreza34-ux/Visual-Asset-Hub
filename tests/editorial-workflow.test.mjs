import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const compact=(value)=>value.replace(/\s+/g,'');

test('workflow v3 is the only package entrypoint for YouTube production',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['youtube:workflow'],'node scripts/youtube-workflow-v3.mjs');
  const source=read('scripts/youtube-workflow-v3.mjs');
  for(const command of ['phase1-plan','phase1-materialize','phase1-check','voiceover-attach','voiceover-align','phase3-prepare','phase3-check'])assert.match(source,new RegExp(command));
});

test('phase 1 strict gate validates every planned shot, not only narration beats',()=>{
  const source=compact(read('scripts/youtube-workflow-v3.mjs'));
  assert.match(source,/for\(constshotofshots\.shots\|\|\[\]\)/);
  assert.match(source,/shot\.beatId\|\|shot\.id/);
  assert.match(source,/keinProduktionsassetgebunden/);
  assert.match(source,/lokaleMaterialisierungvorPhase2/);
  assert.match(source,/checkRightsEvidence\(asset,errors,warnings\)/);
});

test('multi-shot planner keeps every shot linked to a narration beat',()=>{
  const planner=compact(read('scripts/beat-planner.mjs'));
  assert.match(planner,/beatId:baseId/);
  assert.match(planner,/shotIndex/);
  assert.match(planner,/shotCount/);
  assert.match(planner,/beat\.shots/);
  assert.match(planner,/automaticVariant/);
});

test('renderer planning remains real-media assembly only',()=>{
  const planner=compact(read('scripts/beat-planner.mjs'));
  assert.match(planner,/remotionRole:'assembly-only'/);
  assert.match(planner,/syntheticExplainerGraphics:false/);
  assert.match(planner,/calloutsDisabled:true/);
  assert.match(planner,/rejectSyntheticExplainerWhenRealMediaExists:true/);
});
