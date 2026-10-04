import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  isAllowedDownloadHost,
  providersFor,
  searchTypesFor,
  withPexelsDownloads
} from '../scripts/lib/providers/index.mjs';
import { normalizePage, searchWikimedia } from '../scripts/lib/providers/wikimedia.mjs';
import { mapRights as openverseRights } from '../scripts/lib/providers/openverse.mjs';
import { buildCreditLines, chooseDownload, matchesRequiredTerms, rankRealCandidates } from '../scripts/lib/real-media.mjs';
import { applyAlternate, approveBindings, nextAlternate, rejectBinding, syncResolution } from '../scripts/lib/real-media-review.mjs';
import { findEntities, planAiFirstVisuals } from '../scripts/lib/ai-visual-planner.mjs';
import { buildUnifiedVideoManifest } from '../scripts/lib/video-manifest.mjs';

test('Marken/Produkte gehen nur an Archive, generische B-Roll an Stock mit Key', () => {
  assert.deepEqual(providersFor({ tier: 'archive', assetType: 'image', env: {} }), ['wikimedia', 'openverse']);
  assert.deepEqual(providersFor({ tier: 'archive', assetType: 'video', env: {} }), ['wikimedia', 'openverse', 'internet-archive']);
  assert.deepEqual(providersFor({ tier: 'archive', assetType: 'image', env: { PEXELS_API_KEY: 'x' } }), ['wikimedia', 'openverse']);
  assert.deepEqual(providersFor({ tier: 'stock', assetType: 'video', env: { PEXELS_API_KEY: 'x', PIXABAY_API_KEY: 'y' } }), ['pexels', 'pixabay']);
  assert.deepEqual(providersFor({ tier: 'stock', assetType: 'image', env: {} }), ['wikimedia', 'openverse']);
  assert.deepEqual(providersFor({ override: ['wikimedia', 'pexels'], env: {} }), ['wikimedia']);
  assert.throws(() => providersFor({ override: ['unbekannt'], env: {} }), /Unbekannter Provider/);
});

test('Archive suchen für Video-Beats zusätzlich Fotos, Openverse nur Fotos', () => {
  assert.deepEqual(searchTypesFor('wikimedia', 'video'), ['video', 'image']);
  assert.deepEqual(searchTypesFor('openverse', 'video'), ['image']);
  assert.deepEqual(searchTypesFor('pexels', 'video'), ['video']);
});

test('Downloads nur per HTTPS von den Hosts des jeweiligen Providers', () => {
  assert.equal(isAllowedDownloadHost('wikimedia', 'https://upload.wikimedia.org/a.jpg'), true);
  assert.equal(isAllowedDownloadHost('pexels', 'https://videos.pexels.com/a.mp4'), true);
  assert.equal(isAllowedDownloadHost('openverse', 'https://live.staticflickr.com/1/2.jpg'), true);
  assert.equal(isAllowedDownloadHost('wikimedia', 'http://upload.wikimedia.org/a.jpg'), false);
  assert.equal(isAllowedDownloadHost('wikimedia', 'https://upload.wikimedia.org.evil.com/a.jpg'), false);
  assert.equal(isAllowedDownloadHost('openverse', 'https://example.com/a.jpg'), false);
});

