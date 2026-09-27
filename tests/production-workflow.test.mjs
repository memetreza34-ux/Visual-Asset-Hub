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
    'scripts/source-search.mjs',
    'scripts/source-grab.mjs',
    'scripts/lib/source-utils.mjs',
    'scripts/lib/providers/index.mjs',
    'scripts/lib/providers/pixabay.mjs',
    'scripts/lib/providers/openverse.mjs',
    'scripts/serve.mjs',
    'web/app.js'
  ]) {
    const result = check(file);
    assert.equal(result.status, 0, `${file}\n${result.stderr || result.stdout}`);
  }
});

test('package exposes production commands', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.7.0');
  assert.equal(pkg.scripts['media:analyze'], 'node scripts/analyze-media.mjs');
  assert.equal(pkg.scripts['inbox:scan'], 'node scripts/scan-inbox.mjs');
  assert.equal(pkg.scripts['inbox:review'], 'node scripts/review-inbox.mjs');
  assert.equal(pkg.scripts['asset:add'], 'node scripts/add-asset.mjs');
  assert.equal(pkg.scripts['source:search'], 'node scripts/source-search.mjs');
  assert.equal(pkg.scripts['source:grab'], 'node scripts/source-grab.mjs');
});

test('local server guards write endpoints and provider provenance', () => {
  const server = fs.readFileSync(path.join(root, 'scripts/serve.mjs'), 'utf8');
  assert.match(server, /writeApiEnabled/);
  assert.match(server, /\/api\/sources\/search/);
  assert.match(server, /\/api\/sources\/grab/);
  assert.match(server, /\/api\/inbox\/scan/);
  assert.match(server, /\/api\/inbox\/import/);
  assert.match(server, /safeInboxFile/);
  assert.match(server, /Cross-Site-Schreibzugriff wurde blockiert/);
  assert.match(server, /applySourceMetadata/);
  assert.match(server, /licenseStatus === 'restricted'/);
  assert.match(server, /Imported via/);
});

test('inbox scan carries provider metadata into review', () => {
  const scan = fs.readFileSync(path.join(root, 'scripts/scan-inbox.mjs'), 'utf8');
  assert.match(scan, /sourceMetadata/);
  assert.match(scan, /inbox-source/);
});

test('browser exposes source search, inbox review and library surfaces', () => {
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'web/app.js'), 'utf8');
  assert.match(html, /id="source-form"/);
  assert.match(html, /id="review-form"/);
  assert.match(app, /searchSources/);
  assert.match(app, /grabSourceAsset/);
  assert.match(app, /importReviewedAsset/);
});
