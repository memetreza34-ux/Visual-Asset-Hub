import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  buildTimelineBinding,
  choosePexelsDownload,
  mergeRealCandidate,
  rankRealCandidates,
  realMediaPolicy,
  timingMapFromPayload
} from '../scripts/lib/real-media.mjs';

test('exakte Belege werden nicht automatisch durch Stock ersetzt', () => {
  for (const reason of ['original-interface-or-document', 'real-event-authenticity', 'exact-brand-or-product', 'historical-evidence']) {
    const policy = realMediaPolicy({ reason });
    assert.equal(policy.auto_search, false);
    assert.equal(policy.requires_exact_source, true);
    assert.equal(policy.review_required, true);
  }
});

test('authentische Bewegung darf automatisch als echte B-Roll gesucht werden', () => {
  const policy = realMediaPolicy({ reason: 'authentic-motion-broll' });
  assert.equal(policy.auto_search, true);
  assert.equal(policy.auto_download, true);
  assert.equal(policy.requires_exact_source, false);
});

test('mehrfache Query-Treffer werden dedupliziert und aufgewertet', () => {
  const map = new Map();
  const asset = {
    provider: 'pexels',
    provider_id: '42',
    type: 'video',
    width: 1920,
    height: 1080,
    orientation: 'horizontal',
    duration_seconds: 8,
    files: [{ file_type: 'video/mp4', width: 1920, height: 1080, url: 'https://videos.pexels.com/test.mp4' }]
  };
  mergeRealCandidate(map, asset, 'train moving', 1);
  mergeRealCandidate(map, asset, 'commuter train', 2);
  const [merged] = [...map.values()];
  assert.equal(map.size, 1);
  assert.equal(merged.occurrences, 2);
  assert.deepEqual(merged.matched_queries, ['train moving', 'commuter train']);

  const [ranked] = rankRealCandidates([merged], { orientation: 'horizontal', assetType: 'video' });
  assert.ok(ranked.real_media_score >= 80);
});

test('Video-Download bevorzugt brauchbare HD-Datei innerhalb der Zielgröße', () => {
  const chosen = choosePexelsDownload({
    type: 'video',
    files: [
      { quality: 'sd', file_type: 'video/mp4', width: 640, height: 360, url: 'https://videos.pexels.com/sd.mp4' },
      { quality: 'hd', file_type: 'video/mp4', width: 1920, height: 1080, url: 'https://videos.pexels.com/hd.mp4' },
      { quality: 'hd', file_type: 'video/mp4', width: 3840, height: 2160, url: 'https://videos.pexels.com/4k.mp4' }
    ]
  }, { maxDimension: 1920 });
  assert.equal(chosen.url, 'https://videos.pexels.com/hd.mp4');
});

test('Timeline-Binding übernimmt Beat-Timing und begrenzt zu kurzes Video', () => {
  const binding = buildTimelineBinding({
    item: { id: 'beat-001-real-01', beat_id: 'beat-001', reason: 'authentic-motion-broll', asset_type: 'video', orientation: 'horizontal' },
    selected: { provider: 'pexels', provider_id: '7', type: 'video', duration_seconds: 3, orientation: 'horizontal', source_url: 'https://www.pexels.com/video/7/' },
    localFile: '.local-storage/real-media/files/beat-001.mp4',
    timing: { start_seconds: 12.5, duration_seconds: 5 },
    defaultDuration: 4,
    technical: { durationSeconds: 3 }
  });
  assert.equal(binding.status, 'ready');
  assert.equal(binding.placement.start_seconds, 12.5);
  assert.equal(binding.placement.duration_seconds, 3);
  assert.equal(binding.placement.mute, true);
  assert.equal(binding.needs_additional_fill, true);
});

test('Timing-Payload wird über beat_id gemappt', () => {
  const map = timingMapFromPayload({ beats: [{ beat_id: 'beat-003', start_seconds: 9, duration_seconds: 4.5 }] });
  assert.deepEqual(map.get('beat-003'), { start_seconds: 9, duration_seconds: 4.5 });
});

test('Real-Media-CLI kann ohne Netzwerk die Hilfe laden', () => {
  const result = spawnSync(process.execPath, ['scripts/real-media-integrate.mjs', '--help'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Real Media Integration/);
  assert.match(result.stdout, /remotion-real-media\.json/);
});
