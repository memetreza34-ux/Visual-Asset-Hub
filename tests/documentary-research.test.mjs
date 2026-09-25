import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { researchDocumentaryProject, researchScene } from '../scripts/documentary-research.mjs';
import { documentaryCandidateScore } from '../scripts/lib/documentary-source-router.mjs';

function historicalScene() {
  return {
    sceneId: 'SCENE-001',
    sequence: 1,
    originalText: 'Am 26. April 1986 explodierte Reaktor vier des Kernkraftwerks Tschernobyl.',
    visualIntent: 'Historisches Material von Tschernobyl und Reaktor 4 im Jahr 1986.',
    visualIntentType: 'history',
    preferredMediaType: 'photo',
    symbolic: false,
    entities: ['Tschernobyl', '1986', 'Reaktor 4'],
    concepts: ['Kernkraftwerk', 'Explosion'],
    queries: ['Chernobyl reactor 4 1986', 'Chernobyl nuclear power plant archive'],
    documentary: {
      evidenceLevel: 'exact-event-or-era',
      providerPriority: ['wikimedia', 'openverse', 'pexels', 'pixabay', 'unsplash']
    }
  };
}

function fakeSearchers() {
  return {
    wikimedia: async () => ({
      assets: [{
        provider: 'wikimedia',
        provider_id: 'File-Chernobyl-1986',
        type: 'image',
        title: 'Chernobyl Nuclear Power Plant Reactor 4 in 1986',
        source_url: 'https://commons.wikimedia.org/wiki/File:Chernobyl_1986.jpg',
        creator: 'Archive photographer',
        width: 2400,
        height: 1600,
        orientation: 'horizontal',
        preview_url: 'https://upload.wikimedia.org/preview.jpg',
        files: { original: 'https://upload.wikimedia.org/chernobyl-1986.jpg' },
        license: 'CC-BY-SA-4.0'
      }]
    }),
    openverse: async () => ({
      assets: [{
        provider: 'openverse',
        provider_id: 'generic-plant',
        type: 'image',
        title: 'Generic nuclear power station',
        source_url: 'https://example.org/generic-plant',
        creator: 'Example',
        width: 2000,
        height: 1200,
        orientation: 'horizontal',
        preview_url: 'https://example.org/preview.jpg',
        files: { original: 'https://example.org/generic.jpg' },
        license: 'CC0'
      }]
    }),
    pexels: async () => ({ assets: [] }),
    pixabay: async () => ({ assets: [] }),
    unsplash: async () => ({ assets: [] })
  };
}

test('Suchbegriff selbst erhöht den Evidenzscore nicht künstlich', () => {
  const scene = historicalScene();
  const generic = documentaryCandidateScore(scene, {
    provider: 'wikimedia',
    query: 'Chernobyl reactor 4 1986',
    title: 'Unrelated archival building',
    technicalFit: 80,
    reusedElsewhere: false,
    asset: {}
  });
  const exact = documentaryCandidateScore(scene, {
    provider: 'wikimedia',
    query: 'Chernobyl reactor 4 1986',
    title: 'Chernobyl Reactor 4 1986 archive photograph',
    technicalFit: 80,
    reusedElsewhere: false,
    asset: {}
  });
  assert.equal(generic.scoringBasis, 'result-metadata-only');
  assert.ok(exact.score > generic.score);
  assert.equal(exact.exactYearMatch, true);
});

test('Historische Szene priorisiert den passendsten Archivtreffer', async () => {
  const result = await researchScene({
    scene: historicalScene(),
    searchers: fakeSearchers(),
    keys: {},
    maxTasks: 2,
    perPage: 5,
    alternatives: 1
  });

  assert.equal(result.scene.recommendedPrimary, 'wikimedia:File-Chernobyl-1986');
  assert.equal(result.scene.research.rightsStatus, 'review-required-before-publication');
  assert.ok(result.scene.candidates[0].documentaryScore > result.scene.candidates[1].documentaryScore);
  assert.equal(result.scene.candidates[0].reviewStatus, 'review-required');
});

test('Projekt-Recherche schreibt Empfehlungen, Quellen und Szene-Shortcuts', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-research-'));
  try {
    for (const directory of ['03-VISUALS/scene-001', '04-SOURCES', '05-PROJECT']) {
      fs.mkdirSync(path.join(root, directory), { recursive: true });
    }
    fs.writeFileSync(path.join(root, '05-PROJECT', 'scenes.json'), `${JSON.stringify({
      format: 'visual-asset-hub-documentary-scenes',
      version: 1,
      scenes: [historicalScene()]
    }, null, 2)}\n`);

    const { summary } = await researchDocumentaryProject({
      projectDirectory: root,
      searchers: fakeSearchers(),
      keys: {},
      perPage: 5,
      maxTasksPerScene: 2,
      alternatives: 1
    });

    assert.equal(summary.researchedScenes, 1);
    assert.equal(summary.scenesWithRecommendation, 1);
    assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'research-summary.json')), true);
    assert.equal(fs.existsSync(path.join(root, '03-VISUALS', 'scene-001', '01-MAIN-SOURCE.url')), true);
    assert.equal(fs.existsSync(path.join(root, '03-VISUALS', 'scene-001', '01-MAIN-MEDIA.url')), true);

    const sources = fs.readFileSync(path.join(root, '04-SOURCES', 'sources.txt'), 'utf8');
    const licenses = fs.readFileSync(path.join(root, '04-SOURCES', 'licenses.csv'), 'utf8');
    assert.match(sources, /wikimedia/);
    assert.match(sources, /Chernobyl Nuclear Power Plant Reactor 4 in 1986/);
    assert.match(licenses, /review-required/);
    assert.match(licenses, /CC-BY-SA-4\.0/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
