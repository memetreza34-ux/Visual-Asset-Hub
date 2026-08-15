import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(repoRoot, 'scripts', 'build-found-media-vault.mjs');

test('Alles-Gefunden baut Katalog, normale Suchfunde und Themenrecherchen auf und bewahrt alte Funde', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-vault-'));
  try {
    fs.mkdirSync(path.join(root, 'catalog', 'channels'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(root, '.local-storage', 'arsenal-web'), { recursive: true });
    fs.writeFileSync(path.join(root, 'assets', 'test.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    fs.writeFileSync(path.join(root, 'catalog', 'channels', 'index.json'), JSON.stringify({ files: ['catalog/channels/finance.json', 'catalog/channels/combat-sports.json'] }));
    fs.writeFileSync(path.join(root, 'catalog', 'channels', 'finance.json'), JSON.stringify({
      id: 'finance', label: 'Finanzen', channelTag: 'channel-finance',
      collections: [{ id: 'stock-market', label: 'Aktien und Börse', queries: ['stock market'] }]
    }));
    fs.writeFileSync(path.join(root, 'catalog', 'channels', 'combat-sports.json'), JSON.stringify({
      id: 'combat-sports', label: 'Kampfsport', channelTag: 'channel-combat-sports', collections: []
    }));
    fs.writeFileSync(path.join(root, 'catalog', 'assets.json'), JSON.stringify({ assets: [{
      id: 'VAH-LOCAL001', filename: 'test.svg', title: 'Börsenchart Übersicht', description: 'Eigene Testgrafik',
      type: 'image', category: 'finance-investing', orientation: 'vertical', status: 'review',
      tags: ['channel-finance', 'collection-stock-market'], technical: { width: 1080, height: 1920 },
      storage: { kind: 'local', localPath: 'assets/test.svg' }, rights: { sourceName: 'Eigene Datei', licenseStatus: 'owned', attributionRequired: false }
    }] }));

    const normalSearch = path.join(root, '.local-storage', 'arsenal-web', 'ARS-NORMAL.json');
    fs.writeFileSync(normalSearch, JSON.stringify({
      provider: 'pexels',
      arsenalJob: { channel: 'finance', channelLabel: 'Finanzen', collection: 'stock-market', collectionLabel: 'Aktien und Börse', query: 'stock market', type: 'video', orientation: 'vertical' },
      result: { assets: [{ provider: 'pexels', provider_id: '12345', type: 'video', title: 'Pexels Video 12345', creator: 'Test Creator', width: 1080, height: 1920, duration_seconds: 8, orientation: 'vertical', source_url: 'https://www.pexels.com/video/12345/', preview_url: 'https://images.pexels.com/test.jpg', files: [{ url: 'https://videos.pexels.com/test.mp4' }] }] }
    }));

    const topicSearch = path.join(root, '.local-storage', 'arsenal-web', 'ARS-TOPIC.json');
    fs.writeFileSync(topicSearch, JSON.stringify({
      provider: 'wikimedia',
      research: { topic: 'Conor McGregor', section: 'training', sectionLabel: 'Training & Gym' },
      arsenalJob: {
        channel: 'combat-sports', channelLabel: 'Kampfsport', collection: 'topic-conor-mcgregor-training', collectionLabel: 'Conor McGregor · Training & Gym',
        query: 'Conor McGregor training gym', type: 'photo', orientation: 'vertical', researchTopic: 'Conor McGregor', researchSection: 'training', researchSectionLabel: 'Training & Gym'
      },
      result: { assets: [{ provider: 'wikimedia', provider_id: 'CM1', type: 'image', title: 'Training photo', creator: 'Example', width: 1400, height: 2100, orientation: 'vertical', source_url: 'https://commons.wikimedia.org/wiki/File:Example.jpg', preview_url: 'https://upload.wikimedia.org/example.jpg', files: { original: 'https://upload.wikimedia.org/original.jpg' }, license: 'cc-by-sa' }] }
    }));

    const first = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', shell: false });
    assert.equal(first.status, 0, `${first.stdout}\n${first.stderr}`);

    const vault = path.join(root, 'ALLES-GEFUNDEN');
    assert.ok(fs.existsSync(path.join(vault, '00-GESAMTINDEX.md')));
    assert.ok(fs.existsSync(path.join(vault, '00-GESAMTINDEX.csv')));
    const manifest = JSON.parse(fs.readFileSync(path.join(vault, '00-MANIFEST.json'), 'utf8'));
    assert.equal(manifest.version, 3);
    assert.equal(manifest.assets.length, 1);
    assert.equal(manifest.candidates.length, 2);
    assert.equal(manifest.candidates.find((item) => item.providerId === '12345').title, 'Aktien und Börse – Video von Test Creator');
    assert.equal(manifest.candidates.find((item) => item.providerId === 'CM1').researchTopic, 'Conor McGregor');

    const reviewDir = path.join(vault, '01-Finanzen', '01-Aktien und Borse', '02-REVIEW');
    assert.ok(fs.existsSync(reviewDir));
    assert.ok(fs.readdirSync(reviewDir).some((name) => name.endsWith('.svg')));

    const candidateDir = path.join(vault, '90-GEFUNDENE-KANDIDATEN', '01-Finanzen', '01-Aktien und Borse', 'Pexels');
    assert.ok(fs.existsSync(candidateDir));
    assert.ok(fs.readdirSync(candidateDir).some((name) => name.endsWith('-INFO.md')));

    const topicDir = path.join(vault, '05-THEMENRECHERCHEN', '04-Kampfsport', 'Conor McGregor', '02-Training & Gym', 'Wikimedia Commons');
    assert.ok(fs.existsSync(topicDir));
    assert.ok(fs.readdirSync(topicDir).some((name) => name.endsWith('-INFO.md')));
    assert.ok(fs.readdirSync(topicDir).some((name) => name.endsWith('-QUELLE.url')));

    fs.rmSync(normalSearch);
    fs.rmSync(topicSearch);
    const second = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', shell: false });
    assert.equal(second.status, 0, `${second.stdout}\n${second.stderr}`);
    assert.ok(fs.existsSync(candidateDir));
    assert.ok(fs.readdirSync(candidateDir).some((name) => name.endsWith('-INFO.md')), 'historischer normaler Suchfund muss erhalten bleiben');
    assert.ok(fs.existsSync(topicDir));
    assert.ok(fs.readdirSync(topicDir).some((name) => name.endsWith('-INFO.md')), 'historischer Themenfund muss erhalten bleiben');
    assert.ok(fs.existsSync(path.join(vault, '05-THEMENRECHERCHEN', '00-HISTORIE.md')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
