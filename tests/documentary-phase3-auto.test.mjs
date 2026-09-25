import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildAutomaticDocumentaryPhase3 } from '../scripts/documentary-phase3-auto.mjs';
import { sha256Text } from '../scripts/lib/documentary-timing-aligner.mjs';

function setupProject({ createVisual = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-phase3-auto-'));
  for (const dir of ['01-SCRIPT', '02-AUDIO', '03-VISUALS/scene-001', '04-SOURCES', '05-PROJECT', '06-EXPORT']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  const script = 'Hallo Welt.';
  fs.writeFileSync(path.join(root, '01-SCRIPT', 'script.txt'), `${script}\n`);
  fs.writeFileSync(path.join(root, '02-AUDIO', 'voiceover.mp3'), Buffer.from('fake-audio'));
  if (createVisual) fs.writeFileSync(path.join(root, '03-VISUALS', 'scene-001', '01-main.jpg'), Buffer.from('image'));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'project.json'), JSON.stringify({ title: 'Auto Test', slug: 'auto-test' }));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'scenes.json'), JSON.stringify({
    scriptSha256: sha256Text(script),
    scenes: [{
      sceneId: 'SCENE-001',
      sequence: 1,
      originalText: 'Hallo Welt.',
      visualIntent: 'Begrüßung',
      localPrimaryFile: '03-VISUALS/scene-001/01-main.jpg',
      candidates: [],
      localVisuals: [{ role: 'primary', reviewStatus: 'review-required' }]
    }]
  }));
  return root;
}

function fakeOpenAIFetch() {
  return async (url, options) => {
    assert.equal(String(url), 'https://api.openai.com/v1/audio/transcriptions');
    assert.match(options.headers.Authorization, /^Bearer /);
    return new Response(JSON.stringify({
      language: 'de',
      duration: 0.8,
      text: 'Hallo Welt',
      words: [
        { word: 'Hallo', start: 0.1, end: 0.4 },
        { word: 'Welt', start: 0.4, end: 0.8 }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}

test('automatically creates word timing input from voiceover and builds handoff', async (t) => {
  const root = setupProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const result = await buildAutomaticDocumentaryPhase3({
    projectDirectory: root,
    openaiApiKey: 'sk-test-only',
    fetchImpl: fakeOpenAIFetch()
  });

  assert.equal(result.automaticTiming.generated, true);
  assert.equal(result.wordTimings.alignment.status, 'exact');
  assert.equal(result.handoff.gates.canRender, true);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'word-timings-input.json')), true);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'antigravity-handoff.json')), true);
});

test('blocks render when JSON points to a local visual that is not physically present', async (t) => {
  const root = setupProject({ createVisual: false });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const result = await buildAutomaticDocumentaryPhase3({
    projectDirectory: root,
    openaiApiKey: 'sk-test-only',
    fetchImpl: fakeOpenAIFetch()
  });

  assert.equal(result.handoff.gates.canRender, false);
  assert.deepEqual(result.handoff.gates.missingLocalVisuals, ['SCENE-001']);
  assert.equal(result.phase3State.status, 'blocked-missing-local-visuals');
});
