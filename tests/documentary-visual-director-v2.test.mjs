import assert from 'node:assert/strict';
import test from 'node:test';
import {researchSceneV2} from '../scripts/documentary-research-v2.mjs';
import {buildRenderPropsV2} from '../scripts/documentary-render-v2.mjs';
import {visionRerankCandidates} from '../scripts/lib/documentary-vision-rerank.mjs';

function mockAsset(provider, id, type, title) {
  return {
    provider,
    provider_id: id,
    type: type === 'video' ? 'video' : 'image',
    title,
    description: title,
    source_url: `https://example.com/${provider}/${id}`,
    preview_url: `https://example.com/${provider}/${id}.jpg`,
    creator: `${provider}-creator-${id}`,
    width: 1920,
    height: 1080,
    duration_seconds: type === 'video' ? 12 : null,
    files: {original: `https://cdn.example.com/${provider}/${id}.${type === 'video' ? 'mp4' : 'jpg'}`}
  };
}

function mockSearcher(provider) {
  return async ({type, query}) => ({
    assets: [
      mockAsset(provider, `${type}-1-${slug(query)}`, type, `${query} ${type} wide`),
      mockAsset(provider, `${type}-2-${slug(query)}`, type, `${query} ${type} detail`)
    ]
  });
}

function slug(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24); }

function ledger() { return {identities: new Set(), families: new Set(), providerCounts: new Map(), motifCounts: new Map(), recent: []}; }

test('Visual Director wählt mehrere unterschiedliche Shots und priorisiert B-Roll', async () => {
  const scene = {
    sceneId: 'SCENE-001', sequence: 1,
    originalText: 'Der Aralsee schrumpfte über Jahrzehnte, während Bewässerungskanäle immer größere Wassermengen in die Landwirtschaft umleiteten und frühere Häfen trockenfielen.',
    visualIntent: 'Aralsee, Bewässerung und trockengefallene Häfen zeigen',
    preferredMediaType: 'mixed', symbolic: false,
    documentary: {
      evidenceLevel: 'exact-event-or-era',
      providerPriority: ['pexels', 'pixabay'],
      searchDirections: [
        {kind: 'broll', query: 'Aral Sea irrigation canal', preferredMediaType: 'video'},
        {kind: 'evidence', query: 'Aral Sea dry port', preferredMediaType: 'photo'}
      ]
    }
  };
  const result = await researchSceneV2({
    scene,
    searchers: {pexels: mockSearcher('pexels'), pixabay: mockSearcher('pixabay')},
    keys: {pexels: 'x', pixabay: 'y'},
    maxTasks: 8,
    perPage: 4,
    ledger: ledger()
  });
  assert.ok(result.scene.recommendedShots.length >= 2);
  assert.equal(result.scene.recommendedShots[0].mediaType, 'video');
  assert.equal(new Set(result.scene.recommendedShots.map((shot) => shot.candidateKey)).size, result.scene.recommendedShots.length);
});

test('Render V2 teilt eine gelockte Szene in mehrere Shot-Sequenzen', () => {
  const props = buildRenderPropsV2({
    timeline: {
      durationSeconds: 10,
      scenes: [{
        sceneId: 'SCENE-001', sequence: 1, startSeconds: 0, endSeconds: 10,
        visualShots: [
          {shotId: 'SHOT-01', visualPath: '03-VISUALS/scene-001/a.mp4', visualType: 'video'},
          {shotId: 'SHOT-02', visualPath: '03-VISUALS/scene-001/b.jpg', visualType: 'image'}
        ]
      }]
    },
    editPlan: {scenes: []},
    fps: 30
  });
  assert.equal(props.shots.length, 2);
  assert.equal(props.shots[0].startFrame, 0);
  assert.equal(props.shots[0].durationInFrames + props.shots[1].durationInFrames, 300);
  assert.equal(props.shots[1].startFrame, props.shots[0].durationInFrames);
});

test('Vision Gate bewertet tatsächlich gelieferte Previews', async () => {
  const candidates = [
    {key: 'a', provider: 'wikimedia', type: 'image', title: 'Aral Sea ship', previewUrl: 'https://example.com/a.jpg'},
    {key: 'b', provider: 'pexels', type: 'video', title: 'Desert', previewUrl: 'https://example.com/b.jpg'}
  ];
  const fetchImpl = async (_url, request) => {
    const body = JSON.parse(request.body);
    const images = body.input[0].content.filter((item) => item.type === 'input_image');
    assert.equal(images.length, 2);
    return {
      ok: true,
      async json() {
        return {output_text: JSON.stringify({results: [
          {id: 'C1', visibleRelevance: 94, exactness: 'exact', duplicateGroup: 'ship-wreck', reason: 'shows the exact subject'},
          {id: 'C2', visibleRelevance: 32, exactness: 'mismatch', duplicateGroup: 'generic-desert', reason: 'generic desert only'}
        ]})};
      }
    };
  };
  const result = await visionRerankCandidates({scene: {originalText: 'Schiffe stehen heute auf trockenem Boden.', visualIntent: 'Schiffswracks am Aralsee'}, candidates, apiKey: 'test', model: 'test-model', fetchImpl});
  assert.equal(result.applied, true);
  assert.equal(result.scores.get('a').visibleRelevance, 94);
  assert.equal(result.scores.get('b').exactness, 'mismatch');
});
