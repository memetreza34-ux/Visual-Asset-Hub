import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const channelDirectory = path.join(root, 'catalog', 'channels');
const files = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];
const channels = files.map((file) => JSON.parse(fs.readFileSync(path.join(channelDirectory, file), 'utf8')));

test('vier spezialisierte Kanäle und großes Themenarsenal vorhanden', () => {
  assert.deepEqual(channels.map((channel) => channel.id).sort(), ['ai', 'combat-sports', 'electro', 'finance']);
  const collections = channels.flatMap((channel) => channel.collections.map((collection) => ({ channel, collection })));
  const queries = collections.flatMap(({ collection }) => collection.queries);
  assert.ok(collections.length >= 70, `Zu wenige Sammlungen: ${collections.length}`);
  assert.ok(queries.length >= 210, `Zu wenige Suchbegriffe: ${queries.length}`);
  for (const { channel, collection } of collections) {
    assert.ok(collection.queries.length >= 2, `${channel.id}/${collection.id}: zu wenige Queries`);
    assert.ok(collection.tags.length >= 3, `${channel.id}/${collection.id}: zu wenige Tags`);
  }
});

test('Sammlungs-IDs sind pro Kanal eindeutig und Hauptkategorien spezialisiert', () => {
  const expected = {
    finance: 'finance-investing',
    ai: 'artificial-intelligence',
    electro: 'electrical-engineering',
    'combat-sports': 'combat-sports'
  };
  for (const channel of channels) {
    assert.equal(channel.primaryCategory, expected[channel.id]);
    assert.equal(new Set(channel.collections.map((collection) => collection.id)).size, channel.collections.length);
  }
});

test('Arsenal-Plan erzeugt vier Formate pro Sammlung', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-plan-test-'));
  const output = path.join(directory, 'plan.json');
  const csv = path.join(directory, 'plan.csv');
  const run = spawnSync(process.execPath, ['scripts/build-arsenal-plan.mjs', '--channel', 'finance', '--max-collections', '2', '--output', output, '--csv', csv], { cwd: root, encoding: 'utf8' });
  try {
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const plan = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(plan.totals.channels, 1);
    assert.equal(plan.totals.collections, 2);
    assert.equal(plan.totals.jobs, 8);
    assert.equal(plan.totals.videos, 4);
    assert.equal(plan.totals.photos, 4);
    assert.ok(fs.readFileSync(csv, 'utf8').includes('video-vertical'));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Weboberfläche bindet Kanal-Arsenal ein', () => {
  const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
  assert.match(html, /id="channel-arsenal"/);
  assert.match(html, /channel-arsenal\.js/);
  assert.match(html, /channel-arsenal\.css/);
});
