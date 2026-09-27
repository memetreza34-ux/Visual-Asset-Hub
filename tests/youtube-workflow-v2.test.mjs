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

test('current test project has a completed phase 1 visual selection', () => {
  const result = spawnSync(process.execPath, ['scripts/youtube-workflow.mjs', 'phase1-check', '--project', 'handy-fokus-2min'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Phase 1 OK/);
});

test('workflow v2 project declares user voiceover requirement and shot-level visual plan', () => {
  const project = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/project.json', 'utf8'));
  const script = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/scene-script.json', 'utf8'));
  const plan = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/visual-plan-v2.json', 'utf8'));
  const shortlist = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/asset-shortlist.json', 'utf8'));
  assert.equal(project.workflowVersion, 2);
  assert.equal(project.requireUserVoiceover, true);
  assert.equal(plan.version, 2);
  assert.equal(shortlist.status, 'approved');
  assert.deepEqual(plan.scenes.map((scene) => scene.id), script.scenes.map((scene) => scene.id));
  for (const scene of plan.scenes) {
    assert.ok(scene.visualIntent);
    assert.ok(Array.isArray(scene.noGo) && scene.noGo.length > 0);
    assert.ok(Array.isArray(scene.shots) && scene.shots.length > 0);
  }
});

test('phase 1 contains at least one precise internal visual and strong required external selections', () => {
  const shortlist = JSON.parse(fs.readFileSync('projects/handy-fokus-2min/asset-shortlist.json', 'utf8'));
  const candidates = shortlist.scenes.flatMap((scene) => scene.shots.flatMap((shot) => shot.candidates || []));
  assert.ok(candidates.some((candidate) => candidate.provider === 'internal-remotion' && candidate.relevanceScore === 10));
  const selectedExternal = shortlist.scenes.flatMap((scene) => scene.shots)
    .filter((shot) => shot.status === 'approved' && shot.selectedCandidateId)
    .map((shot) => shot.candidates.find((candidate) => candidate.candidateId === shot.selectedCandidateId))
    .filter((candidate) => candidate && candidate.provider !== 'internal-remotion');
  assert.ok(selectedExternal.length >= 3);
  assert.ok(selectedExternal.every((candidate) => candidate.relevanceScore >= 8 && candidate.matchReason));
});
