const API_BASE = 'https://commons.wikimedia.org/w/api.php';
const API_USER_AGENT = 'Visual-Asset-Hub/0.4.0-beta.9 (https://github.com/memetreza34-ux/Visual-Asset-Hub; documentary visual research)';
const SAFE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff']);
const SAFE_VIDEO_MIME_TYPES = new Set(['video/webm', 'video/mp4']);
const MIN_REQUEST_INTERVAL_MS = 350;
const MAX_REQUEST_ATTEMPTS = 4;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function inferOrientation(width, height) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

function assertInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
}

function text(meta, key) { return stripHtml(meta?.[key]?.value ?? ''); }
function stripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyLicense(shortName, usageTerms, licenseUrl) {
  const raw = `${shortName} ${usageTerms} ${licenseUrl}`.toLowerCase();
  if (/\bcc0\b/.test(raw)) return 'cc0';
  if (/public domain|gemeinfrei|pdm/.test(raw)) return 'public-domain';
  if (/cc[ -]?by[ -]?sa|creativecommons\.org\/licenses\/by-sa/.test(raw)) return 'cc-by-sa';
  if (/cc[ -]?by\b|creativecommons\.org\/licenses\/by\//.test(raw)) return 'cc-by';
  return null;
}

function normalizePage(page, requestedType) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const mime = String(info.mime || '').toLowerCase();
  const isVideo = SAFE_VIDEO_MIME_TYPES.has(mime);
  const isImage = SAFE_IMAGE_MIME_TYPES.has(mime);
  if (!isVideo && !isImage) return null;
  if (requestedType === 'video' && !isVideo) return null;
  if (requestedType === 'photo' && !isImage) return null;

  const meta = info.extmetadata ?? {};
  const licenseName = text(meta, 'LicenseShortName');
  const usageTerms = text(meta, 'UsageTerms');
  const licenseUrl = text(meta, 'LicenseUrl');
  const licenseStatus = classifyLicense(licenseName, usageTerms, licenseUrl);
  if (!licenseStatus) return null;
  const creator = text(meta, 'Artist') || info.user || null;
  const description = text(meta, 'ImageDescription');
  const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
  return {
    provider: 'wikimedia',
    provider_id: String(page.pageid),
    type: isVideo ? 'video' : 'image',
    title: description || page.title.replace(/^File:/, ''),
    description,
    source_url: sourceUrl,
    creator,
    creator_url: null,
    width: info.width ?? null,
    height: info.height ?? null,
    duration_seconds: null,
    orientation: inferOrientation(info.width, info.height),
    preview_url: info.thumburl || info.url || null,
    files: { original: info.url || null, medium: info.thumburl || null },
    license: licenseStatus,
    license_name: licenseName || usageTerms || licenseStatus,
    license_url: licenseUrl || null,
    attribution_text: text(meta, 'Credit') || (creator ? `${creator} / Wikimedia Commons` : 'Wikimedia Commons'),
    source_name: 'Wikimedia Commons',
    mime_type: mime
  };
}

async function waitForRequestSlot(fetchImpl) {
  if (fetchImpl !== globalThis.fetch) return;
  const scheduled = requestQueue.then(async () => {
    const waitMs = Math.max(0, (lastRequestAt + MIN_REQUEST_INTERVAL_MS) - Date.now());
    if (waitMs > 0) await sleep(waitMs);
    lastRequestAt = Date.now();
  });
  requestQueue = scheduled.catch(() => {});
  await scheduled;
}

function retryDelayMs(response, attempt) {
  const retryAfter = response?.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(10000, Math.max(500, seconds * 1000));
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(10000, Math.max(500, date - Date.now()));
  }
  return Math.min(8000, 750 * (2 ** attempt));
}

async function fetchWithRetry(url, options, fetchImpl) {
  let lastResponse = null;
  let lastError = null;
  for (let attempt = 0; attempt < MAX_REQUEST_ATTEMPTS; attempt += 1) {
    await waitForRequestSlot(fetchImpl);
    try {
      const response = await fetchImpl(url, options);
      lastResponse = response;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_REQUEST_ATTEMPTS - 1) return response;
      await sleep(retryDelayMs(response, attempt));
    } catch (error) {
      lastError = error;
      if (attempt === MAX_REQUEST_ATTEMPTS - 1) throw error;
      await sleep(Math.min(8000, 750 * (2 ** attempt)));
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError ?? new Error('Wikimedia-Anfrage fehlgeschlagen.');
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export async function searchWikimedia({ query, type = 'photo', orientation, page = 1, perPage = 15, fetchImpl = globalThis.fetch }) {
  if (!query || !String(query).trim()) throw new Error('Eine Suchanfrage ist erforderlich.');
  if (typeof fetchImpl !== 'function') throw new Error('In dieser Node.js-Version ist fetch nicht verfügbar.');
  assertInteger(page, 'page', 1, 100);
  assertInteger(perPage, 'perPage', 1, 20);

  const requestedType = type === 'video' ? 'video' : 'photo';
  const url = new URL(API_BASE);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('generator', 'search');
  const typeFilter = requestedType === 'video' ? ' filetype:video' : ' filetype:bitmap';
  url.searchParams.set('gsrsearch', `${String(query).trim()}${typeFilter}`);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', String(perPage));
  if (page > 1) url.searchParams.set('gsroffset', String((page - 1) * perPage));
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|size|mime|user|extmetadata');
  url.searchParams.set('iiurlwidth', '960');
  url.searchParams.set('iiextmetadatalanguage', 'en');
  url.searchParams.set('iiextmetadatafilter', 'LicenseShortName|LicenseUrl|UsageTerms|Artist|Credit|ImageDescription');
  url.searchParams.set('origin', '*');

  const response = await fetchWithRetry(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': API_USER_AGENT,
      'Api-User-Agent': API_USER_AGENT
    }
  }, fetchImpl);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Wikimedia-Anfrage fehlgeschlagen (${response.status}).${detail ? ` ${detail.slice(0, 300)}` : ''}`);
  }

  const payload = await response.json();
  const normalized = (payload.query?.pages ?? [])
    .map((pageItem) => normalizePage(pageItem, requestedType))
    .filter(Boolean)
    .filter((item) => item.files.original)
    .filter((item) => !orientation || orientation === 'any' || item.orientation === orientation || item.orientation === 'unknown')
    .slice(0, perPage);

  return {
    provider: 'wikimedia',
    query: String(query).trim(),
    type: requestedType,
    page,
    per_page: perPage,
    total_results: normalized.length,
    fetched_at: new Date().toISOString(),
    license_filter: ['public-domain', 'cc0', 'cc-by', 'cc-by-sa'],
    assets: normalized
  };
}
