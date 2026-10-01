import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiImagePrompt,
  classifyVisualSource,
  planAiFirstVisuals,
  splitIntoVisualBeats
} from '../scripts/lib/ai-visual-planner.mjs';

test('normale erklärende Szene wird konsequent als KI-Bild geplant', () => {
  const decision = classifyVisualSource('Ein Büroangestellter arbeitet konzentriert an seinem Computer.');
  assert.equal(decision.mode, 'ai-first');
  assert.equal(decision.preferredAsset, 'ai-image');
});

test('Original-Screenshot wird nicht durch ein erfundenes KI-Bild ersetzt', () => {
  const decision = classifyVisualSource('Zeige einen Screenshot der echten YouTube-Webseite.');
  assert.equal(decision.mode, 'real-first');
  assert.equal(decision.preferredAsset, 'real-image');
  assert.equal(decision.aiAllowed, false);
});

test('starke reale Bewegung bevorzugt B-Roll und erlaubt KI-Fallback', () => {
  const decision = classifyVisualSource('Das Fließband läuft und die Maschine arbeitet in voller Produktion.');
  assert.equal(decision.mode, 'real-first');
  assert.equal(decision.preferredAsset, 'real-video');
  assert.equal(decision.aiAllowed, true);
});

test('erzeugt mehrere unterschiedliche KI-Shots pro Visual Beat', () => {
  const plan = planAiFirstVisuals({
    text: 'Immer mehr Unternehmen automatisieren Büroarbeit mit künstlicher Intelligenz.',
    orientation: 'vertical',
    imagesPerBeat: 4
  });
  assert.equal(plan.summary.beats, 1);
  assert.equal(plan.summary.ai_images, 4);
  assert.equal(plan.summary.real_or_stock_assets, 0);
  assert.equal(plan.summary.ai_share_percent, 100);
  assert.deepEqual(plan.assets.map((asset) => asset.shot), ['wide', 'medium', 'close-up', 'detail']);
  assert.ok(plan.assets.every((asset) => asset.orientation === 'vertical'));
});

test('Prompt erzwingt natürlichen dokumentarischen Look statt typischer KI-Optik', () => {
  const prompt = buildAiImagePrompt({
    beatText: 'Ein Mitarbeiter sitzt allein in einem modernen Büro.',
    shot: 'medium',
    orientation: 'horizontal'
  });
  assert.match(prompt, /photorealistic documentary photography/i);
  assert.match(prompt, /natural practical lighting/i);
  assert.match(prompt, /no text/i);
  assert.match(prompt, /no sci-fi holograms/i);
  assert.match(prompt, /high-quality factual documentary/i);
});

test('längere Sprechertexte werden in mehrere visuelle Beats zerlegt', () => {
  const beats = splitIntoVisualBeats(
    'Viele Unternehmen automatisieren heute einfache Aufgaben. Gleichzeitig verändern sich ganze Berufsbilder. Arbeitnehmer müssen neue Fähigkeiten lernen.',
    { maxWordsPerBeat: 12 }
  );
  assert.ok(beats.length >= 3);
  assert.equal(new Set(beats.map((beat) => beat.id)).size, beats.length);
});

test('reale Belege bleiben in der Real-Queue statt künstlich nachgebaut zu werden', () => {
  const plan = planAiFirstVisuals({
    text: 'Zeige einen Screenshot der echten YouTube-Webseite.',
    imagesPerBeat: 5
  });
  assert.equal(plan.summary.ai_images, 0);
  assert.equal(plan.summary.real_or_stock_assets, 1);
  assert.equal(plan.assets[0].source_mode, 'stock-or-real');
  assert.equal(plan.assets[0].asset_type, 'image');
});
