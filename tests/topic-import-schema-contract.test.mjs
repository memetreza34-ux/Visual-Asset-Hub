import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Katalogschema erlaubt dokumentiertes CC BY-SA', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'catalog/schema.json'), 'utf8'));
  const values = schema.$defs.asset.properties.rights.properties.licenseStatus.enum;
  assert.ok(values.includes('cc-by-sa'));
});

test('Arsenal-Router begrenzt dynamische Suchaliasse auf Schema-Maximum', () => {
  const source = fs.readFileSync(path.join(root, 'scripts/arsenal-import-selected.mjs'), 'utf8');
  assert.match(source, /function safeAlias/);
  assert.match(source, /slice\(0, 80\)/);
  assert.match(source, /map\(safeAlias\)/);
});
