import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const script = fs.readFileSync(path.join(process.cwd(), 'scripts', 'beta-verify.mjs'), 'utf8');
const status = fs.readFileSync(path.join(process.cwd(), 'web', 'release-status.js'), 'utf8');

test('Realtest verlangt alle vier Kanäle, eigenes Medium und Medienpaket', () => {
  for (const value of ['channel-finance', 'channel-ai', 'channel-electro', 'channel-combat-sports']) assert.match(script, new RegExp(value));
  assert.match(script, /createdBy === 'local-inbox-browser'/);
  assert.match(script, /findValidMediaPacks/);
  assert.match(script, /verifiedMediaPackCreated/);
  assert.match(script, /realUsageRecorded/);
});

test('Medienpaket zählt nur mit Manifest, Datei und SHA-256', () => {
  assert.match(script, /visual-asset-hub-media-pack/);
  assert.match(script, /fs\.existsSync\(file\)/);
  assert.match(script, /\^\[a-f0-9\]\{64\}\$/);
});

test('Webstatus zeigt neue Realtest-Kriterien verständlich an', () => {
  assert.match(status, /alle 4 Kanäle mit Assets/);
  assert.match(status, /eigenes Medium importiert/);
  assert.match(status, /Schnittpaket erzeugt/);
});
