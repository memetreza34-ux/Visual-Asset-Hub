import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildDocumentaryPhase1 } from '../scripts/documentary-phase1.mjs';

test('Phase 1 erzeugt kopierbares Skript, Szenenplan und Visual-Ordner', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-doku-phase1-'));
  try {
    const result = buildDocumentaryPhase1({
      root,
      outputRoot: 'projects',
      title: 'Tschernobyl 1986',
      script: 'Am 26. April 1986 explodierte Reaktor vier in Tschernobyl. Die Katastrophe veränderte das Leben in der Region.'
    });

    assert.equal(fs.existsSync(path.join(result.projectDirectory, '01-SCRIPT', 'script.txt')), true);
    assert.equal(fs.existsSync(path.join(result.projectDirectory, '05-PROJECT', 'scenes.json')), true);
    assert.equal(result.plan.settings.orientation, 'horizontal');
    assert.ok(result.phase1.scenes.length >= 1);
    assert.equal(fs.existsSync(path.join(result.projectDirectory, '03-VISUALS', 'scene-001')), true);

    const scenes = JSON.parse(fs.readFileSync(path.join(result.projectDirectory, '05-PROJECT', 'scenes.json'), 'utf8'));
    assert.equal(scenes.timing, 'semantic-only-until-final-voiceover');
    assert.ok(scenes.scenes[0].documentary.providerPriority.length >= 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
