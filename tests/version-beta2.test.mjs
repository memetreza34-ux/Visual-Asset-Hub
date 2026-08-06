import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const packageData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

test('Version und neue Betriebsbefehle sind vollständig', () => {
  assert.equal(packageData.version, '0.4.0-beta.3');
  for (const command of ['starter:import', 'cleanup:local', 'script:plan', 'arsenal:validate', 'arsenal:plan', 'arsenal:search', 'arsenal:import', 'arsenal:report', 'media:pack', 'backup', 'restore', 'beta:verify', 'check']) {
    assert.equal(typeof packageData.scripts[command], 'string', command);
  }
  assert.match(packageData.scripts.validate, /validate-planner-keywords/);
});
