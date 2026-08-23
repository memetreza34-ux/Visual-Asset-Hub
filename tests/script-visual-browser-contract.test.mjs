import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Script Visual Finder ist in HTML und Navigation sichtbar', () => {
  const html = read('web/index.html');
  const nav = read('web/workspace-nav.js');
  assert.match(html, /id="script-visual-finder"/);
  assert.match(html, /script-visual-finder\.css/);
  assert.match(html, /script-visual-finder\.js/);
  assert.match(nav, /Skript → Visuals/);
  assert.match(nav, /#script-visual-finder/);
});

test('nur das Skript ist Pflicht, weitere Einstellungen sind optional oder vorbelegt', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /Fertiges Skript/);
  assert.match(source, /required: true/);
  assert.match(source, /Zuordnung · optional/);
  assert.match(source, /Projekttitel · optional/);
  assert.match(source, /Automatisch/);
});

test('Browser zeigt Bilder, direkte Video-Player und mehrere Kandidaten pro Szene', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /createElement\('video'\)/);
  assert.match(source, /video\.controls = true/);
  assert.match(source, /createElement\('img'\)/);
  assert.match(source, /svf-candidate-grid/);
  assert.match(source, /Als Hauptvisual/);
  assert.match(source, /Als Alternative/);
});

test('Browser unterstützt lange sequenzielle Recherche mit Fortschritt und Stoppen', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /Alle Szenen recherchieren/);
  assert.match(source, /Recherche fortsetzen/);
  assert.match(source, /stopRequested/);
  assert.match(source, /Szenen recherchiert/);
});

test('Provider-Keys bleiben nur im Arbeitsspeicher', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /new Map\(\)/);
  assert.match(source, /Sitzungs-Keys löschen/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
});

test('Import bleibt bewusst und läuft über Review-Pipeline', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /Als Review importieren/);
  assert.match(source, /\/script-visual-api\/import/);
  assert.match(source, /keine automatische Nutzungsfreigabe/);
});
