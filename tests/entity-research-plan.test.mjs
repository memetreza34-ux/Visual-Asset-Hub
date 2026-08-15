import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEntityResearchPlan, extractScriptTerms } from '../scripts/entity-research-plan.mjs';
import { buildTasks, validateEntityPayload } from '../scripts/local-entity-api.mjs';

test('Kampfsport-Themenrecherche baut Conor-artige Reel-Bereiche automatisch auf', () => {
  const plan = buildEntityResearchPlan({ topic: 'Conor McGregor', channel: 'combat-sports', depth: 'deep' });
  assert.equal(plan.topic, 'Conor McGregor');
  assert.equal(plan.topicSlug, 'conor-mcgregor');
  assert.equal(plan.channel, 'combat-sports');
  assert.deepEqual(plan.facets.slice(0, 8).map((item) => item.id), ['overview', 'training', 'fight', 'press', 'weigh-in', 'walkout', 'portrait', 'celebration']);
  assert.equal(plan.facets.find((item) => item.id === 'training').query, 'Conor McGregor training gym');
  assert.equal(plan.facets.find((item) => item.id === 'portrait').preferredMedia, 'photo');
});

test('Reel-Skript ergänzt Gegner, Event und Jahr als zusätzliche Recherchebegriffe', () => {
  const script = '2018 kämpfte Conor McGregor gegen Khabib Nurmagomedov bei UFC 229. Später sprach Conor McGregor über den Kampf.';
  const terms = extractScriptTerms(script, 'Conor McGregor');
  assert.ok(terms.some((item) => item.includes('Khabib Nurmagomedov')));
  assert.ok(terms.some((item) => item.includes('UFC 229')));
  assert.ok(terms.includes('2018'));
  const plan = buildEntityResearchPlan({ topic: 'Conor McGregor', channel: 'combat-sports', script, depth: 'deep' });
  assert.ok(plan.facets.some((item) => item.origin === 'script' && item.query.includes('Khabib Nurmagomedov')));
});

test('Quick-Recherche bleibt klein und Deep-Recherche bleibt begrenzt', () => {
  const quick = buildEntityResearchPlan({ topic: 'Test Person', channel: 'combat-sports', depth: 'quick' });
  assert.ok(quick.facets.length <= 6);
  const deep = buildEntityResearchPlan({ topic: 'Test Person', channel: 'combat-sports', script: 'Test Person gegen Max Mustermann bei UFC 300 im Jahr 2024.', depth: 'deep' });
  assert.ok(deep.facets.length <= 12);
  const tasks = buildTasks(deep, ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia']);
  assert.ok(tasks.length <= 60);
});

test('Foto-only Quellen werden in Tasks unabhängig vom bevorzugten Facet-Medium auf Foto gesetzt', () => {
  const plan = buildEntityResearchPlan({ topic: 'Conor McGregor', channel: 'combat-sports', depth: 'quick' });
  const tasks = buildTasks(plan, ['pexels', 'openverse', 'wikimedia']);
  const trainingOpenverse = tasks.find((item) => item.provider === 'openverse' && item.facet.id === 'training');
  const trainingPexels = tasks.find((item) => item.provider === 'pexels' && item.facet.id === 'training');
  assert.equal(trainingOpenverse.type, 'photo');
  assert.equal(trainingPexels.type, 'video');
});

test('Entity-Payload validiert Thema, Kanal und Skript', () => {
  const value = validateEntityPayload({ topic: 'Conor McGregor', channel: 'combat-sports', script: 'Kurzes Reel.', depth: 'deep' });
  assert.equal(value.topic, 'Conor McGregor');
  assert.equal(value.channel, 'combat-sports');
  assert.throws(() => validateEntityPayload({ topic: '', channel: 'combat-sports' }));
  assert.throws(() => validateEntityPayload({ topic: 'Test', channel: 'unknown' }));
});
