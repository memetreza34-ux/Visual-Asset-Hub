import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vault = fs.readFileSync(path.join(root, 'scripts/build-found-media-vault.mjs'), 'utf8');
const api = fs.readFileSync(path.join(root, 'scripts/local-script-visual-api.mjs'), 'utf8');

test('Vault-Neuaufbau bewahrt Script-Visual-Projekte', () => {
  assert.match(vault, /06-SKRIPT-PROJEKTE/);
  assert.match(vault, /vault-script-project-history/);
  assert.match(vault, /scriptVisualProjectCount/);
  assert.match(vault, /restoreArchives/);
});

test('laufende Script-Visual-Änderungen schreiben nur den geänderten Szenenordner neu', () => {
  assert.match(api, /function writeProjectMirror\(root, project, changedSceneId = null\)/);
  assert.match(api, /if \(!changedSceneId\) fs\.rmSync\(directory/);
  assert.match(api, /const scenes = changedSceneId \? project\.scenes\.filter\(\(scene\) => scene\.id === changedSceneId\) : project\.scenes/);
  assert.match(api, /writeProjectMirror\(root, project, scene\.id\)/);
  assert.match(api, /fs\.rmSync\(sceneDir, \{ recursive: true, force: true \}\)/);
});
