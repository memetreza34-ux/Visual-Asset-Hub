import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'web/script-visual-media-pack.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');

test('Script Visual Finder lädt die sichere Schnittpaket-Integration', () => {
  assert.match(html, /script-visual-media-pack\.js/);
  assert.match(source, /Schnittpaket aus Auswahl/);
  assert.match(source, /\/api\/media-pack/);
  assert.match(source, /\/api\/health/);
});

test('Schnittpaket nutzt nur im Szenenboard ausgewählte und bereits importierte Asset-IDs', () => {
  assert.match(source, /scene\.selectedPrimary/);
  assert.match(source, /scene\.selectedAlternatives/);
  assert.match(source, /candidate\.importedAssetIds/);
  assert.match(source, /selectedCandidates/);
  assert.match(source, /missingImportCandidates/);
});

test('nur freigegebene Katalogassets dürfen in Script-Visual-Schnittpakete', () => {
  assert.match(source, /byId\.get\(id\)\?\.status === 'approved'/);
  assert.match(source, /Keines der ausgewählten Szenenassets ist bereits freigegeben/);
  assert.doesNotMatch(source, /\/api\/review/);
  assert.doesNotMatch(source, /status\s*=\s*['"]approved['"]/);
});

test('lange Projektauswahl wird in Pakete zu höchstens 20 Assets geteilt', () => {
  assert.match(source, /const MAX_PACK_ASSETS = 20/);
  assert.match(source, /chunk\(approved, MAX_PACK_ASSETS\)/);
  assert.match(source, /teil-\$\{index \+ 1\}/);
  assert.match(source, /for \(let index = 0; index < chunks\.length; index \+= 1\)/);
});

test('Schnittpaket-Integration speichert weder Sitzungstoken noch Provider-Keys persistent', () => {
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /apiKey/);
  assert.match(source, /let adminToken = ''/);
});
