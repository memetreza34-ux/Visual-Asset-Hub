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
    'scripts/documentary-research.mjs',
    'scripts/reference-video.mjs',
    'scripts/video-project.mjs',
    'scripts/youtube-workflow.mjs',
    'scripts/align-voiceover.mjs',
    'scripts/lib/source-utils.mjs',
    'scripts/lib/providers/index.mjs',
    'scripts/lib/providers/pixabay.mjs',
    'scripts/lib/providers/openverse.mjs',
    'scripts/lib/providers/wikimedia.mjs',
    'scripts/lib/providers/internet-archive.mjs',
    'scripts/serve.mjs',
    'web/app.js'
  ]) {
    const result = check(file);
    assert.equal(result.status, 0, `${file}\n${result.stderr || result.stdout}`);
  }
});

test('package exposes production commands', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.10.0');
  assert.equal(pkg.scripts['media:analyze'], 'node scripts/analyze-media.mjs');
  assert.equal(pkg.scripts['inbox:scan'], 'node scripts/scan-inbox.mjs');
  assert.equal(pkg.scripts['inbox:review'], 'node scripts/review-inbox.mjs');
  assert.equal(pkg.scripts['asset:add'], 'node scripts/add-asset.mjs');
  assert.equal(pkg.scripts['source:search'], 'node scripts/source-search.mjs');
  assert.equal(pkg.scripts['source:grab'], 'node scripts/source-grab.mjs');
  assert.equal(pkg.scripts['documentary:research'], 'node scripts/documentary-research.mjs');
  assert.equal(pkg.scripts['reference:inspect'], 'node scripts/reference-video.mjs');
  assert.equal(pkg.scripts['video:project'], 'node scripts/video-project.mjs');
  assert.equal(pkg.scripts['youtube:workflow'], 'node scripts/youtube-workflow.mjs');
});

test('documentary research is archive-first and stock is opt-in', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/documentary-research.mjs'), 'utf8');
  assert.match(source, /wikimedia/);
  assert.match(source, /internet-archive/);
  assert.match(source, /includeStock/);
  assert.match(source, /stock-fallback/);
  assert.match(source, /requiresHumanEventMatch/);
});

test('reference inspector never downloads reference video media by default', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/reference-video.mjs'), 'utf8');
  assert.match(source, /--skip-download/);
  assert.match(source, /mediaDownloaded: false/);
  assert.match(source, /autoReuseAllowed: false/);
  assert.doesNotMatch(source, /--format/);
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
  assert.match(server, /\['restricted', 'unknown'\]\.includes\(metadata\.licenseStatus\)/);
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

test('video project export enforces approved assets and usage scope', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/video-project.mjs'), 'utf8');
  assert.match(source, /asset\.status !== 'approved'/);
  assert.match(source, /usageScopes\?\.includes\(scope\)/);
  assert.match(source, /render-manifest\.json/);
  assert.match(source, /durationInFrames/);
  assert.match(source, /attribution/);
});
