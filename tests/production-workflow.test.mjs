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
    'scripts/research-discover.mjs',
    'scripts/article-capture.mjs',
    'scripts/entity-expand.mjs',
    'scripts/reference-video.mjs',
    'scripts/reference-style.mjs',
    'scripts/visual-match.mjs',
    'scripts/visual-qc.mjs',
    'scripts/clip-find.mjs',
    'scripts/beat-planner.mjs',
    'scripts/phase1-materialize.mjs',
    'scripts/phase1-bind.mjs',
    'scripts/map-render.mjs',
    'scripts/frame-extract.mjs',
    'scripts/video-project.mjs',
    'scripts/youtube-workflow.mjs',
    'scripts/youtube-workflow-v14.mjs',
    'scripts/align-voiceover.mjs',
    'scripts/lib/source-utils.mjs',
    'scripts/lib/wikidata.mjs',
    'scripts/lib/providers/index.mjs',
    'scripts/lib/providers/pixabay.mjs',
    'scripts/lib/providers/openverse.mjs',
    'scripts/lib/providers/wikimedia.mjs',
    'scripts/lib/providers/internet-archive.mjs',
    'scripts/lib/providers/nasa.mjs',
    'scripts/lib/providers/library-of-congress.mjs',
    'scripts/serve.mjs',
    'web/app.js',
    'web/archive-first.js'
  ]) {
    const result = check(file);
    assert.equal(result.status, 0, `${file}\n${result.stderr || result.stdout}`);
  }
});

test('package exposes production commands', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.version, '0.14.0');
  assert.equal(pkg.scripts['media:analyze'], 'node scripts/analyze-media.mjs');
  assert.equal(pkg.scripts['inbox:scan'], 'node scripts/scan-inbox.mjs');
  assert.equal(pkg.scripts['inbox:review'], 'node scripts/review-inbox.mjs');
  assert.equal(pkg.scripts['asset:add'], 'node scripts/add-asset.mjs');
  assert.equal(pkg.scripts['source:search'], 'node scripts/source-search.mjs');
  assert.equal(pkg.scripts['source:grab'], 'node scripts/source-grab.mjs');
  assert.equal(pkg.scripts['documentary:research'], 'node scripts/documentary-research.mjs');
  assert.equal(pkg.scripts['research:discover'], 'node scripts/research-discover.mjs');
  assert.equal(pkg.scripts['research:capture'], 'node scripts/article-capture.mjs');
  assert.equal(pkg.scripts['entity:expand'], 'node scripts/entity-expand.mjs');
  assert.equal(pkg.scripts['reference:inspect'], 'node scripts/reference-video.mjs');
  assert.equal(pkg.scripts['reference:style'], 'node scripts/reference-style.mjs');
  assert.equal(pkg.scripts['visual:match'], 'node scripts/visual-match.mjs');
  assert.equal(pkg.scripts['visual:qc'], 'node scripts/visual-qc.mjs');
  assert.equal(pkg.scripts['clip:find'], 'node scripts/clip-find.mjs');
  assert.equal(pkg.scripts['beat:plan'], 'node scripts/beat-planner.mjs');
  assert.equal(pkg.scripts['phase1:materialize'], 'node scripts/phase1-materialize.mjs');
  assert.equal(pkg.scripts['phase1:bind'], 'node scripts/phase1-bind.mjs');
  assert.equal(pkg.scripts['map:render'], 'node scripts/map-render.mjs');
  assert.equal(pkg.scripts['frame:extract'], 'node scripts/frame-extract.mjs');
  assert.equal(pkg.scripts['video:project'], 'node scripts/video-project.mjs');
  assert.equal(pkg.scripts['youtube:workflow'], 'node scripts/youtube-workflow-v14.mjs');
});

test('documentary research is archive-first and stock is opt-in', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/documentary-research.mjs'), 'utf8');
  assert.match(source, /official-archive/);
  assert.match(source, /library-of-congress/);
  assert.match(source, /wikimedia/);
  assert.match(source, /internet-archive/);
  assert.match(source, /expandEntityQuery/);
  assert.match(source, /includeStock/);
  assert.match(source, /stock-fallback/);
  assert.match(source, /requiresHumanEventMatch/);
  assert.match(source, /if \(tier === 'official-archive'\) return 60/);
});

