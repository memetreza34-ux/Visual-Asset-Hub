import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'web', 'workspace-nav.js'), 'utf8');

test('Arbeitsbereich-Navigation ist eingebunden', () => {
  assert.match(html, /workspace-nav\.css/);
  assert.match(html, /workspace-nav\.js/);
  for (const id of ['asset-grid', 'inbox-importer', 'review-queue', 'arsenal-builder', 'channel-arsenal']) assert.match(html, new RegExp(`id="${id}"`));
});

test('Navigation bietet alle fünf Arbeitsbereiche mit Zählern', () => {
  for (const label of ['Bibliothek', 'Eigene Dateien', 'Prüfen', 'Pexels suchen', '90 Kategorien']) assert.match(script, new RegExp(label));
  assert.match(script, /index\.assetCount/);
  assert.match(script, /index\.reviewCount/);
  assert.match(script, /inbox\.files/);
  assert.match(script, /IntersectionObserver/);
});
