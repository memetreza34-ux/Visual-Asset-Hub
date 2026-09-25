import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function transcribeOpenAIWordTimings({
  audioFile,
  apiKey = process.env.OPENAI_API_KEY,
  language = 'de',
  fetchImpl = globalThis.fetch,
  timeoutMs = 10 * 60 * 1000
} = {}) {
  if (!audioFile) throw new Error('audioFile fehlt.');
  const file = path.resolve(audioFile);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Audiodatei nicht gefunden: ${file}`);
  const stat = fs.statSync(file);
  if (stat.size <= 0) throw new Error('Audiodatei ist leer.');
  if (stat.size > MAX_AUDIO_BYTES) {
    throw new Error(`voiceover.mp3 ist größer als 25 MB (${stat.size} Bytes). Für automatische Wort-Timestamps muss die Datei komprimiert oder kontrolliert aufgeteilt werden.`);
  }
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('OPENAI_API_KEY fehlt. Alternativ echte Wort-Timings über --word-timings bereitstellen.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('fetch ist in dieser Node.js-Version nicht verfügbar.');

  const form = new FormData();
  const data = fs.readFileSync(file);
  const audioSha256 = createHash('sha256').update(data).digest('hex');
  form.append('file', new Blob([data], { type: mimeFor(file) }), path.basename(file));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  if (language) form.append('language', String(language));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${String(apiKey).trim()}`,
        Accept: 'application/json'
      },
      body: form,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('OpenAI-Transkription hat das Zeitlimit überschritten.');
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI-Transkription fehlgeschlagen (${response.status}).${detail ? ` ${detail.slice(0, 500)}` : ''}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.words) || !payload.words.length) {
    throw new Error('OpenAI hat keine Wort-Timestamps zurückgegeben.');
  }

  return {
    format: 'visual-asset-hub-word-timings-input',
    version: 1,
    source: 'openai-whisper-1-word-timestamps',
    model: 'whisper-1',
    language: payload.language ?? language ?? null,
    generatedAt: new Date().toISOString(),
    audioSha256,
    audioBytes: stat.size,
    durationSeconds: Number(payload.duration) || Math.max(...payload.words.map((word) => Number(word.end) || 0)),
    transcript: payload.text ?? '',
    words: payload.words.map((word) => ({
      word: String(word.word ?? '').trim(),
      start: Number(word.start),
      end: Number(word.end)
    }))
  };
}

export const OPENAI_WORD_TIMING_LIMITS = Object.freeze({
  maxAudioBytes: MAX_AUDIO_BYTES,
  model: 'whisper-1',
  responseFormat: 'verbose_json',
  timestampGranularity: 'word'
});

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.webm') return 'audio/webm';
  if (ext === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
}
