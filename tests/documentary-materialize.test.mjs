import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { materializeCandidate, materializeDocumentaryVisuals } from '../scripts/documentary-materialize.mjs';

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-documentary-materialize-'));
  for (const dir of ['03-VISUALS/scene-001', '05-PROJECT']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  return root;
}

function fakeFetch(body = Buffer.from('fake-media'), contentType = 'image/jpeg') {
  return async (url, options = {}) => {
    assert.equal(options.redirect, 'manual');
    assert.match(String(url), /^https:\/\//);
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'content-length': String(body.length)
      }
    });
  };
}

test('materializeCandidate stores a recommended Pexels image as a real local file', async () => {
  const projectDirectory = tempProject();
  try {
    const result = await materializeCandidate({
      projectDirectory,
      scene: { sequence: 1 },
      candidate: {
        key: 'pexels:123',
        provider: 'pexels',
        providerId: '123',
        type: 'image',
        sourceUrl: 'https://www.pexels.com/photo/123/',
        mediaUrl: 'https://images.pexels.com/photos/123/example.jpeg',
        reviewStatus: 'review-required'
      },
      fetchImpl: fakeFetch(Buffer.from('jpeg-bytes'), 'image/jpeg')
    });

    assert.equal(result.relativePath, '03-VISUALS/scene-001/01-main.jpg');
    assert.equal(result.skipped, false);
    assert.equal(fs.readFileSync(path.join(projectDirectory, result.relativePath), 'utf8'), 'jpeg-bytes');
  } finally {
    fs.rmSync(projectDirectory, { recursive: true, force: true });
  }
});

test('materializeDocumentaryVisuals downloads only the primary recommendation by default', async () => {
  const projectDirectory = tempProject();
  try {
    const scenes = {
      format: 'test-scenes',
      scenes: [{
        sceneId: 'SCENE-001',
        sequence: 1,
        recommendedPrimary: 'pexels:1',
        recommendedAlternatives: ['pexels:2'],
        candidates: [
          {
            key: 'pexels:1', provider: 'pexels', providerId: '1', type: 'image',
            sourceUrl: 'https://www.pexels.com/photo/1/',
            mediaUrl: 'https://images.pexels.com/photos/1/main.jpeg',
            reviewStatus: 'review-required'
          },
          {
            key: 'pexels:2', provider: 'pexels', providerId: '2', type: 'image',
            sourceUrl: 'https://www.pexels.com/photo/2/',
            mediaUrl: 'https://images.pexels.com/photos/2/alt.jpeg',
            reviewStatus: 'review-required'
          }
        ]
      }]
    };
    fs.writeFileSync(path.join(projectDirectory, '05-PROJECT', 'scenes.json'), JSON.stringify(scenes));

    const result = await materializeDocumentaryVisuals({
      projectDirectory,
      fetchImpl: fakeFetch(Buffer.from('main-file'), 'image/jpeg')
    });

    assert.equal(result.summary.primaryFiles, 1);
    assert.equal(result.summary.alternativeFiles, 0);
    assert.equal(result.summary.failed, 0);
    assert.equal(fs.existsSync(path.join(projectDirectory, '03-VISUALS', 'scene-001', '01-main.jpg')), true);
    assert.equal(fs.existsSync(path.join(projectDirectory, '03-VISUALS', 'scene-001', '02-alternative.jpg')), false);

    const updated = JSON.parse(fs.readFileSync(path.join(projectDirectory, '05-PROJECT', 'scenes.json'), 'utf8'));
    assert.equal(updated.scenes[0].localPrimaryFile, '03-VISUALS/scene-001/01-main.jpg');
    assert.equal(updated.scenes[0].localVisuals[0].reviewStatus, 'review-required');
    assert.equal(updated.materialization.rightsStatus, 'review-required-before-publication');
  } finally {
    fs.rmSync(projectDirectory, { recursive: true, force: true });
  }
});

test('Unsplash materialization uses the download tracking endpoint before fetching media', async () => {
  const projectDirectory = tempProject();
  let tracked = false;
  try {
    const result = await materializeCandidate({
      projectDirectory,
      scene: { sequence: 1 },
      candidate: {
        key: 'unsplash:abc',
        provider: 'unsplash',
        providerId: 'abc',
        type: 'image',
        sourceUrl: 'https://unsplash.com/photos/abc',
        mediaUrl: 'https://images.unsplash.com/photo-abc',
        asset: { download_location: 'https://api.unsplash.com/photos/abc/download' }
      },
      keys: { unsplash: 'test-key-123' },
      tracker: async ({ apiKey, downloadLocation }) => {
        tracked = true;
        assert.equal(apiKey, 'test-key-123');
        assert.equal(downloadLocation, 'https://api.unsplash.com/photos/abc/download');
        return { ok: true, url: 'https://images.unsplash.com/photo-abc?fm=jpg' };
      },
      fetchImpl: fakeFetch(Buffer.from('unsplash-file'), 'image/jpeg')
    });

    assert.equal(tracked, true);
    assert.equal(result.relativePath, '03-VISUALS/scene-001/01-main.jpg');
  } finally {
    fs.rmSync(projectDirectory, { recursive: true, force: true });
  }
});

test('materializer blocks private network media URLs', async () => {
  const projectDirectory = tempProject();
  try {
    await assert.rejects(
      () => materializeCandidate({
        projectDirectory,
        scene: { sequence: 1 },
        candidate: {
          key: 'openverse:x',
          provider: 'openverse',
          type: 'image',
          mediaUrl: 'https://127.0.0.1/secret.jpg'
        },
        fetchImpl: fakeFetch()
      }),
      /private Netzwerkziele/
    );
  } finally {
    fs.rmSync(projectDirectory, { recursive: true, force: true });
  }
});
