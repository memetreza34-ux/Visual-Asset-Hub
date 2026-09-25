import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createDocumentaryProject,
  createSceneDirectories,
  documentaryCategorySlug,
  projectSlug,
  syncDocumentaryPhase1
} from '../scripts/documentary-project.mjs';

test('Doku-Projekt erzeugt die sechs verbindlichen Hauptordner', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const { projectDirectory } = createDocumentaryProject({
      root,
      title: 'Warum Tschernobyl bis heute Folgen hat',
      script: 'Am 26. April 1986 veränderte ein Reaktorunfall die Geschichte.',
      outputRoot: 'projects'
    });

    for (const directory of ['01-SCRIPT', '02-AUDIO', '03-VISUALS', '04-SOURCES', '05-PROJECT', '06-EXPORT']) {
      assert.equal(fs.statSync(path.join(projectDirectory, directory)).isDirectory(), true);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Kategorie liegt zwischen videos-Root und Themenordner', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const { projectDirectory, project } = createDocumentaryProject({
      root,
      outputRoot: 'videos',
      category: 'Umweltgeschichte',
      slug: '001-aralsee',
      title: 'Der Aralsee',
      script: 'Ein finales Skript.'
    });
    assert.equal(path.relative(root, projectDirectory), path.join('videos', 'umweltgeschichte', '001-aralsee'));
    assert.equal(project.category, 'umweltgeschichte');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sichtbares Git-Skelett darf von Phase 1 befuellt werden', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const skeleton = path.join(root, 'videos', 'technik', '001-test');
    fs.mkdirSync(path.join(skeleton, '01-SCRIPT'), {recursive: true});
    fs.writeFileSync(path.join(skeleton, '01-SCRIPT', 'README.txt'), 'Skeleton');
    const {projectDirectory} = createDocumentaryProject({
      root,
      outputRoot: 'videos',
      category: 'Technik',
      slug: '001-test',
      title: 'Test',
      script: 'Finales Skript.'
    });
    assert.equal(projectDirectory, skeleton);
    assert.equal(fs.existsSync(path.join(skeleton, '05-PROJECT', 'project.json')), true);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('script.txt enthält nur den finalen kopierbaren Skripttext', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const script = 'Erster Absatz.\n\nZweiter Absatz.';
    const { projectDirectory } = createDocumentaryProject({ root, title: 'Test Doku', script, outputRoot: 'projects' });
    assert.equal(fs.readFileSync(path.join(projectDirectory, '01-SCRIPT', 'script.txt'), 'utf8'), `${script}\n`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Generator täuscht Audio und fertiges Video nicht vor', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const { projectDirectory } = createDocumentaryProject({ root, title: 'Test Doku', script: 'Finales Skript.', outputRoot: 'projects' });
    assert.equal(fs.existsSync(path.join(projectDirectory, '02-AUDIO', 'voiceover.mp3')), false);
    assert.equal(fs.existsSync(path.join(projectDirectory, '06-EXPORT', 'final-v1.mp4')), false);
    assert.equal(fs.existsSync(path.join(projectDirectory, '06-EXPORT', 'youtube-title.txt')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Projektmanifest kennt Phase-2-, Timing- und YouTube-Exportpfade', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const { projectDirectory } = createDocumentaryProject({ root, title: 'Test Doku', script: 'Finales Skript.', outputRoot: 'projects' });
    const project = JSON.parse(fs.readFileSync(path.join(projectDirectory, '05-PROJECT', 'project.json'), 'utf8'));
    assert.equal(project.paths.audio, '02-AUDIO/voiceover.mp3');
    assert.equal(project.paths.timeline, '05-PROJECT/timeline.json');
    assert.equal(project.paths.finalVideo, '06-EXPORT/final-v1.mp4');
    assert.equal(project.paths.youtubeDescription, '06-EXPORT/youtube-description.txt');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Szenenordner werden lückenlos dreistellig erzeugt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const { projectDirectory } = createDocumentaryProject({ root, title: 'Test Doku', script: 'Finales Skript.', outputRoot: 'projects' });
    createSceneDirectories(projectDirectory, 3);
    assert.equal(fs.existsSync(path.join(projectDirectory, '03-VISUALS', 'scene-001')), true);
    assert.equal(fs.existsSync(path.join(projectDirectory, '03-VISUALS', 'scene-002')), true);
    assert.equal(fs.existsSync(path.join(projectDirectory, '03-VISUALS', 'scene-003')), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Script Visual Finder wird in Phase-1-Szenenplan gespiegelt', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-'));
  try {
    const script = 'Tschernobyl lag in der Sowjetunion. 1986 explodierte Reaktor vier.';
    const { projectDirectory } = createDocumentaryProject({ root, title: 'Tschernobyl', script, outputRoot: 'projects' });
    syncDocumentaryPhase1(projectDirectory, {
      format: 'visual-asset-hub-script-visual-project',
      projectId: 'SVP-ABCDEF123456',
      title: 'Tschernobyl',
      script,
      scriptSha256: 'a'.repeat(64),
      scenes: [
        {
          id: 'SCENE-001',
          sequence: 1,
          originalText: 'Tschernobyl lag in der Sowjetunion.',
          visualIntent: 'Historische Aufnahme des Kraftwerks und Ortskontext',
          visualIntentType: 'history',
          preferredMediaType: 'photo',
          symbolic: false,
          queries: ['Chernobyl nuclear power plant archival photo'],
          selectedPrimary: null,
          selectedAlternatives: []
        },
        {
          id: 'SCENE-002',
          sequence: 2,
          originalText: '1986 explodierte Reaktor vier.',
          visualIntent: 'Historisches Material von Reaktor 4',
          visualIntentType: 'event',
          preferredMediaType: 'video',
          symbolic: false,
          queries: ['Chernobyl reactor 4 1986 archival footage'],
          selectedPrimary: 'wikimedia:123',
          selectedAlternatives: []
        }
      ]
    });

    const scenes = JSON.parse(fs.readFileSync(path.join(projectDirectory, '05-PROJECT', 'scenes.json'), 'utf8'));
    assert.equal(scenes.timing, 'semantic-only-until-final-voiceover');
    assert.equal(scenes.scenes.length, 2);
    assert.equal(scenes.scenes[1].selectedPrimary, 'wikimedia:123');
    assert.equal(fs.existsSync(path.join(projectDirectory, '03-VISUALS', 'scene-001')), true);
    assert.equal(fs.existsSync(path.join(projectDirectory, '03-VISUALS', 'scene-002')), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Projekt-Slug und Kategorien sind stabil und dateisystemsicher', () => {
  assert.equal(projectSlug('Warum Tschernobyl? – Die Folgen'), 'warum-tschernobyl-die-folgen');
  assert.equal(documentaryCategorySlug('Umweltgeschichte'), 'umweltgeschichte');
  assert.equal(documentaryCategorySlug('Computertechnik'), 'technik');
  assert.equal(documentaryCategorySlug('unbekannte Kategorie'), 'sonstiges');
});
