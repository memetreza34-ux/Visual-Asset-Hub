import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const directory = path.join(process.cwd(), '.github', 'workflows');
const files = fs.readdirSync(directory).filter((name) => /\.ya?ml$/i.test(name));

test('GitHub Actions bleibt im kostenkontrollierten manuellen Modus', () => {
  assert.ok(files.length > 0, 'Keine Workflow-Dateien gefunden.');
  for (const file of files) {
    const content = fs.readFileSync(path.join(directory, file), 'utf8');
    assert.match(content, /^\s*workflow_dispatch\s*:/m, `${file}: workflow_dispatch fehlt.`);
    assert.doesNotMatch(content, /^\s{0,4}pull_request\s*:/m, `${file}: automatischer pull_request-Trigger ist nicht erlaubt.`);
    assert.doesNotMatch(content, /^\s{0,4}push\s*:/m, `${file}: automatischer push-Trigger ist nicht erlaubt.`);
    assert.doesNotMatch(content, /^\s{0,4}schedule\s*:/m, `${file}: automatischer schedule-Trigger ist nicht erlaubt.`);
  }
});
