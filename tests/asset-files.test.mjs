import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const catalog = readJson('catalog/assets.json');
const index = readJson('catalog/search-index.json');
const assets = catalog.assets ?? [];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

test('alle lokalen Originaldateien existieren', () => {
  for (const asset of assets) {
    if (!['repository', 'git-lfs'].includes(asset.storage?.kind)) continue;
    assert.ok(asset.storage.path, `${asset.id}: lokaler Speicherpfad fehlt`);
    const absolute = path.join(root, ...asset.storage.path.split('/'));
    assert.ok(fs.existsSync(absolute), `${asset.id}: Datei fehlt: ${asset.storage.path}`);
    assert.ok(fs.statSync(absolute).isFile(), `${asset.id}: Speicherpfad ist keine Datei`);
  }
});

test('externe Assets besitzen sichere HTTP(S)-Originale', () => {
  for (const asset of assets.filter((entry) => entry.storage?.kind === 'external')) {
    assert.match(asset.storage.externalUrl ?? '', /^https?:\/\//i, `${asset.id}: externe Original-URL fehlt`);
  }
});

test('Suchindex entspricht dem aktuellen Katalog', () => {
  assert.equal(index.catalogVersion, catalog.catalogVersion);
  assert.equal(index.catalogUpdatedAt, catalog.updatedAt);
  assert.equal(index.assetCount, assets.length);
  assert.equal(index.records.length, assets.length);
  assert.deepEqual(
    index.records.map((record) => record.id).sort(),
    assets.map((asset) => asset.id).sort()
  );
});

test('Beta enthält genügend reale Medien für den Bedienungstest', () => {
  const videos = assets.filter((asset) => asset.type === 'video');
  const staticVisuals = assets.filter((asset) => ['image', 'graphic'].includes(asset.type));
  assert.ok(videos.length >= 3, `Nur ${videos.length} Videos vorhanden`);
  assert.ok(staticVisuals.length >= 3, `Nur ${staticVisuals.length} statische Bilder/Grafiken vorhanden`);
});

test('lokale statische Medien werden im Index als Vorschau verwendet', () => {
  const records = new Map(index.records.map((record) => [record.id, record]));
  for (const asset of assets.filter((entry) => entry.storage?.kind === 'repository' && ['image', 'graphic'].includes(entry.type))) {
    const record = records.get(asset.id);
    assert.ok(record, `${asset.id}: Indexeintrag fehlt`);
    assert.equal(record.source, asset.storage.path);
    assert.equal(record.preview, asset.storage.path);
  }
});
