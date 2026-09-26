import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { planToSrt, toSrtTime } from '../web/script-planner-srt.js';

const root = process.cwd();
const evidencePath = path.join(root, '.local-storage', 'operations', 'script-plans.json');

test('SRT-Zeitformat und Markerinhalt sind schnittgeeignet', () => {
  assert.equal(toSrtTime(0), '00:00:00,000');
  assert.equal(toSrtTime(65.25), '00:01:05,250');
  const srt = planToSrt({ scenes: [{ scene: 1, startSeconds: 0, endSeconds: 5.5, text: 'Aktien steigen nicht immer.', assets: [{ id: 'VAH-TEST0001', title: 'Aktienchart', status: 'approved' }] }] });
  assert.match(srt, /00:00:00,000 --> 00:00:05,500/);
  assert.match(srt, /VISUAL: VAH-TEST0001/);
});

test('CLI erzeugt vollständigen Shotlist-Ordner und datensparsamen Nachweis', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-script-plan-'));
  const scriptFile = path.join(temp, 'finance-reel.txt');
  const outputRelative = path.relative(root, path.join(root, 'reports', `test-shot-plans-${path.basename(temp)}`)).replaceAll('\\', '/');
  const originalEvidence = fs.existsSync(evidencePath) ? fs.readFileSync(evidencePath, 'utf8') : null;
  const scriptText = 'Aktien und ETFs können langfristig wachsen. Inflation senkt die Kaufkraft.';
  fs.writeFileSync(scriptFile, scriptText);
  const run = spawnSync(process.execPath, [
    'scripts/plan-script.mjs',
    '--channel', 'finance',
    '--file', scriptFile,
    '--duration', '30',
    '--output', outputRelative,
    '--name', 'Test Reel'
  ], { cwd: root, encoding: 'utf8' });
  try {
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const result = JSON.parse(run.stdout);
    const directory = path.join(root, result.directory);
    assert.equal(result.evidenceRecorded, true);
    for (const file of ['shotlist.json', 'shotlist.csv', 'shotlist.md', 'shotlist.srt', 'script.txt']) assert.ok(fs.existsSync(path.join(directory, file)), file);
    const plan = JSON.parse(fs.readFileSync(path.join(directory, 'shotlist.json'), 'utf8'));
    assert.equal(plan.channel.id, 'finance');
    assert.equal(plan.settings.durationSeconds, 30);
    assert.ok(plan.scenes.length >= 2);
    assert.match(fs.readFileSync(path.join(directory, 'shotlist.srt'), 'utf8'), /VISUAL/);

    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    const latest = evidence.plans.at(-1);
    assert.equal(latest.channel, 'finance');
    assert.equal(latest.sceneCount, plan.summary.sceneCount);
    assert.match(latest.scriptSha256, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(latest).includes(scriptText));
    assert.ok(!Object.hasOwn(latest, 'script'));
    assert.ok(!Object.hasOwn(latest, 'text'));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
    fs.rmSync(path.join(root, outputRelative), { recursive: true, force: true });
    if (originalEvidence === null) fs.rmSync(evidencePath, { force: true });
    else {
      fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
      fs.writeFileSync(evidencePath, originalEvidence);
    }
  }
});

test('CLI kann Nachweis bewusst deaktivieren', () => {
  const outputRelative = `reports/test-shot-plans-no-evidence-${Date.now()}`;
  const existedBefore = fs.existsSync(evidencePath);
  const previous = existedBefore ? fs.readFileSync(evidencePath, 'utf8') : null;
  const run = spawnSync(process.execPath, [
    'scripts/plan-script.mjs',
    '--channel', 'ai',
    '--text', 'Ein Chatbot beantwortet Kundenfragen und automatisiert wiederkehrende Aufgaben.',
    '--output', outputRelative,
    '--record-evidence', 'false'
  ], { cwd: root, encoding: 'utf8' });
  try {
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.equal(JSON.parse(run.stdout).evidenceRecorded, false);
    if (existedBefore) assert.equal(fs.readFileSync(evidencePath, 'utf8'), previous);
    else assert.equal(fs.existsSync(evidencePath), false);
  } finally {
    fs.rmSync(path.join(root, outputRelative), { recursive: true, force: true });
  }
});

test('CLI blockiert unsichere Ausgabeordner und doppelte Texteingabe', () => {
  const traversal = spawnSync(process.execPath, ['scripts/plan-script.mjs', '--channel', 'finance', '--text', 'Ein ausreichend langer Finanztext über Aktien.', '--output', '../outside'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(traversal.status, 0);
  assert.match(traversal.stderr, /Projektverzeichnis|sicherer relativer/);

  const duplicate = spawnSync(process.execPath, ['scripts/plan-script.mjs', '--channel', 'finance', '--text', 'Ein ausreichend langer Finanztext über Aktien.', '--file', 'README.md'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /entweder/);
});
