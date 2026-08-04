import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const webRoot = path.join(root, 'web');
const indexHtml = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf8');
const selectionTools = fs.readFileSync(path.join(webRoot, 'selection-tools.js'), 'utf8');

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
