import assert from 'node:assert/strict';
import test from 'node:test';
import { searchPixabay } from '../scripts/lib/providers/pixabay.mjs';
import { searchOpenverse } from '../scripts/lib/providers/openverse.mjs';

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
    text: async () => JSON.stringify(value)
  };
}

test('Pixabay video results normalize to common provider format', async () => {
  const result = await searchPixabay({
    apiKey: 'test-key',
    query: 'factory',
    type: 'video',
    perPage: 3,
    fetchImpl: async () => jsonResponse({ totalHits: 1, hits: [{
      id: 125,
      pageURL: 'https://pixabay.com/videos/id-125/',
      tags: 'factory, automation, industry',
      duration: 12,
      videos: {
        medium: { url: 'https://cdn.example/video.mp4', width: 1920, height: 1080, size: 1000, thumbnail: 'https://cdn.example/video.jpg' }
      },
      user_id: 7,
      user: 'Creator'
    }] })
  });
  assert.equal(result.provider, 'pixabay');
  assert.equal(result.assets[0].type, 'video');
  assert.equal(result.assets[0].orientation, 'horizontal');
  assert.equal(result.assets[0].rights.license_status, 'licensed');
  assert.equal(result.assets[0].rights.attribution_required, false);
  assert.equal(result.assets[0].downloads[0].width, 1920);
});

test('Openverse CC BY maps to attribution-required catalog rights', async () => {
  const result = await searchOpenverse({
    query: 'circuit',
    fetchImpl: async () => jsonResponse({ result_count: 1, results: [{
      id: 'abc',
      title: 'Circuit board',
      url: 'https://example.org/circuit.jpg',
      thumbnail: 'https://example.org/thumb.jpg',
      width: 1200,
      height: 800,
      creator: 'Alice',
      foreign_landing_url: 'https://example.org/work',
      license: 'by',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Circuit board by Alice, CC BY 4.0'
    }] })
  });
  const asset = result.assets[0];
  assert.equal(asset.rights.license_status, 'cc-by');
  assert.equal(asset.rights.attribution_required, true);
  assert.equal(asset.rights.suggested_status, 'approved');
});

test('Openverse licenses not representable by the catalog stay restricted', async () => {
  const result = await searchOpenverse({
    query: 'photo',
    fetchImpl: async () => jsonResponse({ result_count: 1, results: [{
      id: 'nc', title: 'Restricted work', url: 'https://example.org/work.jpg', width: 800, height: 1200,
      license: 'by-nc-sa', creator: 'Bob', foreign_landing_url: 'https://example.org/work'
    }] })
  });
  const asset = result.assets[0];
  assert.equal(asset.rights.license_status, 'restricted');
  assert.equal(asset.rights.suggested_status, 'review');
  assert.deepEqual(asset.rights.suggested_scopes, ['internal-only']);
  assert.match(asset.rights.warning, /manuell prüfen/);
});
