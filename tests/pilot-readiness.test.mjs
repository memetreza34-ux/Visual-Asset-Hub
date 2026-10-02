import test from 'node:test';
import assert from 'node:assert/strict';
import { planAiFirstVisuals } from '../scripts/lib/ai-visual-planner.mjs';
import { buildFlowProduction } from '../scripts/lib/flow-production.mjs';
import {
  analyzePilotReadiness,
  applyPilotCoverEnhancements,
  buildCoverBrief
} from '../scripts/lib/pilot-readiness.mjs';

test('Cover-Brief nutzt Titel, Cover-Text und mehrere Story-Anker', () => {
  const plan = planAiFirstVisuals({
    text: 'Büros automatisieren Routinearbeit. Mitarbeiter lernen neue Fähigkeiten. Manche Jobs verändern sich komplett.',
    maxWordsPerBeat: 8
  });
  const brief = buildCoverBrief(plan, { title: 'Wie KI Arbeit verändert', coverText: 'WERDEN JOBS ERSETZT?' });
  assert.equal(brief.title, 'Wie KI Arbeit verändert');
  assert.equal(brief.cover_text, 'WERDEN JOBS ERSETZT?');
  assert.ok(brief.story_spine.length >= 2);
  assert.match(brief.rule, /whole video/i);
});

test('Pilot-Erweiterung setzt Cover-Hold auf 2 Sekunden und erweitert alle drei Cover-Prompts', () => {
  const plan = planAiFirstVisuals({
    text: 'KI verändert Büroarbeit. Arbeitnehmer lernen neue Fähigkeiten. Firmen automatisieren Routine. Neue Rollen entstehen.',
    maxWordsPerBeat: 8
  });
  const base = buildFlowProduction(plan, { title: 'KI Arbeit', coverText: 'JOBS IN GEFAHR?' });
  const result = applyPilotCoverEnhancements(base, plan, { title: 'KI Arbeit', coverText: 'JOBS IN GEFAHR?' });
  assert.equal(result.production_plan.images[0].planned_hold_seconds, 2);
  assert.equal(result.production_plan.cover_strategy.source, 'title+cover-text+whole-video-story-spine');
  assert.ok(result.generation_queue.stage_1_cover.jobs.every((job) => /WHOLE-VIDEO COVER BRIEF/i.test(job.prompt)));
});

test('2-Minuten-Pilot besteht mit dichter Planung und fällt bei zu wenigen Visuals durch', () => {
  const denseText = Array.from({ length: 32 }, (_, i) => `Punkt ${i + 1} verändert einen klaren Teil des Alltags.`).join(' ');
  const densePlan = planAiFirstVisuals({ text: denseText, maxWordsPerBeat: 8 });
  let denseProduction = buildFlowProduction(densePlan, { title: '32 Veränderungen', coverText: 'ALLES ÄNDERT SICH' });
  denseProduction = applyPilotCoverEnhancements(denseProduction, densePlan, { title: '32 Veränderungen', coverText: 'ALLES ÄNDERT SICH' });
  const dense = analyzePilotReadiness({ visualPlan: densePlan, productionPlan: denseProduction.production_plan, targetDurationSeconds: 120 });
  assert.equal(dense.status, 'ready-for-asset-pilot', dense.errors.join('\n'));
  assert.ok(dense.metrics.estimated_intro_visual_starts >= 4);

  const sparsePlan = planAiFirstVisuals({ text: 'Ein langer Gedanke bleibt stehen. Dann kommt ein zweiter Gedanke.', maxWordsPerBeat: 40 });
  let sparseProduction = buildFlowProduction(sparsePlan, { title: 'Zu wenig', coverText: 'ZU STATISCH' });
  sparseProduction = applyPilotCoverEnhancements(sparseProduction, sparsePlan, { title: 'Zu wenig', coverText: 'ZU STATISCH' });
  const sparse = analyzePilotReadiness({ visualPlan: sparsePlan, productionPlan: sparseProduction.production_plan, targetDurationSeconds: 120 });
  assert.equal(sparse.status, 'not-ready');
  assert.ok(sparse.errors.some((value) => /Bilddichte/i.test(value)));
});
