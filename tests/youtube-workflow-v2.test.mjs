import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';

const root = process.cwd();

test('youtube workflow v3 help is available', () => {
  const result = spawnSync(process.execPath, ['scripts/youtube-workflow-v3.mjs', 'help'], {cwd: root, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Workflow v3/);
  assert.match(result.stdout, /Phase 3/);
});

test('current science project is explicitly workflow v3 and user-voiceover only', () => {
  const project = JSON.parse(fs.readFileSync('projects/5-naturphaenomene-wie-cgi-2min/project.json', 'utf8'));
  assert.equal(project.workflowVersion, 3);
  assert.equal(project.requireUserVoiceover, true);
  assert.equal(project.editingRules.remotionRole, 'assembly-only');
  assert.equal(project.editingRules.syntheticExplainerGraphics, false);
});

test('phase3 prepare requires local phase1 assets instead of runtime web fetching', () => {
  const source = fs.readFileSync('scripts/phase3-prepare.mjs', 'utf8');
  assert.match(source, /networkAllowed: false/);
  assert.match(source, /storage\?\.kind === 'external'/);
  assert.match(source, /lokale Datei fehlt/);
});