test('Wikimedia: Lizenz wird erkannt, SVG-Logos werden verworfen, skaliertes Bild zuerst', () => {
  const base = {
    pageid: 1,
    title: 'File:Nokia N95.jpg',
    imageinfo: [{
      url: 'https://upload.wikimedia.org/o/Nokia_N95.jpg',
      thumburl: 'https://upload.wikimedia.org/t/1920px-Nokia_N95.jpg',
      thumbwidth: 1920,
      thumbheight: 1440,
      descriptionurl: 'https://commons.wikimedia.org/wiki/File:Nokia_N95.jpg',
      mime: 'image/jpeg',
      width: 4000,
      height: 3000,
      extmetadata: { LicenseShortName: { value: 'CC BY-SA 3.0' }, Artist: { value: '<b>Jane</b>' } }
    }]
  };
  const asset = normalizePage(base);
  assert.equal(asset.rights.license_status, 'cc-by');
  assert.equal(asset.rights.share_alike, true);
  assert.equal(asset.creator, 'Jane');
  assert.equal(asset.downloads[0].url, 'https://upload.wikimedia.org/t/1920px-Nokia_N95.jpg');
  assert.match(asset.rights.attribution_text, /Jane, CC BY-SA 3\.0, via Wikimedia Commons/);

  const svg = structuredClone(base);
  svg.imageinfo[0].mime = 'image/svg+xml';
  assert.equal(normalizePage(svg), null);

  const nc = structuredClone(base);
  nc.imageinfo[0].extmetadata.LicenseShortName.value = 'CC BY-NC-SA 2.0';
  assert.equal(normalizePage(nc).rights.license_status, 'restricted');
});

test('Wikimedia-Suche filtert Dateityp bereits in der Anfrage', async () => {
  let requested;
  const result = await searchWikimedia({
    query: 'Nokia N95',
    type: 'image',
    fetchImpl: async (url) => {
      requested = new URL(url);
      return Response.json({ query: { pages: [] } });
    }
  });
  assert.equal(requested.searchParams.get('gsrsearch'), 'Nokia N95 filetype:bitmap');
  assert.equal(result.provider, 'wikimedia');
  assert.deepEqual(result.assets, []);
});

test('Openverse: BY-SA ist nutzbar mit Hinweis, NC ist gesperrt', () => {
  assert.equal(openverseRights({ license: 'by-sa' }).share_alike, true);
  assert.equal(openverseRights({ license: 'by-sa' }).license_status, 'cc-by');
  assert.equal(openverseRights({ license: 'by-nc' }).license_status, 'restricted');
  assert.equal(openverseRights({ license: 'cc0' }).attribution_required, false);
});

test('Ranking verwirft gesperrte Lizenzen, zu kleine Bilder und Treffer ohne Markennamen', () => {
  const make = (id, extra) => ({
    provider: 'wikimedia', provider_id: id, type: 'image', width: 3000, height: 2000, orientation: 'horizontal',
    matched_queries: ['Nokia'], occurrences: 1, first_seen_page: 1,
    rights: { license_status: 'cc-by' }, title: `Nokia phone ${id}.jpg`, ...extra
  });
  const ranked = rankRealCandidates([
    make('ok'),
    make('nc', { rights: { license_status: 'restricted' } }),
    make('unklar', { rights: { license_status: 'unknown' } }),
    make('klein', { width: 400, height: 300 }),
    make('fremd', { title: 'Office building.jpg' })
  ], { orientation: 'horizontal', assetType: 'image', requiredTerms: ['Nokia'] });
  assert.deepEqual(ranked.map((asset) => asset.provider_id), ['ok']);
  assert.equal(matchesRequiredTerms({ title: 'Nokia Lumia 800.jpg' }, ['Windows Phone', 'Lumia']), true);
  assert.equal(matchesRequiredTerms({ title: 'Windows 95 box.jpg' }, ['Windows Phone']), false);
});

test('Download-Auswahl: Bild knapp über Zielgröße, Video als MP4/WebM, kein OGV', () => {
  const image = chooseDownload({
    type: 'image',
    downloads: [
      { url: 'https://x/original.jpg', width: 6000, height: 4000, file_type: 'image/jpeg' },
      { url: 'https://x/1920.jpg', width: 1920, height: 1280, file_type: 'image/jpeg' },
      { url: 'https://x/640.jpg', width: 640, height: 427, file_type: 'image/jpeg' }
    ]
  }, { maxDimension: 1920 });
  assert.equal(image.url, 'https://x/1920.jpg');

  const video = chooseDownload({
    type: 'video',
    downloads: [
      { url: 'https://x/a.ogv', width: 1920, height: 1080, file_type: 'video/ogg' },
      { url: 'https://x/a.webm', width: 1280, height: 720, file_type: 'video/webm' }
    ]
  });
  assert.equal(video.url, 'https://x/a.webm');
  assert.equal(chooseDownload({ type: 'video', downloads: [{ url: 'https://x/a.ogv', file_type: 'video/ogg' }] }), null);
});

