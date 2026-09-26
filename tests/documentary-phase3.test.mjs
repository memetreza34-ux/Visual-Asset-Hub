import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildDocumentaryPhase3 } from '../scripts/documentary-phase3.mjs';
import { sha256Text } from '../scripts/lib/documentary-timing-aligner.mjs';

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-phase3-'));
  for (const dir of ['01-SCRIPT', '02-AUDIO', '03-VISUALS/scene-001', '03-VISUALS/scene-002', '04-SOURCES', '05-PROJECT', '06-EXPORT']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  const script = 'Berlin verändert sich. Die Stadt wächst weiter.';
  fs.writeFileSync(path.join(root, '01-SCRIPT', 'script.txt'), `${script}\n`);
  fs.writeFileSync(path.join(root, '02-AUDIO', 'voiceover.mp3'), Buffer.from('fake-audio-for-hash-test'));
  fs.writeFileSync(path.join(root, '03-VISUALS', 'scene-001', '01-main.jpg'), Buffer.from('fake-image'));
  fs.writeFileSync(path.join(root, '03-VISUALS', 'scene-002', '01-main.mp4'), Buffer.from('fake-video'));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'project.json'), JSON.stringify({
    format: 'visual-asset-hub-documentary-project',
    version: 1,
    title: 'Berlin Test',
    slug: 'berlin-test'
  }, null, 2));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'scenes.json'), JSON.stringify({
    format: 'visual-asset-hub-documentary-scenes',
    version: 1,
    scriptSha256: sha256Text(script),
    timing: 'semantic-only-until-final-voiceover',
    scenes: [
      {
        sceneId: 'SCENE-001', sequence: 1, originalText: 'Berlin verändert sich.',
        visualIntent: 'Berlin', localPrimaryFile: '03-VISUALS/scene-001/01-main.jpg',
        candidates: [], localVisuals: [{ role: 'primary', reviewStatus: 'review-required' }]
      },
      {
        sceneId: 'SCENE-002', sequence: 2, originalText: 'Die Stadt wächst weiter.',
        visualIntent: 'Stadt', localPrimaryFile: '03-VISUALS/scene-002/01-main.mp4',
        candidates: [], localVisuals: [{ role: 'primary', reviewStatus: 'review-required' }]
      }
    ]
  }, null, 2));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'word-timings-input.json'), JSON.stringify({
    source: 'test-tts',
    language: 'de',
    words: [
      { word: 'Berlin', start: 0.05, end: 0.35 },
      { word: 'verändert', start: 0.35, end: 0.75 },
      { word: 'sich', start: 0.75, end: 1.0 },
      { word: 'Die', start: 1.1, end: 1.25 },
      { word: 'Stadt', start: 1.25, end: 1.55 },
      { word: 'wächst', start: 1.55, end: 1.9 },
      { word: 'weiter', start: 1.9, end: 2.2 }
    ]
  }, null, 2));
  return { root, script };
}

test('builds exact Phase 3 files and Antigravity handoff', async (t) => {
  const { root } = makeProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const result = await buildDocumentaryPhase3({ projectDirectory: root });
  assert.equal(result.wordTimings.alignment.status, 'exact');
  assert.equal(result.timeline.sceneCount, 2);
  assert.equal(result.timeline.scenes[0].startSeconds, 0.05);
  assert.equal(result.timeline.scenes[0].endSeconds, 1);
  assert.equal(result.timeline.scenes[1].startSeconds, 1.1);
  assert.equal(result.timeline.scenes[1].endSeconds, 2.2);
  assert.equal(result.timeline.exportTarget, '06-EXPORT/final-v1.mp4');
  assert.equal(result.handoff.render.neverOverwriteExistingFinal, true);

  for (const file of ['word-timings.json', 'timeline.json', 'edit-plan.json', 'antigravity-handoff.json', 'phase3-state.json']) {
    assert.equal(fs.existsSync(path.join(root, '05-PROJECT', file)), true, file);
  }

  const scenes = JSON.parse(fs.readFileSync(path.join(root, '05-PROJECT', 'scenes.json'), 'utf8'));
  assert.equal(scenes.timing, 'exact-final-voiceover-word-alignment');
  assert.equal(scenes.scenes[0].startPhrase, 'Berlin verändert sich');
  assert.equal(scenes.scenes[1].endWord, 'weiter');
});

test('uses the next export version when final-v1 already exists', async (t) => {
  const { root } = makeProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, '06-EXPORT', 'final-v1.mp4'), Buffer.from('existing-render'));
  const result = await buildDocumentaryPhase3({ projectDirectory: root });
  assert.equal(result.timeline.exportTarget, '06-EXPORT/final-v2.mp4');
});

test('rejects changed script before creating a timeline', async (t) => {
  const { root } = makeProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, '01-SCRIPT', 'script.txt'), 'Das Skript wurde verändert.\n');
  await assert.rejects(() => buildDocumentaryPhase3({ projectDirectory: root }), /nach Phase 1 verändert/);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'timeline.json')), false);
});

test('refuses to run without real word timings', async (t) => {
  const { root } = makeProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.rmSync(path.join(root, '05-PROJECT', 'word-timings-input.json'));
  await assert.rejects(() => buildDocumentaryPhase3({ projectDirectory: root }), /Echte Wort-Timings fehlen/);
});
