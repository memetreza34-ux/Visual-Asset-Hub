import assert from 'node:assert/strict';
import test from 'node:test';
import { buildExpansionPlan } from '../scripts/arsenal-expansion-plan.mjs';

const channels = [{
  id: 'finance',
  label: 'Finanzen',
  primaryCategory: 'finance-investing',
  channelTag: 'channel-finance',
  collections: [
    { id: 'empty', label: 'Leer', queries: ['empty query'] },
    { id: 'photos-only', label: 'Nur Fotos', queries: ['photo query'] },
    { id: 'videos-only', label: 'Nur Videos', queries: ['video query'] }
  ]
}];

function asset(id, collection, type, status = 'approved') {
  return { id, type, status, tags: ['channel-finance', `collection-${collection}`] };
}

test('Ausbauplan priorisiert leere Sammlungen und passende Quellen', () => {
  const assets = [
    asset('A1', 'photos-only', 'image'), asset('A2', 'photos-only', 'image'),
    asset('A3', 'videos-only', 'video'), asset('A4', 'videos-only', 'video')
  ];
  const plan = buildExpansionPlan({ channels, assets });
  assert.equal(plan.summary.collections, 3);
  assert.equal(plan.summary.approved, 4);
  assert.equal(plan.summary.target, 24);
  assert.equal(plan.priorities[0].collection, 'empty');

  const empty = plan.priorities.find((row) => row.collection === 'empty');
  assert.deepEqual(empty.gaps, { approved: 8, minimumApproved: 4, videos: 2, photos: 2 });
  assert.deepEqual(empty.providerPriority, ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia']);

  const photosOnly = plan.priorities.find((row) => row.collection === 'photos-only');
  assert.equal(photosOnly.gaps.videos, 2);
  assert.equal(photosOnly.gaps.photos, 0);
  assert.ok(photosOnly.providerPriority.includes('pexels'));
  assert.ok(photosOnly.providerPriority.includes('pixabay'));

  const videosOnly = plan.priorities.find((row) => row.collection === 'videos-only');
  assert.equal(videosOnly.gaps.videos, 0);
  assert.equal(videosOnly.gaps.photos, 2);
  assert.ok(videosOnly.providerPriority.includes('unsplash'));
  assert.ok(videosOnly.providerPriority.includes('openverse'));
  assert.ok(videosOnly.providerPriority.includes('wikimedia'));
});

test('Review-Kandidaten zählen nicht als freigegeben', () => {
  const assets = [asset('R1', 'empty', 'video', 'review'), asset('R2', 'empty', 'image', 'review')];
  const plan = buildExpansionPlan({ channels, assets });
  const row = plan.priorities.find((item) => item.collection === 'empty');
  assert.equal(row.counts.totalCandidates, 2);
  assert.equal(row.counts.review, 2);
  assert.equal(row.counts.approved, 0);
  assert.equal(row.complete, false);
});