test('Pexels-Treffer bekommen gemeinsames Download- und Rechte-Modell', () => {
  const asset = withPexelsDownloads({
    provider: 'pexels', provider_id: '1', type: 'image', width: 5000, height: 3000, creator: 'Max',
    files: { original: 'https://images.pexels.com/o.jpg', large2x: 'https://images.pexels.com/l2.jpg' }
  });
  assert.equal(asset.rights.license_status, 'licensed');
  assert.equal(asset.rights.attribution_text, 'Max via Pexels');
  assert.equal(chooseDownload(asset, { maxDimension: 1920 }).url, 'https://images.pexels.com/o.jpg');
  assert.equal(chooseDownload(asset, { maxDimension: 1800 }).url, 'https://images.pexels.com/l2.jpg');
});

test('Credits enthalten nur freigegebene Treffer, ohne Dubletten', () => {
  const lines = buildCreditLines([
    { status: 'ready', provider: 'wikimedia', provider_id: '5', source_url: 'https://c/5', rights: { attribution_text: '„A“ von B, CC BY-SA 3.0, via Wikimedia Commons', license_code: 'CC BY-SA 3.0' } },
    { status: 'ready', provider: 'wikimedia', provider_id: '5', source_url: 'https://c/5', rights: {} },
    { status: 'review-required', provider: 'wikimedia', provider_id: '6', source_url: 'https://c/6', rights: {} }
  ]);
  assert.deepEqual(lines, ['- „A“ von B, CC BY-SA 3.0, via Wikimedia Commons – https://c/5']);
});

test('Review: "all" gibt frei, gleichzeitig abgelehnte Beats bleiben ausgenommen', () => {
  const timeline = {
    bindings: [
      { beat_id: 'beat-001', status: 'review-required' },
      { beat_id: 'beat-002', status: 'review-required' },
      { beat_id: 'beat-003', status: 'ready' }
    ]
  };
  const resolution = { items: [{ beat_id: 'beat-001', status: 'review-required' }, { beat_id: 'beat-002', status: 'review-required' }] };
  const result = approveBindings({ timeline, resolution, approve: ['all', 'beat-009'], exclude: ['beat-002'] });
  assert.deepEqual(result.approved, ['beat-001']);
  assert.deepEqual(result.unknown, ['beat-009']);
  assert.deepEqual(timeline.bindings.map((b) => b.status), ['ready', 'review-required', 'ready']);

  rejectBinding({ binding: timeline.bindings[1], resolutionItem: resolution.items[1] });
  syncResolution(resolution, timeline);
  assert.deepEqual(resolution.summary, { ready: 1, review_required: 0, rejected: 1 });
});

