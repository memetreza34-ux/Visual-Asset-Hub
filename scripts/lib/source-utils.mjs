import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { searchProvider } from './providers/index.mjs';

const packageVersion = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version || 'dev';
  } catch {
    return 'dev';
  }
})();

export function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

export async function searchWithCache({ root, refresh = false, cacheHours = 24, ...options }) {
  const cacheFile = providerCachePath(root, options);
  if (!refresh && fs.existsSync(cacheFile)) {
    const ageMs = Date.now() - fs.statSync(cacheFile).mtimeMs;
    if (ageMs <= cacheHours * 60 * 60 * 1000) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return { ...cached, cache: { hit: true, file: relative(root, cacheFile) } };
    }
  }
  const result = await searchProvider(options);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, `${JSON.stringify(result, null, 2)}\n`);
  return { ...result, cache: { hit: false, file: relative(root, cacheFile) } };
}

export function chooseDownload(asset, maxDimension = 1920) {
  const candidates = (asset.downloads || []).filter((item) => item?.url);
  if (!candidates.length) return null;
  const scored = candidates.map((item) => ({ item, score: score(item, maxDimension, asset.type) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.item || null;
}

export async function downloadAsset({ root, asset, download, provider }) {
  const extension = extensionFor(download.url, download.file_type, asset.type);
  const base = `${provider}-${asset.type}-${safeName(asset.provider_id || asset.title || 'asset')}.${extension}`;
  const filename = uniqueInboxName(root, base);
  const target = path.join(root, 'inbox', filename);
  const tmp = `${target}.part`;
  const maxBytes = 700 * 1024 * 1024;
  const response = await fetch(download.url, {
    headers: { 'User-Agent': `Visual-Asset-Hub/${packageVersion}`, Accept: '*/*' },
    redirect: 'follow'
  });
  if (!response.ok || !response.body) throw new Error(`Download fehlgeschlagen (${response.status}).`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('Download ist größer als 700 MB.');
  try {
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(tmp, { flags: 'wx' }));
    const size = fs.statSync(tmp).size;
    if (!size) throw new Error('Heruntergeladene Datei ist leer.');
    if (size > maxBytes) throw new Error('Heruntergeladene Datei überschreitet 700 MB.');
    fs.renameSync(tmp, target);
  } catch (error) {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true });
    throw error;
  }
  return { filename, target, relativePath: `inbox/${filename}` };
}

export function writeSourceMetadata({ root, downloaded, asset, provider, query }) {
  const metadataDir = path.join(root, '.local-storage', 'inbox-source');
  fs.mkdirSync(metadataDir, { recursive: true });
  const rights = asset.rights || {};
  const metadata = {
    provider,
    providerId: asset.provider_id,
    upstreamProvider: asset.upstream_provider,
    upstreamSource: asset.upstream_source,
    searchQuery: query,
    title: asset.title,
    description: asset.description,
    tags: Array.isArray(asset.tags) ? asset.tags.slice(0, 30) : [],
    sourceName: asset.creator ? `${providerLabel(provider)} — ${asset.creator}` : providerLabel(provider),
    sourceUrl: asset.source_url,
    creator: asset.creator,
    creatorUrl: asset.creator_url,
    licenseStatus: rights.license_status || 'unknown',
    licenseCode: rights.license_code,
    licenseUrl: rights.license_url,
    attributionRequired: Boolean(rights.attribution_required),
    attributionText: rights.attribution_text,
    suggestedScopes: rights.suggested_scopes || ['internal-only'],
    suggestedStatus: rights.suggested_status || 'review',
    rightsWarning: rights.warning,
    downloadedAt: new Date().toISOString(),
    downloadedFile: downloaded.relativePath
  };
  const file = path.join(metadataDir, `${downloaded.filename}.json`);
  fs.writeFileSync(file, `${JSON.stringify(compact(metadata), null, 2)}\n`);
  return metadata;
}

function providerCachePath(root, options) {
  const key = JSON.stringify({
    provider: options.provider,
    query: options.query,
    type: options.type,
    orientation: options.orientation || null,
    page: options.page || 1,
    perPage: options.perPage || 20
  });
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 16);
  return path.join(root, '.local-storage', 'provider-cache', String(options.provider), `${safeName(options.query)}-${hash}.json`);
}
function score(item, maxDimension, type) {
  const width = Number(item.width || 0), height = Number(item.height || 0), longest = Math.max(width, height);
  const area = width * height;
  const usable = longest > 0 && longest <= maxDimension ? 2_000_000_000_000 : 0;
  const nearTarget = longest > 0 ? -Math.abs(maxDimension - longest) * 1_000_000 : 0;
  const sizePenalty = Number(item.size || 0) > 350 * 1024 * 1024 ? -1_000_000_000_000 : 0;
  const quality = ['medium', 'hd', 'fullhd', 'large', 'original', 'archive', 'official', 'phase1-direct'].includes(String(item.quality || '').toLowerCase()) ? 500_000_000_000 : 0;
  const imageFallback = type === 'image' && !longest ? 1_000_000 : 0;
  return usable + quality + area + nearTarget + sizePenalty + imageFallback;
}
function extensionFor(url, fileType, type) {
  const mime = String(fileType || '').toLowerCase();
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('mpeg') && type === 'video') return 'mpg';
  if (mime.includes('ogg') && type === 'video') return 'ogv';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('tiff')) return 'tif';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  try {
    const ext = path.extname(new URL(url).pathname).slice(1).toLowerCase();
    if (/^[a-z0-9]{2,5}$/.test(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {}
  return type === 'video' ? 'mp4' : 'jpg';
}
function uniqueInboxName(root, base) {
  const folder = path.join(root, 'inbox');
  fs.mkdirSync(folder, { recursive: true });
  const ext = path.extname(base), stem = path.basename(base, ext);
  let name = base, index = 2;
  while (fs.existsSync(path.join(folder, name))) name = `${stem}-${index++}${ext}`;
  return name;
}
function safeName(value) { return String(value || 'asset').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'asset'; }
function relative(root, file) { return path.relative(root, file).split(path.sep).join('/'); }
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', openverse: 'Openverse', europeana: 'Europeana', smithsonian: 'Smithsonian Open Access', nara: 'National Archives Catalog', wikimedia: 'Wikimedia Commons', 'internet-archive': 'Internet Archive', nasa: 'NASA Image and Video Library', noaa: 'NOAA', usgs: 'U.S. Geological Survey', 'library-of-congress': 'Library of Congress', 'exact-source': 'Phase-1 exact source' })[value] || value; }
function compact(value) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')); }
