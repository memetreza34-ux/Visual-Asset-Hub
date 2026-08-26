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

test('Gemischt-Modus zeigt Video-/Bildverteilung pro Szene sichtbar an', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /Gemischt · \$\{preference\} zuerst/);
  assert.match(source, /function candidateSummary\(scene, project\)/);
  assert.match(source, /Videos · \$\{photos\} Bilder/);
  assert.match(source, /Mix erfüllt/);
  assert.match(source, /Mix noch unvollständig/);
  assert.match(source, /mediaPreferenceLabel/);
});

test('übernommener Szenenkontext wird transparent im Board angezeigt', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /scene\.contextInherited/);
  assert.match(source, /scene\.contextEntities/);
  assert.match(source, /scene\.contextConcepts/);
  assert.match(source, /Kontext übernommen: \$\{contextLabel\}/);
  assert.match(source, /original\.textContent = scene\.originalText/);
});

test('manuelle Web-Recherche bleibt klar von Import und Rechtefreigabe getrennt', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /Weitere Web-Recherche/);
  assert.match(source, /function externalResearchPanel\(scene\)/);
  assert.match(source, /Nur manuelle Recherche\. Sichtbarkeit im Web ist keine Nutzungs- oder Rechtefreigabe/);
  assert.match(source, /www\.youtube\.com\/results\?search_query=/);
  assert.match(source, /www\.google\.com\/search\?tbm=isch/);
  assert.match(source, /www\.google\.com\/search\?tbm=vid/);
  assert.match(source, /www\.google\.com\/search\?tbm=nws/);
  assert.match(source, /de\.wikipedia\.org\/w\/index\.php\?search=/);
  assert.match(source, /link\.target = '_blank'/);
  assert.match(source, /link\.rel = 'noopener noreferrer'/);
});

test('lange Projekte rendern Kandidaten erst beim Öffnen der jeweiligen Szene', () => {
  const source = read('web/script-visual-finder.js');
  const css = read('web/script-visual-finder.css');
  assert.match(source, /function candidatePanel\(project, scene, keyFields, perPage, status\)/);
  assert.match(source, /const longProject = \(project\.scenes\?\.length \?\? 0\) > 20/);
  assert.match(source, /if \(!longProject && scene\.candidates\.length\)/);
  assert.match(source, /details\.addEventListener\('toggle'/);
  assert.match(source, /if \(details\.open\) render\(\)/);
  assert.match(source, /else if \(longProject\)[\s\S]*grid\.replaceChildren\(\)[\s\S]*rendered = false/);
  assert.match(css, /\.svf-candidate-panel/);
});

test('Mehr Treffer zeigt die echte nächste Suchseite und ein festes Maximum', () => {
  const source = read('web/script-visual-finder.js');
  assert.match(source, /const MAX_SEARCH_PAGE = 100/);
  assert.match(source, /Visuals suchen · Seite 1/);
  assert.match(source, /`Mehr Treffer · Seite \$\{currentPage \+ 1\}`/);
  assert.match(source, /Maximale Suchseite erreicht/);
  assert.match(source, /search\.disabled = maxPageReached/);
  assert.match(source, /Seite \$\{updated\.searchRound \|\| expectedPage\}/);
  assert.match(source, /Seite \$\{candidate\.job\?\.page \?\? 1\}/);
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
