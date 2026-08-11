import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(repoRoot, 'scripts', 'build-found-media-vault.mjs');

test('Alles-Gefunden baut Katalog und Suchkandidaten kategorisiert auf und bewahrt alte Funde', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-vault-'));
  try {
    fs.mkdirSync(path.join(root, 'catalog', 'channels'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(root, '.local-storage', 'arsenal-web'), { recursive: true });
    fs.writeFileSync(path.join(root, 'assets', 'test.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    fs.writeFileSync(path.join(root, 'catalog', 'channels', 'index.json'), JSON.stringify({ files: ['catalog/channels/finance.json'] }));
    fs.writeFileSync(path.join(root, 'catalog', 'channels', 'finance.json'), JSON.stringify({
      id: 'finance',
      label: 'Finanzen',
      channelTag: 'channel-finance',
      collections: [{ id: 'stock-market', label: 'Aktien und Börse', queries: ['stock market'] }]
    }));
    fs.writeFileSync(path.join(root, 'catalog', 'assets.json'), JSON.stringify({ assets: [{
      id: 'VAH-LOCAL001',
      filename: 'test.svg',
      title: 'Börsenchart Übersicht',
      description: 'Eigene Testgrafik',
      type: 'image',
      category: 'finance-investing',
      orientation: 'vertical',
      status: 'review',
      tags: ['channel-finance', 'collection-stock-market'],
      technical: { width: 1080, height: 1920 },
      storage: { kind: 'local', localPath: 'assets/test.svg' },
      rights: { sourceName: 'Eigene Datei', licenseStatus: 'owned', attributionRequired: false }
    }] }));
    const searchFile = path.join(root, '.local-storage', 'arsenal-web', 'ARS-TEST.json');
    fs.writeFileSync(searchFile, JSON.stringify({
      provider: 'pexels',
      arsenalJob: {
        channel: 'finance', channelLabel: 'Finanzen', collection: 'stock-market', collectionLabel: 'Aktien und Börse',
        query: 'stock market', type: 'video', orientation: 'vertical'
      },
      result: { assets: [{
        provider: 'pexels', provider_id: '12345', type: 'video', title: 'Pexels Video 12345',
        creator: 'Test Creator', width: 1080, height: 1920, duration_seconds: 8, orientation: 'vertical',
        source_url: 'https://www.pexels.com/video/12345/', preview_url: 'https://images.pexels.com/test.jpg',
        files: [{ url: 'https://videos.pexels.com/test.mp4' }]
      }] }
    }));

    const first = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', shell: false });
    assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);

    const vault = path.join(root, 'ALLES-GEFUNDEN');
    assert.ok(fs.existsSync(path.join(vault, '00-GESAMTINDEX.md')));
    assert.ok(fs.existsSync(path.join(vault, '00-GESAMTINDEX.csv')));
    const manifest = JSON.parse(fs.readFileSync(path.join(vault, '00-MANIFEST.json'), 'utf8'));
    assert.equal(manifest.version, 2);
    assert.equal(manifest.assets.length, 1);
    assert.equal(manifest.candidates.length, 1);
    assert.equal(manifest.candidates[0].title, 'Aktien und Börse – Video von Test Creator');

    const reviewDir = path.join(vault, '01-Finanzen', '01-Aktien und Borse', '02-REVIEW');
    assert.ok(fs.existsSync(reviewDir));
    assert.ok(fs.readdirSync(reviewDir).some((name) => name.endsWith('.svg')));
    assert.ok(fs.readdirSync(reviewDir).some((name) => name.endsWith('-INFO.md')));

    const candidateDir = path.join(vault, '90-GEFUNDENE-KANDIDATEN', '01-Finanzen', '01-Aktien und Borse', 'Pexels');
    assert.ok(fs.existsSync(candidateDir));
    const candidateFiles = fs.readdirSync(candidateDir);
    assert.ok(candidateFiles.some((name) => name.endsWith('-INFO.md')));
    assert.ok(candidateFiles.some((name) => name.endsWith('-QUELLE.url')));
    assert.ok(candidateFiles.some((name) => name.endsWith('-MEDIUM.url')));
    assert.ok(candidateFiles.some((name) => name.endsWith('-VORSCHAU.url')));

    fs.rmSync(searchFile);
    const second = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', shell: false });
    assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
    assert.ok(fs.existsSync(candidateDir));
    assert.ok(fs.readdirSync(candidateDir).some((name) => name.endsWith('-INFO.md')), 'historischer Suchfund muss nach dem Neuaufbau erhalten bleiben');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
