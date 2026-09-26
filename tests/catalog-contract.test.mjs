import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'catalog/taxonomy.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/assets.json'), 'utf8'));

function run(script) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

test('taxonomy values and prefixes are unique', () => {
  for (const [name, values] of Object.entries({
    assetTypes: taxonomy.assetTypes,
    categories: taxonomy.categories,
    orientations: taxonomy.orientations,
    shotTypes: taxonomy.shotTypes,
    cameraMovements: taxonomy.cameraMovements,
    styles: taxonomy.styles,
    usageScopes: taxonomy.usageScopes,
    licenseStatuses: taxonomy.licenseStatuses,
    lifecycleStatuses: taxonomy.lifecycleStatuses
  })) {
    assert.equal(new Set(values).size, values.length, `${name} enthält Duplikate`);
  }
  assert.deepEqual(Object.keys(taxonomy.typePrefixes).sort(), [...taxonomy.assetTypes].sort());
  assert.equal(new Set(Object.values(taxonomy.typePrefixes)).size, taxonomy.assetTypes.length);
});

test('catalog passes strict validation', () => {
  const result = run('scripts/validate-catalog.mjs');
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('search index is deterministic and complete', () => {
  const first = run('scripts/build-index.mjs');
  assert.equal(first.status, 0, first.stderr || first.stdout);
  const firstContent = fs.readFileSync(path.join(root, 'catalog/search-index.json'), 'utf8');

  const second = run('scripts/build-index.mjs');
  assert.equal(second.status, 0, second.stderr || second.stdout);
  const secondContent = fs.readFileSync(path.join(root, 'catalog/search-index.json'), 'utf8');
  assert.equal(firstContent, secondContent);

  const index = JSON.parse(firstContent);
  assert.equal(index.assetCount, catalog.assets.length);
  assert.equal(index.records.length, catalog.assets.length);
  assert.equal(index.catalogVersion, catalog.catalogVersion);
  assert.equal(index.catalogUpdatedAt, catalog.updatedAt);
  for (const asset of catalog.assets.filter((entry) => entry.storage.previewUrl)) {
    assert.equal(index.records.find((record) => record.id === asset.id)?.preview, asset.storage.previewUrl);
  }
});

test('schema contains core rights and discovery fields', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'catalog/schema.json'), 'utf8'));
  const properties = schema.$defs.asset.properties;
  for (const key of ['id', 'filename', 'tags', 'searchAliases', 'storage', 'rights', 'sha256']) {
    assert.ok(properties[key], `Schema-Feld fehlt: ${key}`);
  }
  assert.ok(properties.storage.properties.previewUrl, 'storage.previewUrl fehlt im Schema');
  assert.ok(schema.$defs.asset.required.includes('rights'));
  assert.ok(schema.$defs.asset.required.includes('storage'));
});
