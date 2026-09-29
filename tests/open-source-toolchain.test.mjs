import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('open-source toolbox parses and is exposed through package scripts', () => {
  const result = spawnSync(process.execPath, ['--check', 'scripts/open-source-toolchain.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.tools, 'node scripts/open-source-toolchain.mjs');
  assert.equal(pkg.scripts['tools:doctor'], 'node scripts/open-source-toolchain.mjs doctor');
  assert.equal(pkg.scripts['research:extract'], 'node scripts/open-source-toolchain.mjs research-extract');
  assert.equal(pkg.scripts['image:prepare'], 'node scripts/open-source-toolchain.mjs image-prepare');
  assert.equal(pkg.scripts['audio:prepare'], 'node scripts/open-source-toolchain.mjs audio-prepare');
  assert.equal(pkg.scripts['final:qc'], 'node scripts/open-source-toolchain.mjs final-qc');
});

test('toolbox integrates light open-source quality tools with graceful fallbacks', () => {
  const source = read('scripts/open-source-toolchain.mjs');
  assert.match(source, /Trafilatura/);
  assert.match(source, /ArchiveBox/);
  assert.match(source, /MediaInfo/);
  assert.match(source, /Sharp\/libvips/);
  assert.match(source, /sqlite-vec/);
  assert.match(source, /pyiqa/);
  assert.match(source, /ffmpeg-normalize/);
  assert.match(source, /libvmaf/);
  assert.match(source, /optionalToolsNeverBlockNormalWorkflow: true/);
  assert.match(source, /heavyAiToolsDefaultOff: true/);
});

test('safe fetch requires an explicit rights-cleared gate', () => {
  const source = read('scripts/open-source-toolchain.mjs');
  assert.match(source, /rightsCleared !== 'true'/);
  assert.match(source, /gallery-dl/);
  assert.match(source, /yt-dlp/);
  assert.match(source, /RIGHTS-REVIEW\.txt/);
  assert.match(source, /not legal proof of rights/);
});

test('heavy AI helpers are optional and never generate documentary explainers', () => {
  const source = read('scripts/open-source-toolchain.mjs');
  const crop = read('scripts/tooling/smart_crop.py');
  const dedupe = read('scripts/tooling/visual_dedupe.py');
  const whisper = read('scripts/tooling/voiceover_precision.py');
  assert.match(source, /DINOv2\/Transformers/);
  assert.match(source, /Segment Anything/);
  assert.match(source, /Real-ESRGAN/);
  assert.match(source, /AI-Upscaling ist standardmäßig AUS/);
  assert.match(crop, /syntheticContentAdded/);
  assert.match(crop, /GroundingDINO/);
  assert.match(dedupe, /facebook\/dinov2-base/);
  assert.match(whisper, /userVoiceoverRemainsMasterAudio/);
  assert.match(whisper, /noSyntheticVoiceGenerated/);
});

test('asset memory uses local OpenCLIP plus sqlite-vec', () => {
  const memory = read('scripts/tooling/asset_memory.py');
  assert.match(memory, /sqlite_vec\.load/);
  assert.match(memory, /CREATE VIRTUAL TABLE vec_assets USING vec0/);
  assert.match(memory, /open_clip\.create_model_and_transforms/);
  assert.match(memory, /embedding MATCH/);
  assert.match(memory, /not proof of event identity or rights/);
});

test('research and image quality helpers keep extraction and quality separate from rights', () => {
  const research = read('scripts/tooling/research_extract.py');
  const quality = read('scripts/tooling/image_quality.py');
  assert.match(research, /trafilatura\.extract/);
  assert.match(research, /favor_precision=True/);
  assert.match(quality, /qualityScoreDoesNotGrantRights/);
  assert.match(quality, /qualityScoreIsNotSemanticRelevance/);
});
