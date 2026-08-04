import assert from 'node:assert/strict';
import test from 'node:test';
import { renderGallery } from '../scripts/pexels-gallery.mjs';

test('Galerie escaped Inhalte und verlinkt Quelle sowie Datei', () => {
  const html = renderGallery({ query: '<KI & Zukunft>', type: 'video', total_results: 1, page: 1, assets: [{
    type: 'video', provider_id: '42', title: '<script>alert(1)</script>', creator: 'Creator & Co',
    orientation: 'vertical', preview_url: 'https://example.com/poster.jpg', source_url: 'https://www.pexels.com/video/42/',
    files: [{ quality: 'hd', width: 1080, url: 'https://example.com/video.mp4' }]
  }] });
  assert.ok(html.includes('&lt;KI &amp; Zukunft&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('https://www.pexels.com/video/42/'));
  assert.ok(html.includes('https://example.com/video.mp4'));
});
