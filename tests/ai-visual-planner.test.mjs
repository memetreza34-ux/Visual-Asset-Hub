import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAiImagePrompt,
  classifyVisualSource,
  createSceneCard,
  inferVisualForm,
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

test('Bild 01 ist Cover und normale Beats bekommen keine unnötigen Mehrfachvarianten', () => {
  const plan = planAiFirstVisuals({
    text: 'Unternehmen automatisieren Büroarbeit. Mitarbeiter lernen neue Fähigkeiten. Neue Berufe entstehen.',
    orientation: 'vertical',
    maxWordsPerBeat: 10
  });
  const primaryAi = plan.assets.filter((asset) => asset.source_mode === 'ai-generated' && asset.priority !== 'fallback');
  assert.ok(primaryAi.length >= 3);
  assert.equal(primaryAi[0].priority, 'cover');
  assert.equal(primaryAi[0].production_role, 'cover-and-opening-scene');
  assert.equal(primaryAi.filter((asset) => asset.beat_id === plan.beats[1].id).length, 1);
  assert.ok(primaryAi.every((asset) => asset.scene_card.prompt_qc_score >= 8));
});

test('Prompt nutzt konkrete dokumentarische Regeln statt generischer Hype-Wörter', () => {
  const prompt = buildAiImagePrompt({
    beatText: 'Ein Mitarbeiter sitzt allein in einem modernen Büro.',
    shot: 'medium',
    orientation: 'horizontal'
  });
  assert.match(prompt, /factual documentary/i);
  assert.match(prompt, /natural practical light/i);
  assert.match(prompt, /no visible text/i);
  assert.doesNotMatch(prompt, /ultra detailed|masterpiece|8k|bokeh/i);
});

test('längere Sprechertexte werden dicht in mehrere visuelle Beats zerlegt', () => {
  const beats = splitIntoVisualBeats(
    'Viele Unternehmen automatisieren heute einfache Aufgaben. Gleichzeitig verändern sich ganze Berufsbilder. Arbeitnehmer müssen neue Fähigkeiten lernen.',
    { maxWordsPerBeat: 10 }
  );
  assert.ok(beats.length >= 3);
  assert.equal(new Set(beats.map((beat) => beat.id)).size, beats.length);
  assert.ok(beats.every((beat) => beat.estimated_hold_seconds >= 3.5 && beat.estimated_hold_seconds <= 9));
});

test('reale Belege bleiben Real-Media und werden nicht als Story-KI-Bild nachgebaut', () => {
  const plan = planAiFirstVisuals({
    text: 'Zeige einen Screenshot der echten YouTube-Webseite.',
    maxWordsPerBeat: 16
  });
  const real = plan.assets.filter((asset) => asset.source_mode === 'stock-or-real');
  const storyAi = plan.assets.filter((asset) => asset.production_role === 'story-image');
  assert.equal(real.length, 1);
  assert.equal(real[0].asset_type, 'image');
  assert.equal(storyAi.length, 0);
  assert.equal(plan.assets[0].production_role, 'cover-and-opening-scene');
});

test('Visual Form wird aus der Aussage gewählt', () => {
  assert.equal(inferVisualForm('Im Vergleich ist Lösung A schneller als Lösung B.'), 'comparison');
  assert.equal(inferVisualForm('Dadurch führt der Fehler zu einem Ausfall.'), 'cause-effect');
  assert.equal(inferVisualForm('Zuerst startet die Pumpe, danach öffnet das Ventil.'), 'process-sequence');
});

test('Scene Card enthält Narration-first Felder und einen QC-Score', () => {
  const card = createSceneCard({
    beat: { text: 'Ein Techniker prüft eine Maschine.', estimated_hold_seconds: 4 },
    index: 1,
    orientation: 'horizontal',
    context: 'Industrie und Wartung'
  });
  assert.match(card.viewer_takeaway, /Techniker/);
  assert.ok(card.visual_purpose.length > 20);
  assert.ok(card.topic_anchor.length > 0);
  assert.ok(card.prompt_qc_score >= 8);
});
