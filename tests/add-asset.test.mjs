import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const catalogPath = path.join(root, 'catalog/assets.json');

const validArguments = [
  'scripts/add-asset.mjs',
  '--dry-run', 'true',
  '--storage', 'external',
  '--external-url', 'https://media.example.com/assets/smartphone-scroll.mp4',
  '--extension', 'mp4',
  '--type', 'video',
  '--category', 'technology-ai',
  '--subject', 'smartphone',
  '--action', 'scrolling',
  '--shot', 'cu',
  '--orientation', 'vertical',
  '--title', 'Person scrollt am Smartphone',
  '--description', 'Nahaufnahme einer Hand beim Scrollen durch eine Social-Media-App.',
  '--tags', 'smartphone,scrolling,social-media',
  '--style', 'realistic',
  '--movement', 'static',
  '--license', 'owned',
  '--source', 'Eigene Produktion',
  '--scopes', 'organic-social,youtube,website'
];

test('asset import dry-run creates a valid name without changing the catalog', () => {
  const before = fs.readFileSync(catalogPath, 'utf8');
  const result = spawnSync(process.execPath, validArguments, { cwd: root, encoding: 'utf8' });
  const after = fs.readFileSync(catalogPath, 'utf8');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(after, before);
  assert.match(result.stdout, /VAH-[A-Z0-9]{8}/);
  assert.match(result.stdout, /brl-technology-ai-smartphone-scrolling-cu-vertical-0001\.mp4/);
  assert.match(result.stdout, /Dry-Run: keine Dateien verändert/);
});

test('asset import rejects unknown categories before writing', () => {
  const argumentsWithUnknownCategory = [...validArguments];
  const categoryIndex = argumentsWithUnknownCategory.indexOf('--category') + 1;
  argumentsWithUnknownCategory[categoryIndex] = 'unknown-category';

  const before = fs.readFileSync(catalogPath, 'utf8');
  const result = spawnSync(process.execPath, argumentsWithUnknownCategory, { cwd: root, encoding: 'utf8' });
  const after = fs.readFileSync(catalogPath, 'utf8');

  assert.notEqual(result.status, 0);
  assert.equal(after, before);
  assert.match(result.stderr, /category ist ungültig/);
});
