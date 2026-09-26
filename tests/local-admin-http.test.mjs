import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createLocalAdminApi } from '../scripts/local-admin-api.mjs';

async function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-local-api-'));
  fs.mkdirSync(path.join(root, 'catalog'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: 'test-version' }));
  fs.writeFileSync(path.join(root, 'catalog', 'search-index.json'), JSON.stringify({ assetCount: 6, reviewCount: 6, approvedCount: 0, totalUsageCount: 0, catalogUpdatedAt: '2026-08-04T00:00:00.000Z', records: [] }));
  const api = createLocalAdminApi({ root, token: 'fixed-test-token' });
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    if (!(await api.handle(request, response, url))) {
      response.statusCode = 404;
      response.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { root, server, baseUrl };
}

function close(server, root) {
  return new Promise((resolve) => server.close(() => {
    fs.rmSync(root, { recursive: true, force: true });
    resolve();
  }));
}

test('Health-Endpunkt liefert nur lokale Betriebsdaten und Sitzungstoken', async () => {
  const { root, server, baseUrl } = await fixture();
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const data = await response.json();
    assert.equal(data.localAdmin, true);
    assert.equal(data.version, 'test-version');
    assert.equal(data.assetCount, 6);
    assert.equal(data.token, 'fixed-test-token');
  } finally {
    await close(server, root);
  }
});

test('Schreibaktion ohne Sitzungstoken wird vor jeder Dateiveränderung blockiert', async () => {
  const { root, server, baseUrl } = await fixture();
  try {
    const response = await fetch(`${baseUrl}/api/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: '{}'
    });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /Token/i);
  } finally {
    await close(server, root);
  }
});

test('fremder Browser-Ursprung wird trotz korrektem Token blockiert', async () => {
  const { root, server, baseUrl } = await fixture();
  try {
    const response = await fetch(`${baseUrl}/api/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-VAH-Token': 'fixed-test-token', Origin: 'https://example.com' },
      body: '{}'
    });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /Ursprung/i);
  } finally {
    await close(server, root);
  }
});
