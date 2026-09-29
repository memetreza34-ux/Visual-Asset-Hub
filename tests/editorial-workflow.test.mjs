import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('workflow v3 is the only package entrypoint for YouTube production', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts['youtube:workflow'], 'node scripts/youtube-workflow-v3.mjs');
  const source = read('scripts/youtube-workflow-v3.mjs');
  assert.match(source, /phase1-plan/);
  assert.match(source, /phase1-materialize/);
  assert.match(source, /phase1-check/);
  assert.match(source, /voiceover-attach/);
  assert.match(source, /voiceover-align/);
  assert.match(source, /phase3-prepare/);
  assert.match(source, /phase3-check/);
});

test('phase 1 strict gate validates every planned shot, not only narration beats', () => {
  const source = read('scripts/youtube-workflow-v3.mjs');
  assert.match(source, /for \(const shot of shots\.shots/);
  assert.match(source, /shot\.beatId \|\| shot\.id/);
  assert.match(source, /kein Produktionsasset gebunden/);
  assert.match(source, /lokale Materialisierung vor Phase 2/);
});

test('multi-shot planner keeps every shot linked to a narration beat', () => {
  const planner = read('scripts/beat-planner.mjs');
  assert.match(planner, /beatId: baseId/);
  assert.match(planner, /shotIndex/);
  assert.match(planner, /shotCount/);
  assert.match(planner, /beat\.shots/);
  assert.match(planner, /automaticVariant/);
});

test('renderer planning remains real-media assembly only', () => {
  const planner = read('scripts/beat-planner.mjs');
  assert.match(planner, /remotionRole: 'assembly-only'/);
  assert.match(planner, /syntheticExplainerGraphics: false/);
  assert.match(planner, /calloutsDisabled: true/);
  assert.match(planner, /rejectSyntheticExplainerWhenRealMediaExists: true/);
});
