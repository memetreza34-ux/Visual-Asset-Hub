import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const builder = fs.readFileSync(path.join(process.cwd(), 'web', 'arsenal-builder.js'), 'utf8');
const css = fs.readFileSync(path.join(process.cwd(), 'web', 'arsenal-builder.css'), 'utf8');

test('Batch-Suchergebnisse können gesammelt ohne Zwischen-Reload importiert werden', () => {
  assert.match(builder, /Alle markierten Batch-Treffer importieren/);
  assert.match(builder, /reloadAfterImport:\s*false/);
  assert.match(builder, /processedGroups/);
  assert.match(builder, /for \(const item of selections\)/);
  assert.match(builder, /setTimeout\(\(\) => location\.reload\(\), 1100\)/);
});

test('bereits importierte Batch-Karten werden gesperrt und markiert', () => {
  assert.match(builder, /function markImported/);
  assert.match(builder, /input\.disabled = true/);
  assert.match(builder, /classList\.add\('imported'\)/);
  assert.match(css, /\.builder-result-card\.imported/);
  assert.match(css, /content:"importiert"/);
});

test('Unsplash-Batchimport benötigt weiterhin den Key im aktuellen Arbeitsspeicher', () => {
  assert.match(builder, /selections\.some\(\(item\) => item\.group\.provider === 'unsplash'\)/);
  assert.match(builder, /keyResolver\('unsplash'\)/);
  assert.match(builder, /Unsplash-Key wurde aus dem Arbeitsspeicher gelöscht/);
});
