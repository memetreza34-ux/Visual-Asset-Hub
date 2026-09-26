import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();

function read(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function run(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
}

test('review and usage stores have valid empty envelopes', () => {
  const reviews = read('catalog/reviews.json');
  const usage = read('catalog/usage.json');
  assert.equal(reviews.version, 1);
  assert.ok(Array.isArray(reviews.decisions));
  assert.equal(usage.version, 1);
  assert.ok(Array.isArray(usage.uses));
});

test('operations validator passes repository data', () => {
  const result = run('scripts/validate-operations.mjs');
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('new operational commands are exposed', () => {
  const pkg = read('package.json');
  for (const command of ['asset:review', 'usage:add', 'attribution:export', 'backup', 'pexels:select']) {
    assert.ok(pkg.scripts[command], `Befehl fehlt: ${command}`);
  }
  assert.ok(fs.existsSync(path.join(root, 'START-HERE.cmd')));
  assert.ok(fs.existsSync(path.join(root, 'docs/OPERATIONS.md')));
});

test('selected Pexels import rejects incomplete invocation safely', () => {
  const result = run('scripts/pexels-import-selected.mjs', []);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--input ist erforderlich/);
});
