import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { restoreBackup, verifyBackup } from '../scripts/catalog-restore.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-restore-'));
  const backup = path.join(root, 'backups', 'test-backup');
  const catalog = path.join(backup, 'catalog');
  fs.mkdirSync(catalog, { recursive: true });
  const files = {
    'catalog/assets.json': JSON.stringify({ catalogVersion: 1, updatedAt: '2026-08-04T00:00:00.000Z', assets: [] }),
    'catalog/reviews.json': JSON.stringify({ version: 1, updatedAt: '2026-08-04T00:00:00.000Z', decisions: [] }),
    'catalog/usage.json': JSON.stringify({ version: 1, updatedAt: '2026-08-04T00:00:00.000Z', uses: [] })
  };
  const entries = [];
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(backup, ...relative.split('/'));
    fs.writeFileSync(target, `${content}\n`);
    const buffer = fs.readFileSync(target);
    entries.push({ path: relative, sha256: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length });
  }
  fs.writeFileSync(path.join(backup, 'manifest.json'), `${JSON.stringify({ version: 1, createdAt: '2026-08-04T00:00:00.000Z', files: entries }, null, 2)}\n`);
  return { root, backup };
}

test('gültiges Backup wird vollständig verifiziert', () => {
  const { root } = fixture();
  const result = verifyBackup({ root, backup: 'backups/test-backup' });
  assert.equal(result.files.length, 3);
  const dryRun = restoreBackup({ root, backup: 'backups/test-backup', dryRun: true });
  assert.equal(dryRun.restored, false);
  assert.equal(dryRun.verifiedFiles, 3);
  fs.rmSync(root, { recursive: true, force: true });
});

test('veränderte Backup-Datei wird über SHA-256 erkannt', () => {
  const { root, backup } = fixture();
  fs.appendFileSync(path.join(backup, 'catalog', 'assets.json'), 'manipuliert');
  assert.throws(() => verifyBackup({ root, backup: 'backups/test-backup' }), /Dateigröße stimmt nicht|SHA-256 stimmt nicht/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('Restore akzeptiert keine Pfade außerhalb des Backup-Ordners', () => {
  const { root } = fixture();
  assert.throws(() => verifyBackup({ root, backup: '../anderer-ordner' }), /innerhalb des Ordners backups/);
  fs.rmSync(root, { recursive: true, force: true });
});
