import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { listInboxFiles, validateInboxImportPayload } from '../scripts/local-inbox-api.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-inbox-'));
  fs.mkdirSync(path.join(root, 'inbox'), { recursive: true });
  fs.mkdirSync(path.join(root, 'catalog', 'channels'), { recursive: true });
  fs.writeFileSync(path.join(root, 'inbox', 'my-clip.mp4'), 'video-bytes');
  fs.writeFileSync(path.join(root, 'inbox', 'my-image.png'), 'image-bytes');
  fs.writeFileSync(path.join(root, 'inbox', 'my-vector.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  fs.writeFileSync(path.join(root, 'inbox', 'README.md'), 'ignore');
  fs.writeFileSync(path.join(root, 'inbox', 'unsupported.exe'), 'ignore');
  fs.writeFileSync(path.join(root, 'catalog', 'channels', 'index.json'), JSON.stringify({ files: ['catalog/channels/finance.json'] }));
  fs.writeFileSync(path.join(root, 'catalog', 'channels', 'finance.json'), JSON.stringify({
    id: 'finance',
    label: 'Finanzen',
    channelTag: 'channel-finance',
    primaryCategory: 'finance-investing',
    collections: [{ id: 'budgeting-saving', label: 'Budget und Sparen', tags: ['budget', 'saving'], queries: ['budget planning'] }]
  }));
  return root;
}

function payload(filename) {
  return {
    filename,
    channel: 'finance',
    collection: 'budgeting-saving',
    title: 'Eigenes Budget Asset',
    description: 'Eigene Aufnahme eines neutralen Budgetmotivs für Social Media.',
    orientation: 'vertical',
    tags: 'geld,planung',
    aliases: 'Budget Clip, Geld planen',
    rightsOwned: true,
    width: 1080,
    height: 1920,
    duration: 8.5
  };
}

test('Inbox-Liste zeigt nur unterstützte lokale Medien', () => {
  const root = fixture();
  try {
    const files = listInboxFiles(root);
    assert.equal(files.length, 3);
    assert.deepEqual(files.map((file) => file.filename).sort(), ['my-clip.mp4', 'my-image.png', 'my-vector.svg']);
    assert.equal(files.find((file) => file.filename === 'my-clip.mp4').type, 'video');
    assert.equal(files.find((file) => file.filename === 'my-image.png').type, 'image');
    assert.equal(files.find((file) => file.filename === 'my-vector.svg').type, 'graphic');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('gültiger eigener Import übernimmt Kanal und Sammlung', () => {
  const root = fixture();
  try {
    const value = validateInboxImportPayload(payload('my-clip.mp4'), root);
    assert.equal(value.type, 'video');
    assert.equal(value.category, 'finance-investing');
    assert.equal(value.storage, 'git-lfs');
    assert.ok(value.tags.includes('channel-finance'));
    assert.ok(value.tags.includes('collection-budgeting-saving'));
    assert.equal(value.orientation, 'vertical');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('binäre Bilder nutzen LFS, SVG-Grafiken bleiben im Repository', () => {
  const root = fixture();
  try {
    const image = validateInboxImportPayload({ ...payload('my-image.png'), duration: undefined }, root);
    const graphic = validateInboxImportPayload({ ...payload('my-vector.svg'), duration: undefined }, root);
    assert.equal(image.type, 'image');
    assert.equal(image.storage, 'git-lfs');
    assert.equal(graphic.type, 'graphic');
    assert.equal(graphic.storage, 'repository');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Inbox blockiert Traversal, fehlende Rechte und unbekannte Sammlung', () => {
  const root = fixture();
  const base = payload('my-clip.mp4');
  try {
    assert.throws(() => validateInboxImportPayload({ ...base, filename: '../my-clip.mp4' }, root), /filename/);
    assert.throws(() => validateInboxImportPayload({ ...base, rightsOwned: false }, root), /Nutzungsrechte/);
    assert.throws(() => validateInboxImportPayload({ ...base, collection: 'unknown' }, root), /Unbekannte Sammlung/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('erfolgreicher Import behandelt ein späteres Löschproblem nur als Warnung', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'scripts', 'local-inbox-api.mjs'), 'utf8');
  assert.match(source, /cleanupWarning/);
  assert.match(source, /erfolgreich katalogisiert/);
  assert.doesNotMatch(source, /if \(input\.removeAfterImport\) fs\.rmSync/);
});

test('Weboberfläche bindet den lokalen Inbox-Import ein', () => {
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'web', 'inbox-importer.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'scripts', 'serve.mjs'), 'utf8');
  assert.match(html, /id="inbox-importer"/);
  assert.match(html, /inbox-importer\.js/);
  assert.match(script, /\/inbox-api\/import/);
  assert.match(script, /rightsOwned/);
  assert.match(server, /createLocalInboxApi/);
});
