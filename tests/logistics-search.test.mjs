import test from 'node:test';
import assert from 'node:assert/strict';
import { planSearchQueries, translateSearchPhrase } from '../scripts/lib/search-planner.mjs';
import { rankRealCandidates, scoreQueryRelevance } from '../scripts/lib/real-media.mjs';

test('deutsche Logistikbegriffe werden in brauchbare englische Stock-Queries übersetzt', () => {
  const translated = translateSearchPhrase('lastwagen fährt zum paketzentrum');
  assert.match(translated, /delivery truck/i);
  assert.match(translated, /driving/i);
  assert.match(translated, /parcel sorting center/i);

  const plan = planSearchQueries({ topic: 'fließband bringt sendungen zu sortierpunkten', maxQueries: 3 });
  assert.equal(plan.category, 'logistics-delivery');
  assert.match(plan.queries[0].query, /conveyor belt/i);
  assert.match(plan.queries[0].query, /parcels/i);
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
    matched_queries: ['delivery truck driving parcel sorting center']
  };
  const exact = {
    ...common,
    provider_id: '2',
    title: 'Delivery truck arriving at parcel sorting center',
    source_url: 'https://www.pexels.com/video/delivery-truck-parcel-sorting-center-2/'
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
  assert.ok(ranked[0].query_relevance_score > ranked[1].query_relevance_score);
});
