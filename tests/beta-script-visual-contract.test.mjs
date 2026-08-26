import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'scripts/beta-verify.mjs'), 'utf8');

test('Beta-Readiness verlangt ein echtes Script-Visual-Projekt', () => {
  assert.match(source, /scriptVisualProjectGenerated/);
  assert.match(source, /scriptVisualMultipleScenesSearched/);
  assert.match(source, /scriptVisualMixedMediaFound/);
  assert.match(source, /scriptVisualReviewImported/);
  assert.match(source, /findValidScriptVisualProjects/);
});

test('Verifier prüft Originalskript-Hash, Szenen und echte Kandidaten', () => {
  assert.match(source, /visual-asset-hub-script-visual-project/);
  assert.match(source, /scriptSha256/);
  assert.match(source, /SCENE-/);
  assert.match(source, /videoCandidates/);
  assert.match(source, /photoCandidates/);
  assert.match(source, /importedAssetIds/);
});

test('Gemischt gilt erst als real getestet wenn dieselbe Szene Video und Bild enthält', () => {
  assert.match(source, /const mixedMediaScenes = project\.scenes\.filter/);
  assert.match(source, /sceneCandidates\.some\(\(candidate\) => candidate\.type === 'video'\)/);
  assert.match(source, /sceneCandidates\.some\(\(candidate\) => candidate\.type !== 'video'\)/);
  assert.match(source, /scriptVisualMixedMediaFound: scriptVisualProjects\.some\(\(entry\) => entry\.mixedMediaScenes >= 1\)/);
  assert.match(source, /mindestens eine reale Szene mit Video- und Bildkandidaten im selben Szenenboard/);
});
