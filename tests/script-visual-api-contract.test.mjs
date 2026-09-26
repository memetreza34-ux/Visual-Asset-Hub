import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = fs.readFileSync(path.join(root, 'scripts/local-script-visual-api.mjs'), 'utf8');
const server = fs.readFileSync(path.join(root, 'scripts/serve.mjs'), 'utf8');

test('lokale Script-Visual-API ist in denselben Loopback- und Token-Schutz eingebunden', () => {
  assert.match(server, /createLocalScriptVisualApi/);
  assert.match(server, /'\/script-visual-api\/'/);
  assert.match(server, /scriptVisualApi\.handle/);
  assert.match(api, /isLoopback/);
  assert.match(api, /sameOrigin/);
  assert.match(api, /x-vah-token/);
});

test('API unterstützt Projekt, Szene, Auswahl und Review-Import', () => {
  for (const endpoint of ['create', 'search-scene', 'select', 'import']) assert.match(api, new RegExp(`/script-visual-api/${endpoint}`));
  assert.match(api, /scripts\/arsenal-import-selected\.mjs/);
  assert.match(api, /script-visual-finder/);
  assert.match(api, /reviewNotes/);
});

test('alle fünf vorhandenen Provider werden wiederverwendet und Foto-only-Regeln bleiben erhalten', () => {
  for (const provider of ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia']) assert.match(api, new RegExp(provider));
  assert.match(api, /PHOTO_ONLY/);
  assert.match(api, /PIXABAY_CACHE_MS/);
  assert.match(api, /24 \* 60 \* 60 \* 1000/);
});

test('Script-Projekte werden lokal persistiert und nach ALLES-GEFUNDEN gespiegelt', () => {
  assert.match(api, /\.local-storage.*script-visual-projects/s);
  assert.match(api, /06-SKRIPT-PROJEKTE/);
  assert.match(api, /00-SKRIPT\.txt/);
  assert.match(api, /00-SHOTLIST\.json/);
  assert.match(api, /00-SHOTLIST\.csv/);
  assert.match(api, /00-SZENENPLAN\.md/);
});

test('API-Schlüssel werden nicht in Projekt- oder Kandidatenobjekte geschrieben', () => {
  assert.doesNotMatch(api, /project\.(?:apiKey|keys)\s*=/);
  assert.doesNotMatch(api, /candidate\.(?:apiKey|keys)\s*=/);
  assert.match(api, /validateKeys/);
});
