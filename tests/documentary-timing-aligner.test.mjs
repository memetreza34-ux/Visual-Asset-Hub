import assert from 'node:assert/strict';
import test from 'node:test';
import {
  alignFinalScriptToTimings,
  anchorScenesToFinalScript,
  applyWordTimingsToScenes
} from '../scripts/lib/documentary-timing-aligner.mjs';

test('aligns punctuation and casing but preserves exact word sequence', () => {
  const script = 'Berlin fiel nicht. Es veränderte sich.';
  const aligned = alignFinalScriptToTimings(script, {
    source: 'test',
    words: [
      { word: 'berlin', start: 0.1, end: 0.4 },
      { word: 'fiel', start: 0.4, end: 0.7 },
      { word: 'nicht', start: 0.7, end: 1.0 },
      { word: 'es', start: 1.1, end: 1.3 },
      { word: 'veränderte', start: 1.3, end: 1.8 },
      { word: 'sich', start: 1.8, end: 2.0 }
    ]
  });
  assert.equal(aligned.alignment.status, 'exact');
  assert.equal(aligned.words.length, 6);
  assert.equal(aligned.words[0].word, 'Berlin');
  assert.equal(aligned.words[5].end, 2);
});

test('fails instead of guessing when a timed word differs', () => {
  assert.throws(() => alignFinalScriptToTimings('Das ist richtig.', {
    words: [
      { word: 'Das', start: 0, end: 0.2 },
      { word: 'war', start: 0.2, end: 0.4 },
      { word: 'richtig', start: 0.4, end: 0.8 }
    ]
  }), /Keine Zeiten wurden geraten/);
});

test('anchors semantic scenes with full script coverage and maps exact times', () => {
  const script = 'Erste Szene beginnt hier. Zweite Szene endet dort.';
  const anchored = anchorScenesToFinalScript(script, [
    { sceneId: 'SCENE-001', sequence: 1, originalText: 'Erste Szene beginnt hier.' },
    { sceneId: 'SCENE-002', sequence: 2, originalText: 'Zweite Szene endet dort.' }
  ]);
  assert.equal(anchored.coverage, 1);
  assert.equal(anchored.scenes[0].scriptWordStart, 0);
  assert.equal(anchored.scenes[0].scriptWordEnd, 3);
  assert.equal(anchored.scenes[1].scriptWordStart, 4);

  const aligned = alignFinalScriptToTimings(script, {
    words: [
      { word: 'Erste', start: 0.0, end: 0.3 },
      { word: 'Szene', start: 0.3, end: 0.6 },
      { word: 'beginnt', start: 0.6, end: 0.9 },
      { word: 'hier', start: 0.9, end: 1.2 },
      { word: 'Zweite', start: 1.3, end: 1.6 },
      { word: 'Szene', start: 1.6, end: 1.9 },
      { word: 'endet', start: 1.9, end: 2.2 },
      { word: 'dort', start: 2.2, end: 2.5 }
    ]
  });
  const scenes = applyWordTimingsToScenes(anchored.scenes, aligned);
  assert.equal(scenes[0].startSeconds, 0);
  assert.equal(scenes[0].endSeconds, 1.2);
  assert.equal(scenes[1].startSeconds, 1.3);
  assert.equal(scenes[1].endSeconds, 2.5);
});

test('rejects gaps between semantic scenes', () => {
  assert.throws(() => anchorScenesToFinalScript('Eins zwei drei vier.', [
    { sceneId: 'SCENE-001', sequence: 1, originalText: 'Eins zwei' },
    { sceneId: 'SCENE-002', sequence: 2, originalText: 'vier' }
  ]), /unzugeordneter Skripttext/);
});
