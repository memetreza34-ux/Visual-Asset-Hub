import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const script = fs.readFileSync(path.join(process.cwd(), 'scripts', 'beta-verify.mjs'), 'utf8');
const planner = fs.readFileSync(path.join(process.cwd(), 'scripts', 'plan-script.mjs'), 'utf8');
const status = fs.readFileSync(path.join(process.cwd(), 'web', 'release-status.js'), 'utf8');

test('Realtest verlangt Skriptplan, alle vier Kanäle, eigenes Medium und Medienpaket', () => {
  for (const value of ['channel-finance', 'channel-ai', 'channel-electro', 'channel-combat-sports']) assert.match(script, new RegExp(value));
  assert.match(script, /findValidScriptPlans/);
  assert.match(script, /scriptPlanGenerated/);
  assert.match(script, /createdBy === 'local-inbox-browser'/);
  assert.match(script, /findValidMediaPacks/);
  assert.match(script, /verifiedMediaPackCreated/);
  assert.match(script, /realUsageRecorded/);
});

test('Skriptplan zählt nur mit vollständigen Dateien und passender SHA-256', () => {
  for (const file of ['shotlist.json', 'shotlist.csv', 'shotlist.md', 'shotlist.srt', 'script.txt']) assert.match(script, new RegExp(file.replace('.', '\\.')));
  assert.match(script, /visual-asset-hub-shot-plan/);
  assert.match(script, /scriptSha256/);
  assert.match(script, /createHash\('sha256'\)/);
  assert.match(script, /PLAN-\[A-F0-9\]/);
});

test('Planer-Nachweis enthält keinen Sprechtext', () => {
  assert.match(planner, /scriptSha256/);
  assert.match(planner, /record-evidence/);
  const recordBlock = planner.slice(planner.indexOf('const record ='), planner.indexOf('evidence.version = 1'));
  assert.doesNotMatch(recordBlock, /script:\s|text:\s|source:\s/);
});

test('Medienpaket zählt nur mit Manifest, Datei und SHA-256', () => {
  assert.match(script, /visual-asset-hub-media-pack/);
  assert.match(script, /fs\.existsSync\(file\)/);
  assert.match(script, /\^\[a-f0-9\]\{64\}\$/);
});

test('Webstatus zeigt alle Realtest-Kriterien verständlich an', () => {
  assert.match(status, /Skript- und Shotlist-Test erstellt/);
  assert.match(status, /alle 4 Kanäle mit Assets/);
  assert.match(status, /eigenes Medium importiert/);
  assert.match(status, /Schnittpaket erzeugt/);
});
