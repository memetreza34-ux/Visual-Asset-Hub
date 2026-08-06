import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createMediaPack, validateIds, validatePublicHttpUrl } from '../scripts/export-media-pack.mjs';
import { validateMediaPackPayload } from '../scripts/local-admin-api.mjs';

function fixture(status = 'approved') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-media-pack-'));
  fs.mkdirSync(path.join(root, 'catalog'), { recursive: true });
  fs.mkdirSync(path.join(root, 'assets', 'graphics'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets', 'graphics', 'test.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  fs.writeFileSync(path.join(root, 'catalog', 'assets.json'), JSON.stringify({
    catalogVersion: 1,
    updatedAt: new Date().toISOString(),
    assets: [{
      id: 'VAH-TEST0001',
      filename: 'test.svg',
      title: 'Testgrafik',
      description: 'Lokale freigegebene Testgrafik.',
      type: 'graphic',
      category: 'abstract-backgrounds',
      tags: ['test', 'graphic'],
      status,
      storage: { kind: 'repository', path: 'assets/graphics/test.svg' },
      rights: {
        licenseStatus: 'owned',
        sourceName: 'Test',
        usageScopes: ['organic-social'],
        attributionRequired: false,
        attributionText: 'Testgrafik'
      }
    }]
  }, null, 2));
  return root;
}

test('freigegebenes lokales Asset wird mit Manifest und Prüfsumme exportiert', async () => {
  const root = fixture('approved');
  try {
    const result = await createMediaPack({ root, ids: ['VAH-TEST0001'], name: 'Reel Paket' });
    assert.equal(result.assetCount, 1);
    const directory = path.join(root, result.directory);
    assert.ok(fs.existsSync(path.join(directory, 'media', 'test.svg')));
    assert.ok(fs.existsSync(path.join(directory, 'ATTRIBUTION.md')));
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.assets[0].id, 'VAH-TEST0001');
    assert.match(manifest.assets[0].sha256, /^[a-f0-9]{64}$/);
    assert.ok(manifest.totalBytes > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('ungeprüfte Assets werden aus Medienpaketen blockiert', async () => {
  const root = fixture('review');
  try {
    await assert.rejects(() => createMediaPack({ root, ids: ['VAH-TEST0001'], name: 'test-pack' }), /nicht freigegeben/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('private Downloadziele und ungültige Auswahl werden blockiert', () => {
  for (const value of ['http://127.0.0.1/file.mp4', 'http://localhost/file.mp4', 'http://192.168.1.2/file.mp4', 'file:///tmp/file.mp4']) {
    assert.throws(() => validatePublicHttpUrl(value));
  }
  assert.throws(() => validateIds(['VAH-TEST0001', 'VAH-TEST0001']), /Duplikate/);
  assert.throws(() => validateMediaPackPayload({ ids: ['VAH-TEST0001', 'VAH-TEST0001'], name: 'test' }), /Duplikate/);
  assert.deepEqual(validateMediaPackPayload({ ids: ['VAH-TEST0001'], name: 'Mein Reel Paket' }), { ids: ['VAH-TEST0001'], name: 'mein-reel-paket' });
});

test('Auswahlwerkzeug bindet lokalen Medienpaket-Endpunkt ein', () => {
  const script = fs.readFileSync(path.join(process.cwd(), 'web', 'selection-tools.js'), 'utf8');
  assert.match(script, /\/api\/media-pack/);
  assert.match(script, /status !== 'approved'/);
  assert.match(script, /X-VAH-Token/);
  assert.match(script, /Medienpaket erstellen/);
});
