import assert from 'node:assert/strict';
import test from 'node:test';
import { searchPixabay } from '../scripts/lib/pixabay.mjs';

test('Pixabay-Videos werden normalisiert und nach Hochformat gefiltert', async () => {
  let requestedUrl;
  const result = await searchPixabay({
    apiKey: 'pixabay-test-key-123456',
    query: 'boxing training',
    type: 'video',
    orientation: 'vertical',
    perPage: 12,
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return new Response(JSON.stringify({
        total: 2,
        totalHits: 2,
        hits: [
          {
            id: 101,
            pageURL: 'https://pixabay.com/videos/id-101/',
            duration: 8,
            user: 'Creator One',
            user_id: 11,
            videos: { medium: { url: 'https://cdn.example/101.mp4', width: 1080, height: 1920, size: 1000, thumbnail: 'https://cdn.example/101.jpg' } }
          },
          {
            id: 102,
            pageURL: 'https://pixabay.com/videos/id-102/',
            duration: 9,
            user: 'Creator Two',
            user_id: 12,
            videos: { medium: { url: 'https://cdn.example/102.mp4', width: 1920, height: 1080, size: 1000, thumbnail: 'https://cdn.example/102.jpg' } }
          }
        ]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });

  assert.equal(requestedUrl.origin + requestedUrl.pathname, 'https://pixabay.com/api/videos/');
  assert.equal(requestedUrl.searchParams.get('key'), 'pixabay-test-key-123456');
  assert.equal(requestedUrl.searchParams.get('safesearch'), 'true');
  assert.equal(result.provider, 'pixabay');
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].provider_id, '101');
  assert.equal(result.assets[0].orientation, 'vertical');
  assert.equal(result.assets[0].files[0].file_type, 'video/mp4');
  assert.equal(JSON.stringify(result).includes('pixabay-test-key-123456'), false);
});

test('Pixabay-Bilder verwenden deutsche Suche, sichere Vorschau und Dateivarianten', async () => {
  let requestedUrl;
  const result = await searchPixabay({
    apiKey: 'pixabay-test-key-123456',
    query: 'elektrik schaltschrank',
    type: 'photo',
    orientation: 'vertical',
    perPage: 6,
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return new Response(JSON.stringify({
        totalHits: 1,
        hits: [{
          id: 201,
          pageURL: 'https://pixabay.com/photos/id-201/',
          tags: 'electrician, control cabinet',
          user: 'Tech Creator',
          user_id: 21,
          imageWidth: 2000,
          imageHeight: 3000,
          previewURL: 'https://cdn.example/201-preview.jpg',
          webformatURL: 'https://cdn.example/201-medium.jpg',
          largeImageURL: 'https://cdn.example/201-large.jpg'
        }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });

  assert.equal(requestedUrl.pathname, '/api/');
  assert.equal(requestedUrl.searchParams.get('lang'), 'de');
  assert.equal(requestedUrl.searchParams.get('orientation'), 'vertical');
  assert.equal(requestedUrl.searchParams.get('image_type'), 'all');
  assert.equal(result.assets[0].type, 'image');
  assert.equal(result.assets[0].preview_url, 'https://cdn.example/201-medium.jpg');
  assert.equal(result.assets[0].files.large, 'https://cdn.example/201-large.jpg');
  assert.equal(result.cache_ttl_hours, 24);
});

test('Pixabay verweigert fehlende Schlüssel und zu kleine Batches', async () => {
  await assert.rejects(() => searchPixabay({ apiKey: '', query: 'test', type: 'video', perPage: 3 }), /PIXABY_API/);
  await assert.rejects(() => searchPixabay({ apiKey: '12345678', query: 'test', type: 'video', perPage: 2 }), /perPage/);
});
