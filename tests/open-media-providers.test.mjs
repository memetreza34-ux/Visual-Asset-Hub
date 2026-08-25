import assert from 'node:assert/strict';
import test from 'node:test';
import { searchOpenverse } from '../scripts/lib/openverse.mjs';
import { searchWikimedia } from '../scripts/lib/wikimedia.mjs';

test('Openverse sucht anonym, filtert sichere Lizenzen und Hochformat', async () => {
  let requested;
  const result = await searchOpenverse({
    query: 'boxing training',
    orientation: 'vertical',
    perPage: 5,
    fetchImpl: async (url) => {
      requested = new URL(url);
      return new Response(JSON.stringify({
        result_count: 2,
        results: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'Boxing gym',
            foreign_landing_url: 'https://example.org/boxing',
            url: 'https://example.org/boxing.jpg',
            thumbnail: 'https://example.org/boxing-small.jpg',
            creator: 'Creator',
            width: 1000,
            height: 1500,
            license: 'by-sa',
            license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
            mature: false
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            title: 'Landscape',
            foreign_landing_url: 'https://example.org/landscape',
            url: 'https://example.org/landscape.jpg',
            width: 1600,
            height: 900,
            license: 'cc0',
            mature: false
          }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });
  assert.equal(requested.searchParams.get('license'), 'by,by-sa,cc0,pdm');
  assert.equal(requested.searchParams.get('mature'), 'false');
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].license, 'by-sa');
  assert.equal(result.assets[0].orientation, 'vertical');
});

test('Wikimedia übernimmt nur Bilder mit unterstützter freier Lizenz', async () => {
  let requested;
  const result = await searchWikimedia({
    query: 'electric motor',
    orientation: 'horizontal',
    perPage: 5,
    fetchImpl: async (url) => {
      requested = new URL(url);
      return new Response(JSON.stringify({
        query: {
          pages: [
            {
              pageid: 123,
              title: 'File:Electric motor.jpg',
              imageinfo: [{
                url: 'https://upload.wikimedia.org/motor.jpg',
                thumburl: 'https://upload.wikimedia.org/motor-thumb.jpg',
                width: 1600,
                height: 900,
                mime: 'image/jpeg',
                user: 'Uploader',
                extmetadata: {
                  LicenseShortName: { value: 'CC BY-SA 4.0' },
                  LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
                  Artist: { value: '<b>Jane Doe</b>' },
                  Credit: { value: 'Jane Doe / Wikimedia Commons' },
                  ImageDescription: { value: '<p>Electric motor</p>' }
                }
              }]
            },
            {
              pageid: 456,
              title: 'File:Unsupported.svg',
              imageinfo: [{
                url: 'https://upload.wikimedia.org/unsupported.svg',
                width: 1000,
                height: 500,
                mime: 'image/svg+xml',
                extmetadata: { LicenseShortName: { value: 'GPL' } }
              }]
            }
          ]
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });
  assert.equal(requested.searchParams.get('gsrnamespace'), '6');
  assert.match(requested.searchParams.get('iiprop'), /extmetadata/);
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].license, 'cc-by-sa');
  assert.equal(result.assets[0].creator, 'Jane Doe');
  assert.equal(result.assets[0].orientation, 'horizontal');
});

test('Wikimedia nutzt für weitere Treffer echte Suchseiten über gsroffset', async () => {
  let requested;
  const result = await searchWikimedia({
    query: 'humanoid robot',
    page: 3,
    perPage: 5,
    fetchImpl: async (url) => {
      requested = new URL(url);
      return new Response(JSON.stringify({ query: { pages: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });
  assert.equal(requested.searchParams.get('gsroffset'), '40');
  assert.equal(requested.searchParams.get('gsrlimit'), '20');
  assert.equal(result.page, 3);
});
