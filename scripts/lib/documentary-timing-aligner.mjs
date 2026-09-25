import { createHash } from 'node:crypto';

const WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

export function sha256Text(value) {
  return createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

export function tokenizeDocumentaryText(value) {
  const text = String(value ?? '');
  const words = [];
  for (const match of text.matchAll(WORD_RE)) {
    const raw = match[0];
    const normalized = normalizeWord(raw);
    if (!normalized) continue;
    words.push({
      index: words.length,
      raw,
      normalized,
      charStart: match.index ?? null,
      charEnd: (match.index ?? 0) + raw.length
    });
  }
  return words;
}

export function normalizeWord(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function normalizeWordTimings(input, { source = 'external-word-timestamps' } = {}) {
  const payload = Array.isArray(input) ? { words: input } : (input && typeof input === 'object' ? input : {});
  if (!Array.isArray(payload.words) || !payload.words.length) {
    throw new Error('Wort-Timings fehlen: erwartet wird ein JSON-Objekt mit words[].');
  }

  const words = payload.words.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Wort-Timing ${index + 1} ist ungültig.`);
    const word = String(entry.word ?? entry.text ?? '').trim();
    const normalized = normalizeWord(word);
    const start = number(entry.start ?? entry.startSeconds);
    const end = number(entry.end ?? entry.endSeconds);
    if (!word || !normalized) throw new Error(`Wort-Timing ${index + 1} enthält kein auswertbares Wort.`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
      throw new Error(`Wort-Timing ${index + 1} hat ungültige Start-/Endzeiten.`);
    }
    return { index, word, normalized, start: round(start, 4), end: round(end, 4) };
  });

  for (let index = 1; index < words.length; index += 1) {
    if (words[index].start < words[index - 1].start) {
      throw new Error(`Wort-Timings sind bei Wort ${index + 1} nicht chronologisch.`);
    }
    if (words[index].end < words[index - 1].end) {
      throw new Error(`Wort-Timings laufen bei Wort ${index + 1} rückwärts.`);
    }
  }

  return {
    format: 'visual-asset-hub-word-timings',
    version: 1,
    source: String(payload.source ?? source),
    language: payload.language ?? 'de',
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    durationSeconds: round(Math.max(...words.map((word) => word.end)), 4),
    words
  };
}

export function alignFinalScriptToTimings(script, timingPayload) {
  const scriptWords = tokenizeDocumentaryText(script);
  if (!scriptWords.length) throw new Error('Das finale Skript enthält keine Wörter.');
  const timings = normalizeWordTimings(timingPayload);

  if (scriptWords.length !== timings.words.length) {
    throw alignmentError(
      `Wortanzahl stimmt nicht überein: Skript ${scriptWords.length}, Timing-Quelle ${timings.words.length}.`,
      scriptWords,
      timings.words
    );
  }

  const alignedWords = [];
  for (let index = 0; index < scriptWords.length; index += 1) {
    const scriptWord = scriptWords[index];
    const timedWord = timings.words[index];
    if (scriptWord.normalized !== timedWord.normalized) {
      throw alignmentError(
        `Wort ${index + 1} stimmt nicht überein: Skript „${scriptWord.raw}“, Timing „${timedWord.word}“.`,
        scriptWords,
        timings.words,
        index
      );
    }
    alignedWords.push({
      index,
      word: scriptWord.raw,
      normalized: scriptWord.normalized,
      start: timedWord.start,
      end: timedWord.end
    });
  }

  return {
    ...timings,
    scriptSha256: sha256Text(String(script).trim()),
    alignment: {
      mode: 'strict-normalized-word-sequence',
      status: 'exact',
      scriptWordCount: scriptWords.length,
      timedWordCount: timings.words.length,
      matchedWords: scriptWords.length,
      coverage: 1
    },
    words: alignedWords
  };
}

export function anchorScenesToFinalScript(script, scenes = []) {
  if (!Array.isArray(scenes) || !scenes.length) throw new Error('Szenenplan enthält keine Szenen.');
  const scriptWords = tokenizeDocumentaryText(script);
  const anchored = [];
  let cursor = 0;

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
    const scene = scenes[sceneIndex];
    const sceneWords = tokenizeDocumentaryText(scene.originalText);
    if (!sceneWords.length) throw new Error(`Szene ${scene.sceneId ?? sceneIndex + 1} enthält keinen gesprochenen Text.`);
    const normalizedScene = sceneWords.map((word) => word.normalized);
    const start = findExactSequence(scriptWords, normalizedScene, cursor);
    if (start < 0) {
      throw new Error(`Szene ${scene.sceneId ?? sceneIndex + 1} konnte ab Skriptwort ${cursor + 1} nicht eindeutig im finalen Skript verankert werden.`);
    }
    if (start !== cursor) {
      const gap = scriptWords.slice(cursor, start).map((word) => word.raw).join(' ');
      throw new Error(`Zwischen Szenen ist unzugeordneter Skripttext vorhanden: „${gap}“. Phase 1 muss neu erzeugt werden.`);
    }
    const end = start + sceneWords.length - 1;
    const firstWords = scriptWords.slice(start, Math.min(end + 1, start + 5)).map((word) => word.raw).join(' ');
    anchored.push({
      ...scene,
      speechSection: scene.originalText,
      startPhrase: firstWords,
      endWord: scriptWords[end].raw,
      scriptWordStart: start,
      scriptWordEnd: end,
      scriptWordCount: sceneWords.length
    });
    cursor = end + 1;
  }

  if (cursor !== scriptWords.length) {
    const remainder = scriptWords.slice(cursor).map((word) => word.raw).join(' ');
    throw new Error(`Nach der letzten Szene bleibt unzugeordneter Skripttext: „${remainder}“. Phase 1 muss neu erzeugt werden.`);
  }

  return {
    scriptWordCount: scriptWords.length,
    scenes: anchored,
    coverage: 1
  };
}

export function applyWordTimingsToScenes(anchoredScenes = [], alignedTimingPayload) {
  if (!Array.isArray(anchoredScenes) || !anchoredScenes.length) throw new Error('Verankerte Szenen fehlen.');
  const words = alignedTimingPayload?.words;
  if (!Array.isArray(words) || !words.length) throw new Error('Ausgerichtete Wort-Timings fehlen.');

  return anchoredScenes.map((scene) => {
    const first = words[scene.scriptWordStart];
    const last = words[scene.scriptWordEnd];
    if (!first || !last) throw new Error(`Timing-Bereich für ${scene.sceneId} fehlt.`);
    const startSeconds = round(first.start, 4);
    const endSeconds = round(last.end, 4);
    if (!(endSeconds > startSeconds)) throw new Error(`Timing-Bereich für ${scene.sceneId} ist ungültig.`);
    return {
      ...scene,
      startSeconds,
      endSeconds,
      durationSeconds: round(endSeconds - startSeconds, 4),
      timingSource: 'exact-word-alignment'
    };
  });
}

function findExactSequence(scriptWords, normalizedScene, fromIndex) {
  const remaining = scriptWords.length - normalizedScene.length;
  for (let start = fromIndex; start <= remaining; start += 1) {
    let matches = true;
    for (let offset = 0; offset < normalizedScene.length; offset += 1) {
      if (scriptWords[start + offset].normalized !== normalizedScene[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return start;
  }
  return -1;
}

function alignmentError(message, scriptWords, timedWords, index = null) {
  const focus = index === null ? Math.min(scriptWords.length, timedWords.length) : index;
  const start = Math.max(0, focus - 3);
  const end = Math.min(Math.max(scriptWords.length, timedWords.length), focus + 4);
  const scriptContext = scriptWords.slice(start, end).map((word) => word.raw).join(' ');
  const timingContext = timedWords.slice(start, end).map((word) => word.word).join(' ');
  return new Error(`${message} Skript-Kontext: „${scriptContext}“. Timing-Kontext: „${timingContext}“. Keine Zeiten wurden geraten.`);
}

function number(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  return Number.NaN;
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}
