import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createLocalUploadApi } from '../scripts/local-upload-api.mjs';

async function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-upload-http-'));
  const token = 'test-token-local-upload';
  const api = createLocalUploadApi({ root, token });
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    if (!(await api.handle(request, response, url))) {
      response.statusCode = 404;
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    root,
    token,
    origin: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

test('gültiges PNG wird über lokale HTTP-Verbindung atomar in inbox gespeichert', async () => {
  const env = await fixture();
  const body = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  try {
    const response = await fetch(`${env.origin}/upload-api/file`, {
      method: 'POST',
      headers: {
        Origin: env.origin,
        'Content-Type': 'application/octet-stream',
        'X-VAH-Token': env.token,
        'X-VAH-Filename': encodeURIComponent('Eigene Grafik.png'),
        'X-VAH-Size': String(body.length)
      },
      body
    });
    const result = await response.json();
    assert.equal(response.status, 201, result.error || JSON.stringify(result));
    assert.equal(result.storedFilename, 'Eigene Grafik.png');
    assert.equal(result.bytes, body.length);
    assert.deepEqual(fs.readFileSync(path.join(env.root, 'inbox', result.storedFilename)), body);
    assert.equal(fs.readdirSync(path.join(env.root, 'inbox')).some((name) => name.endsWith('.part')), false);
  } finally {
    await env.close();
  }
});

test('gleiche Dateinamen werden umbenannt statt überschrieben', async () => {
  const env = await fixture();
  const body = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  try {
    const names = [];
    for (let index = 0; index < 2; index += 1) {
      const response = await fetch(`${env.origin}/upload-api/file`, {
        method: 'POST',
        headers: {
          Origin: env.origin,
          'Content-Type': 'application/octet-stream',
          'X-VAH-Token': env.token,
          'X-VAH-Filename': encodeURIComponent('bild.png'),
          'X-VAH-Size': String(body.length)
        },
        body
      });
      const result = await response.json();
      assert.equal(response.status, 201, result.error || JSON.stringify(result));
      names.push(result.storedFilename);
    }
    assert.deepEqual(names, ['bild.png', 'bild-2.png']);
    assert.deepEqual(fs.readdirSync(path.join(env.root, 'inbox')).sort(), ['bild-2.png', 'bild.png']);
  } finally {
    await env.close();
  }
});

test('falsche Signatur, falsches Token und fremder Ursprung werden blockiert', async () => {
  const env = await fixture();
  try {
    const fake = Buffer.from('MZ fake executable payload');
    const badSignature = await fetch(`${env.origin}/upload-api/file`, {
      method: 'POST',
      headers: { Origin: env.origin, 'Content-Type': 'application/octet-stream', 'X-VAH-Token': env.token, 'X-VAH-Filename': 'fake.png', 'X-VAH-Size': String(fake.length) },
      body: fake
    });
    assert.equal(badSignature.status, 400);
    assert.match((await badSignature.json()).error, /PNG-Signatur/);
    assert.equal(fs.existsSync(path.join(env.root, 'inbox', 'fake.png')), false);

    const png = Buffer.from('89504e470d0a1a0a00000000', 'hex');
    const badToken = await fetch(`${env.origin}/upload-api/file`, {
      method: 'POST',
      headers: { Origin: env.origin, 'Content-Type': 'application/octet-stream', 'X-VAH-Token': 'wrong', 'X-VAH-Filename': 'bad-token.png', 'X-VAH-Size': String(png.length) },
      body: png
    });
    assert.equal(badToken.status, 403);

    const badOrigin = await fetch(`${env.origin}/upload-api/file`, {
      method: 'POST',
      headers: { Origin: 'http://evil.example', 'Content-Type': 'application/octet-stream', 'X-VAH-Token': env.token, 'X-VAH-Filename': 'bad-origin.png', 'X-VAH-Size': String(png.length) },
      body: png
    });
    assert.equal(badOrigin.status, 403);
    assert.equal(fs.readdirSync(path.join(env.root, 'inbox')).filter((name) => !name.startsWith('.')).length, 0);
  } finally {
    await env.close();
  }
});
