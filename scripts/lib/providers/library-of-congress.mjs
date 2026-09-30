const BASE = 'https://www.loc.gov';

export async function searchLibraryOfCongress({ query, type = 'image', page = 1, perPage = 20, fetchImpl = fetch }) {
  if (!query?.trim()) throw new Error('Library-of-Congress-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('Library of Congress unterstützt image oder video.');
  const endpoint = type === 'video' ? 'film-and-videos' : 'photos';
  const params = new URLSearchParams({
    q: query.trim(),
    fo: 'json',
    c: String(clamp(perPage, 1, 50)),
    sp: String(Math.max(1, Number(page) || 1)),
    at: 'results,pagination'
  });
  const response = await fetchImpl(`${BASE}/${endpoint}/?${params}`, { headers: headers() });
  if (!response.ok) throw new Error(`Library-of-Congress-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const assets = [];
  for (const result of payload.results || []) {
    const normalized = await normalizeResult(result, type, fetchImpl);
    if (normalized) assets.push(normalized);
  }
  return {
    provider: 'library-of-congress',
    query: query.trim(),
    type,
    page: Math.max(1, Number(page) || 1),
    per_page: clamp(perPage, 1, 50),
    total_results: Number(payload.pagination?.total || payload.pagination?.total_results) || null,
    assets
  };
}

async function normalizeResult(result, type, fetchImpl) {
  const sourceUrl = httpsUrl(result.id || result.url || result.item?.id);
  if (!sourceUrl) return null;
  let detail = result;
  let downloads = collectDownloads(detail, type);
  if (!downloads.length) {
    try {
      const detailUrl = sourceUrl.includes('?') ? `${sourceUrl}&fo=json` : `${sourceUrl}?fo=json`;
      const response = await fetchImpl(detailUrl, { headers: headers() });
      if (response.ok) {
        detail = await response.json();
        downloads = collectDownloads(detail, type);
      }
    } catch {
      // Search result remains useful for research even when item details are temporarily unavailable.
    }
  }
  const preview = firstString(result.image_url) || firstString(detail.image_url) || findPreview(detail);
  const title = result.title || detail.item?.title || detail.title || sourceUrl;
  const creator = firstString(result.contributor) || firstString(detail.item?.contributor_names) || 'Library of Congress';
  const subjects = unique([
    ...arrayStrings(result.subject),
    ...arrayStrings(detail.item?.subjects),
    ...arrayStrings(detail.item?.subject)
  ]).slice(0, 30);
  const rightsText = [
    ...arrayStrings(result.rights),
    ...arrayStrings(detail.item?.rights),
    ...arrayStrings(detail.item?.rights_advisory),
    ...arrayStrings(detail.item?.rights_and_access)
  ].filter(Boolean).join(' ').slice(0, 1500) || null;

  return {
    provider: 'library-of-congress',
    provider_id: result.item_id || detail.item?.id || slugId(sourceUrl),
    type,
    title,
    description: firstString(result.description) || firstString(detail.item?.summary) || firstString(detail.item?.notes) || null,
    source_url: sourceUrl,
    creator,
    creator_url: BASE,
    width: null,
    height: null,
    duration_seconds: null,
    orientation: null,
    preview_url: preview,
    tags: subjects,
    downloads,
    rights: {
      license_status: 'unknown',
      license_code: 'loc-rights-review',
      license_url: `${BASE}/legal/`,
      attribution_required: true,
      attribution_text: `Library of Congress${creator && creator !== 'Library of Congress' ? ` — ${creator}` : ''}`,
      suggested_scopes: ['internal-only'],
      suggested_status: 'review',
      warning: `Library of Congress stellt heterogene Sammlungen bereit. Vor Veröffentlichung die konkrete Item-Seite und "Rights & Access" prüfen.${rightsText ? ` Gefundener Rechtehinweis: ${rightsText}` : ''}`
    }
  };
}

function collectDownloads(value, type) {
  const found = [];
  walk(value, (candidate, context) => {
    const url = httpsUrl(candidate);
    if (!url || !matchesMedia(url, type)) return;
    found.push({
      quality: quality(url, context),
      url,
      width: numeric(context?.width),
      height: numeric(context?.height),
      size: numeric(context?.size || context?.filesize),
      file_type: mime(url, type),
      preview_url: null
    });
  });
  return [...new Map(found.map((item) => [item.url, item])).values()].slice(0, 40);
}
function walk(value, visit, context = null, depth = 0) {
  if (depth > 8 || value === null || value === undefined) return;
  if (typeof value === 'string') { visit(value, context); return; }
  if (Array.isArray(value)) { for (const item of value) walk(item, visit, context, depth + 1); return; }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string' && ['url','href','download','download_url','fulltext_file','file'].includes(key.toLowerCase())) visit(item, value);
      else walk(item, visit, value, depth + 1);
    }
  }
}
function matchesMedia(url, type) {
  const pathname = safePath(url);
  if (type === 'video') return /\.(mp4|mov|m4v|webm|mpg|mpeg)$/i.test(pathname);
  return /\.(jpe?g|png|webp|tiff?|gif)$/i.test(pathname);
}
function mime(url, type) {
  const value = safePath(url).toLowerCase();
  if (value.endsWith('.mp4') || value.endsWith('.m4v')) return 'video/mp4';
  if (value.endsWith('.webm')) return 'video/webm';
  if (value.endsWith('.mov')) return 'video/quicktime';
  if (/\.png$/.test(value)) return 'image/png';
  if (/\.webp$/.test(value)) return 'image/webp';
  if (/\.tiff?$/.test(value)) return 'image/tiff';
  if (/\.gif$/.test(value)) return 'image/gif';
  return type === 'video' ? 'video/mpeg' : 'image/jpeg';
}
function quality(url, context) {
  const text = `${url} ${JSON.stringify(context || {})}`.toLowerCase();
  if (/original|master|full|highest/.test(text)) return 'original';
  if (/large|high|\bhd\b/.test(text)) return 'large';
  if (/medium/.test(text)) return 'medium';
  if (/small|thumb/.test(text)) return 'small';
  return 'archive';
}
function findPreview(value) {
  const candidates = [];
  walk(value, (candidate) => { const url = httpsUrl(candidate); if (url && /\.(jpe?g|png|webp)$/i.test(safePath(url))) candidates.push(url); });
  return candidates[0] || null;
}
function httpsUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
  return value.replace(/^http:\/\//i, 'https://');
}
function safePath(value) { try { return new URL(value).pathname; } catch { return String(value).split('?')[0]; } }
function firstString(value) { return arrayStrings(value)[0] || null; }
function arrayStrings(value) { if (Array.isArray(value)) return value.flatMap(arrayStrings); if (typeof value === 'string' && value.trim()) return [value.trim()]; return []; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function numeric(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function slugId(url) { return safePath(url).split('/').filter(Boolean).pop() || url; }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
function headers() { return { 'User-Agent': 'Visual-Asset-Hub/0.11 documentary research', Accept: 'application/json' }; }
