import assert from 'node:assert/strict';
import test from 'node:test';
import { searchUnsplash, trackUnsplashDownload } from '../scripts/lib/unsplash.mjs';

test('Unsplash-Suche nutzt Client-ID, Hochformat und sichere Inhaltsfilter', async () => {
  let requestUrl;
  let requestOptions;
  const fetchImpl = async (url, options) => {
    requestUrl = new URL(url);
    requestOptions = options;
    return new Response(JSON.stringify({
      total: 1,
      total_pages: 1,
      results: [{
        id: 'AbC_123-xY',
        width: 1080,
        height: 1920,
        color: '#123456',
        alt_description: 'robot hand',
        urls: {
          raw: 'https://images.unsplash.com/photo-1?raw=1',
          full: 'https://images.unsplash.com/photo-1?full=1',
          regular: 'https://images.unsplash.com/photo-1?regular=1',
          small: 'https://images.unsplash.com/photo-1?small=1',
          thumb: 'https://images.unsplash.com/photo-1?thumb=1'
        },
        links: {
          html: 'https://unsplash.com/photos/AbC_123-xY',
          download_location: 'https://api.unsplash.com/photos/AbC_123-xY/download'
        },
        user: {
          name: 'Test Fotograf',
          links: { html: 'https://unsplash.com/@test' }
        }
      }]
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '50',
        'x-ratelimit-remaining': '49'
      }
    });
  };

  const result = await searchUnsplash({
    apiKey: 'unsplash-test-key',
    query: 'robot hand',
    orientation: 'vertical',
    perPage: 12,
    fetchImpl
  });

  assert.equal(requestUrl.pathname, '/search/photos');
  assert.equal(requestUrl.searchParams.get('orientation'), 'portrait');
  assert.equal(requestUrl.searchParams.get('content_filter'), 'high');
  assert.equal(requestOptions.headers.Authorization, 'Client-ID unsplash-test-key');
  assert.equal(result.provider, 'unsplash');
  assert.equal(result.assets[0].provider_id, 'AbC_123-xY');
  assert.equal(result.assets[0].orientation, 'vertical');
  assert.match(result.assets[0].source_url, /utm_source=visual_asset_hub/);
  assert.match(result.assets[0].creator_url, /utm_source=visual_asset_hub/);
  assert.equal(result.assets[0].download_location, 'https://api.unsplash.com/photos/AbC_123-xY/download');
  assert.equal(result.rate_limit.remaining, 49);
});

test('Unsplash-Download-Meldung akzeptiert nur den offiziellen API-Host', async () => {
  let authorization;
  const fetchImpl = async (_url, options) => {
    authorization = options.headers.Authorization;
    return new Response(JSON.stringify({ url: 'https://images.unsplash.com/photo-1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await trackUnsplashDownload({
    apiKey: 'unsplash-test-key',
    downloadLocation: 'https://api.unsplash.com/photos/AbC_123-xY/download',
    fetchImpl
  });
  assert.equal(result.ok, true);
  assert.equal(authorization, 'Client-ID unsplash-test-key');

  await assert.rejects(
    () => trackUnsplashDownload({
      apiKey: 'unsplash-test-key',
      downloadLocation: 'https://example.com/track',
      fetchImpl
    }),
    /Ungültiger Unsplash-Download-Endpunkt/
  );
});
