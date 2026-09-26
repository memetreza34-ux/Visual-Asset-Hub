import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const builder = fs.readFileSync(path.join(process.cwd(), 'web', 'arsenal-builder.js'), 'utf8');

test('weitere Sammlungs-Suchbegriffe werden vor Provider-Fallback angeboten', () => {
  assert.match(builder, /function getNextQuery/);
  assert.match(builder, /function prepareNextQuery/);
  assert.match(builder, /Nächster Suchbegriff/);
  assert.match(builder, /if \(nextQuery && typeof options\.onNextQuery === 'function'\)/);
  assert.match(builder, /else \{\s*const nextProvider = fallbackProvider/s);
});

test('nächster Suchbegriff übernimmt Quelle, Sammlung und Format', () => {
  assert.match(builder, /provider\.input\.value = data\.provider/);
  assert.match(builder, /collection\.input\.value = data\.job\.collection/);
  assert.match(builder, /const desiredVariant = `\$\{data\.job\.type\}-\$\{data\.job\.orientation\}`/);
  assert.match(builder, /queryIndex\.input\.value = String\(nextQuery\.index\)/);
});

test('weder Suchbegriff noch Provider-Fallback starten automatisch eine Suche', () => {
  assert.match(builder, /Die Suche startet erst nach deinem Klick/);
  assert.doesNotMatch(builder, /prepareNextQuery[\s\S]{0,1200}post\('\/arsenal-api\/search'/);
  assert.doesNotMatch(builder, /prepareFallback[\s\S]{0,1200}post\('\/arsenal-api\/search'/);
});
