import assert from 'node:assert/strict';
import test from 'node:test';
import { buildImportPlans, chooseExternalFile, slug } from '../scripts/pexels-batch-import.mjs';
import taxonomy from '../catalog/taxonomy.json' with { type: 'json' };

const catalog = { catalogVersion: 1, updatedAt: new Date().toISOString(), assets: [] };
const options = {
  query: 'Künstliche Intelligenz Zukunft',
  type: 'video', category: 'technology-ai', orientation: 'vertical', count: 2,
  tags: 'robotik,innovation', aliases: '', secondaryCategories: [],
  scopes: ['organic-social', 'youtube'], status: 'review', style: 'realistic',
  quality: 3, createdBy: 'test', storePreviews: false
};

const result = {
  assets: [{
    provider_id: '123', type: 'video', title: 'Pexels Video 123', source_url: 'https://www.pexels.com/video/123/',
    creator: 'Test Creator', width: 1080, height: 1920, duration_seconds: 8, orientation: 'vertical',
    preview_url: 'https://images.pexels.com/videos/123/free-video-123.jpg',
    files: [{ file_type: 'video/mp4', quality: 'hd', width: 1080, height: 1920, fps: 30, url: 'https://videos.pexels.com/video-files/123/123-hd.mp4' }]
  }]
};

test('slug normalisiert deutsche Suchbegriffe', () => {
  assert.equal(slug('Künstliche Intelligenz & Zukunft'), 'kunstliche-intelligenz-zukunft');
});

test('chooseExternalFile bevorzugt brauchbare HD-MP4-Datei', () => {
  const selected = chooseExternalFile({
    type: 'video', provider_id: '1', width: 2160, height: 3840,
    files: [
      { file_type: 'video/mp4', quality: 'sd', width: 360, height: 640, fps: 25, url: 'https://cdn.example/sd.mp4' },
      { file_type: 'video/mp4', quality: 'hd', width: 1080, height: 1920, fps: 30, url: 'https://cdn.example/hd.mp4' }
    ]
  });
  assert.equal(selected.url, 'https://cdn.example/hd.mp4');
  assert.equal(selected.extension, 'mp4');
});

test('buildImportPlans erzeugt Review-Einträge mit externer Vorschau und Pexels-Rechten', () => {
  const plans = buildImportPlans({ result, catalog, taxonomy, options, now: '2026-08-04T08:00:00.000Z' });
  assert.equal(plans.length, 1);
  const asset = plans[0].asset;
  assert.equal(asset.status, 'review');
  assert.equal(asset.storage.kind, 'external');
  assert.equal(asset.storage.previewUrl, 'https://images.pexels.com/videos/123/free-video-123.jpg');
  assert.equal(asset.storage.previewPath, undefined);
  assert.equal(asset.rights.sourceName, 'Pexels');
  assert.equal(asset.rights.licenseStatus, 'licensed');
  assert.match(asset.filename, /^brl-technology-ai-/);
  assert.ok(asset.tags.includes('pexels'));
});

test('lokale Vorschau kann ausdrücklich aktiviert werden', () => {
  const plans = buildImportPlans({ result, catalog, taxonomy, options: { ...options, storePreviews: true }, now: '2026-08-04T08:00:00.000Z' });
  assert.equal(plans[0].asset.storage.previewPath, 'previews/pexels/123.jpg');
  assert.equal(plans[0].asset.storage.previewUrl, undefined);
  assert.equal(plans[0].previewUrl, 'https://images.pexels.com/videos/123/free-video-123.jpg');
});

test('bereits vorhandene Pexels-Quellen werden nicht doppelt importiert', () => {
  const existing = {
    ...catalog,
    assets: [{ id: 'VAH-ABCDEFGH', filename: 'x.mp4', rights: { sourceUrl: 'https://www.pexels.com/video/123/' } }]
  };
  const duplicateResult = { assets: [{ provider_id: '123', type: 'video', source_url: 'https://www.pexels.com/video/123/', files: [] }] };
  const plans = buildImportPlans({ result: duplicateResult, catalog: existing, taxonomy, options });
  assert.equal(plans.length, 0);
});
