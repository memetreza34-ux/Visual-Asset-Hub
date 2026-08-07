import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const starterScript = fs.readFileSync(path.join(root, 'scripts/import-channel-starter-pack.mjs'), 'utf8');
const tagScript = fs.readFileSync(path.join(root, 'scripts/tag-existing-channel-assets.mjs'), 'utf8');

test('Starterplan ergänzt alle vier Kanäle ohne automatische Freigabe', () => {
  for (const tag of ['channel-finance', 'channel-ai', 'channel-electro']) {
    assert.match(tagScript, new RegExp(tag));
  }
  assert.match(starterScript, /channel-combat-sports/);
  assert.match(starterScript, /collection-boxing-training/);
  assert.match(starterScript, /VAH-WBOX2021/);
  assert.match(starterScript, /cc-by-sa/);
  assert.match(starterScript, /creativecommons\.org\/licenses\/by-sa\/4\.0/);
  assert.match(starterScript, /status:\s*'review'/);
  assert.doesNotMatch(starterScript, /status:\s*'approved'/);
});

test('Starterplan enthält fünf zusätzliche Pexels-B-Rolls plus einen Wikimedia-Kampfsportstarter', () => {
  const pexelsIds = [...starterScript.matchAll(/id:\s*'VAH-P\d+'/g)];
  assert.equal(pexelsIds.length, 5);
  assert.match(starterScript, /id:\s*'VAH-WBOX2021'/);
  assert.match(starterScript, /sourceName:\s*'Wikimedia Commons'/);
  assert.match(starterScript, /attributionRequired:\s*true/);
});
