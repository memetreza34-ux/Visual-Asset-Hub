import assert from 'node:assert/strict';
import test from 'node:test';
import {generateAutonomousDocumentaryBrief} from '../scripts/lib/documentary-autonomous-brief.mjs';

function payload(title, topicKey, angle) {
  return {
    title,
    topicKey,
    angle,
    category: 'Test',
    script: Array.from({length: 350}, (_, index) => `Wort${index + 1}`).join(' '),
    researchSummary: 'Gepruefte Testrecherche.',
    sources: [
      {title: 'Quelle 1', url: 'https://example.com/1', publisher: 'A'},
      {title: 'Quelle 2', url: 'https://example.com/2', publisher: 'B'},
      {title: 'Quelle 3', url: 'https://example.com/3', publisher: 'C'}
    ],
    visualSearchAnchors: [
      {query: 'Test topic archive', cues: ['Archiv', 'Geschichte'], intent: 'evidence'},
      {query: 'Test topic satellite', cues: ['Satellit', 'Karte'], intent: 'satellite'},
      {query: 'Test topic location', cues: ['Ort', 'Stadt'], intent: 'evidence'},
      {query: 'Test topic process', cues: ['Prozess', 'Ablauf'], intent: 'broll'},
      {query: 'Test topic map', cues: ['Land', 'Region'], intent: 'map'}
    ],
    publish: {
      title,
      description: 'Fertige Beschreibung.',
      hashtags: ['Eins', 'Zwei', 'Drei', 'Vier', 'Fuenf'],
      tags: ['eins', 'zwei', 'drei', 'vier', 'fuenf'],
      thumbnailText: 'Kurzer Test Titel'
    }
  };
}

function response(value) {
  return new Response(JSON.stringify({
    output: [{content: [{type: 'output_text', text: JSON.stringify(value)}]}]
  }), {status: 200, headers: {'content-type': 'application/json'}});
}

test('autonomous brief rejects a duplicate and asks for another topic', async () => {
  const calls = [];
  const answers = [
    payload('Wie der Aralsee verschwand', 'aralsee', 'Warum der Aralsee schrumpfte'),
    payload('Wie der Eurotunnel gebaut wurde', 'eurotunnel-bau', 'Ingenieure unter dem Aermelkanal')
  ];
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    return response(answers[calls.length - 1]);
  };

  const result = await generateAutonomousDocumentaryBrief({
    registry: {
      topics: [{
        title: 'Wie der Aralsee fast verschwand',
        topicKey: 'aralsee',
        angle: 'Warum der Aralsee schrumpfte',
        status: 'phase1-complete'
      }]
    },
    apiKey: 'sk-test-only',
    model: 'test-model',
    fetchImpl,
    maxAttempts: 3,
    targetDurationSeconds: 150
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].tools[0].type, 'web_search');
  assert.equal(calls[0].tool_choice, 'required');
  assert.equal(calls[0].text.format.type, 'json_schema');
  assert.equal(result.title, 'Wie der Eurotunnel gebaut wurde');
  assert.equal(result.publish.hashtags.length, 5);
  assert.equal(result.generation.actualWords, 350);
  assert.equal(result.visualSearchAnchors.length, 5);
  assert.equal(result.visualSearchAnchors[0].intent, 'evidence');
});
