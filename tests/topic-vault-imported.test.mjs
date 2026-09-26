import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(repoRoot, 'scripts', 'augment-topic-vault.mjs');

test('importierter Themenfund wird im Themenordner gespiegelt und historischer Fund markiert', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-topic-import-'));
  try {
    fs.mkdirSync(path.join(root, 'catalog'), { recursive: true });
    const candidateDir = path.join(root, 'ALLES-GEFUNDEN', '05-THEMENRECHERCHEN', '04-Kampfsport', 'Conor McGregor', '02-Training & Gym', 'Pexels');
    fs.mkdirSync(candidateDir, { recursive: true });
    fs.writeFileSync(path.join(candidateDir, '001-find-INFO.md'), [
      '# Fund', '',
      '> NOCH NICHT IMPORTIERT. Dieser Treffer wurde nur bei einer Mediensuche gefunden und besitzt noch keine Freigabe im Katalog.', '',
      '## Links', '',
      '- Quellseite: https://www.pexels.com/video/12345/'
    ].join('\n'));
    fs.writeFileSync(path.join(root, 'catalog', 'assets.json'), JSON.stringify({ assets: [{
      id: 'VAH-ABCDEFGH',
      title: 'Conor Training B-Roll',
      type: 'video',
      status: 'review',
      tags: ['channel-combat-sports', 'entity-research', 'topic-conor-mcgregor', 'topic-section-training'],
      searchAliases: ['Kampfsport', 'Conor McGregor · Training & Gym'],
      storage: { kind: 'external', externalUrl: 'https://videos.pexels.com/test.mp4', previewUrl: 'https://images.pexels.com/test.jpg' },
      rights: { sourceName: 'Pexels', sourceUrl: 'https://www.pexels.com/video/12345/', licenseStatus: 'licensed', attributionRequired: false, usageScopes: ['youtube'] }
    }] }));

    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', shell: false });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    const importedRoot = path.join(candidateDir, '90-IMPORTIERT', '02-REVIEW');
    assert.ok(fs.existsSync(importedRoot));
    assert.ok(fs.readdirSync(importedRoot).some((name) => name.endsWith('-KATALOG.md')));
    assert.ok(fs.readdirSync(importedRoot).some((name) => name.endsWith('-QUELLE.url')));

    const historical = fs.readFileSync(path.join(candidateDir, '001-find-INFO.md'), 'utf8');
    assert.match(historical, /BEREITS IN DEN KATALOG IMPORTIERT/);
    assert.doesNotMatch(historical, /> NOCH NICHT IMPORTIERT\./);

    const index = path.join(root, 'ALLES-GEFUNDEN', '05-THEMENRECHERCHEN', '04-Kampfsport', 'Conor McGregor', '00-IMPORTIERTE-ASSETS.md');
    assert.ok(fs.existsSync(index));
    assert.match(fs.readFileSync(index, 'utf8'), /VAH-ABCDEFGH/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
