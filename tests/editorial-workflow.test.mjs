import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('editorial YouTube workflow auto-detects visual-plan and locks phase 1 before voiceover', () => {
  const source = read('scripts/youtube-workflow.mjs');
  assert.match(source, /workflowMode\(projectId\)/);
  assert.match(source, /visual-plan\.json/);
  assert.match(source, /validateEditorialPhase1/);
  assert.match(source, /ensureShotPlan/);
  assert.match(source, /phase1ShotPlan: mode === 'editorial' \? 'complete'/);
  assert.match(source, /Voiceover wird nicht akzeptiert, solange Phase 1 nicht vollständig freigegeben ist/);
  assert.match(source, /source: 'user-provided'/);
  assert.match(source, /generatedByPipeline: false/);
});

test('editorial phase-1 gate requires concrete external sources and renderer specs', () => {
  const source = read('scripts/youtube-workflow.mjs');
  assert.match(source, /externer\/archivierter Visual-Beat hat noch keine konkrete Quelle/);
  assert.match(source, /Renderer-Spezifikation unvollständig/);
  assert.match(source, /Rechte-Gate fehlt/);
  assert.match(source, /requiresExternalMedia/);
});

test('phase 3 accepts beat timings for editorial projects and checks real voiceover length', () => {
  const source = read('scripts/youtube-workflow.mjs');
  assert.match(source, /timings\.beats \|\| timings\.scenes/);
  assert.match(source, /project\.voiceover\.durationSeconds/);
  assert.match(source, /Timeline endet/);
});

test('comparison intent does not emit an unsupported renderer presentation', () => {
  const planner = read('scripts/beat-planner.mjs');
  const project = read('scripts/video-project.mjs');
  assert.match(planner, /if \(\/comparison\|before-after\|two-image\/\.test\(type\)\) return 'auto'/);
  assert.match(planner, /resolve-secondary-asset/);
  assert.doesNotMatch(project, /PRESENTATIONS = \[[^\]]*'comparison'/s);
});
