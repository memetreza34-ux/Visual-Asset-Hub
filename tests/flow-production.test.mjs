import test from 'node:test';
import assert from 'node:assert/strict';
import { planAiFirstVisuals } from '../scripts/lib/ai-visual-planner.mjs';
import {
  buildFlowProduction,
  compileScenePrompt,
  defaultStyleLock,
  defaultWorldLock
} from '../scripts/lib/flow-production.mjs';

test('Flow Production erzwingt drei Cover-Kandidaten und stoppt vor Bild 02', () => {
  const plan = planAiFirstVisuals({
    text: 'Künstliche Intelligenz verändert Büroarbeit. Mitarbeiter lernen neue Aufgaben. Unternehmen automatisieren Routineprozesse.',
    maxWordsPerBeat: 10
  });
  const result = buildFlowProduction(plan, {
    title: 'KI und Büroarbeit',
    coverText: 'KI ERSETZT BÜROJOBS?'
  });
  assert.equal(result.generation_queue.stage_1_cover.jobs.length, 3);
  assert.equal(result.generation_queue.stage_1_cover.stop_after_stage, true);
  assert.match(result.generation_queue.stage_1_cover.completion_gate, /explicitly selects/i);
  assert.equal(result.production_plan.cover_image_number, 1);
});

test('Bild 01 enthält Covertext, spätere Bilder verbieten Text', () => {
  const plan = planAiFirstVisuals({
    text: 'Ein Mitarbeiter arbeitet im Büro. Danach lernt er neue digitale Fähigkeiten.',
    maxWordsPerBeat: 8
  });
  const result = buildFlowProduction(plan, {
    title: 'Arbeit im Wandel',
    coverText: 'ARBEIT IM WANDEL'
  });
  assert.match(result.production_plan.images[0].compiled_prompt, /ARBEIT IM WANDEL/);
  if (result.production_plan.images[1]) {
    assert.match(result.production_plan.images[1].compiled_prompt, /No visible text/i);
  }
});

test('Stage 2 arbeitet strikt einzeln und gruppiert nur für QC in Fünferblöcke', () => {
  const plan = planAiFirstVisuals({
    text: 'Erster Punkt verändert den Alltag. Zweiter Punkt verändert die Arbeit. Dritter Punkt verändert die Schule. Vierter Punkt verändert den Verkehr. Fünfter Punkt verändert die Industrie. Sechster Punkt verändert den Handel. Siebter Punkt verändert die Kommunikation.',
    maxWordsPerBeat: 8
  });
  const result = buildFlowProduction(plan, {
    title: 'Sieben Veränderungen',
    coverText: 'ALLES VERÄNDERT SICH',
    blockSize: 5
  });
  assert.ok(result.production_plan.production_blocks.every((block) => block.images.length <= 5));
  assert.ok(result.generation_queue.stage_2_story.jobs.every((job) => /exactly one image/i.test(job.rule)));
  assert.match(result.master_prompt, /Never run a parallel image batch/i);
  assert.match(result.master_prompt, /five-image QC blocks only as checkpoints/i);
});

test('Style und World Lock bleiben universal und nicht kanalgebunden', () => {
  const plan = planAiFirstVisuals({ text: 'Ein Techniker prüft eine Maschine.' });
  const style = defaultStyleLock();
  const world = defaultWorldLock(plan);
  assert.equal(style.status, 'READY');
  assert.match(style.style_id, /documentary/);
  assert.doesNotMatch(style.master_style_prompt, /stickman|finanzneo/i);
  assert.equal(world.status, 'READY');
});

test('Scene Prompt blockiert unvollständige oder schwache Scene Cards', () => {
  assert.throws(() => compileScenePrompt({ prompt_qc_score: 9 }, { styleLock: defaultStyleLock() }), /fehlt/);
});
