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
  assert.ok(plan.scenes.every((scene) => scene.searchRound === 0 && scene.searchedAt === null));
});

test('nummerierte und Aufzählungs-Zeilen bleiben im Szenen-Originaltext erhalten', () => {
  const script = '1. Humanoide Roboter arbeiten in Fabriken.\n2. Sie könnten später auch im Alltag helfen.\n- Medizinrobotik unterstützt Ärzte.';
  const units = segmentScript(script, 'sentence');
  assert.deepEqual(units, [
    '1. Humanoide Roboter arbeiten in Fabriken.',
    '2. Sie könnten später auch im Alltag helfen.',
    '- Medizinrobotik unterstützt Ärzte.'
  ]);
  const plan = createScriptVisualPlan({ script, segmentation: 'sentence' });
  assert.equal(plan.script, script);
  assert.deepEqual(plan.scenes.map((scene) => scene.originalText), units);
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
  assert.equal(analyzeVisualIntent('Conor McGregor besiegte José Aldo 2015.').intent, 'action');
});

test('jede Szene erhält mehrere konkrete Visual-Queries', () => {
  const analysis = analyzeVisualIntent('In Fabriken übernehmen KI-Roboter repetitive Aufgaben.');
  const queries = generateVisualQueries('In Fabriken übernehmen KI-Roboter repetitive Aufgaben.', analysis, 'max');
  assert.ok(queries.length >= 3);
  assert.ok(new Set(queries).size === queries.length);
  assert.ok(queries.some((query) => /robot|factory|b roll|process/i.test(query)));
});

test('Query-Engine behält konkrete Personen und erzeugt unterschiedliche Suchachsen', () => {
  const analysis = {
    intent: 'action',
    entities: ['Conor McGregor', 'José Aldo', '2015'],
    concepts: ['kampf', 'arena', 'sieg'],
    symbolic: false
  };
  const queries = generateVisualQueries('Conor McGregor besiegte José Aldo 2015 in der Arena.', analysis, 'max');
  assert.equal(queries.length, 5);
  assert.ok(queries.some((query) => query.includes('Conor McGregor')));
  assert.ok(queries.some((query) => query.includes('José Aldo')));
  assert.ok(queries.some((query) => /fight|action b roll|dynamic footage/i.test(query)));
  assert.ok(new Set(queries).size === queries.length);
});

test('Query-Engine übersetzt häufige allgemeine Motive providerfreundlich', () => {
  const analysis = {
    intent: 'technology',
    entities: [],
    concepts: ['roboter', 'fabrik', 'alltag'],
    symbolic: false
  };
  const queries = generateVisualQueries('Roboter arbeiten in Fabriken und verändern den Alltag.', analysis, 'max');
  assert.ok(queries.some((query) => /robot/i.test(query)));
  assert.ok(queries.some((query) => /factory/i.test(query)));
  assert.ok(queries.some((query) => /daily life/i.test(query)));
  assert.ok(queries.some((query) => /technology b roll|device close up|technology in use/i.test(query)));
});

test('abstrakte Aussagen erhalten einen eigenen symbolischen B-Roll-Fallback', () => {
  const analysis = {
    intent: 'abstract',
    entities: [],
    concepts: ['zukunft', 'arbeit', 'risiko'],
    symbolic: true
  };
  const queries = generateVisualQueries('Die Zukunft der Arbeit bringt Chancen und Risiken.', analysis, 'max');
  assert.ok(queries.some((query) => /symbolic b roll/i.test(query)));
  assert.ok(queries.some((query) => /future/i.test(query)));
  assert.ok(queries.some((query) => /work/i.test(query)));
});

test('kontextabhängige Folgesätze erben die vorherige Entität nur für die Visualsuche', () => {
  const script = 'OpenAI entwickelt humanoide Roboter. Sie sollen später in Fabriken arbeiten.';
  const plan = createScriptVisualPlan({ script, segmentation: 'sentence', depth: 'max' });
  assert.equal(plan.scenes.length, 2);
  assert.equal(plan.scenes[0].contextInherited, false);
  assert.equal(plan.scenes[1].originalText, 'Sie sollen später in Fabriken arbeiten.');
  assert.equal(plan.scenes[1].contextInherited, true);
  assert.ok(plan.scenes[1].contextEntities.some((value) => /OpenAI/i.test(value)));
  assert.ok(plan.scenes[1].queries.some((query) => /OpenAI/i.test(query)));
  assert.equal(plan.script, script);
  assert.equal(plan.summary.contextInherited, 1);
});

