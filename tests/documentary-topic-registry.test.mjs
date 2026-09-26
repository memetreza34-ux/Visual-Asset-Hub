import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  isDuplicateTopic,
  loadTopicRegistry,
  reserveTopic,
  updateTopicEntry,
  registryPaths
} from '../scripts/lib/documentary-topic-registry.mjs';

test('topic registry writes readable register and blocks repeated topics', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-topic-registry-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));

  const first = reserveTopic(root, {
    title: 'Wie der Aralsee fast verschwand',
    topicKey: 'aralsee-verschwand',
    angle: 'Wie Bewaesserung einen riesigen See schrumpfen liess',
    category: 'Umweltgeschichte'
  }, {targetDurationSeconds: 150});

  assert.equal(first.entry.status, 'reserved');
  const paths = registryPaths(root);
  assert.equal(fs.existsSync(paths.json), true);
  assert.equal(fs.existsSync(paths.text), true);
  assert.match(fs.readFileSync(paths.text, 'utf8'), /Wie der Aralsee fast verschwand/);

  const registry = loadTopicRegistry(root);
  const exact = isDuplicateTopic(registry, {
    title: 'Wie der Aralsee fast verschwand',
    topicKey: 'aralsee-verschwand',
    angle: 'Der verschwundene Aralsee'
  });
  assert.equal(exact.duplicate, true);

  const similar = isDuplicateTopic(registry, {
    title: 'Warum der Aralsee immer kleiner wurde',
    angle: 'Wie Bewaesserung den Aralsee schrumpfen liess'
  });
  assert.equal(similar.duplicate, true);

  const different = isDuplicateTopic(registry, {
    title: 'Wie der Eurotunnel gebaut wurde',
    angle: 'Die Ingenieurleistung unter dem Aermelkanal'
  });
  assert.equal(different.duplicate, false);

  const updated = updateTopicEntry(root, first.entry.id, {status: 'phase1-complete', projectDirectory: 'aralsee'});
  assert.equal(updated.status, 'phase1-complete');
  assert.match(fs.readFileSync(paths.text, 'utf8'), /phase1-complete/);
});
