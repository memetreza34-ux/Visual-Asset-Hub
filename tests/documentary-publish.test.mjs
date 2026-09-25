import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {buildFallback, createDocumentaryPublishPackage} from '../scripts/documentary-publish.mjs';

test('fallback description ends with exactly five hashtags', () => {
  const result = buildFallback(
    {title: 'Warum Tschernobyl bis heute Folgen hat'},
    '1986 explodierte Block vier des Kernkraftwerks Tschernobyl. Die Katastrophe veränderte die Region und die Energiepolitik dauerhaft.'
  );
  const hashtags = result.description.match(/#[\p{L}\p{N}]+/gu) ?? [];
  assert.equal(hashtags.length, 5);
  assert.equal(result.hashtags.length, 5);
  assert.ok(result.tags.length >= 3);
  assert.ok(result.thumbnailText.split(/\s+/).length <= 5);
});

test('curated publish.json is exported without labels and old trailing hashtags are replaced', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-publish-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, '01-SCRIPT'), {recursive: true});
  fs.mkdirSync(path.join(root, '05-PROJECT'), {recursive: true});
  fs.mkdirSync(path.join(root, '06-EXPORT'), {recursive: true});
  fs.writeFileSync(path.join(root, '01-SCRIPT', 'script.txt'), 'Ein kurzer finaler Skripttext.');
  fs.writeFileSync(path.join(root, '05-PROJECT', 'project.json'), JSON.stringify({title: 'Mein Doku-Titel'}));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'publish.json'), JSON.stringify({
    title: 'Der finale Titel',
    description: 'Die fertige Beschreibung.\n\n#Alt #Weg',
    hashtags: ['Doku', 'Geschichte', 'Wissen', 'Deutsch', 'Erklaert'],
    tags: ['Dokumentation', 'Geschichte', 'Wissen'],
    thumbnailText: 'Was wirklich geschah'
  }));

  const result = createDocumentaryPublishPackage({projectDirectory: root});
  assert.equal(result.state.source, '05-PROJECT/publish.json');
  assert.equal(fs.readFileSync(path.join(root, '06-EXPORT', 'youtube-title.txt'), 'utf8').trim(), 'Der finale Titel');
  const description = fs.readFileSync(path.join(root, '06-EXPORT', 'youtube-description.txt'), 'utf8').trim();
  assert.equal((description.match(/#[\p{L}\p{N}]+/gu) ?? []).length, 5);
  assert.equal(description.includes('#Alt'), false);
  assert.equal(fs.readFileSync(path.join(root, '06-EXPORT', 'youtube-tags.txt'), 'utf8').trim(), 'Dokumentation, Geschichte, Wissen');
});
