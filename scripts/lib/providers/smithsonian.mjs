const BASE = 'https://api.si.edu/openaccess/api/v1.0';
const SITE = 'https://www.si.edu';
const RIGHTS_URL = 'https://www.si.edu/openaccess';

export async function searchSmithsonian({ apiKey, query, type = 'image', page = 1, perPage = 20, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('SMITHSONIAN_API_KEY fehlt. Kostenlosen api.data.gov-Key eintragen.');
  if (!query?.trim()) throw new Error('Smithsonian-Suche benötigt einen Suchbegriff.');
  if (type !== 'image') throw new Error('Smithsonian Open Access ist in Visual Asset Hub derzeit als Bildquelle integriert.');

  const rows = clamp(perPage, 1, 50);
  const pageNumber = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams({
    api_key: apiKey,
    q: `${query.trim()} AND online_media_type:"Images" AND media_usage:CC0`,
    start: String((pageNumber - 1) * rows),
    rows: String(rows),
    sort: 'relevancy'
  });
  const response = await fetchImpl(`${BASE}/search?${params}`, { headers: headers() });
  if (!response.ok) throw new Error(`Smithsonian-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const rowsData = payload?.response?.rows || [];
  const assets = rowsData.map(normalizeRow).filter(Boolean);

  return {
    provider: 'smithsonian',
    query: query.trim(),
    type,
    page: pageNumber,
    per_page: rows,
    total_results: Number(payload?.response?.rowCount) || null,
    assets
  };
}

function normalizeRow(row) {
  const media = findMedia(row?.content?.descriptiveNonRepeating?.online_media?.media || []);
  if (!media.length) return null;
  const cc0Media = media.filter((item) => String(item?.usage?.access || '').toUpperCase() === 'CC0');
  if (!cc0Media.length) return null;
  const downloads = cc0Media.map((item) => mediaDownload(item)).filter(Boolean);
  if (!downloads.length) return null;

  const sourceUrl = normalizeSourceUrl(row?.url) || `${SITE}/search?edan_q=${encodeURIComponent(row?.title || row?.id || '')}`;
  const title = row?.title || row?.content?.descriptiveNonRepeating?.title?.content || row?.id || 'Smithsonian Open Access item';
  const creator = firstText([
    row?.content?.freetext?.name,
    row?.content?.descriptiveNonRepeating?.data_source,
    row?.content?.descriptiveNonRepeating?.unit_code
  ]) || 'Smithsonian Institution';
  const preview = downloads.find((item) => item.preview_url)?.preview_url || downloads[0]?.url || null;

  return {
    provider: 'smithsonian',
    provider_id: String(row?.id || slugId(sourceUrl)),
    type: 'image',
    title: text(title),
    description: firstText([row?.content?.freetext?.notes, row?.content?.freetext?.physicalDescription, row?.content?.descriptiveNonRepeating?.record_link]) || null,
    source_url: sourceUrl,
    creator: text(creator),
    creator_url: SITE,
    width: null,
    height: null,
    duration_seconds: null,
    orientation: null,
    preview_url: preview,
    tags: collectTags(row).slice(0, 30),
    downloads,
    rights: {
      license_status: 'public-domain',
      license_code: 'cc0-1.0',
      license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attribution_required: false,
      attribution_text: `Smithsonian Institution${creator && creator !== 'Smithsonian Institution' ? ` — ${text(creator)}` : ''}`,
      suggested_scopes: ['youtube', 'website', 'organic-social', 'client-work'],
      suggested_status: 'review',
      warning: 'Die API kennzeichnet die verwendete Mediendatei als CC0. Vor Veröffentlichung trotzdem konkrete Objektseite, Marken/Logos und dargestellte Drittinhalte prüfen.'
    }
  };
}

function findMedia(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && (item.content || item.thumbnail));
}
function mediaDownload(item) {
  const url = httpsUrl(item?.content) || httpsUrl(item?.thumbnail);
  if (!url) return null;
  const preview = httpsUrl(item?.thumbnail) || url;
  return {
    quality: item?.content ? 'original' : 'preview',
    url,
    width: numeric(item?.resources?.[0]?.width),
    height: numeric(item?.resources?.[0]?.height),
    size: null,
    file_type: imageMime(url),
    preview_url: preview
  };
}
function normalizeSourceUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, SITE);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.protocol = 'https:';
    return url.toString();
  } catch { return null; }
}
function collectTags(row) {
  const values = [];
  walk(row?.content?.indexedStructured, (value) => { if (typeof value === 'string' && value.length <= 120) values.push(value); });
  return [...new Set(values.map(text).filter(Boolean))];
}
function firstText(values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const found = firstText(value);
      if (found) return found;
    }
    if (value && typeof value === 'object') {
      const found = firstText(Object.values(value));
      if (found) return found;
    }
  }
  return null;
}
function walk(value, visit, depth = 0) {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string') { visit(value); return; }
  if (Array.isArray(value)) { value.forEach((item) => walk(item, visit, depth + 1)); return; }
  if (typeof value === 'object') Object.values(value).forEach((item) => walk(item, visit, depth + 1));
}
function httpsUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
  return value.replace(/^http:\/\//i, 'https://');
}
function imageMime(url) {
  const path = safePath(url).toLowerCase();
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (/\.tiff?$/.test(path)) return 'image/tiff';
  if (path.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}
function safePath(value) { try { return new URL(value).pathname; } catch { return String(value).split('?')[0]; } }
function slugId(value) { return safePath(value).split('/').filter(Boolean).pop() || value; }
function numeric(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function text(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
function headers() { return { 'User-Agent': 'Visual-Asset-Hub/0.16 documentary research', Accept: 'application/json' }; }
