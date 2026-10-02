import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImportMapping, orderFlowImages, validateImportPlan } from '../scripts/lib/flow-import.mjs';

test('Flow-Import sortiert eindeutige Bildnummern sicher', () => {
  const files = [
    { name: 'render-03.png', relative: 'render-03.png', path: '/x/render-03.png', mtimeMs: 3 },
    { name: 'render-01.png', relative: 'render-01.png', path: '/x/render-01.png', mtimeMs: 1 },
    { name: 'render-02.png', relative: 'render-02.png', path: '/x/render-02.png', mtimeMs: 2 }
  ];
  assert.deepEqual(orderFlowImages(files, 'auto').map((file) => file.name), ['render-01.png', 'render-02.png', 'render-03.png']);
});

test('Flow-Import bricht bei falscher Stage-2-Bildzahl ab', () => {
  const plan = { images: [{ image_number: 1 }, { image_number: 2 }, { image_number: 3 }] };
  assert.throws(() => validateImportPlan(plan, [{}, {}, {}]), /erwartet werden exakt 2/);
});

test('Import-Mapping reserviert Bild 01 für das gewählte Cover', () => {
  const plan = { images: [
    { image_number: 1, beat_id: 'beat-001' },
    { image_number: 2, beat_id: 'beat-002' },
    { image_number: 3, beat_id: 'beat-003' }
  ] };
  const files = [
    { path: '/x/a.png', relative: 'a.png' },
    { path: '/x/b.png', relative: 'b.png' }
  ];
  const mapping = buildImportMapping(plan, files, '/x/cover.png');
  assert.equal(mapping[0].target, 'Bild 01.png');
  assert.equal(mapping[0].role, 'selected-cover');
  assert.equal(mapping[2].target, 'Bild 03.png');
  assert.equal(mapping[2].beat_id, 'beat-003');
});
