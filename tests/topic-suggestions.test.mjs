import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const root = process.cwd();
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'catalog/taxonomy.json'), 'utf8'));
const suggestions = JSON.parse(fs.readFileSync(path.join(root, 'catalog/topic-suggestions.json'), 'utf8'));
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test('every category has topic suggestions and no unknown category exists', () => {
  assert.deepEqual(Object.keys(suggestions.topics).sort(), [...taxonomy.categories].sort());
});

test('topic suggestions are unique valid slugs', () => {
  for (const [category, topics] of Object.entries(suggestions.topics)) {
    assert.ok(Array.isArray(topics) && topics.length >= 8, `${category} benötigt mindestens acht Themen`);
    assert.equal(new Set(topics).size, topics.length, `${category} enthält doppelte Themen`);
    for (const topic of topics) assert.match(topic, slugPattern, `${category}: ungültiger Slug ${topic}`);
  }
});

test('mood suggestions are unique valid slugs', () => {
  assert.ok(Array.isArray(suggestions.moods) && suggestions.moods.length >= 10);
  assert.equal(new Set(suggestions.moods).size, suggestions.moods.length);
  for (const mood of suggestions.moods) assert.match(mood, slugPattern);
});
