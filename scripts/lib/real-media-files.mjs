import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';
import { isAllowedDownloadHost } from './providers/index.mjs';
import { extensionForDownload, safeMediaName } from './real-media.mjs';

// Gemeinsame Datei-Schritte für real:integrate und real:review (Download, FFmpeg, Metadaten).

export async function downloadAsset({ item, selected, download, mediaDir }) {
  if (!isAllowedDownloadHost(selected.provider, download.url)) throw new Error(`Unerwarteter Download-Host für ${selected.provider}.`);
  const ext = extensionForDownload(download.url, download.file_type, selected.type);
  const base = `${safeMediaName(item.beat_id ?? item.id)}-${selected.type}-${safeMediaName(selected.provider_id)}.${ext}`;
  const target = uniquePath(path.join(mediaDir, base));
  const partial = `${target}.part`;
  const response = await fetch(download.url, {
    headers: { 'User-Agent': 'Visual-Asset-Hub/0.9 (https://github.com/memetreza34-ux/Visual-Asset-Hub)', Accept: '*/*' },
    redirect: 'follow'
  });
  if (!response.ok || !response.body) throw new Error(`Download fehlgeschlagen (${response.status}).`);
  const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
  if (contentType && !contentType.startsWith(`${selected.type === 'video' ? 'video' : 'image'}/`) && !contentType.includes('octet-stream')) {
    throw new Error(`Unerwarteter Dateityp: ${contentType}`);
  }

  const maxBytes = 700 * 1024 * 1024;
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new Error('Download ist größer als 700 MB.');

  try {
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial, { flags: 'wx' }));
    const size = fs.statSync(partial).size;
    if (!size) throw new Error('Heruntergeladene Datei ist leer.');
    if (size > maxBytes) throw new Error('Heruntergeladene Datei überschreitet 700 MB.');
    fs.renameSync(partial, target);
  } catch (error) {
    if (fs.existsSync(partial)) fs.rmSync(partial, { force: true });
    throw error;
  }
  return target;
}

export function analyzeVideo(file, { root = process.cwd() } = {}) {
  const result = spawnSync(process.execPath, ['scripts/analyze-media.mjs', '--file', file, '--preview', 'false'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) {
    return { error: (result.stderr || result.stdout || 'FFmpeg-Analyse fehlgeschlagen.').trim() };
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    return { error: 'FFmpeg-Analyse lieferte ungültiges JSON.' };
  }
}

export function writeMetadata({ item, selected, download, target, technical, metaDir, queries, root = process.cwd() }) {
  const metadata = {
    version: 1,
    beat_id: item.beat_id,
    request_id: item.id,
    reason: item.reason,
    provider: selected.provider,
    provider_id: selected.provider_id,
    title: selected.title,
    source_url: selected.source_url,
    creator: selected.creator,
    creator_url: selected.creator_url,
    license_status: selected.rights?.license_status ?? null,
    license_code: selected.rights?.license_code ?? null,
    license_url: selected.rights?.license_url ?? null,
    attribution_required: selected.rights?.attribution_required ?? null,
    attribution_text: selected.rights?.attribution_text ?? null,
    share_alike: selected.rights?.share_alike ?? false,
    rights_warning: selected.rights?.warning ?? null,
    attribution: selected.attribution ?? null,
    matched_queries: selected.matched_queries,
    queries,
    selection_score: selected.real_media_score,
    downloaded_at: new Date().toISOString(),
    downloaded_file: path.relative(root, target).split(path.sep).join('/'),
    chosen_download: {
      quality: download.quality ?? null,
      width: download.width ?? null,
      height: download.height ?? null,
      file_type: download.file_type ?? null
    },
    technical
  };
  const file = path.join(metaDir, `${safeMediaName(item.id)}.json`);
  fs.writeFileSync(file, `${JSON.stringify(metadata, null, 2)}\n`);
}

/** Kandidat für Reports; mit downloads und rights, damit real:review Alternativen später laden kann. */
export function candidateSummary(asset) {
  return {
    provider: asset.provider,
    provider_id: asset.provider_id,
    type: asset.type,
    title: asset.title,
    source_url: asset.source_url,
    creator: asset.creator,
    creator_url: asset.creator_url,
    width: asset.width,
    height: asset.height,
    duration_seconds: asset.duration_seconds ?? null,
    orientation: asset.orientation,
    preview_url: asset.preview_url,
    license_status: asset.rights?.license_status ?? null,
    license_code: asset.rights?.license_code ?? null,
    rights: asset.rights ?? null,
    downloads: asset.downloads ?? null,
    score: asset.real_media_score,
    matched_queries: asset.matched_queries
  };
}

function uniquePath(target) {
  if (!fs.existsSync(target)) return target;
  const ext = path.extname(target);
  const stem = target.slice(0, -ext.length);
  let index = 2;
  while (fs.existsSync(`${stem}-${index}${ext}`)) index += 1;
  return `${stem}-${index}${ext}`;
}
