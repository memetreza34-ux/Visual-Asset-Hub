import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();

test('beat planner defaults to real-media assembly without automatic explainer graphics', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/beat-planner.mjs'), 'utf8');
  assert.match(source, /realMediaFirst: true/);
  assert.match(source, /syntheticExplainerGraphics: false/);
  assert.match(source, /defaultOverlayMode: 'none'/);
  assert.match(source, /explicitOverlayOnly: true/);
  assert.match(source, /calloutsDisabled: true/);
  assert.match(source, /remotionRole: 'assembly-only'/);
  assert.doesNotMatch(source, /overlays\.push\(\{ kind: 'callout'/);
});

test('current CGI phenomena project forbids synthetic Remotion explainers', () => {
  const project = JSON.parse(fs.readFileSync(path.join(root, 'projects/5-naturphaenomene-wie-cgi-2min/project.json'), 'utf8'));
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'projects/5-naturphaenomene-wie-cgi-2min/shot-plan.json'), 'utf8'));
  assert.equal(project.editingRules.remotionRole, 'assembly-only');
  assert.equal(project.editingRules.syntheticExplainerGraphics, false);
  assert.equal(project.editingRules.particleOrElectronAnimations, false);
  assert.equal(project.editingRules.centerTextCards, false);
  assert.equal(plan.policy.syntheticExplainerGraphics, false);
  assert.equal(plan.policy.automaticOverlays, false);
  assert.equal(plan.shots.every((shot) => Array.isArray(shot.overlays) && shot.overlays.length === 0), true);
});
