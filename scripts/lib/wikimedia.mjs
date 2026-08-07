const API_BASE = 'https://commons.wikimedia.org/w/api.php';
const SAFE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff']);

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

function normalizePage(page) {
  const info = page.imageinfo?.[0];
  if (!info || !SAFE_MIME_TYPES.has(String(info.mime || '').toLowerCase())) return null;
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
    type: 'image',
    title: description || page.title.replace(/^File:/, ''),
    source_url: sourceUrl,
    creator,
    creator_url: null,
    width: info.width ?? null,
    height: info.height ?? null,
    orientation: inferOrientation(info.width, info.height),
    preview_url: info.thumburl || info.url || null,
    files: { original: info.url || null, medium: info.thumburl || null },
    license: licenseStatus,
    license_name: licenseName || usageTerms || licenseStatus,
    license_url: licenseUrl || null,
    attribution_text: text(meta, 'Credit') || (creator ? `${creator} / Wikimedia Commons` : 'Wikimedia Commons'),
    source_name: 'Wikimedia Commons'
  };
}

export async function searchWikimedia({ query, orientation, page = 1, perPage = 15, fetchImpl = globalThis.fetch }) {
  if (!query || !String(query).trim()) throw new Error('Eine Suchanfrage ist erforderlich.');
  if (typeof fetchImpl !== 'function') throw new Error('In dieser Node.js-Version ist fetch nicht verfügbar.');
  assertInteger(page, 'page', 1, 100);
  assertInteger(perPage, 'perPage', 1, 20);

  const url = new URL(API_BASE);
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', String(query).trim());
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', '20');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|size|mime|user|extmetadata');
  url.searchParams.set('iiurlwidth', '640');
  url.searchParams.set('iiextmetadatalanguage', 'en');
  url.searchParams.set('iiextmetadatafilter', 'LicenseShortName|LicenseUrl|UsageTerms|Artist|Credit|ImageDescription');
  url.searchParams.set('origin', '*');

  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Wikimedia-Anfrage fehlgeschlagen (${response.status}).${detail ? ` ${detail.slice(0, 300)}` : ''}`);
  }

  const payload = await response.json();
  const normalized = (payload.query?.pages ?? [])
    .map(normalizePage)
    .filter(Boolean)
    .filter((item) => item.files.original)
    .filter((item) => !orientation || orientation === 'any' || item.orientation === orientation)
    .slice(0, perPage);

  return {
    provider: 'wikimedia',
    query: String(query).trim(),
    type: 'photo',
    page,
    per_page: perPage,
    total_results: normalized.length,
    fetched_at: new Date().toISOString(),
    license_filter: ['public-domain', 'cc0', 'cc-by', 'cc-by-sa'],
    assets: normalized
  };
}
