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

test('Projekttitel werden vor der bestehenden Media-Pack-API sicher normalisiert und begrenzt', () => {
  assert.match(source, /const MAX_PACK_NAME_LENGTH = 80/);
  assert.match(source, /function packBaseName\(project\)/);
  assert.match(source, /\.normalize\('NFKD'\)/);
  assert.match(source, /\.replace\(\/\[\^a-z0-9\]\+\/g, '-'\)/);
  assert.match(source, /MAX_PACK_NAME_LENGTH - suffix\.length - 10/);
  assert.match(source, /'script-project'/);
  assert.match(source, /\.slice\(0, MAX_PACK_NAME_LENGTH\)/);
});

test('erzeugte Media-Pack-Pfade werden aus der bestehenden CLI-Antwort sichtbar gemacht', () => {
  assert.match(source, /function parseMediaPackOutput\(value\)/);
  assert.match(source, /JSON\.parse\(value\)/);
  assert.match(source, /if \(pack\.directory\) directories\.push\(pack\.directory\)/);
  assert.match(source, /Ordner: \$\{directories\.join\(' \| '\)\}/);
  assert.match(source, /directories \}\s*\}\)/);
});

test('Fehler in späteren Teilpaketen verschweigen bereits erfolgreiche Exporte nicht', () => {
  assert.match(source, /let exportedAssetCount = 0/);
  assert.match(source, /exportedAssetCount \+= chunks\[index\]\.length/);
  assert.match(source, /Teilpaket \$\{index \+ 1\}\/\$\{chunks\.length\} ist fehlgeschlagen/);
  assert.match(source, /Bereits erstellt: \$\{directories\.join\(' \| '\)\}/);
});

test('Schnittpaket-Integration speichert weder Sitzungstoken noch Provider-Keys persistent', () => {
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /apiKey/);
  assert.match(source, /let adminToken = ''/);
});
