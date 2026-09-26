import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'scripts', 'channel-coverage-report.mjs'), 'utf8');

test('Abdeckungsbericht verwendet den zentralen Ausbauplan', () => {
  assert.match(source, /buildExpansionPlan/);
  assert.match(source, /version:\s*2/);
  assert.match(source, /nextReview:\s*expansion\.nextReview/);
  assert.match(source, /nextBatch:\s*expansion\.nextBatch/);
});

test('Abdeckungsbericht zeigt Review-first und Suche getrennt', () => {
  assert.match(source, /reviewFirstCollections/);
  assert.match(source, /searchCollections/);
  assert.match(source, /Review zuerst/);
  assert.match(source, /Weitere Suche/);
});

test('Suchaufgaben enthalten Medienart und Quellenkette', () => {
  assert.match(source, /entry\.mediaType/);
  assert.match(source, /entry\.primaryProvider/);
  assert.match(source, /entry\.fallbackProviders/);
});
