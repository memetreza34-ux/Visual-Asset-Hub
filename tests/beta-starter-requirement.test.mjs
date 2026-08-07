import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'scripts/beta-verify.mjs'), 'utf8');

test('Beta-Abnahme verlangt fest zwölf dokumentiert geprüfte Starterassets', () => {
  assert.match(source, /const requiredReviewCount = 12;/);
  assert.match(source, /assets\.length >= requiredReviewCount/);
  assert.match(source, /reviewedAssets\.length >= requiredReviewCount/);
  assert.doesNotMatch(source, /Math\.min\(12, assets\.length\)/);
});
