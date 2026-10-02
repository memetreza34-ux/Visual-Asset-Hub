import test from 'node:test';
import assert from 'node:assert/strict';
import { inferEssentialVisibleText, planAiFirstVisuals } from '../scripts/lib/ai-visual-planner.mjs';
import {
  buildFlowProduction,
  buildStage2AfterCoverSelection,
  compileScenePrompt,
  defaultStyleLock,
  defaultWorldLock
} from '../scripts/lib/flow-production.mjs';

test('Flow Production erzwingt drei verwandte Cover-Kandidaten und stoppt vor Bild 02', () => {
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
  assert.match(result.generation_queue.stage_1_cover.shared_identity_rule, /same visual world/i);
  assert.deepEqual(result.generation_queue.stage_1_cover.jobs.map((job) => job.variant), ['A', 'B', 'C']);
  assert.equal(result.production_plan.cover_image_number, 1);
  assert.equal(result.production_plan.cover_selection_required, true);
});

test('Ausgewähltes Cover entsperrt Stage 2 und wird Referenz für jedes spätere KI-Bild', () => {
  const plan = planAiFirstVisuals({
    text: 'Ein Mitarbeiter arbeitet im Büro. Danach lernt er neue digitale Fähigkeiten. Später verändert sich sein Arbeitsplatz.',
    maxWordsPerBeat: 8
  });
  const compiled = buildFlowProduction(plan, {
    title: 'Arbeit im Wandel',
    coverText: 'ARBEIT IM WANDEL'
  });
  const stage2 = buildStage2AfterCoverSelection(compiled.production_plan, {
    candidate: 'B',
    reference: 'Bild 01.png'
  });
  assert.equal(stage2.cover_selection.selected_candidate, 'B');
  assert.equal(stage2.cover_selection.selected_reference, 'Bild 01.png');
  assert.equal(stage2.stage_2_queue.status, 'unlocked-after-user-cover-selection');
  assert.ok(stage2.stage_2_queue.jobs.every((job) => job.selected_cover_reference === 'Bild 01.png'));
  assert.ok(stage2.stage_2_queue.jobs.every((job) => /soft style\/world\/quality reference/i.test(job.prompt)));
  assert.match(stage2.stage_2_prompt, /must still be individually composed/i);
});

test('Cover-Referenz hält Stil zusammen, verbietet aber Kompositionsklone', () => {
  const plan = planAiFirstVisuals({ text: 'Ein Techniker prüft eine Maschine. Danach dokumentiert er das Ergebnis.', maxWordsPerBeat: 8 });
  const result = buildFlowProduction(plan, { title: 'Technik', coverText: 'MASCHINE PRÜFEN' });
  const policy = result.production_plan.cover_reference_policy;
  assert.ok(policy.preserve.some((item) => /color family/i.test(item)));
  assert.ok(policy.vary.some((item) => /composition/i.test(item)));
  assert.ok(policy.never_copy.some((item) => /cover layout/i.test(item)));
  assert.match(result.master_prompt, /soft visual identity anchor, not a layout template/i);
});

test('Story-Bilder bleiben textfrei, außer kurzer exakter Text ist im Sprechertext wirklich vorhanden', () => {
  assert.deepEqual(inferEssentialVisibleText('Im Jahr 1955 beginnt die Geschichte.'), ['1955']);
  assert.deepEqual(inferEssentialVisibleText('Die Quote steigt auf 37,5 %.'), ['37,5%']);
  assert.deepEqual(inferEssentialVisibleText('Ein Mitarbeiter arbeitet konzentriert im Büro.'), []);

  const plan = planAiFirstVisuals({
    text: 'Ein Mitarbeiter arbeitet konzentriert im Büro. Im Jahr 1955 beginnt ein neues Kapitel.',
    maxWordsPerBeat: 8
  });
  const story = plan.assets.find((asset) => asset.source_mode === 'ai-generated' && asset.priority === 'primary' && asset.scene_card?.text_policy?.mode === 'essential-only');
  assert.ok(story);
  assert.deepEqual(story.scene_card.text_policy.exact_text, ['1955']);
  const result = buildFlowProduction(plan, { title: 'Geschichte', coverText: 'DAS NEUE KAPITEL' });
  const image = result.production_plan.images.find((item) => item.text_policy?.mode === 'essential-only');
  assert.match(image.compiled_prompt, /Use only these exact literal items/i);
  assert.match(image.compiled_prompt, /1955/);
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
