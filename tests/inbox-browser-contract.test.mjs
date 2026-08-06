import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const script = fs.readFileSync(path.join(process.cwd(), 'web', 'inbox-importer.js'), 'utf8');

test('Inbox-Browser erkennt technische Medieninformationen', () => {
  assert.match(script, /video\.videoWidth/);
  assert.match(script, /video\.videoHeight/);
  assert.match(script, /video\.duration/);
  assert.match(script, /image\.naturalWidth/);
  assert.match(script, /image\.naturalHeight/);
});

test('Inbox-Browser verlangt Rechte und übermittelt keine Dateibytes per JSON', () => {
  assert.match(script, /rightsOwned/);
  assert.match(script, /notwendigen Nutzungsrechte/);
  assert.match(script, /filename: file\.filename/);
  assert.doesNotMatch(script, /FileReader|arrayBuffer|base64/);
});
