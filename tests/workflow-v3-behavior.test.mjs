import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const root = process.cwd();

test('beat planner really expands one narration beat into multiple linked shots', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-v3-'));
  try {
    const planFile = path.join(dir, 'visual-plan.json');
    const outputFile = path.join(dir, 'shot-plan.json');
    fs.writeFileSync(planFile, `${JSON.stringify({
      version: 3,
      projectId: 'behavior-test',
      style: {normalVisualSeconds: '3-6', insertSeconds: '1.5-3'},
      beats: [{
        id: 'b01',
        narrationAnchor: 'Diese Aufnahmen sehen aus wie CGI',
        visualType: 'fast-montage',
        visual: 'Five distinct real-media archive visuals in rapid succession.',
        sources: [
          'https://example.test/1',
          'https://example.test/2',
          'https://example.test/3',
          'https://example.test/4',
          'https://example.test/5'
        ]
      }]
    }, null, 2)}\n`);

    const run = spawnSync(process.execPath, ['scripts/beat-planner.mjs', '--plan', planFile, '--output', outputFile], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const result = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    assert.equal(result.version, 3);
    assert.equal(result.policy.multiShotPerBeat, true);
    assert.ok(result.shots.length >= 4, `expected montage to expand, got ${result.shots.length}`);
    assert.ok(result.shots.every((shot) => shot.beatId === 'b01'));
    assert.equal(new Set(result.shots.map((shot) => shot.id)).size, result.shots.length);
    assert.deepEqual(result.beats[0].shotIds, result.shots.map((shot) => shot.id));
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('workflow v3 help is executable and describes offline phase 3', () => {
  const run = spawnSync(process.execPath, ['scripts/youtube-workflow-v3.mjs', 'help'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /Workflow v3/);
  assert.match(run.stdout, /keinen Netzwerkzugriff/);
  assert.match(run.stdout, /phase1-quality/);
});
