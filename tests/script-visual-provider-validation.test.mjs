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

test('Gemischt-Modus wartet nach Möglichkeit auf Video und Bild', () => {
  assert.match(api, /const mixedRequested = project\.settings\.mediaPreference === 'mixed'/);
  assert.match(api, /const mixedMediaPossible = mixedRequested && enabledProviders\.some/);
  assert.match(api, /searchTypeForProvider\(provider, scene\.preferredMediaType, mixedRequested\)/);
  assert.match(api, /const mixedMediaReady = !mixedMediaPossible \|\| hasMixedMediaCandidates\(candidates\)/);
  assert.match(api, /providersUsed\.size >= settings\.minProviders && mixedMediaReady/);
});

test('Gemischt-Modus nutzt Videoquellen für B-Roll und Fotoquellen für Standbilder', () => {
  assert.match(api, /function searchTypeForProvider\(provider, preferredType, mixedRequested\)/);
  assert.match(api, /PHOTO_ONLY\.has\(provider\).*return 'photo'/);
  assert.match(api, /if \(mixedRequested\) return 'video'/);
  assert.match(api, /function hasMixedMediaCandidates\(candidates\)/);
  assert.match(api, /item\.type === 'video'/);
  assert.match(api, /item\.type !== 'video'/);
});

test('Kandidatenlimit bewahrt Auswahl und hält im Gemischt-Modus beide Medientypen', () => {
  assert.match(api, /function retainSceneCandidates\(candidates, scene, mixedRequested, limit = 20\)/);
  assert.match(api, /scene\.selectedPrimary/);
  assert.match(api, /scene\.selectedAlternatives/);
  assert.match(api, /candidate\.type === 'video'/);
  assert.match(api, /candidate\.type !== 'video'/);
});

test('bereits vorhandene Katalog-Assets werden mit der Skriptszene verknüpft statt erneut importiert', () => {
  assert.match(api, /findExistingCatalogAssetIds\(afterAssets, candidate\)/);
  assert.match(api, /linkedExisting: existingIds\.length/);
  assert.match(api, /candidate\.importedAssetIds = \[\.\.\.new Set/);
  assert.match(api, /asset\?\.rights\?\.sourceUrl/);
  assert.match(api, /asset\?\.storage\?\.externalUrl/);
  assert.match(browser, /data\.linkedExisting/);
  assert.match(browser, /war bereits im Katalog und wurde mit/);
});
