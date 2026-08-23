import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'scripts/build-found-media-vault.mjs'), 'utf8');

test('Vault-Neuaufbau bewahrt Script-Visual-Projekte', () => {
  assert.match(source, /06-SKRIPT-PROJEKTE/);
  assert.match(source, /vault-script-project-history/);
  assert.match(source, /scriptVisualProjectCount/);
  assert.match(source, /restoreArchives/);
});
