import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const arsenal = fs.readFileSync(path.join(root, 'web', 'channel-arsenal.js'), 'utf8');
const builder = fs.readFileSync(path.join(root, 'web', 'arsenal-builder.js'), 'utf8');

test('Kanal-Arsenal bewertet Fortschritt nach freigegebenen Assets', () => {
  assert.match(arsenal, /approved \/ recommendedPerCollection/);
  assert.match(arsenal, /Größte Lücken zuerst/);
  assert.match(arsenal, /Nur unvollständige Sammlungen/);
  assert.match(arsenal, /Als Nächstes ausbauen/);
});

test('Lückenempfehlungen konfigurieren den Arsenal Builder', () => {
  assert.match(arsenal, /vah:arsenal-select/);
  assert.match(builder, /addEventListener\('vah:arsenal-select'/);
  assert.match(builder, /arsenal-builder-channel/);
  assert.match(builder, /arsenal-builder-collection/);
  assert.match(builder, /video-vertical/);
});

test('Builder entfernt API-Key nach Erfolg und Fehler', () => {
  const clears = [...builder.matchAll(/apiKey\.input\.value = ''/g)];
  assert.ok(clears.length >= 2);
});
