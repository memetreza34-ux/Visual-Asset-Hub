import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSearchPhrase, planSearchQueries, translateSearchPhrase } from '../scripts/lib/search-planner.mjs';
import { isSyntheticMediaCandidate, passesRequiredConcepts, rankRealCandidates, scoreQueryRelevance } from '../scripts/lib/real-media.mjs';

test('deutsche Logistikbegriffe werden in brauchbare englische Stock-Queries übersetzt', () => {
  const translated = translateSearchPhrase('lastwagen fährt zum paketzentrum');
  assert.match(translated, /delivery truck/i);
  assert.match(translated, /driving/i);
  assert.match(translated, /parcel sorting center/i);

  const plan = planSearchQueries({ topic: 'fließband bringt sendungen zu sortierpunkten', maxQueries: 3 });
  assert.equal(plan.category, 'logistics-delivery');
  assert.equal(plan.canonical_topic, 'parcel sorting conveyor belt warehouse');
  assert.match(plan.queries[0].query, /parcel sorting conveyor belt warehouse/i);
});

test('kanonische Logistik-Queries reduzieren gemischte DE-EN Suchphrasen', () => {
  assert.equal(
    canonicalSearchPhrase('zustellfahrzeug fährt von straße zu straße', 'delivery van driving von street zu street', 'logistics-delivery'),
    'delivery van driving residential street'
  );
  assert.equal(
    canonicalSearchPhrase('verkehr baustellen viele sendungen', 'traffic road construction viele parcels', 'logistics-delivery'),
    'city traffic road construction delivery route'
  );
});

test('semantisch passendes B-Roll schlägt technisch gleichwertigen generischen Verkehr', () => {
  const common = {
    provider: 'pexels',
    type: 'video',
    width: 1920,
    height: 1080,
    orientation: 'horizontal',
    duration_seconds: 12,
    occurrences: 1,
    first_seen_page: 1,
    matched_queries: ['delivery truck driving logistics distribution center']
  };
  const exact = {
    ...common,
    provider_id: '2',
    title: 'Delivery truck arriving at logistics distribution center',
    source_url: 'https://www.pexels.com/video/delivery-truck-logistics-center-2/'
  };
  const generic = {
    ...common,
    provider_id: '1',
    title: 'Cars on the road',
    source_url: 'https://www.pexels.com/video/cars-on-the-road-1/'
  };

  assert.ok(scoreQueryRelevance(exact) > scoreQueryRelevance(generic));
  const ranked = rankRealCandidates([generic, exact], { orientation: 'horizontal', assetType: 'video' });
  assert.equal(ranked[0].provider_id, '2');
  assert.equal(ranked.length, 1);
});

test('Animation und CGI werden in einer Real-B-Roll-Suche stark abgewertet', () => {
  const common = {
    provider: 'pexels',
    type: 'video',
    width: 1920,
    height: 1080,
    orientation: 'horizontal',
    duration_seconds: 10,
    occurrences: 1,
    first_seen_page: 1,
    matched_queries: ['parcel sorting conveyor belt warehouse']
  };
  const real = {
    ...common,
    provider_id: '10',
    title: 'Parcels moving on warehouse conveyor belt',
    source_url: 'https://www.pexels.com/video/parcels-warehouse-conveyor-belt-10/'
  };
  const animated = {
    ...common,
    provider_id: '11',
    title: '3D animation of boxes on conveyor belt',
    source_url: 'https://www.pexels.com/video/3d-animation-boxes-conveyor-11/'
  };

  assert.equal(isSyntheticMediaCandidate(animated), true);
  assert.equal(isSyntheticMediaCandidate(real), false);
  const ranked = rankRealCandidates([animated, real], { orientation: 'horizontal', assetType: 'video' });
  assert.equal(ranked[0].provider_id, '10');
});

test('harte Kernmotive verwerfen falsche Delivery-Van Treffer vollständig', () => {
  const correct = {
    provider: 'pexels', provider_id: '20', type: 'video', width: 1920, height: 1080,
    orientation: 'horizontal', duration_seconds: 10, occurrences: 1, first_seen_page: 1,
    matched_queries: ['delivery van driving residential street'],
    title: 'White delivery van driving on residential street',
    source_url: 'https://www.pexels.com/video/delivery-van-residential-street-20/'
  };
  const wrong = {
    ...correct,
    provider_id: '21',
    title: 'Highway traffic on cloudy day',
    source_url: 'https://www.pexels.com/video/highway-traffic-21/'
  };

  assert.equal(passesRequiredConcepts(correct), true);
  assert.equal(passesRequiredConcepts(wrong), false);
  const ranked = rankRealCandidates([wrong, correct], { orientation: 'horizontal', assetType: 'video' });
  assert.deepEqual(ranked.map((item) => item.provider_id), ['20']);
});
