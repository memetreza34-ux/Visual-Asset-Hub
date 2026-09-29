import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const check = (file) => spawnSync(process.execPath, ['--check', file], {cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe']});

test('production JavaScript entrypoints parse', () => {
  for (const file of [
    'scripts/analyze-media.mjs','scripts/add-asset.mjs','scripts/source-search.mjs','scripts/source-grab.mjs',
    'scripts/documentary-research.mjs','scripts/research-discover.mjs','scripts/article-capture.mjs','scripts/reference-style.mjs',
    'scripts/visual-qc.mjs','scripts/clip-find.mjs','scripts/beat-planner.mjs','scripts/phase1-materialize.mjs',
    'scripts/phase1-bind.mjs','scripts/phase1-quality-pass.mjs','scripts/phase3-prepare.mjs','scripts/video-project.mjs',
    'scripts/youtube-workflow-v3.mjs','scripts/align-voiceover.mjs','scripts/open-source-toolchain.mjs','scripts/serve.mjs',
    'scripts/lib/providers/index.mjs','scripts/lib/providers/nasa.mjs','scripts/lib/providers/noaa.mjs','scripts/lib/providers/usgs.mjs',
    'scripts/lib/providers/nara.mjs','scripts/lib/providers/smithsonian.mjs','scripts/lib/providers/europeana.mjs'
  ]) {
    const result = check(file);
    assert.equal(result.status, 0, `${file}\n${result.stderr || result.stdout}`);
  }
});

test('package exposes the single production workflow v3', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.version, '0.17.0');
  assert.equal(pkg.scripts['youtube:workflow'], 'node scripts/youtube-workflow-v3.mjs');
  assert.equal(pkg.scripts['phase3:prepare'], 'node scripts/phase3-prepare.mjs');
  assert.equal(pkg.scripts['voiceover:align'], 'node scripts/align-voiceover.mjs');
  assert.equal(pkg.scripts['phase1:materialize'], 'node scripts/phase1-materialize.mjs');
  assert.equal(pkg.scripts['phase1:quality'], 'node scripts/phase1-quality-pass.mjs');
});

test('workflow v3 blocks phase 2 until assets are local, approved and bound', () => {
  const source = read('scripts/youtube-workflow-v3.mjs');
  assert.match(source, /materialization\.json/);
  assert.match(source, /visual-qc\.json/);
  assert.match(source, /beat-bindings\.json/);
  assert.match(source, /storage\?\.kind === 'external'/);
  assert.match(source, /lokal gebundene Datei fehlt/);
  assert.match(source, /Voiceover blockiert/);
  assert.match(source, /source: 'user-provided'/);
  assert.match(source, /generatedByPipeline: false/);
  assert.match(source, /phase3-prepare/);
});

test('beat planner supports multiple real-media shots per narration beat', () => {
  const planner = read('scripts/beat-planner.mjs');
  assert.match(planner, /multiShotPerBeat: true/);
  assert.match(planner, /flatMap/);
  assert.match(planner, /beatId:/);
  assert.match(planner, /shotCountFor/);
  assert.match(planner, /beat\.shots/);
  assert.match(planner, /syntheticExplainerGraphics: false/);
  assert.match(planner, /calloutsDisabled: true/);
});

test('phase 1 materializes locked direct media before voiceover', () => {
  const source = read('scripts/phase1-materialize.mjs');
  assert.match(source, /phase1DownloadsLockedMedia: true/);
  assert.match(source, /phase3NetworkFetchForbidden: true/);
  assert.match(source, /exactDirectMediaUrl/);
  assert.match(source, /phase1-direct-download/);
  assert.match(source, /downloadSelected/);
  assert.match(source, /sha256/);
  assert.match(source, /autoApproveExternalMedia: false/);
});

test('voiceover alignment targets editorial visual beats', () => {
  const source = read('scripts/align-voiceover.mjs');
  assert.match(source, /visual-plan\.json/);
  assert.match(source, /narrationAnchor/);
  assert.match(source, /beats/);
  assert.match(source, /whisper-anchor-sequential/);
  assert.match(source, /generatedVoiceForbidden: true/);
});

test('phase3 prepare creates deterministic local-only multi-shot handoff', () => {
  const source = read('scripts/phase3-prepare.mjs');
  assert.match(source, /networkAllowed: false/);
  assert.match(source, /phase1AssetsOnly: true/);
  assert.match(source, /randomReplacementBroll: false/);
  assert.match(source, /groupByBeat/);
  assert.match(source, /targetWeight/);
  assert.match(source, /externes Asset ist in Phase 3 verboten/);
  assert.match(source, /phase3-handoff\.json/);
  assert.match(source, /render-manifest\.json/);
});

test('video export carries planned focus/motion and refuses remote v3 assets', () => {
  const source = read('scripts/video-project.mjs');
  assert.match(source, /manifestVersion: 4/);
  assert.match(source, /Workflow v3 verbietet externe Laufzeit-Assets/);
  assert.match(source, /motion: normalizeMotion/);
  assert.match(source, /focus: normalizeFocus/);
  assert.match(source, /networkAllowed: false/);
});

test('renderer follows focus/motion and rejects v3 remote runtime sources', () => {
  const renderer = read('renderer/src/AssetVideo.tsx');
  assert.match(renderer, /motionTransform/);
  assert.match(renderer, /objectPosition/);
  assert.match(renderer, /scene\.focus/);
  assert.match(renderer, /networkAllowed !== false/);
  assert.match(renderer, /refuses remote runtime asset/);
  assert.doesNotMatch(renderer, /hash\(scene\.id\)/);
});

test('official provider layer remains archive-first', () => {
  const providers = read('scripts/lib/providers/index.mjs');
  for (const name of ['nasa','noaa','usgs','nara','smithsonian','library-of-congress','europeana','wikimedia','internet-archive','openverse','pexels','pixabay']) {
    assert.match(providers, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(providers, /tier: 'official-archive'/);
  assert.match(providers, /tier: 'stock-fallback'/);
});

test('visual QC keeps rights and event identity outside semantic model authority', () => {
  const source = read('scripts/visual-qc.mjs');
  assert.match(source, /unknownRightsPublishable: false/);
  assert.match(source, /eventIdentity: 'manual-or-authoritative-source-review-required'/);
  assert.match(source, /watermarkDetection: 'manual-required'/);
  assert.match(source, /visual-match\.py/);
});

test('open-source quality toolbox remains optional and real-media-first', () => {
  const source = read('scripts/open-source-toolchain.mjs');
  assert.match(source, /optionalToolsNeverBlockNormalWorkflow: true/);
  assert.match(source, /heavyAiToolsDefaultOff: true/);
  assert.match(source, /remotionSyntheticExplainers: false/);
  assert.match(source, /Trafilatura/);
  assert.match(source, /sqlite-vec/);
  assert.match(source, /OpenCLIP/);
  assert.match(source, /WhisperX/);
});
