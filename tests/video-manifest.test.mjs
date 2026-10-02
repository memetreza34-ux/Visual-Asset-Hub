import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUnifiedVideoManifest } from '../scripts/lib/video-manifest.mjs';

test('Unified Manifest wählt AI für AI-Beat und Real-Media für Real-Beat', () => {
  const visualPlan = {
    beats: [
      { id: 'beat-001', text: 'Intro', source_decision: { mode: 'ai-first' } },
      { id: 'beat-002', text: 'Zug fährt', source_decision: { mode: 'real-first' } }
    ],
    assets: [
      { beat_id: 'beat-001', source_mode: 'ai-generated', priority: 'cover' },
      { beat_id: 'beat-002', source_mode: 'stock-or-real', priority: 'primary' },
      { beat_id: 'beat-002', source_mode: 'ai-generated', priority: 'fallback' }
    ]
  };
  const productionPlan = { images: [{ image_number: 1, beat_id: 'beat-001' }] };
  const flowImportReport = {
    output_dir: 'flow/final-images',
    items: [{ image_number: 1, beat_id: 'beat-001', role: 'selected-cover', target: 'Bild 01.png', sha256: 'abc' }]
  };
  const realManifest = {
    bindings: [{ beat_id: 'beat-002', status: 'ready', asset_type: 'video', local_file: 'real/train.mp4', placement: { mute: true } }]
  };
  const result = buildUnifiedVideoManifest({ visualPlan, productionPlan, flowImportReport, realManifest });
  assert.equal(result.status, 'assets-ready-awaiting-voice-timings');
  assert.equal(result.items[0].selected.source_mode, 'ai-generated');
  assert.equal(result.items[1].selected.source_mode, 'real-media');
  assert.equal(result.summary.real_selected, 1);
});

test('Unified Manifest markiert fehlendes Real-Media mit geplantem AI-Fallback korrekt', () => {
  const visualPlan = {
    beats: [{ id: 'beat-001', text: 'Maschine läuft', source_decision: { mode: 'real-first' } }],
    assets: [
      { beat_id: 'beat-001', source_mode: 'ai-generated', priority: 'cover' },
      { beat_id: 'beat-001', source_mode: 'stock-or-real', priority: 'primary' },
      { beat_id: 'beat-001', source_mode: 'ai-generated', priority: 'fallback' }
    ]
  };
  const result = buildUnifiedVideoManifest({
    visualPlan,
    productionPlan: { images: [{ image_number: 1, beat_id: 'beat-001' }] },
    flowImportReport: { output_dir: 'flow/final-images', items: [{ image_number: 1, beat_id: 'beat-001', role: 'selected-cover', target: 'Bild 01.png' }] },
    realManifest: { bindings: [{ beat_id: 'beat-001', status: 'unresolved', asset_type: 'video', local_file: null }] }
  });
  assert.equal(result.status, 'needs-resolution');
  assert.equal(result.items[0].status, 'fallback-generation-required');
});

test('Mit vollständigen Beat-Timings wird Manifest render-handoff-ready', () => {
  const visualPlan = {
    beats: [{ id: 'beat-001', text: 'Intro', source_decision: { mode: 'ai-first' } }],
    assets: [{ beat_id: 'beat-001', source_mode: 'ai-generated', priority: 'cover' }]
  };
  const result = buildUnifiedVideoManifest({
    visualPlan,
    productionPlan: { images: [{ image_number: 1, beat_id: 'beat-001' }] },
    flowImportReport: { output_dir: 'flow/final-images', items: [{ image_number: 1, beat_id: 'beat-001', role: 'selected-cover', target: 'Bild 01.png' }] },
    realManifest: { bindings: [] },
    timings: { beats: [{ beat_id: 'beat-001', start_seconds: 0, duration_seconds: 4 }] }
  });
  assert.equal(result.status, 'render-handoff-ready');
  assert.equal(result.remotion_bindings[0].placement.start_seconds, 0);
});
