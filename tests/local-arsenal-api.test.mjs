import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';
import { validateImportPayload, validateSearchPayload } from '../scripts/local-arsenal-api.mjs';

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

test('Pexels bleibt die Standardquelle für bestehende Aufrufe', () => {
  const value = validateSearchPayload({
    apiKey: 'test-pexels-key-1234567890',
    channel: 'finance',
    collection: 'cash-money',
    variant: 'video-vertical'
  }, root);
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

test('Import akzeptiert nur kontrollierte Such- und Medien-IDs', () => {
  const value = validateImportPayload({ searchId: 'ARS-1234567890ABCDEF', ids: ['12345', '67890'] });
  assert.deepEqual(value.ids, ['12345', '67890']);
  assert.throws(() => validateImportPayload({ searchId: '../catalog/assets', ids: ['12345'] }), /searchId/);
  assert.throws(() => validateImportPayload({ searchId: 'ARS-1234567890ABCDEF', ids: ['12345', '12345'] }), /Duplikate/);
  assert.throws(() => validateImportPayload({ searchId: 'ARS-1234567890ABCDEF', ids: ['abc'] }), /ungültige/);
});
