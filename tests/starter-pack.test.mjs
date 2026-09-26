import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const script = fs.readFileSync(path.join(root, 'scripts', 'import-channel-starter-pack.mjs'), 'utf8');
const ids = [...script.matchAll(/id: '(VAH-[A-Z0-9]{8})'/g)].map((match) => match[1]);

test('Starterpaket enthält fünf eindeutige zusätzliche Assets', () => {
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  assert.deepEqual(ids.sort(), ['VAH-P6120120', 'VAH-P6153455', 'VAH-P6153460', 'VAH-P6153725', 'VAH-P7989872'].sort());
});

test('Starterpaket bleibt sicher im Review-Status', () => {
  const statuses = [...script.matchAll(/status: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(statuses.length, 5);
  assert.ok(statuses.every((status) => status === 'review'));
  assert.match(script, /validate-catalog\.mjs/);
  assert.match(script, /build-index\.mjs/);
  assert.match(script, /Starterimport zurückgerollt/);
});

test('Starterpaket deckt Finanz- und KI-Kanäle ab', () => {
  assert.match(script, /channel-finance/);
  assert.match(script, /channel-ai/);
  assert.match(script, /finance-investing/);
  assert.match(script, /artificial-intelligence/);
  assert.match(script, /collection-budgeting-saving/);
  assert.match(script, /collection-mobile-ai/);
  assert.match(script, /collection-humanoid-robots/);
  assert.match(script, /collection-ai-general/);
});