test('Ersatz: nächste Alternative ohne Dubletten, Fotoserien und früher Abgelehntes', () => {
  const alt = (id, title, extra = {}) => ({ provider: 'wikimedia', provider_id: id, type: 'image', title, downloads: [{ url: `https://upload.wikimedia.org/${id}.jpg` }], ...extra });
  const binding = {
    id: 'beat-001-real-01', beat_id: 'beat-001', status: 'review-required', provider: 'wikimedia', provider_id: '1', asset_type: 'image',
    title: 'Nokia HQ 01.jpg', local_file: 'a.jpg', placement: { start_seconds: 3, duration_seconds: 4, requested_duration_seconds: 4 }
  };
  const other = { beat_id: 'beat-002', status: 'ready', provider: 'wikimedia', provider_id: '2', asset_type: 'image', title: 'Nokia 3310.jpg' };
  const resolutionItem = {
    beat_id: 'beat-001',
    alternates: [
      alt('2', 'Nokia 3310.jpg'),
      alt('3', 'Nokia HQ 02.jpg'),
      alt('4', 'Nokia N95.jpg', { downloads: [] }),
      alt('5', 'Nokia Lumia 800.jpg', { rights: { license_status: 'cc-by', license_code: 'CC BY 4.0' } })
    ]
  };
  const next = nextAlternate({ binding, resolutionItem, bindings: [binding, other] });
  assert.equal(next.provider_id, '5');

  applyAlternate({ binding, resolutionItem, alternate: next, localFile: 'b.jpg' });
  assert.equal(binding.status, 'review-required');
  assert.equal(binding.provider_id, '5');
  assert.equal(binding.local_file, 'b.jpg');
  assert.equal(binding.rights.license_code, 'CC BY 4.0');
  assert.equal(binding.placement.start_seconds, 3);
  assert.equal(binding.replaced[0].provider_id, '1');
  assert.equal(resolutionItem.alternates.some((entry) => entry.provider_id === '5'), false);
  assert.equal(nextAlternate({ binding, resolutionItem, bindings: [binding, other] }), null);
});

test('Planer erkennt Firmen/Produkte und nutzt den letzten Namen als Kontext', () => {
  assert.deepEqual(findEntities('Microsoft übernahm Nokias Geräte und die Lumia-Reihe', ['Nokia', 'Lumia', 'Microsoft']), ['Microsoft', 'Nokia', 'Lumia']);
  assert.deepEqual(findEntities('Windows Phone kam', ['Windows', 'Windows Phone']), ['Windows Phone']);

  const plan = planAiFirstVisuals({
    text: '2007 war Nokia fast überall. Die Marke stand für zuverlässige Handys. Kunden kauften gern.',
    entities: ['Nokia']
  });
  const beat1 = plan.beats.find((beat) => beat.text.includes('Nokia'));
  assert.equal(beat1.source_decision.mode, 'real-first');
  assert.equal(beat1.source_decision.reason, 'exact-brand-or-product');
  const contextAsset = plan.assets.find((asset) => asset.source_mode === 'stock-or-real' && asset.entity_source === 'context');
  assert.deepEqual(contextAsset.search_terms, ['Nokia']);
  assert.equal(contextAsset.stock_query, 'Nokia');
  const neutral = plan.beats.find((beat) => beat.text.startsWith('Kunden'));
  assert.equal(neutral.source_decision.mode, 'ai-first');
});

test('Suchhinweise werden reihum je Name geplant, Pflichtbegriffe bleiben die Namen', () => {
  const plan = planAiFirstVisuals({
    text: 'Nokia hatte mit Symbian ein eigenes System.',
    entities: [{ name: 'Nokia', queries: ['Nokia mobile phone', 'Nokia N95'] }, { name: 'Symbian', queries: ['Symbian phone'] }]
  });
  const asset = plan.assets.find((entry) => entry.source_mode === 'stock-or-real');
  assert.deepEqual(asset.search_terms, ['Nokia mobile phone', 'Symbian phone', 'Nokia N95']);
  assert.deepEqual(asset.required_terms, ['Nokia', 'Symbian']);
});

test('Ohne --entities bleibt das bisherige Verhalten', () => {
  const plan = planAiFirstVisuals({ text: '2007 war Nokia fast überall. Kunden kauften gern.' });
  assert.ok(plan.beats.every((beat) => beat.source_decision.mode === 'ai-first'));
});

