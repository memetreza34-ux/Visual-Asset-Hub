import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Arsenal Builder merkt neu eingetippte Keys erst nach erfolgreicher Suche', () => {
  const source = read('web/arsenal-builder.js');
  assert.doesNotMatch(source, /apiKey\.input\.addEventListener\('input'[\s\S]{0,300}sessionKeys\.set/);
  assert.doesNotMatch(source, /function getApiKeyOrError\(\)[\s\S]{0,350}sessionKeys\.set/);
  assert.match(source, /const data = await post\('\/arsenal-api\/search'[\s\S]{0,250}rememberProviderKey\(provider\.input\.value, transientApiKey\)/);
  assert.match(source, /const data = await post\('\/arsenal-api\/batch-search'[\s\S]{0,300}rememberProviderKey\(provider\.input\.value, transientApiKey\)/);
});

test('Themenrecherche merkt neu eingetippte Keys erst nach erfolgreichem Recherchelauf', () => {
  const source = read('web/entity-research.js');
  assert.doesNotMatch(source, /\.input\.addEventListener\('input'[\s\S]{0,300}researchKeys\.set/);
  assert.match(source, /const typedKeys = readTypedKeys\(\)/);
  assert.match(source, /const data = await post\('\/entity-api\/search'[\s\S]{0,300}rememberValidatedKeys\(typedKeys\)/);
  assert.doesNotMatch(source, /event\.preventDefault\(\);\s*rememberValidatedKeys/);
});

test('Script Visual Finder folgt derselben validierten Key-Regel', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /const data = await post\('\/script-visual-api\/search-scene'/);
  assert.match(source, /for \(const \[provider, value\] of Object\.entries\(typed\)\) if \(value\) sessionKeys\.set\(provider, value\)/);
  const searchIndex = source.indexOf("const data = await post('/script-visual-api/search-scene'");
  const rememberIndex = source.indexOf('sessionKeys.set(provider, value)', searchIndex);
  assert.ok(searchIndex >= 0 && rememberIndex > searchIndex, 'Keys müssen erst nach erfolgreichem Such-POST gespeichert werden.');
});

test('Keiner der drei Suchbereiche persistiert Provider-Keys im Browser-Speicher', () => {
  for (const file of ['web/arsenal-builder.js', 'web/entity-research.js', 'web/script-visual-finder.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /localStorage[^\n]*(?:key|api)/i, file);
    assert.doesNotMatch(source, /sessionStorage/i, file);
  }
});