test('research discovery uses keyless GDELT and optional self-hosted SearXNG', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/research-discover.mjs'), 'utf8');
  assert.match(source, /api\.gdeltproject\.org/);
  assert.match(source, /SEARXNG_URL/);
  assert.match(source, /format', 'json'/);
  assert.match(source, /autoReuseMedia: false/);
  assert.match(source, /authorityBoost/);
});

test('article capture stores screenshot and source evidence without granting reuse rights', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/article-capture.mjs'), 'utf8');
  assert.match(source, /import\('playwright'\)/);
  assert.match(source, /page\.screenshot/);
  assert.match(source, /canonicalUrl/);
  assert.match(source, /screenshotDoesNotGrantReuseRights: true/);
});

test('reference inspector never downloads reference video media by default', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/reference-video.mjs'), 'utf8');
  assert.match(source, /--skip-download/);
  assert.match(source, /mediaDownloaded: false/);
  assert.match(source, /autoReuseAllowed: false/);
  assert.doesNotMatch(source, /--format/);
});

test('reference style analyzer uses PySceneDetect and FFmpeg frames', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/reference-style.mjs'), 'utf8');
  const python = fs.readFileSync(path.join(root, 'scripts/reference-style.py'), 'utf8');
  assert.match(source, /reference-style\.py/);
  assert.match(source, /ffmpeg/);
  assert.match(source, /style-profile\.json/);
  assert.match(python, /ContentDetector/);
  assert.match(python, /cutsPerMinute/);
});

test('visual matcher and clip finder keep semantic ranking separate from fact proof', () => {
  const matcher = fs.readFileSync(path.join(root, 'scripts/visual-match.py'), 'utf8');
  const finder = fs.readFileSync(path.join(root, 'scripts/clip-find.mjs'), 'utf8');
  assert.match(matcher, /open_clip/);
  assert.match(matcher, /clipSimilarity/);
  assert.match(finder, /visual-match\.py/);
  assert.match(finder, /proofOfEventIdentity: false/);
});

test('beat planner translates phase-1 intent into renderer specs without inventing new story', () => {
  const planner = fs.readFileSync(path.join(root, 'scripts/beat-planner.mjs'), 'utf8');
  assert.match(planner, /editorialIntentWins: true/);
  assert.match(planner, /phase1Locked: true/);
  assert.match(planner, /stockFallbackOnly: true/);
  assert.match(planner, /presentationFor/);
  assert.match(planner, /qualityGate/);
  assert.match(planner, /minimumSemanticRelevance: 0\.7/);
  assert.match(planner, /freeze-frame/);
  assert.match(planner, /map/);
  assert.match(planner, /callout/);
});

test('phase 1 materializer resolves real archive candidates and keeps publish approval separate', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/phase1-materialize.mjs'), 'utf8');
  assert.match(source, /archiveFirst: true/);
  assert.match(source, /autoApproveExternalMedia: false/);
  assert.match(source, /eventIdentityStillRequiresReview: true/);
  assert.match(source, /providersFor/);
  assert.match(source, /editorialScore/);
  assert.match(source, /downloadSelected/);
  assert.match(source, /writeSourceMetadata/);
  assert.match(source, /materialization\.json/);
});

test('visual QC blocks weak rights or technical candidates and optionally uses OpenCLIP', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/visual-qc.mjs'), 'utf8');
  assert.match(source, /unknownRightsPublishable: false/);
  assert.match(source, /watermarkDetection: 'manual-required'/);
  assert.match(source, /visual-match\.py/);
  assert.match(source, /semantic-match-weak/);
  assert.match(source, /restricted-rights/);
  assert.match(source, /duplicate-of/);
});

test('phase 1 binder only binds approved YouTube assets and auto-binding requires QC', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/phase1-bind.mjs'), 'utf8');
  assert.match(source, /visual-qc\.json fehlt/);
  assert.match(source, /auto-source-match/);
  assert.match(source, /manualReviewed: true/);
  assert.match(source, /usageScopes\?\.includes\('youtube'\)/);
  assert.match(source, /qcCandidate\.status === 'blocked'/);
});

