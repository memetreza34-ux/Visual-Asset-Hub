import assert from 'node:assert/strict';
import test from 'node:test';
import { documentaryCandidateScore, documentaryEvidenceLevel, enrichDocumentaryScene, routeDocumentaryProviders } from '../scripts/lib/documentary-source-router.mjs';

test('historische konkrete Szene priorisiert Wissensquellen', () => {
  const scene = {
    originalText: 'Am 26. April 1986 explodierte Reaktor vier in Tschernobyl.',
    visualIntentType: 'event',
    preferredMediaType: 'photo',
    symbolic: false
  };
  assert.equal(documentaryEvidenceLevel(scene), 'exact-event-or-era');
  assert.deepEqual(routeDocumentaryProviders(scene).slice(0, 2), ['wikimedia', 'openverse']);
});

test('symbolische B-Roll priorisiert Stockquellen', () => {
  const scene = {
    originalText: 'Die Unsicherheit wächst in vielen Unternehmen.',
    visualIntentType: 'abstract',
    preferredMediaType: 'video',
    symbolic: true
  };
  assert.equal(documentaryEvidenceLevel(scene), 'symbolic');
  assert.deepEqual(routeDocumentaryProviders(scene).slice(0, 2), ['pexels', 'pixabay']);
});

test('konkreter historischer Treffer schlägt generisches Stockmaterial', () => {
  const scene = {
    originalText: '1986 explodierte Reaktor vier in Tschernobyl.',
    visualIntent: 'Historisches Material von Reaktor vier',
    visualIntentType: 'event',
    entities: ['Tschernobyl', '1986'],
    symbolic: false
  };
  const archive = documentaryCandidateScore(scene, {
    provider: 'wikimedia',
    title: 'Chernobyl reactor 4 after the 1986 disaster',
    query: 'Chernobyl reactor 4 1986',
    technicalFit: 82,
    reusedElsewhere: false
  });
  const stock = documentaryCandidateScore(scene, {
    provider: 'pexels',
    title: 'Modern nuclear power plant aerial footage',
    query: 'nuclear power plant',
    technicalFit: 96,
    reusedElsewhere: false
  });
  assert.ok(archive.score > stock.score);
});

test('enrichDocumentaryScene ergänzt Evidence-Level und Provider-Reihenfolge', () => {
  const result = enrichDocumentaryScene({
    originalText: 'Historische Aufnahmen zeigen Berlin im Jahr 1989.',
    visualIntentType: 'history',
    preferredMediaType: 'photo'
  });
  assert.equal(result.documentary.evidenceLevel, 'exact-event-or-era');
  assert.equal(result.documentary.providerPriority[0], 'wikimedia');
});
