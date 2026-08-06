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

test('Inbox-Liste zeigt nur unterstützte lokale Medien', () => {
  const root = fixture();
  try {
    const files = listInboxFiles(root);
    assert.equal(files.length, 1);
    assert.equal(files[0].filename, 'my-clip.mp4');
    assert.equal(files[0].type, 'video');
    assert.equal(files[0].previewUrl, '/inbox/my-clip.mp4');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('gültiger eigener Import übernimmt Kanal und Sammlung', () => {
  const root = fixture();
  try {
    const value = validateInboxImportPayload({
      filename: 'my-clip.mp4',
      channel: 'finance',
      collection: 'budgeting-saving',
      title: 'Eigener Budget Clip',
      description: 'Eigene Aufnahme eines neutralen Budgetmotivs für Social Media.',
      orientation: 'vertical',
      tags: 'geld,planung',
      aliases: 'Budget Clip, Geld planen',
      rightsOwned: true,
      width: 1080,
      height: 1920,
      duration: 8.5
    }, root);
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

test('Inbox blockiert Traversal, fehlende Rechte und unbekannte Sammlung', () => {
  const root = fixture();
  const base = {
    filename: 'my-clip.mp4', channel: 'finance', collection: 'budgeting-saving', title: 'Eigener Budget Clip',
    description: 'Eigene Aufnahme eines neutralen Budgetmotivs für Social Media.', orientation: 'vertical'
  };
  try {
    assert.throws(() => validateInboxImportPayload({ ...base, filename: '../my-clip.mp4', rightsOwned: true }, root), /filename/);
    assert.throws(() => validateInboxImportPayload({ ...base, rightsOwned: false }, root), /Nutzungsrechte/);
    assert.throws(() => validateInboxImportPayload({ ...base, collection: 'unknown', rightsOwned: true }, root), /Unbekannte Sammlung/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
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
