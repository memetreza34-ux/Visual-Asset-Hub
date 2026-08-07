import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { createPixabayCacheKey, validateBatchSearchPayload, validateImportPayload, validateSearchPayload } from '../scripts/local-arsenal-api.mjs';

const root = process.cwd();

test('lokale Arsenal-Suche löst Quelle, Kanal, Sammlung und Format kontrolliert auf', () => {
  const value = validateSearchPayload({
    provider: 'pixabay',
    apiKey: 'test-pixabay-key-1234567890',
    channel: 'combat-sports',
    collection: 'boxing-training',
    variant: 'video-vertical',
    queryIndex: 1,
    perPage: 12
  }, root);
  assert.equal(value.provider, 'pixabay');
  assert.equal(value.job.channel, 'combat-sports');
  assert.equal(value.job.collection, 'boxing-training');
  assert.equal(value.job.type, 'video');
  assert.equal(value.job.orientation, 'vertical');
  assert.equal(value.job.perPage, 12);
  assert.ok(value.job.tags.includes('channel-combat-sports'));
  assert.ok(value.job.tags.includes('collection-boxing-training'));
});

test('Unsplash akzeptiert Fotoformate und blockiert Videoformate', () => {
  const photo = validateSearchPayload({ provider: 'unsplash', apiKey: 'test-unsplash-key-1234567890', channel: 'ai', collection: 'humanoid-robots', variant: 'photo-vertical' }, root);
  assert.equal(photo.provider, 'unsplash');
  assert.equal(photo.job.type, 'photo');
  assert.throws(() => validateSearchPayload({ provider: 'unsplash', apiKey: 'test-unsplash-key-1234567890', channel: 'ai', collection: 'humanoid-robots', variant: 'video-vertical' }, root), /nur Bilder/);
});

test('Openverse und Wikimedia benötigen keinen API-Key und sind foto-only', () => {
  for (const provider of ['openverse', 'wikimedia']) {
    const photo = validateSearchPayload({ provider, channel: 'electro', collection: 'motors-drives', variant: 'photo-horizontal' }, root);
    assert.equal(photo.provider, provider);
    assert.equal(photo.apiKey, '');
    assert.equal(photo.job.type, 'photo');
    assert.throws(() => validateSearchPayload({ provider, channel: 'electro', collection: 'motors-drives', variant: 'video-vertical' }, root), /nur Bilder/);
  }
});

test('Batch-Suche akzeptiert höchstens fünf eindeutige Sammlungen', () => {
  const batch = validateBatchSearchPayload({
    provider: 'openverse',
    channel: 'finance',
    collections: ['cash-money', 'budgeting-saving', 'banking-cards'],
    variant: 'photo-vertical',
    queryIndex: 0,
    perPage: 8
  }, root);
  assert.equal(batch.length, 3);
  assert.deepEqual(batch.map((item) => item.job.collection), ['cash-money', 'budgeting-saving', 'banking-cards']);
  assert.throws(() => validateBatchSearchPayload({ provider: 'openverse', channel: 'finance', collections: ['cash-money', 'cash-money'], variant: 'photo-vertical' }, root), /Duplikate/);
  assert.throws(() => validateBatchSearchPayload({ provider: 'openverse', channel: 'finance', collections: ['cash-money', 'budgeting-saving', 'banking-cards', 'investing-stocks', 'trading-charts', 'crypto-blockchain'], variant: 'photo-vertical' }, root), /1 bis 5/);
});

test('Pixabay cachet nur API-Parameter und niemals Kanal- oder Sammlungsmetadaten', () => {
  const common = { query: 'same stock query', type: 'video', orientation: 'vertical', perPage: 12 };
  const first = createPixabayCacheKey({ ...common, channel: 'finance', collection: 'cash-money', id: 'finance-cash' });
  const second = createPixabayCacheKey({ ...common, channel: 'combat-sports', collection: 'boxing-training', id: 'combat-boxing' });
  assert.equal(first, second, 'identische Pixabay-API-Anfragen sollen denselben 24h-Cache verwenden');
  assert.match(first, /^[a-f0-9]{32}$/);

  const source = fs.readFileSync(path.join(root, 'scripts/local-arsenal-api.mjs'), 'utf8');
  assert.match(source, /pixabay-cache/);
  assert.match(source, /arsenalJob:\s*input\.job/);
  assert.match(source, /const searchId = createSearchId\(\)/);
  assert.doesNotMatch(source, /return `ARS-\$\{digest\.slice/);
});

test('Pexels bleibt die Standardquelle für bestehende Aufrufe', () => {
  const value = validateSearchPayload({ apiKey: 'test-pexels-key-1234567890', channel: 'finance', collection: 'cash-money', variant: 'video-vertical' }, root);
  assert.equal(value.provider, 'pexels');
});

test('lokale Suche blockiert unbekannte Quellen, Kanäle, Sammlungen und zu große Batches', () => {
  const base = { provider: 'pixabay', apiKey: 'test-pixabay-key-1234567890', channel: 'finance', collection: 'cash-money', variant: 'video-vertical' };
  assert.throws(() => validateSearchPayload({ ...base, provider: 'unknown' }, root), /provider/);
  assert.throws(() => validateSearchPayload({ ...base, channel: 'unknown' }, root), /Unbekannter Kanal/);
  assert.throws(() => validateSearchPayload({ ...base, collection: 'unknown' }, root), /Unbekannte Sammlung/);
  assert.throws(() => validateSearchPayload({ ...base, perPage: 21 }, root), /perPage/);
  assert.throws(() => validateSearchPayload({ ...base, apiKey: 'kurz' }, root), /apiKey/);
});

test('Import akzeptiert numerische und sichere externe Medien-IDs', () => {
  const numeric = validateImportPayload({ searchId: 'ARS-1234567890ABCDEF', ids: ['12345', '67890'] });
  assert.deepEqual(numeric.ids, ['12345', '67890']);
  const external = validateImportPayload({ searchId: 'ARS-1234567890ABCDEF', ids: ['AbC_123-xY'], apiKey: 'temporary-key' });
  assert.deepEqual(external.ids, ['AbC_123-xY']);
  assert.equal(external.apiKey, 'temporary-key');
  assert.throws(() => validateImportPayload({ searchId: '../catalog/assets', ids: ['12345'] }), /searchId/);
  assert.throws(() => validateImportPayload({ searchId: 'ARS-1234567890ABCDEF', ids: ['12345', '12345'] }), /Duplikate/);
  assert.throws(() => validateImportPayload({ searchId: 'ARS-1234567890ABCDEF', ids: ['bad/id'] }), /ungültige/);
});
