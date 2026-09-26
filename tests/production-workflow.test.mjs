import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();

function check(file) {
  return spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

test('production workflow JavaScript parses successfully', () => {
  for (const file of [
    'scripts/analyze-media.mjs',
    'scripts/scan-inbox.mjs',
    'scripts/review-inbox.mjs',
    'scripts/add-asset.mjs',
    'scripts/pexels-grab.mjs',
    'scripts/serve.mjs',
    'web/app.js'
  ]) {
    const result = check(file);
    assert.equal(result.status, 0, `${file}\n${result.stderr || result.stdout}`);
  }
});

test('package exposes production commands', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.6.0');
  assert.equal(pkg.scripts['media:analyze'], 'node scripts/analyze-media.mjs');
  assert.equal(pkg.scripts['inbox:scan'], 'node scripts/scan-inbox.mjs');
  assert.equal(pkg.scripts['inbox:review'], 'node scripts/review-inbox.mjs');
  assert.equal(pkg.scripts['asset:add'], 'node scripts/add-asset.mjs');
  assert.equal(pkg.scripts['pexels:grab'], 'node scripts/pexels-grab.mjs');
});

test('local server contains guarded inbox write endpoints and provenance protection', () => {
  const server = fs.readFileSync(path.join(root, 'scripts/serve.mjs'), 'utf8');
  assert.match(server, /writeApiEnabled/);
  assert.match(server, /\/api\/inbox\/scan/);
  assert.match(server, /\/api\/inbox\/import/);
  assert.match(server, /safeInboxFile/);
  assert.match(server, /Cross-Site-Schreibzugriff wurde blockiert/);
  assert.match(server, /value = 'approved'/);
  assert.match(server, /applySourceMetadata/);
  assert.match(server, /Imported via Pexels API/);
});

test('inbox scan can carry provider metadata into review', () => {
  const scan = fs.readFileSync(path.join(root, 'scripts/scan-inbox.mjs'), 'utf8');
  assert.match(scan, /sourceMetadata/);
  assert.match(scan, /inbox-source/);
});
