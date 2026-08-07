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

test('Unsplash akzeptiert Fotoformate und blockiert Videoformate', () => {
  const photo = validateSearchPayload({
    provider: 'unsplash',
    apiKey: 'test-unsplash-key-1234567890',
    channel: 'ai',
    collection: 'humanoid-robots',
    variant: 'photo-vertical'
  }, root);
  assert.equal(photo.provider, 'unsplash');
  assert.equal(photo.job.type, 'photo');
  assert.throws(() => validateSearchPayload({
    provider: 'unsplash',
    apiKey: 'test-unsplash-key-1234567890',
    channel: 'ai',
    collection: 'humanoid-robots',
    variant: 'video-vertical'
  }, root), /nur Bilder/);
});

test('Openverse und Wikimedia benötigen keinen API-Key und sind foto-only', () => {
  for (const provider of ['openverse', 'wikimedia']) {
    const photo = validateSearchPayload({
      provider,
      channel: 'electro',
      collection: 'electric-motors',
      variant: 'photo-horizontal'
    }, root);
    assert.equal(photo.provider, provider);
    assert.equal(photo.apiKey, '');
    assert.equal(photo.job.type, 'photo');
    assert.throws(() => validateSearchPayload({
      provider,
      channel: 'electro',
      collection: 'electric-motors',
      variant: 'video-vertical'
    }, root), /nur Bilder/);
  }
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
