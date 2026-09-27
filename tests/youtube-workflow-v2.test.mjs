import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const root = process.cwd();

test('youtube workflow help is available', () => {
  const result = spawnSync(process.execPath, ['scripts/youtube-workflow.mjs', '--help'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /YouTube Workflow v2/);
});

test('current test project cannot accept voiceover before phase 1 external visuals are approved', () => {
  const result = spawnSync(process.execPath, ['scripts/youtube-workflow.mjs', 'phase1-check', '--project', 'handy-fokus-2min'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Phase 1 NICHT fertig/);
});

test('workflow v2 project declares user voiceover requirement and shot-level visual plan', () => {
  const project = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/project.json', 'utf8'));
  const script = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/scene-script.json', 'utf8'));
  const plan = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/visual-plan-v2.json', 'utf8'));
  assert.equal(project.workflowVersion, 2);
  assert.equal(project.requireUserVoiceover, true);
  assert.equal(plan.version, 2);
  assert.deepEqual(plan.scenes.map((scene) => scene.id), script.scenes.map((scene) => scene.id));
  for (const scene of plan.scenes) {
    assert.ok(scene.visualIntent);
    assert.ok(Array.isArray(scene.noGo) && scene.noGo.length > 0);
    assert.ok(Array.isArray(scene.shots) && scene.shots.length > 0);
  }
});
