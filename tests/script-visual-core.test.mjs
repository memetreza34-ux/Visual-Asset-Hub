import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeVisualIntent, createScriptVisualPlan, generateVisualQueries, inferChannel, segmentScript } from '../scripts/script-visual-core.mjs';

test('Script Visual Finder verändert den gelieferten Skripttext nicht', () => {
  const script = 'Bis 2035 könnten KI-Roboter unseren Alltag verändern. In Fabriken übernehmen Roboter repetitive Aufgaben.';
  const plan = createScriptVisualPlan({ script, channel: 'auto', segmentation: 'auto' });
  assert.equal(plan.script, script);
  assert.equal(plan.scriptSha256.length, 64);
  assert.ok(plan.scenes.length >= 2);
  assert.equal(plan.scenes.map((scene) => scene.originalText).join(' '), script);
});

test('Auto, Satz- und Absatzmodus erzeugen stabile visuelle Einheiten', () => {
  const script = 'Erster Satz über Robotik. Zweiter Satz über Fabriken.\n\nDritter Absatz über Medizinrobotik.';
  assert.equal(segmentScript(script, 'sentence').length, 3);
  assert.equal(segmentScript(script, 'paragraph').length, 2);
  assert.ok(segmentScript(script, 'auto').length >= 3);
});

test('lange Sätze werden in kleinere visuelle Einheiten geteilt', () => {
  const script = 'Tesla entwickelt humanoide Roboter, die zukünftig in großen Fabriken schwere Aufgaben übernehmen, während weitere Systeme später in Haushalten helfen und dort mit Menschen im Alltag zusammenarbeiten könnten.';
  const units = segmentScript(script, 'auto');
  assert.ok(units.length >= 2);
  assert.ok(units.every((unit) => unit.length > 5));
});

test('KI-Roboter-Skript wird automatisch dem KI-Kontext zugeordnet', () => {
  assert.equal(inferChannel('KI und humanoide Roboter verändern die Zukunft der Arbeit.'), 'ai');
  assert.equal(inferChannel('RCD, Spannung und Transformator in einer elektrischen Anlage.'), 'electro');
  assert.equal(inferChannel('UFC MMA Kampf und Boxtraining im Ring.'), 'combat-sports');
});

test('visuelle Analyse unterscheidet Technik, Ort, Historie und abstrakte Aussagen', () => {
  assert.equal(analyzeVisualIntent('Der RCD überwacht den Fehlerstrom in der Anlage.').intent, 'technology');
  assert.equal(analyzeVisualIntent('Berlin ist eine Stadt mit vielen bekannten Gebäuden.').intent, 'place');
  assert.equal(analyzeVisualIntent('Historische Aufnahmen zeigen die Entwicklung im Jahr 1989.').intent, 'history');
  assert.equal(analyzeVisualIntent('Diese Entwicklung könnte die Zukunft stark verändern.').symbolic, true);
});

test('jede Szene erhält mehrere konkrete Visual-Queries', () => {
  const analysis = analyzeVisualIntent('In Fabriken übernehmen KI-Roboter repetitive Aufgaben.');
  const queries = generateVisualQueries('In Fabriken übernehmen KI-Roboter repetitive Aufgaben.', analysis, 'max');
  assert.ok(queries.length >= 3);
  assert.ok(new Set(queries).size === queries.length);
  assert.ok(queries.some((query) => /robot|factory|b roll|process/i.test(query)));
});

test('Projekt unterstützt lange Skripte bis zur vorgesehenen Szenengrenze', () => {
  const sentence = 'Humanoide Roboter helfen Menschen bei einer klar beschriebenen Aufgabe.';
  const script = Array.from({ length: 80 }, (_, index) => `${index + 1}. ${sentence}`).join('\n');
  const plan = createScriptVisualPlan({ script, segmentation: 'sentence', depth: 'quick' });
  assert.equal(plan.scenes.length, 80);
  assert.equal(plan.scenes.at(-1).sequence, 80);
  assert.ok(plan.settings.durationSeconds > 60);
});

test('Allgemeiner Modus bleibt außerhalb der vier Ausbau-720-Kanäle möglich', () => {
  const plan = createScriptVisualPlan({ script: 'Ein Dokumentarfilm erklärt einen ungewöhnlichen kulturellen Trend in einer Stadt.', channel: 'general' });
  assert.equal(plan.channel, 'general');
  assert.ok(plan.scenes.every((scene) => scene.category));
});
