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
