import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Arsenal Builder merkt Keys nur nach provider-spezifischer erfolgreicher Suche', () => {
  const source = read('web/arsenal-builder.js');
  assert.doesNotMatch(source, /apiKey\.input\.addEventListener\('input'[\s\S]{0,300}sessionKeys\.set/);
  assert.doesNotMatch(source, /function getApiKeyOrError\(\)[\s\S]{0,350}sessionKeys\.set/);
  assert.match(source, /rememberProviderKey\(provider\.input\.value, transientApiKey, data\.provider !== 'pixabay' \|\| !data\.cached\)/);
  assert.match(source, /const keyWasValidated = data\.provider !== 'pixabay' \|\| \(data\.groups \?\? \[\]\)\.some\(\(group\) => !group\.cached\)/);
  assert.match(source, /function rememberProviderKey\(providerName, value, validated = true\)/);
  assert.match(source, /if \(!validated \|\| keylessProviders\.has\(providerName\) \|\| !value\) return/);
});

test('Themenrecherche merkt nur Keys von tatsächlich erfolgreichen Provider-Gruppen', () => {
  const source = read('web/entity-research.js');
  assert.doesNotMatch(source, /\.input\.addEventListener\('input'[\s\S]{0,300}researchKeys\.set/);
  assert.match(source, /const typedKeys = readTypedKeys\(\)/);
  assert.match(source, /rememberValidatedKeys\(typedKeys, data\.groups \?\? \[\]\)/);
  assert.match(source, /group\.provider !== 'pixabay' \|\| !group\.cached/);
  assert.match(source, /validatedProviders\.has\(provider\)/);
});

test('Script Visual Finder speichert nur vom Server validierte Provider-Keys', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /const data = await post\('\/script-visual-api\/search-scene'/);
  assert.match(source, /const validated = new Set\(data\.validatedKeyProviders \?\? \[\]\)/);
  assert.match(source, /if \(value && validated\.has\(provider\)\) sessionKeys\.set\(provider, value\)/);
  const searchIndex = source.indexOf("const data = await post('/script-visual-api/search-scene'");
  const rememberIndex = source.indexOf('sessionKeys.set(provider, value)', searchIndex);
  assert.ok(searchIndex >= 0 && rememberIndex > searchIndex, 'Keys müssen erst nach erfolgreichem Such-POST und Provider-Nachweis gespeichert werden.');
});

test('Pixabay-Cache allein gilt in keinem Suchbereich als Prüfung eines neu eingegebenen Keys', () => {
  const arsenal = read('web/arsenal-builder.js');
  const entity = read('web/entity-research.js');
  const scriptVisualApi = read('scripts/local-script-visual-api.mjs');
  assert.match(arsenal, /data\.provider !== 'pixabay' \|\| !data\.cached/);
  assert.match(entity, /group\.provider !== 'pixabay' \|\| !group\.cached/);
  assert.match(scriptVisualApi, /!KEYLESS\.has\(provider\) && !execution\.cached/);
});

test('Keiner der drei Suchbereiche persistiert Provider-Keys im Browser-Speicher', () => {
  for (const file of ['web/arsenal-builder.js', 'web/entity-research.js', 'web/script-visual-finder.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /localStorage[^\n]*(?:key|api)/i, file);
    assert.doesNotMatch(source, /sessionStorage/i, file);
  }
});
