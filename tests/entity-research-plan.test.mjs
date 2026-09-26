import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEntityResearchPlan, extractScriptTerms, inferResearchType } from '../scripts/entity-research-plan.mjs';
import { buildTasks, validateEntityPayload } from '../scripts/local-entity-api.mjs';

test('Kampfsport-Recherche erkennt Conor als Sportkontext und baut passende Bereiche', () => {
  const plan = buildEntityResearchPlan({ topic: 'Conor McGregor', channel: 'combat-sports', depth: 'deep' });
  assert.equal(plan.version, 3);
  assert.equal(plan.topic, 'Conor McGregor');
  assert.equal(plan.topicSlug, 'conor-mcgregor');
  assert.equal(plan.researchType, 'sport');
  assert.equal(plan.researchTypeLabel, 'Sport / Kampf / Athletik');
  assert.ok(plan.facets.some((item) => item.id === 'training'));
  assert.ok(plan.facets.some((item) => item.id === 'action'));
  assert.ok(plan.facets.some((item) => item.id === 'press'));
  assert.ok(plan.maxSearchTasks <= 40);
});

test('universelle Recherchearten erzeugen unterschiedliche Medienpläne', () => {
  const organization = buildEntityResearchPlan({ topic: 'NVIDIA', channel: 'ai', researchType: 'organization', depth: 'deep' });
  assert.equal(organization.researchType, 'organization');
  assert.ok(organization.facets.some((item) => item.id === 'branding'));
  assert.ok(organization.facets.some((item) => item.id === 'products'));

  const product = buildEntityResearchPlan({ topic: 'Tesla Model 3', channel: 'finance', researchType: 'product', depth: 'deep' });
  assert.ok(product.facets.some((item) => item.id === 'closeup'));
  assert.ok(product.facets.some((item) => item.id === 'use'));

  const place = buildEntityResearchPlan({ topic: 'Berlin', channel: 'finance', researchType: 'place', depth: 'deep' });
  assert.ok(place.facets.some((item) => item.id === 'landmark'));
  assert.ok(place.facets.some((item) => item.id === 'aerial'));

  const technology = buildEntityResearchPlan({ topic: 'RCD', channel: 'electro', researchType: 'technology', depth: 'deep' });
  assert.ok(technology.facets.some((item) => item.id === 'components'));
  assert.ok(technology.facets.some((item) => item.id === 'operation'));

  const history = buildEntityResearchPlan({ topic: 'Berliner Mauer', channel: 'finance', researchType: 'history', depth: 'deep' });
  assert.ok(history.facets.some((item) => item.id === 'archive'));
  assert.ok(history.facets.some((item) => item.id === 'places'));
});

test('Auto-Erkennung nutzt Kanal und eindeutige Begriffe als Signal', () => {
  assert.equal(inferResearchType({ topic: 'Conor McGregor', channel: 'combat-sports' }), 'sport');
  assert.equal(inferResearchType({ topic: 'RCD Schutzschalter', channel: 'electro' }), 'technology');
  assert.equal(inferResearchType({ topic: 'Berlin city', channel: 'finance' }), 'place');
  assert.equal(inferResearchType({ topic: 'Tech conference event', channel: 'ai' }), 'event');
  assert.equal(inferResearchType({ topic: 'Eine allgemeine Sparstrategie', channel: 'finance' }), 'concept');
});

test('Reel-Skript reserviert Suchplätze für Gegner, Events, Jahre und zitierte Begriffe', () => {
  const script = '2018 kämpfte Conor McGregor gegen Khabib Nurmagomedov bei UFC 229. Später sprach er über „Training Camp“.';
  const terms = extractScriptTerms(script, 'Conor McGregor');
  assert.ok(terms.some((item) => item.includes('Khabib Nurmagomedov')));
  assert.ok(terms.some((item) => item.includes('UFC 229')));
  assert.ok(terms.includes('2018'));
  assert.ok(terms.some((item) => item.includes('Training Camp')));
  const plan = buildEntityResearchPlan({ topic: 'Conor McGregor', channel: 'combat-sports', script, depth: 'deep' });
  assert.ok(plan.facets.some((item) => item.origin === 'script' && item.query.includes('Khabib Nurmagomedov')));
});

test('Schnell, Tief und Maximal begrenzen die Recherche bewusst', () => {
  const quick = buildEntityResearchPlan({ topic: 'NVIDIA', channel: 'ai', researchType: 'organization', depth: 'quick' });
  assert.ok(quick.facets.length <= 6);
  const deep = buildEntityResearchPlan({ topic: 'NVIDIA', channel: 'ai', researchType: 'organization', depth: 'deep' });
  assert.ok(deep.facets.length <= 8);
  const maximal = buildEntityResearchPlan({ topic: 'NVIDIA', channel: 'ai', researchType: 'organization', depth: 'max' });
  assert.ok(maximal.facets.length <= 12);
  assert.equal(maximal.maxSearchTasks, maximal.facets.length * 5);
  const tasks = buildTasks(maximal, ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia']);
  assert.ok(tasks.length <= 60);
});

test('Foto-only Quellen werden unabhängig vom bevorzugten Bereich auf Foto gesetzt', () => {
  const plan = buildEntityResearchPlan({ topic: 'RCD', channel: 'electro', researchType: 'technology', depth: 'quick' });
  const tasks = buildTasks(plan, ['pexels', 'openverse', 'wikimedia']);
  const operationOpenverse = tasks.find((item) => item.provider === 'openverse' && item.facet.id === 'operation');
  const operationPexels = tasks.find((item) => item.provider === 'pexels' && item.facet.id === 'operation');
  assert.equal(operationOpenverse.type, 'photo');
  assert.equal(operationPexels.type, 'video');
});

test('Entity-Payload validiert Thema, Kanal, Rechercheart, Skript und Maximalmodus', () => {
  const value = validateEntityPayload({ topic: 'NVIDIA', channel: 'ai', researchType: 'organization', script: 'Kurzes Reel.', depth: 'max' });
  assert.equal(value.topic, 'NVIDIA');
  assert.equal(value.channel, 'ai');
  assert.equal(value.researchType, 'organization');
  assert.equal(value.depth, 'max');
  assert.throws(() => validateEntityPayload({ topic: '', channel: 'combat-sports' }));
  assert.throws(() => validateEntityPayload({ topic: 'Test', channel: 'unknown' }));
  assert.throws(() => validateEntityPayload({ topic: 'Test', channel: 'ai', researchType: 'unknown' }));
});
