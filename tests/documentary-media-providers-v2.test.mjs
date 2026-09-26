import assert from 'node:assert/strict';
import test from 'node:test';
import {searchWikimedia} from '../scripts/lib/wikimedia.mjs';
import {searchNasa} from '../scripts/lib/nasa-media.mjs';
import {searchLibraryOfCongress} from '../scripts/lib/loc-media.mjs';

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
    async text() { return JSON.stringify(payload); }
  };
}

test('Wikimedia Commons kann freies WebM als Video normalisieren', async () => {
  let requested = '';
  const fetchImpl = async (url) => {
    requested = String(url);
    return response({
      query: {
        pages: [{
          pageid: 123,
          title: 'File:Historical footage.webm',
          imageinfo: [{
            mime: 'video/webm',
            width: 1920,
            height: 1080,
            url: 'https://upload.wikimedia.org/example/history.webm',
            thumburl: 'https://upload.wikimedia.org/example/history.jpg',
            user: 'Archivist',
            extmetadata: {
              LicenseShortName: {value: 'CC BY-SA 4.0'},
              LicenseUrl: {value: 'https://creativecommons.org/licenses/by-sa/4.0/'},
              UsageTerms: {value: 'CC BY-SA'},
              Artist: {value: 'Archivist'},
              ImageDescription: {value: 'Historical film footage'}
            }
          }]
        }]
      }
    });
  };
  const result = await searchWikimedia({query: 'historical footage', type: 'video', orientation: 'horizontal', perPage: 5, fetchImpl});
  assert.match(requested, /filetype%3Avideo|filetype:video/);
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].type, 'video');
  assert.equal(result.assets[0].files.original, 'https://upload.wikimedia.org/example/history.webm');
  assert.equal(result.assets[0].license, 'cc-by-sa');
});

test('NASA Provider loest Video ueber Asset-Manifest auf', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const href = String(url);
    calls.push(href);
    if (href.includes('/search')) {
      return response({collection: {metadata: {total_hits: 1}, items: [{
        data: [{nasa_id: 'NASA-001', title: 'Earth from orbit', description: 'Satellite view', keywords: ['earth','satellite'], center: 'NASA', date_created: '2020-01-01'}],
        links: [{rel: 'preview', href: 'https://images-assets.nasa.gov/preview.jpg'}]
      }]}});
    }
    return response({collection: {items: [
      {href: 'https://images-assets.nasa.gov/video/NASA-001~small.mp4'},
      {href: 'https://images-assets.nasa.gov/video/NASA-001~orig.mp4'}
    ]}});
  };
  const result = await searchNasa({query: 'earth satellite', type: 'video', perPage: 4, fetchImpl});
  assert.equal(calls.length, 2);
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].type, 'video');
  assert.match(result.assets[0].files.original, /\.mp4$/);
  assert.match(result.assets[0].source_url, /images\.nasa\.gov\/details/);
});

test('Library of Congress Provider findet historische MP4-Ressource und behaelt Rights Review', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const href = String(url);
    calls.push(href);
    if (href.includes('/film-and-videos/')) {
      return response({
        pagination: {total: 1},
        results: [{
          id: 'https://www.loc.gov/item/abc123/',
          item_id: 'abc123',
          title: 'Historic factory film',
          date: '1942',
          contributor: ['Creator Name'],
          description: ['Factory workers'],
          subject: ['industry'],
          rights: ['Rights advisory applies'],
          image_url: ['https://tile.loc.gov/preview.jpg']
        }]
      });
    }
    return response({
      item: {rights_advisory: 'Rights advisory applies'},
      resources: [{files: [{url: 'https://tile.loc.gov/storage-services/service/mbrs/abc123.mp4'}]}]
    });
  };
  const result = await searchLibraryOfCongress({query: 'historic factory', type: 'video', perPage: 4, fetchImpl});
  assert.equal(calls.length, 2);
  assert.equal(result.assets.length, 1);
  assert.equal(result.assets[0].type, 'video');
  assert.match(result.assets[0].files.original, /\.mp4$/);
  assert.equal(result.assets[0].license, 'loc-rights-review');
});
