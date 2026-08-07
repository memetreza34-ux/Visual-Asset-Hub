import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(path.join(process.cwd(), 'web', 'arsenal-builder.js'), 'utf8');
const context = vm.createContext({
  document: { querySelector: () => null },
  window: {},
  console,
  URL,
  setTimeout: () => 0,
  location: { reload() {} }
});
new vm.Script(source, { filename: 'web/arsenal-builder.js' }).runInContext(context);

const technicalFit = context.technicalFit;
const rankTechnicalCandidates = context.rankTechnicalCandidates;

test('technischer Fit bevorzugt reel-taugliches vertikales Video', () => {
  const strong = technicalFit({
    type: 'video',
    width: 1080,
    height: 1920,
    orientation: 'vertical',
    duration_seconds: 8,
    preview_url: 'https://example.com/preview.jpg',
    source_url: 'https://example.com/source',
    creator: 'Creator',
    files: [{ url: 'https://example.com/video.mp4' }]
  }, { type: 'video', orientation: 'vertical' });

  const weak = technicalFit({
    type: 'video',
    width: 360,
    height: 200,
    orientation: 'horizontal',
    duration_seconds: 90,
    source_url: 'https://example.com/source'
  }, { type: 'video', orientation: 'vertical' });

  assert.equal(strong.score, 100);
  assert.equal(strong.band, 'very-good');
  assert.ok(weak.score < 50);
  assert.ok(strong.score > weak.score);
});

test('technischer Fit bewertet hochauflösendes Bild ohne Statusentscheidung', () => {
  const fit = technicalFit({
    type: 'image',
    width: 1440,
    height: 2560,
    orientation: 'vertical',
    preview_url: 'https://example.com/preview.jpg',
    source_url: 'https://example.com/source',
    creator: 'Creator',
    files: { original: 'https://example.com/image.jpg' }
  }, { type: 'photo', orientation: 'vertical' });

  assert.ok(fit.score >= 90);
  assert.deepEqual(Object.keys(fit).sort(), ['band', 'reasons', 'score']);
  assert.equal('status' in fit, false);
  assert.equal('approved' in fit, false);
  assert.equal('licenseStatus' in fit, false);
});

test('technische Rangfolge ist stabil bei gleichem Score', () => {
  const assets = [
    { provider_id: 'first', width: 720, height: 1280, orientation: 'vertical', preview_url: 'a', source_url: 'a' },
    { provider_id: 'second', width: 720, height: 1280, orientation: 'vertical', preview_url: 'b', source_url: 'b' }
  ];
  const ranked = rankTechnicalCandidates(assets, { type: 'photo', orientation: 'vertical' });
  assert.deepEqual(ranked.map((item) => item.asset.provider_id), ['first', 'second']);
});

test('Builder kennzeichnet technischen Fit ausdrücklich als keine Freigabe', () => {
  assert.match(source, /keine Inhalts- oder Rechtefreigabe/i);
  assert.match(source, /keine Sichtprüfung, Rechteprüfung oder Inhaltsbewertung/i);
  assert.match(source, /Technischer Fit/);
});
