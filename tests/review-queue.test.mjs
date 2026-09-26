import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'web', 'review-queue.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'web', 'review-queue.css'), 'utf8');

test('Review-Warteschlange ist in der Weboberfläche eingebunden', () => {
  assert.match(html, /id="review-queue"/);
  assert.match(html, /review-queue\.js/);
  assert.match(html, /review-queue\.css/);
  assert.ok(css.length > 1000);
});

test('Review-Warteschlange verarbeitet nur offene Assets und Einzelentscheidungen', () => {
  assert.match(script, /\['review', 'inbox'\]\.includes\(record\.status\)/);
  assert.match(script, /\/api\/review/);
  assert.match(script, /Freigeben & weiter/);
  assert.match(script, /Einschränken & weiter/);
  assert.match(script, /Archivieren & weiter/);
  assert.match(script, /Überspringen/);
});

test('Freigabe nutzt dieselben vier Pflichtprüfungen wie die lokale API', () => {
  for (const field of ['contentViewed', 'peopleAndBrandsChecked', 'rightsChecked', 'contextChecked']) {
    assert.match(script, new RegExp(field));
  }
  assert.match(script, /X-VAH-Token/);
  assert.doesNotMatch(script, /innerHTML\s*=\s*record\./);
});

test('Untagged-Filter begrenzt Queue und Sammlungsoptionen auf Assets ohne Kanal-Tag', () => {
  const guard = /const channelTags = recordTags\.filter\(\(tag\) => tag\.startsWith\('channel-'\)\);\s*if \(channelValue === 'untagged' && channelTags\.length\) continue;/;
  assert.match(script, guard);
  assert.match(script, /if \(channelValue === 'untagged' && channelTags\.length\) return false;/);
});
