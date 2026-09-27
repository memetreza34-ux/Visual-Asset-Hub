import assert from 'node:assert/strict';
import test from 'node:test';
import { searchPixabay } from '../scripts/lib/providers/pixabay.mjs';
import { searchOpenverse } from '../scripts/lib/providers/openverse.mjs';
import { searchWikimedia } from '../scripts/lib/providers/wikimedia.mjs';
import { searchInternetArchive } from '../scripts/lib/providers/internet-archive.mjs';

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

test('Wikimedia Commons public-domain image becomes an archive-ready asset', async () => {
  const result = await searchWikimedia({
    query: 'Apollo 11',
    type: 'image',
    fetchImpl: async () => jsonResponse({ query: { pages: [{
      pageid: 42,
      title: 'File:Apollo 11 crew.jpg',
      imageinfo: [{
        url: 'https://upload.wikimedia.org/apollo.jpg',
        thumburl: 'https://upload.wikimedia.org/apollo-thumb.jpg',
        descriptionurl: 'https://commons.wikimedia.org/wiki/File:Apollo_11_crew.jpg',
        width: 3000,
        height: 2000,
        size: 800000,
        mime: 'image/jpeg',
        extmetadata: {
          LicenseShortName: { value: 'Public domain' },
          Artist: { value: 'NASA' },
          ImageDescription: { value: 'Apollo 11 crew' }
        }
      }]
    }] } })
  });
  const asset = result.assets[0];
  assert.equal(result.provider, 'wikimedia');
  assert.equal(asset.orientation, 'horizontal');
  assert.equal(asset.rights.license_status, 'public-domain');
  assert.equal(asset.rights.attribution_required, false);
  assert.equal(asset.downloads[0].url, 'https://upload.wikimedia.org/apollo.jpg');
});

test('Internet Archive only auto-approves clearly reusable rights', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('advancedsearch.php')) return jsonResponse({ response: { numFound: 1, docs: [{ identifier: 'historic-film', title: 'Historic Film', mediatype: 'movies' }] } });
    return jsonResponse({
      metadata: {
        identifier: 'historic-film',
        title: 'Historic Film',
        creator: 'US Government',
        rights: 'Public Domain',
        subject: ['history']
      },
      files: [
        { name: 'historic-film.mp4', source: 'original', format: 'MPEG4', size: '1200000', width: '1280', height: '720' },
        { name: 'historic-film_thumb.jpg', source: 'derivative', format: 'JPEG' }
      ]
    });
  };
  const result = await searchInternetArchive({ query: 'historic film', type: 'video', fetchImpl });
  const asset = result.assets[0];
  assert.equal(result.provider, 'internet-archive');
  assert.equal(asset.type, 'video');
  assert.equal(asset.rights.license_status, 'public-domain');
  assert.equal(asset.rights.suggested_status, 'approved');
  assert.match(asset.downloads[0].url, /archive\.org\/download\/historic-film\/historic-film\.mp4/);
});

test('Internet Archive unknown rights stay in review', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('advancedsearch.php')) return jsonResponse({ response: { numFound: 1, docs: [{ identifier: 'mystery', title: 'Mystery clip', mediatype: 'movies' }] } });
    return jsonResponse({ metadata: { title: 'Mystery clip' }, files: [{ name: 'mystery.mp4', source: 'original', format: 'MPEG4' }] });
  };
  const result = await searchInternetArchive({ query: 'mystery', type: 'video', fetchImpl });
  const asset = result.assets[0];
  assert.equal(asset.rights.license_status, 'unknown');
  assert.equal(asset.rights.suggested_status, 'review');
  assert.deepEqual(asset.rights.suggested_scopes, ['internal-only']);
});
