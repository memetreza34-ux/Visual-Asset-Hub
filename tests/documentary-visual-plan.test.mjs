import assert from 'node:assert/strict';
import test from 'node:test';
import { createDocumentaryVisualPlan, documentaryProviderOrder, documentaryQueries, rankDocumentaryCandidates } from '../scripts/documentary-visual-plan.mjs';

test('Doku-Plan nutzt standardmäßig horizontal und gemischte Medien', () => {
  const plan = createDocumentaryVisualPlan({
    title: 'Tschernobyl',
    script: 'Am 26. April 1986 explodierte Reaktor vier in Tschernobyl.'
  });
  assert.equal(plan.mode, 'documentary');
  assert.equal(plan.settings.orientation, 'horizontal');
  assert.equal(plan.settings.mediaPreference, 'mixed');
  assert.ok(plan.scenes.length >= 1);
  assert.ok(plan.scenes.every((scene) => scene.documentary?.providerPriority?.length));
});

test('historische Szene erhält Archiv-Suchrichtungen', () => {
  const scene = {
    originalText: 'Am 26. April 1986 explodierte Reaktor vier in Tschernobyl.',
    visualIntentType: 'history',
    entities: ['Tschernobyl', '1986'],
    concepts: ['reaktor', 'explosion'],
    queries: ['Chernobyl reactor']
  };
  const queries = documentaryQueries(scene);
  assert.ok(queries.some((query) => /historical archive|archival footage|historical photo/i.test(query)));
  assert.ok(queries.some((query) => /1986/.test(query)));
});

test('historische Szenen priorisieren Wissensquellen', () => {
  const scene = { originalText: 'Historische Aufnahmen aus Berlin 1989.', visualIntentType: 'history', preferredMediaType: 'photo' };
  const order = documentaryProviderOrder(scene, ['pexels', 'pixabay', 'wikimedia', 'openverse']);
  assert.deepEqual(order.slice(0, 2), ['wikimedia', 'openverse']);
});

test('Doku-Ranking bevorzugt inhaltlich und quellenmäßig passenden Treffer', () => {
  const scene = {
    originalText: 'Am 26. April 1986 explodierte Reaktor vier in Tschernobyl.',
    visualIntentType: 'history',
    entities: ['Tschernobyl', '1986'],
    concepts: ['reaktor', 'explosion']
  };
  const ranked = rankDocumentaryCandidates(scene, [
    { provider: 'pexels', title: 'generic nuclear power plant', query: 'nuclear plant', technicalFit: 95, reusedElsewhere: false },
    { provider: 'wikimedia', title: 'Tschernobyl reactor 1986 historical archive', query: 'Tschernobyl 1986', technicalFit: 70, reusedElsewhere: false }
  ]);
  assert.equal(ranked[0].provider, 'wikimedia');
  assert.ok(ranked[0].documentaryScore.score > ranked[1].documentaryScore.score);
});
