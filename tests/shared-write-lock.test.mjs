import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'scripts', 'serve.mjs'), 'utf8');

test('Server besitzt eine gemeinsame Sperre für alle lokalen Schreib-APIs', () => {
  assert.match(source, /const apiPrefixes = \['\/api\/', '\/arsenal-api\/', '\/inbox-api\/'\]/);
  assert.match(source, /let activeWriteAction = null/);
  assert.match(source, /isWriteRequest && activeWriteAction/);
  assert.match(source, /activeWriteAction = url\.pathname/);
  assert.match(source, /activeWriteAction = null/);
});

test('gleichzeitige Schreibaktion erhält einen JSON-Konflikt', () => {
  assert.match(source, /sendJson\(response, 409/);
  assert.match(source, /Eine andere lokale Schreibaktion läuft bereits/);
  assert.match(source, /Content-Type': 'application\/json/);
});
