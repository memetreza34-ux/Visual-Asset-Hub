import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOrientation, searchPexels } from '../scripts/lib/pexels.mjs';

test('normalisiert deutsche Formatbegriffe für Pexels', () => {
  assert.equal(normalizeOrientation('vertical'), 'portrait');
  assert.equal(normalizeOrientation('horizontal'), 'landscape');
  assert.equal(normalizeOrientation('square'), 'square');
});

test('sendet Video-Suche mit sicherem Authorization-Header', async () => {
  let capturedUrl;
  let capturedOptions;

  const fetchImpl = async (url, options) => {
    capturedUrl = new URL(url);
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          page: 1,
          per_page: 1,
          total_results: 1,
          videos: [{
            id: 42,
            width: 1080,
            height: 1920,
            duration: 8,
            url: 'https://www.pexels.com/video/42/',
            image: 'https://images.pexels.com/videos/42/preview.jpg',
            user: { name: 'Creator', url: 'https://www.pexels.com/@creator' },
            video_files: [{ id: 1, quality: 'hd', file_type: 'video/mp4', width: 1080, height: 1920, link: 'https://example.test/video.mp4' }],
            video_pictures: []
          }]
        };
      },
      async text() { return ''; }
    };
  };

  const result = await searchPexels({
    apiKey: 'secret-key',
    query: 'Laptop Arbeit',
    type: 'video',
    orientation: 'vertical',
    perPage: 1,
    fetchImpl
  });

  assert.equal(capturedUrl.pathname, '/v1/videos/search');
  assert.equal(capturedUrl.searchParams.get('query'), 'Laptop Arbeit');
  assert.equal(capturedUrl.searchParams.get('orientation'), 'portrait');
  assert.equal(capturedOptions.headers.Authorization, 'secret-key');
  assert.equal(result.assets[0].provider_id, '42');
  assert.equal(result.assets[0].orientation, 'vertical');
  assert.equal(result.assets[0].creator, 'Creator');
});

test('verweigert Anfragen ohne Schlüssel', async () => {
  await assert.rejects(
    () => searchPexels({ apiKey: '', query: 'Natur', fetchImpl: async () => ({}) }),
    /PEXELS_API_KEY fehlt/
  );
});
