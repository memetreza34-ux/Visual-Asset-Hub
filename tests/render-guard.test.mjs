import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFinalRenderManifest } from '../scripts/lib/render-guard.mjs';

test('Render Guard blockiert fehlende oder manuelle Beats', () => {
  const result = validateFinalRenderManifest({
    status: 'needs-resolution',
    missing: [{ beat_id: 'beat-2', status: 'manual-required' }],
    items: [
      {
        beat_id: 'beat-1',
        status: 'ready',
        selected: { source_mode: 'ai-generated', local_file: 'Bild 01.png' }
      },
      {
        beat_id: 'beat-2',
        status: 'manual-required',
        selected: null
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => /beat-2/i.test(entry)));
  assert.equal(result.policy.placeholder_frames_allowed, false);
  assert.equal(result.policy.technical_cards_allowed, false);
});

test('Render Guard akzeptiert nur vollständige reale oder KI-Visuals', () => {
  const result = validateFinalRenderManifest({
    status: 'render-handoff-ready',
    missing: [],
    items: [
      {
        beat_id: 'beat-1',
        status: 'ready',
        selected: { source_mode: 'ai-generated', local_file: 'Bild 01.png' }
      },
      {
        beat_id: 'beat-2',
        status: 'ready',
        selected: { source_mode: 'real-media', local_file: 'clip-02.mp4' }
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('Render Guard lehnt technische Primärvisual-Typen ab', () => {
  const result = validateFinalRenderManifest({
    status: 'render-handoff-ready',
    missing: [],
    items: [
      {
        beat_id: 'beat-1',
        status: 'ready',
        selected: { source_mode: 'placeholder-card', local_file: 'slot-card.png' }
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((entry) => /unzulässigen Primärvisual-Typ/i.test(entry)));
});