test('neuer expliziter Szenenbezug übernimmt nicht unnötig die vorherige Entität', () => {
  const script = 'OpenAI entwickelt humanoide Roboter. Tesla entwickelt ein eigenes Robotersystem.';
  const plan = createScriptVisualPlan({ script, segmentation: 'sentence', depth: 'max' });
  assert.equal(plan.scenes.length, 2);
  assert.equal(plan.scenes[1].contextInherited, false);
  assert.ok(plan.scenes[1].entities.some((value) => /Tesla/i.test(value)));
  assert.ok(plan.scenes[1].queries.some((query) => /Tesla/i.test(query)));
});

test('Ortsbezug mit Dort kann Kontext aus der vorherigen Szene für die Suche übernehmen', () => {
  const script = 'Berlin baut neue Rechenzentren. Dort entstehen große Serverhallen.';
  const plan = createScriptVisualPlan({ script, segmentation: 'sentence', depth: 'max' });
  assert.equal(plan.scenes[1].contextInherited, true);
  assert.ok(plan.scenes[1].contextEntities.some((value) => /Berlin/i.test(value)));
  assert.ok(plan.scenes[1].queries.some((query) => /Berlin/i.test(query)));
  assert.equal(plan.scenes[1].originalText, 'Dort entstehen große Serverhallen.');
});

test('mehrere Rückbezugssätze behalten den relevanten Hauptkontext über die Szenenkette', () => {
  const script = 'OpenAI entwickelt humanoide Roboter. Sie arbeiten später in großen Fabriken. Dort übernehmen sie die Montage.';
  const plan = createScriptVisualPlan({ script, segmentation: 'sentence', depth: 'max' });
  assert.equal(plan.scenes.length, 3);
  assert.equal(plan.scenes[1].contextInherited, true);
  assert.equal(plan.scenes[2].contextInherited, true);
  assert.ok(plan.scenes[1].contextEntities.some((value) => /OpenAI/i.test(value)));
  assert.ok(plan.scenes[2].contextEntities.some((value) => /OpenAI/i.test(value)));
  assert.ok(plan.scenes[2].queries.some((query) => /OpenAI/i.test(query)));
  assert.equal(plan.scenes[2].originalText, 'Dort übernehmen sie die Montage.');
});

test('Auto-Modus verdichtet sehr viele kurze Sätze auf höchstens 120 visuelle Einheiten', () => {
  const sentence = 'Humanoide Roboter helfen später im Alltag.';
  const script = Array.from({ length: 150 }, (_, index) => `${index + 1}. ${sentence}`).join('\n');
  const plan = createScriptVisualPlan({ script, segmentation: 'auto', depth: 'quick' });
  assert.equal(plan.script, script);
  assert.equal(plan.scenes.length, 120);
  assert.ok(plan.scenes.some((scene) => (scene.originalText.match(/Humanoide Roboter/g) ?? []).length >= 2));
  assert.ok(plan.settings.durationSeconds > 60);
});

test('Projekt unterstützt lange Skripte bis zur vorgesehenen Szenengrenze', () => {
  const sentence = 'Humanoide Roboter helfen Menschen bei einer klar beschriebenen Aufgabe.';
  const script = Array.from({ length: 80 }, (_, index) => `${index + 1}. ${sentence}`).join('\n');
  const plan = createScriptVisualPlan({ script, segmentation: 'sentence', depth: 'quick' });
  assert.equal(plan.scenes.length, 80);
  assert.equal(plan.scenes[0].originalText, `1. ${sentence}`);
  assert.equal(plan.scenes.at(-1).originalText, `80. ${sentence}`);
  assert.equal(plan.scenes.at(-1).sequence, 80);
  assert.ok(plan.settings.durationSeconds > 60);
});

test('Allgemeiner Modus bleibt außerhalb der vier Ausbau-720-Kanäle möglich', () => {
  const plan = createScriptVisualPlan({ script: 'Ein Dokumentarfilm erklärt einen ungewöhnlichen kulturellen Trend in einer Stadt.', channel: 'general' });
  assert.equal(plan.channel, 'general');
  assert.ok(plan.scenes.every((scene) => scene.category));
});
