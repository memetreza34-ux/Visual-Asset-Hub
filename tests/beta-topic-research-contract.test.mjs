import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'scripts/beta-verify.mjs'), 'utf8');

test('Beta-Readiness verlangt echte und skriptspezifische Themenrecherche', () => {
  assert.match(source, /topicResearchGenerated:\s*topicResearches\.length >= 1/);
  assert.match(source, /scriptSpecificTopicResearch:\s*scriptSpecificResearches\.length >= 1/);
  assert.match(source, /findValidTopicResearch/);
  assert.match(source, /05-THEMENRECHERCHEN/);
  assert.match(source, /00-RECHERCHEPLAN\.md/);
});

test('Unvollständige Themenordner zählen nicht als Realtest-Nachweis', () => {
  assert.match(source, /guide\.startsWith\('# Rechercheplan – '\)/);
  assert.match(source, /guide\.includes\('## Rechtehinweis'\)/);
  assert.match(source, /endsWith\('-INFO\.md'\)/);
  assert.match(source, /if \(!candidates\.length\) continue/);
});
