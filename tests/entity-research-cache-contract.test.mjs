import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Themenrecherche verwendet für Pixabay denselben 24-Stunden-Cachebereich wie der Arsenal Builder', () => {
  const entity = fs.readFileSync(path.join(root, 'scripts/local-entity-api.mjs'), 'utf8');
  const arsenal = fs.readFileSync(path.join(root, 'scripts/local-arsenal-api.mjs'), 'utf8');
  for (const source of [entity, arsenal]) {
    assert.match(source, /24 \* 60 \* 60 \* 1000/);
    assert.match(source, /pixabay-cache/);
    assert.match(source, /query/);
    assert.match(source, /orientation/);
    assert.match(source, /perPage/);
    assert.match(source, /locale:\s*'de'/);
    assert.match(source, /page:\s*1/);
  }
  assert.match(entity, /cachedSearches/);
  assert.match(entity, /readFreshPixabayCache/);
});

test('Themenrecherche speichert keine API-Keys in Suchwrappern', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/local-entity-api.mjs'), 'utf8');
  const wrapperBlock = source.slice(source.indexOf('const wrapper = {'), source.indexOf('fs.writeFileSync(path.join(searchDirectory'));
  assert.doesNotMatch(wrapperBlock, /apiKey|keys/);
  assert.match(wrapperBlock, /arsenalJob:\s*job/);
  assert.match(wrapperBlock, /research:/);
});