test('v0.14 controller blocks user voiceover until real beat bindings are ready', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/youtube-workflow-v14.mjs'), 'utf8');
  assert.match(source, /materialization\.json/);
  assert.match(source, /visual-qc\.json/);
  assert.match(source, /beat-bindings\.json/);
  assert.match(source, /kein echtes Asset gebunden/);
  assert.match(source, /Voiceover blockiert/);
  assert.match(source, /source: 'user-provided'/);
  assert.match(source, /generatedByPipeline: false/);
  assert.match(source, /delegateLegacy/);
});

test('map renderer is keyless and preserves map attribution review metadata', () => {
  const map = fs.readFileSync(path.join(root, 'scripts/map-render.mjs'), 'utf8');
  assert.match(map, /maplibre-gl/);
  assert.match(map, /tiles\.openfreemap\.org/);
  assert.match(map, /© OpenStreetMap contributors/);
  assert.match(map, /suggestedStatus: 'review'/);
  assert.match(map, /toInbox/);
});

test('freeze-frame extractor inherits parent rights but forces review', () => {
  const frame = fs.readFileSync(path.join(root, 'scripts/frame-extract.mjs'), 'utf8');
  assert.match(frame, /ffmpeg/);
  assert.match(frame, /derived-frame/);
  assert.match(frame, /suggestedStatus: 'review'/);
  assert.match(frame, /Dieselben Quellen-\/Lizenzbedingungen/);
  assert.match(frame, /rights\.usageScopes/);
});

test('Wikidata expansion supplies aliases without becoming a fact source', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/lib/wikidata.mjs'), 'utf8');
  assert.match(source, /wbsearchentities/);
  assert.match(source, /wbgetentities/);
  assert.match(source, /aliases/);
  assert.match(source, /variants/);
});

test('provider layer exposes keyless official archives', () => {
  const providers = fs.readFileSync(path.join(root, 'scripts/lib/providers/index.mjs'), 'utf8');
  assert.match(providers, /nasa: \{ types: \['video', 'image'\], requiresKey: null, tier: 'official-archive'/);
  assert.match(providers, /'library-of-congress': \{ types: \['video', 'image'\], requiresKey: null, tier: 'official-archive'/);
});

test('local server guards write endpoints and provider provenance', () => {
  const server = fs.readFileSync(path.join(root, 'scripts/serve.mjs'), 'utf8');
  assert.match(server, /version: '0\.14'/);
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
  const archiveFirst = fs.readFileSync(path.join(root, 'web/archive-first.js'), 'utf8');
  assert.match(html, /id="source-form"/);
  assert.match(html, /archive-first\.js/);
  assert.match(html, /NASA · Library of Congress/);
  assert.match(app, /searchSources/);
  assert.match(app, /grabSourceAsset/);
  assert.match(app, /importReviewedAsset/);
  assert.match(archiveFirst, /Stock-Fallback/);
});

test('video project export enforces rights and passes editorial presentation to renderer', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/video-project.mjs'), 'utf8');
  assert.match(source, /asset\.status !== 'approved'/);
  assert.match(source, /usageScopes\?\.includes\(scope\)/);
  assert.match(source, /render-manifest\.json/);
  assert.match(source, /manifestVersion: 3/);
  assert.match(source, /freeze-frame/);
  assert.match(source, /overlays: normalizeOverlays/);
  assert.match(source, /presentation/);
  assert.match(source, /transition/);
});

test('renderer supports documentary overlays, maps, article shots and freeze frames', () => {
  const renderer = fs.readFileSync(path.join(root, 'renderer/src/AssetVideo.tsx'), 'utf8');
  const overlays = fs.readFileSync(path.join(root, 'renderer/src/EditorialOverlays.tsx'), 'utf8');
  const prepare = fs.readFileSync(path.join(root, 'renderer/scripts/prepare-project.mjs'), 'utf8');
  assert.match(renderer, /VerticalBlurVideo/);
  assert.match(renderer, /ArticleScreenshot/);
  assert.match(renderer, /MapImage/);
  assert.match(renderer, /FreezeFrame/);
  assert.match(renderer, /EditorialOverlays/);
  assert.match(overlays, /kind: 'label' \| 'headline' \| 'number' \| 'callout' \| 'source'/);
  assert.match(overlays, /spring/);
  assert.match(prepare, /-preview/);
  assert.match(prepare, /freeze-frame/);
});
