import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Themenrecherche ist in HTML und Navigation eingebunden', () => {
  const html = read('web/index.html');
  const nav = read('web/workspace-nav.js');
  assert.match(html, /id="entity-research"/);
  assert.match(html, /entity-research\.css/);
  assert.match(html, /entity-research\.js/);
  assert.match(nav, /Thema recherchieren/);
  assert.match(nav, /#entity-research/);
});

test('Themenrecherche nutzt lokale Entity-API, Session-Memory und keine Browser-Persistenz', () => {
  const source = read('web/entity-research.js');
  assert.match(source, /new Map\(\)/);
  assert.match(source, /\/entity-api\/plan/);
  assert.match(source, /\/entity-api\/search/);
  assert.match(source, /\/arsenal-api\/import/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
});

test('Themenrecherche bietet direkte Video-Sichtung und Rechtewarnungen', () => {
  const source = read('web/entity-research.js');
  assert.match(source, /document\.createElement\('video'\)/);
  assert.match(source, /video\.controls = true/);
  assert.match(source, /playableVideoUrl/);
  assert.match(source, /Broadcast/);
  assert.match(source, /keine automatische Nutzungs- oder Veröffentlichungserlaubnis|keine Nutzungsfreigabe|Rechte weiterhin prüfen/);
});

test('Lokaler Server bindet Entity-API in die geschützte API-Schreibsperre ein', () => {
  const server = read('scripts/serve.mjs');
  assert.match(server, /createLocalEntityApi/);
  assert.match(server, /'\/entity-api\/'/);
  assert.match(server, /entityApi\.handle/);
  assert.match(server, /activeWriteAction/);
});
