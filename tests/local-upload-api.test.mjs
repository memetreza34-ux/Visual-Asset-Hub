import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { sanitizeUploadFilename, validateUploadMetadata, validateUploadedFile } from '../scripts/local-upload-api.mjs';

function tempFile(extension, content) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-upload-'));
  const file = path.join(directory, `test${extension}`);
  fs.writeFileSync(file, content);
  return { directory, file };
}

test('Upload-Metadaten akzeptieren sichere unterstützte Dateien', () => {
  const result = validateUploadMetadata({
    'x-vah-filename': encodeURIComponent('Mein Boxtraining 01.mp4'),
    'x-vah-size': '12345',
    'content-length': '12345'
  });
  assert.equal(result.filename, 'Mein Boxtraining 01.mp4');
  assert.equal(result.extension, '.mp4');
  assert.equal(result.size, 12345);
});

test('Dateinamen blockieren Traversal, Windows-Geräte und ungültige Zeichen', () => {
  for (const value of ['../clip.mp4', '..\\clip.mp4', '.secret.mp4', 'CON.mp4', 'video?.mp4', 'ordner/video.mp4']) {
    assert.throws(() => sanitizeUploadFilename(value));
  }
  assert.equal(sanitizeUploadFilename('Eigene Aufnahme 01.mp4'), 'Eigene Aufnahme 01.mp4');
});

test('Upload-Metadaten blockieren falsche Größen und unbekannte Dateitypen', () => {
  assert.throws(() => validateUploadMetadata({ 'x-vah-filename': encodeURIComponent('clip.exe'), 'x-vah-size': '100' }), /nicht unterstützt/);
  assert.throws(() => validateUploadMetadata({ 'x-vah-filename': encodeURIComponent('clip.mp4'), 'x-vah-size': '100', 'content-length': '99' }), /stimmt nicht/);
  assert.throws(() => validateUploadMetadata({ 'x-vah-filename': encodeURIComponent('clip.mp4'), 'x-vah-size': '0' }), /Dateigröße/);
});

test('echte PNG-, JPEG-, WEBP- und MP4-Signaturen werden erkannt', () => {
  const fixtures = [
    ['.png', Buffer.from('89504e470d0a1a0a00000000', 'hex')],
    ['.jpg', Buffer.from('ffd8ffe000104a464946', 'hex')],
    ['.webp', Buffer.concat([Buffer.from('52494646', 'hex'), Buffer.alloc(4), Buffer.from('57454250', 'hex')])],
    ['.mp4', Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('66747970', 'hex'), Buffer.from('69736f6d', 'hex')])]
  ];
  for (const [extension, content] of fixtures) {
    const fixture = tempFile(extension, content);
    try { assert.equal(validateUploadedFile(fixture.file, extension), true); }
    finally { fs.rmSync(fixture.directory, { recursive: true, force: true }); }
  }
});

test('umbenannte oder unvollständige Binärdateien werden blockiert', () => {
  for (const extension of ['.png', '.jpg', '.mp4', '.webm']) {
    const fixture = tempFile(extension, Buffer.from('MZ fake executable payload'));
    try { assert.throws(() => validateUploadedFile(fixture.file, extension)); }
    finally { fs.rmSync(fixture.directory, { recursive: true, force: true }); }
  }
});

test('sicheres SVG wird akzeptiert, aktive oder externe Inhalte werden blockiert', () => {
  const safe = tempFile('.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><rect width="10" height="10" fill="url(#g)"/></svg>');
  try { assert.equal(validateUploadedFile(safe.file, '.svg'), true); }
  finally { fs.rmSync(safe.directory, { recursive: true, force: true }); }

  const dangerous = [
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://example.com/a.css)</style></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://example.com/a.svg)"/></svg>',
    '<?xml-stylesheet href="https://example.com/a.css"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject>HTML</foreignObject></svg>',
    '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"></svg>'
  ];
  for (const source of dangerous) {
    const fixture = tempFile('.svg', source);
    try { assert.throws(() => validateUploadedFile(fixture.file, '.svg'), /aktive|externe/); }
    finally { fs.rmSync(fixture.directory, { recursive: true, force: true }); }
  }
});

test('Browser und Server binden den lokalen Rohdatei-Upload sicher ein', () => {
  const root = process.cwd();
  const html = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
  const browser = fs.readFileSync(path.join(root, 'web', 'inbox-uploader.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'scripts', 'serve.mjs'), 'utf8');
  assert.match(html, /inbox-uploader\.css/);
  assert.match(html, /inbox-uploader\.js/);
  assert.match(browser, /\/upload-api\/file/);
  assert.match(browser, /application\/octet-stream/);
  assert.match(browser, /X-VAH-Token/);
  assert.match(browser, /X-VAH-Filename/);
  assert.match(browser, /XMLHttpRequest/);
  assert.doesNotMatch(browser, /FileReader|base64|FormData/);
  assert.match(server, /createLocalUploadApi/);
  assert.match(server, /\/upload-api\//);
});
