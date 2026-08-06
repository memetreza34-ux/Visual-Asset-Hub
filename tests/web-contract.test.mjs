import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const webRoot = path.join(root, 'web');
const indexHtml = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf8');
const selectionTools = fs.readFileSync(path.join(webRoot, 'selection-tools.js'), 'utf8');
const localAdmin = fs.readFileSync(path.join(webRoot, 'local-admin.js'), 'utf8');
const releaseStatus = fs.readFileSync(path.join(webRoot, 'release-status.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'scripts/serve.mjs'), 'utf8');

function referencedFiles(html, attribute) {
  const expression = new RegExp(`${attribute}="\\./([^"?#]+)`, 'g');
  return [...html.matchAll(expression)].map((match) => match[1]);
}

test('alle lokalen Browser-Dateien aus index.html existieren', () => {
  const references = [
    ...referencedFiles(indexHtml, 'src'),
    ...referencedFiles(indexHtml, 'href')
  ];
  for (const relative of references) {
    assert.ok(fs.existsSync(path.join(webRoot, relative)), `Webdatei fehlt: ${relative}`);
  }
});

test('Auswahlexport speichert Rechte- und Quelleninformationen', () => {
  for (const field of ['sourcePage', 'licenseUrl', 'usageScopes', 'attributionRequired', 'status']) {
    assert.match(selectionTools, new RegExp(`\\b${field}\\b`), `Exportfeld fehlt: ${field}`);
  }
  assert.match(selectionTools, /nicht freigegebene Assets/i);
});

test('Auswahlbedienung ist vollständig verknüpft', () => {
  for (const id of ['favorite-selection-count', 'export-favorites', 'clear-favorites']) {
    assert.match(indexHtml, new RegExp(`id="${id}"`), `Bedienelement fehlt: ${id}`);
  }
  assert.match(indexHtml, /selection-tools\.js/);
  assert.match(indexHtml, /selection-tools\.css/);
});

test('lokale No-Code-Verwaltung ist vollständig verknüpft', () => {
  for (const id of ['local-admin-status', 'local-admin-status-text', 'local-backup']) {
    assert.match(indexHtml, new RegExp(`id="${id}"`), `Lokales Bedienelement fehlt: ${id}`);
  }
  assert.match(indexHtml, /local-admin\.js/);
  assert.match(indexHtml, /local-admin\.css/);
  for (const endpoint of ['/api/health', '/api/review', '/api/usage', '/api/backup', '/api/attribution']) {
    assert.ok(localAdmin.includes(endpoint) || server.includes(endpoint), `API-Verknüpfung fehlt: ${endpoint}`);
  }
});

test('Beta-Fortschritt und Testbericht sind in der Oberfläche verknüpft', () => {
  assert.match(indexHtml, /id="release-status"/);
  assert.match(indexHtml, /release-status\.js/);
  assert.match(indexHtml, /release-status\.css/);
  assert.match(releaseStatus, /beta-readiness\.json/);
  assert.match(releaseStatus, /nextActions/);
});

test('lokaler Server ist auf Loopback und strikte Browser-Sicherheit ausgelegt', () => {
  assert.match(server, /127\.0\.0\.1/);
  assert.match(server, /Content-Security-Policy/);
  assert.match(server, /X-Frame-Options/);
  assert.match(server, /VAH_ALLOW_REMOTE/);
});

test('Startseite leitet auf stabilen Web-Basispfad um', () => {
  assert.match(server, /url\.pathname === '\/'/);
  assert.match(server, /Location: '\/web\/'/);
  assert.match(server, /url\.pathname === '\/web\/' \? '\/web\/index\.html'/);
});
