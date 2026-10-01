import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCategory, planSearchQueries, translateSearchPhrase } from '../scripts/lib/search-planner.mjs';

const suggestions = {
  'technology-ai': ['artificial-intelligence', 'automation', 'robotics', 'computer', 'server'],
  'business-work': ['office', 'meeting', 'teamwork', 'remote-work'],
  'industry-trades': ['factory', 'electrician', 'maintenance', 'technician']
};

test('übersetzt zentrale deutsche Stock-Suchbegriffe', () => {
  assert.equal(translateSearchPhrase('KI im Büro'), 'artificial intelligence im office');
  assert.equal(translateSearchPhrase('Elektriker in der Fabrik'), 'electrician in der factory');
});

test('erkennt eine passende Hauptkategorie', () => {
  assert.equal(detectCategory('KI automation computer', suggestions), 'technology-ai');
  assert.equal(detectCategory('Elektriker maintenance factory', suggestions), 'industry-trades');
});

test('erzeugt mehrere eindeutige visuelle Suchrichtungen', () => {
  const plan = planSearchQueries({
    topic: 'KI ersetzt Büro Jobs',
    topicSuggestions: suggestions,
    maxQueries: 8
  });

  assert.equal(plan.category, 'technology-ai');
  assert.equal(plan.queries.length, 8);
  assert.match(plan.queries[0].query, /artificial intelligence/i);
  assert.ok(plan.queries.some((entry) => entry.reason === 'visual-angle'));
  assert.equal(new Set(plan.queries.map((entry) => entry.query.toLowerCase())).size, plan.queries.length);
});

test('respektiert die maximale Anzahl Suchrichtungen', () => {
  const plan = planSearchQueries({
    topic: 'industrial electrician maintenance',
    topicSuggestions: suggestions,
    maxQueries: 4
  });
  assert.equal(plan.queries.length, 4);
});
