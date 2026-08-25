import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = fs.readFileSync(path.join(root, 'scripts/local-script-visual-api.mjs'), 'utf8');
const browser = fs.readFileSync(path.join(root, 'web/script-visual-finder.js'), 'utf8');

test('Script Visual API trennt erfolgreiche Provider von validierten Sitzungsschlüsseln', () => {
  assert.match(api, /successfulProviders:/);
  assert.match(api, /validatedKeyProviders:/);
  assert.match(api, /const validatedKeyProviders = new Set\(\)/);
  assert.match(api, /!KEYLESS\.has\(provider\) && !execution\.cached/);
  assert.match(api, /searchedProviders: outcome\.successfulProviders/);
});

test('Browser übernimmt nur vom Server bestätigte Provider in den Sitzungsspeicher', () => {
  assert.match(browser, /const validated = new Set\(data\.validatedKeyProviders \?\? \[\]\)/);
  assert.match(browser, /validated\.has\(provider\)/);
});

test('Finder dedupliziert über Provider-ID und kanonisierte Medienreferenzen', () => {
  assert.match(api, /function assetIdentities\(provider, asset\)/);
  assert.match(api, /canonicalUrl\(asset\?\.source_url\)/);
  assert.match(api, /canonicalUrl\(asset\?\.original_url\)/);
  assert.match(api, /canonicalUrl\(bestMediaUrl\(asset\?\.files\)\)/);
  assert.match(api, /localSeen\.has\(identity\)/);
  assert.match(api, /projectSeen\.has\(identity\)/);
});
