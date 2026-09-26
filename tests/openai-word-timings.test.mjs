import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { transcribeOpenAIWordTimings } from '../scripts/lib/openai-word-timings.mjs';

test('requests whisper-1 verbose word timestamps without exposing API key in output', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-openai-timing-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const audio = path.join(root, 'voiceover.mp3');
  fs.writeFileSync(audio, Buffer.from('fake-mp3'));
  let request;
  const result = await transcribeOpenAIWordTimings({
    audioFile: audio,
    apiKey: 'sk-test-only-not-real',
    fetchImpl: async (url, options) => {
      request = { url: String(url), options };
      return new Response(JSON.stringify({
        language: 'de', duration: 0.8, text: 'Hallo Welt',
        words: [
          { word: 'Hallo', start: 0, end: 0.35 },
          { word: 'Welt', start: 0.35, end: 0.8 }
        ]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });

  assert.equal(request.url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.match(request.options.headers.Authorization, /^Bearer /);
  assert.equal(result.model, 'whisper-1');
  assert.equal(result.source, 'openai-whisper-1-word-timestamps');
  assert.deepEqual(result.words.map((word) => word.word), ['Hallo', 'Welt']);
  assert.equal(JSON.stringify(result).includes('sk-test-only-not-real'), false);
});

test('requires an API key', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-openai-timing-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const audio = path.join(root, 'voiceover.mp3');
  fs.writeFileSync(audio, Buffer.from('fake-mp3'));
  await assert.rejects(() => transcribeOpenAIWordTimings({ audioFile: audio, apiKey: '' }), /OPENAI_API_KEY fehlt/);
});

test('rejects files above the transcription size limit before network access', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-openai-timing-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const audio = path.join(root, 'voiceover.mp3');
  fs.writeFileSync(audio, Buffer.alloc(1));
  fs.truncateSync(audio, 25 * 1024 * 1024 + 1);
  let called = false;
  await assert.rejects(() => transcribeOpenAIWordTimings({
    audioFile: audio,
    apiKey: 'sk-test',
    fetchImpl: async () => { called = true; throw new Error('should not run'); }
  }), /größer als 25 MB/);
  assert.equal(called, false);
});
