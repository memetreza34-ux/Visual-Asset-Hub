import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildAutomaticDocumentaryPhase3 } from '../scripts/documentary-phase3-auto.mjs';
import { validateDocumentaryPhase3 } from '../scripts/documentary-phase3-validate.mjs';
import { sha256Text } from '../scripts/lib/documentary-timing-aligner.mjs';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-phase3-preflight-'));
  for (const dir of ['01-SCRIPT', '02-AUDIO', '03-VISUALS/scene-001', '04-SOURCES', '05-PROJECT', '06-EXPORT']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const script = 'Hallo Welt.';
  fs.writeFileSync(path.join(root, '01-SCRIPT', 'script.txt'), `${script}\n`);
  fs.writeFileSync(path.join(root, '02-AUDIO', 'voiceover.mp3'), Buffer.from('audio-v1'));
  fs.writeFileSync(path.join(root, '03-VISUALS', 'scene-001', '01-main.jpg'), Buffer.from('image'));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'project.json'), JSON.stringify({ title: 'Preflight', slug: 'preflight' }));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'scenes.json'), JSON.stringify({
    scriptSha256: sha256Text(script),
    scenes: [{ sceneId: 'SCENE-001', sequence: 1, originalText: script, visualIntent: 'Test', localPrimaryFile: '03-VISUALS/scene-001/01-main.jpg', candidates: [], localVisuals: [{ role: 'primary', reviewStatus: 'review-required' }] }]
  }));
  return root;
}

const fakeFetch = async () => new Response(JSON.stringify({
  language: 'de', duration: 0.8, text: 'Hallo Welt',
  words: [{ word: 'Hallo', start: 0.1, end: 0.4 }, { word: 'Welt', start: 0.4, end: 0.8 }]
}), { status: 200, headers: { 'content-type': 'application/json' } });

test('pre-render validation passes for unchanged prepared project', async (t) => {
  const root = setup();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await buildAutomaticDocumentaryPhase3({ projectDirectory: root, openaiApiKey: 'sk-test', fetchImpl: fakeFetch });
  const report = validateDocumentaryPhase3({ projectDirectory: root });
  assert.equal(report.readyToRender, true);
  assert.equal(report.errors.length, 0);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'phase3-validation.json')), true);
});

test('pre-render validation blocks changed audio', async (t) => {
  const root = setup();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await buildAutomaticDocumentaryPhase3({ projectDirectory: root, openaiApiKey: 'sk-test', fetchImpl: fakeFetch });
  fs.writeFileSync(path.join(root, '02-AUDIO', 'voiceover.mp3'), Buffer.from('audio-v2'));
  const report = validateDocumentaryPhase3({ projectDirectory: root });
  assert.equal(report.readyToRender, false);
  assert.match(report.errors.join(' '), /voiceover\.mp3/);
});

test('pre-render validation blocks overwrite of an existing final render', async (t) => {
  const root = setup();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const phase3 = await buildAutomaticDocumentaryPhase3({ projectDirectory: root, openaiApiKey: 'sk-test', fetchImpl: fakeFetch });
  fs.writeFileSync(path.join(root, phase3.timeline.exportTarget), Buffer.from('existing-final'));
  const report = validateDocumentaryPhase3({ projectDirectory: root });
  assert.equal(report.readyToRender, false);
  assert.match(report.errors.join(' '), /existiert bereits/);
});