test('Unified Manifest blockiert ungeprüfte Archiv-Treffer', () => {
  const manifest = buildUnifiedVideoManifest({
    visualPlan: { beats: [{ id: 'beat-001', text: 'Nokia', source_decision: { mode: 'real-first' } }], assets: [] },
    productionPlan: { images: [{ image_number: 1 }] },
    flowImportReport: { output_dir: 'x', items: [{ image_number: 1, role: 'selected-cover', target: 'c.png' }] },
    realManifest: { bindings: [{ beat_id: 'beat-001', status: 'review-required', local_file: 'a.jpg' }] }
  });
  assert.equal(manifest.items[0].status, 'review-required');
  assert.equal(manifest.status, 'needs-resolution');
});

// Führt real:integrate bzw. real:review mit gemocktem Wikimedia aus (kein Netzwerk).
function runMocked(script, args) {
  return spawnSync(process.execPath, ['--import', './tests/fixtures/mock-wikimedia-fetch.mjs', script, ...args], { cwd: process.cwd(), encoding: 'utf8' });
}

function integrateNokiaFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-real-'));
  const queue = path.join(dir, 'real-material-queue.json');
  fs.writeFileSync(queue, JSON.stringify({
    assets: [{
      id: 'beat-001-real-01', beat_id: 'beat-001', asset_type: 'image', orientation: 'horizontal',
      reason: 'exact-brand-or-product', stock_query: 'Nokia N95', search_terms: ['Nokia N95'], required_terms: ['Nokia N95']
    }]
  }));
  const run = runMocked('scripts/real-media-integrate.mjs', ['--queue', queue, '--providers', 'wikimedia']);
  assert.equal(run.status, 0, run.stderr || run.stdout);
  return { dir, outDir: path.join(dir, 'real-media') };
}

test('real:integrate lädt Archivtreffer, sperrt NC-Lizenzen und verlangt Review (ohne Netzwerk)', () => {
  const { dir, outDir } = integrateNokiaFixture();
  const timeline = JSON.parse(fs.readFileSync(path.join(outDir, 'remotion-real-media.json'), 'utf8'));
  const [binding] = timeline.bindings;
  assert.equal(binding.status, 'review-required');
  assert.equal(binding.provider, 'wikimedia');
  assert.equal(binding.provider_id, '5');
  assert.equal(binding.rights.share_alike, true);
  assert.ok(fs.existsSync(path.resolve(binding.local_file)));
  assert.equal(fs.readFileSync(path.join(outDir, 'credits.txt'), 'utf8'), '');

  const review = spawnSync(process.execPath, ['scripts/real-media-review.mjs', '--dir', outDir, '--approve', 'all'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(review.status, 0, review.stderr);
  assert.match(fs.readFileSync(path.join(outDir, 'credits.txt'), 'utf8'), /Nokia N95 front\.jpg.*Tester.*CC BY-SA 3\.0/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('real:review ersetzt Abgelehntes durch die nächste Alternative, bis keine mehr passt', () => {
  const { dir, outDir } = integrateNokiaFixture();
  const readBinding = () => JSON.parse(fs.readFileSync(path.join(outDir, 'remotion-real-media.json'), 'utf8')).bindings[0];
  assert.equal(readBinding().provider_id, '5');

  const first = runMocked('scripts/real-media-review.mjs', ['--dir', outDir, '--reject', 'beat-001']);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Durch Alternative ersetzt/);
  const replaced = readBinding();
  assert.equal(replaced.status, 'review-required');
  assert.equal(replaced.provider_id, '6');
  assert.equal(replaced.replaced.length, 1);
  assert.ok(fs.existsSync(path.resolve(replaced.local_file)));

  // "Nokia N95 front 2" gehört zur abgelehnten Fotoserie und wird übersprungen.
  const second = runMocked('scripts/real-media-review.mjs', ['--dir', outDir, '--reject', 'beat-001']);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /Abgelehnt ohne Ersatz: beat-001/);
  assert.equal(readBinding().status, 'rejected');
  const resolution = JSON.parse(fs.readFileSync(path.join(outDir, 'real-media-resolution.json'), 'utf8'));
  assert.equal(resolution.summary.rejected, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
