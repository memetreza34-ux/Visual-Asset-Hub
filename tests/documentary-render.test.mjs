import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {buildRenderProps, prepareDocumentaryRender} from '../scripts/documentary-render.mjs';
import {sha256Text} from '../scripts/lib/documentary-timing-aligner.mjs';

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-render-'));
  for (const dir of ['01-SCRIPT', '02-AUDIO', '03-VISUALS/scene-001', '03-VISUALS/scene-002', '04-SOURCES', '05-PROJECT', '06-EXPORT']) {
    fs.mkdirSync(path.join(root, dir), {recursive: true});
  }
  const script = 'Hallo Welt. Danach geht es weiter.';
  const audio = Buffer.from('fake-final-audio');
  const scriptSha256 = sha256Text(script);
  const audioSha256 = createHash('sha256').update(audio).digest('hex');
  fs.writeFileSync(path.join(root, '01-SCRIPT', 'script.txt'), `${script}\n`);
  fs.writeFileSync(path.join(root, '02-AUDIO', 'voiceover.mp3'), audio);
  fs.writeFileSync(path.join(root, '03-VISUALS', 'scene-001', '01-main.jpg'), Buffer.from('image-one'));
  fs.writeFileSync(path.join(root, '03-VISUALS', 'scene-002', '02-main.mp4'), Buffer.from('video-two'));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'project.json'), JSON.stringify({title: 'Render Test', slug: 'render-test'}));
  const timeline = {
    format: 'visual-asset-hub-documentary-timeline',
    version: 1,
    scriptSha256,
    audioSha256,
    durationSeconds: 2.4,
    audio: '02-AUDIO/voiceover.mp3',
    exportTarget: '06-EXPORT/final-v1.mp4',
    scenes: [
      {sceneId: 'SCENE-001', sequence: 1, startSeconds: 0.1, endSeconds: 1, visualPath: '03-VISUALS/scene-001/01-main.jpg', visualType: 'image', rightsStatus: 'approved', edit: {motion: 'subtle-documentary-pan-or-zoom', transitionIn: 'none'}},
      {sceneId: 'SCENE-002', sequence: 2, startSeconds: 1, endSeconds: 2.2, visualPath: '03-VISUALS/scene-002/02-main.mp4', visualType: 'video', rightsStatus: 'approved', edit: {motion: 'source-motion', transitionIn: 'cut'}}
    ]
  };
  fs.writeFileSync(path.join(root, '05-PROJECT', 'timeline.json'), JSON.stringify(timeline));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'edit-plan.json'), JSON.stringify({scenes: [
    {sceneId: 'SCENE-001', motion: 'subtle-documentary-pan-or-zoom', transitionIn: 'none'},
    {sceneId: 'SCENE-002', motion: 'source-motion', transitionIn: 'cut', sourceInSeconds: 0.5, sourceOutSeconds: 2}
  ]}));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'phase3-state.json'), JSON.stringify({scriptSha256, audioSha256, timingAlignment: {status: 'exact'}, status: 'ready-for-editor'}));
  fs.writeFileSync(path.join(root, '05-PROJECT', 'antigravity-handoff.json'), JSON.stringify({gates: {exactTimingAlignmentRequired: true}, render: {target: '06-EXPORT/final-v1.mp4'}}));
  return {root, timeline};
}

test('buildRenderProps preserves exact boundaries at 30 fps and fills leading/trailing silence', () => {
  const timeline = {
    durationSeconds: 2.4,
    scenes: [
      {sceneId: 'SCENE-001', sequence: 1, startSeconds: 0.1, visualPath: 'a.jpg', visualType: 'image', edit: {}},
      {sceneId: 'SCENE-002', sequence: 2, startSeconds: 1, visualPath: 'b.mp4', visualType: 'video', edit: {}}
    ]
  };
  const props = buildRenderProps({timeline, editPlan: {scenes: []}});
  assert.equal(props.totalFrames, 72);
  assert.equal(props.scenes[0].startFrame, 0);
  assert.equal(props.scenes[0].durationInFrames, 30);
  assert.equal(props.scenes[1].startFrame, 30);
  assert.equal(props.scenes[1].durationInFrames, 42);
});

test('prepareDocumentaryRender stages only final audio and selected visuals', (t) => {
  const {root} = makeProject();
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const prepared = prepareDocumentaryRender({projectDirectory: root});
  assert.equal(prepared.renderProps.scenes.length, 2);
  assert.equal(prepared.renderProps.scenes[1].trimBeforeFrames, 15);
  assert.equal(prepared.renderProps.scenes[1].trimAfterFrames, 60);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'remotion-public', 'audio', 'voiceover.mp3')), true);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'remotion-public', 'visuals', '001.jpg')), true);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'remotion-public', 'visuals', '002.mp4')), true);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'render-props.json')), true);
  assert.equal(fs.existsSync(path.join(root, '05-PROJECT', 'render-plan.json')), true);
  assert.equal(prepared.outputRelative, '06-EXPORT/final-v1.mp4');
});

test('buildRenderProps rejects scene boundaries that collapse into the same frame', () => {
  assert.throws(() => buildRenderProps({
    timeline: {
      durationSeconds: 1,
      scenes: [
        {sceneId: 'SCENE-001', sequence: 1, startSeconds: 0, visualType: 'image', visualPath: 'a.jpg'},
        {sceneId: 'SCENE-002', sequence: 2, startSeconds: 0.01, visualType: 'image', visualPath: 'b.jpg'}
      ]
    },
    editPlan: {scenes: []}
  }), /nicht eindeutig/);
});
