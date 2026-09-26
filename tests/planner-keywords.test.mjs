import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const config = read('catalog/planner-keywords.json');
const channelIds = ['finance', 'ai', 'electro', 'combat-sports'];

test('Planerlexikon deckt alle vier Kanäle umfangreich ab', () => {
  assert.deepEqual(Object.keys(config.channels).sort(), channelIds.slice().sort());
  let totalRules = 0;
  let totalTerms = 0;
  for (const channelId of channelIds) {
    const rules = config.channels[channelId];
    assert.ok(rules.length >= 15, `${channelId}: zu wenige Regeln`);
    totalRules += rules.length;
    totalTerms += rules.reduce((sum, rule) => sum + rule.terms.length, 0);
  }
  assert.ok(totalRules >= 70, `zu wenige Regeln: ${totalRules}`);
  assert.ok(totalTerms >= 300, `zu wenige Begriffe: ${totalTerms}`);
});

test('Jede Planerregel verweist auf existierende Sammlungen', () => {
  for (const channelId of channelIds) {
    const channel = read(`catalog/channels/${channelId}.json`);
    const collections = new Set(channel.collections.map((item) => item.id));
    for (const rule of config.channels[channelId]) {
      assert.ok(rule.terms.length > 0, `${channelId}/${rule.id}: terms`);
      assert.ok(rule.collections.length > 0, `${channelId}/${rule.id}: collections`);
      for (const collection of rule.collections) assert.ok(collections.has(collection), `${channelId}/${rule.id}: ${collection}`);
    }
  }
});

test('Eigenständige Lexikonvalidierung läuft erfolgreich', () => {
  const run = spawnSync(process.execPath, ['scripts/validate-planner-keywords.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /Planerlexikon gültig/);
  assert.match(run.stdout, /4 Kanäle/);
});

function read(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}
