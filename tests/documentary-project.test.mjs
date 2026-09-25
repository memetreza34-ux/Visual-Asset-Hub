import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createDocumentaryProject, createSceneDirectories, projectSlug } from '../scripts/documentary-project.mjs';

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

test('Projekt-Slug ist stabil und dateisystemsicher', () => {
  assert.equal(projectSlug('Warum Tschernobyl? – Die Folgen'), 'warum-tschernobyl-die-folgen');
});
