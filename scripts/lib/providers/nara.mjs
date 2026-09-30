const BASE = 'https://catalog.archives.gov';
const API = `${BASE}/api/v2/records/search`;
const RIGHTS_URL = 'https://www.archives.gov/research/catalog/help/api';

export async function searchNara({ apiKey, query, type = 'image', page = 1, perPage = 20, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('NARA_API_KEY fehlt. Kostenlosen National-Archives-Catalog-Key eintragen.');
  if (!query?.trim()) throw new Error('NARA-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('NARA unterstützt image oder video.');

  const limit = clamp(perPage, 1, 50);
  const pageNumber = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams({
    q: query.trim(),
    availableOnline: 'true',
    limit: String(limit)
  });
  if (pageNumber > 1) params.set('searchAfter', '*');
  if (type === 'video') params.set('typeOfMaterials', 'Moving Images');
  else params.set('typeOfMaterials', 'Photographs and other Graphic Materials');

  const response = await fetchImpl(`${API}?${params}`, {
    headers: { 'User-Agent': 'Visual-Asset-Hub/0.16 documentary research', Accept: 'application/json', 'x-api-key': apiKey }
  });
  if (!response.ok) throw new Error(`NARA-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const hits = payload?.body?.hits?.hits || [];
  const assets = [];
  for (const hit of hits) {
    const asset = normalizeRecord(hit?._source?.record, type);
    if (asset) assets.push(asset);
  }

  return {
    provider: 'nara',
    query: query.trim(),
    type,
    page: pageNumber,
    per_page: limit,
    total_results: Number(payload?.body?.hits?.total?.value ?? payload?.body?.hits?.total) || null,
    assets
  };
}

function normalizeRecord(record, type) {
  if (!record) return null;
  const naId = record.naId || record.naid || record.id;
  const sourceUrl = naId ? `${BASE}/id/${naId}` : null;
  if (!sourceUrl) return null;
  const digitalObjects = Array.isArray(record.digitalObjects) ? record.digitalObjects : [];
  const downloads = [];
  for (const object of digitalObjects) {
    const url = httpsUrl(object?.objectUrl || object?.url);
    if (!url || !matchesType(url, type)) continue;
    const preview = httpsUrl(object?.thumbnailUrl || object?.thumbnail) || null;
    downloads.push({
      quality: /original|master|full/i.test(String(object?.objectType || object?.description || '')) ? 'original' : 'archive',
      url,
      width: numeric(object?.width),
      height: numeric(object?.height),
      size: numeric(object?.fileSize),
      file_type: mime(url, type),
      preview_url: preview
    });
  }
  if (!downloads.length) return null;

  const restrictionText = collectText([
    record.useRestriction,
    record.useRestrictions,
    record.accessRestriction,
    record.accessRestrictions,
    record.rights,
    record.copyright
  ]).join(' ').slice(0, 1800);
  const clearlyOpen = /\bpublic domain\b/i.test(restrictionText);
  const rights = clearlyOpen ? {
    license_status: 'public-domain',
    license_code: 'nara-public-domain',
    license_url: RIGHTS_URL,
    attribution_required: false,
    attribution_text: 'National Archives and Records Administration',
    suggested_scopes: ['youtube', 'website', 'organic-social', 'client-work'],
    suggested_status: 'review',
    warning: `NARA-Metadaten enthalten einen Public-Domain-Hinweis. Vor Veröffentlichung trotzdem den Use-Restrictions-Eintrag und mögliche gespendete/urheberrechtlich geschützte Bestandteile prüfen.${restrictionText ? ` Hinweis: ${restrictionText}` : ''}`
  } : {
    license_status: 'unknown',
    license_code: 'nara-rights-review',
    license_url: RIGHTS_URL,
    attribution_required: true,
    attribution_text: 'National Archives and Records Administration',
    suggested_scopes: ['internal-only'],
    suggested_status: 'review',
    warning: `NARA-Bestände sind häufig gemeinfrei, können aber Ausnahmen enthalten. Vor Nutzung den konkreten Use-Restrictions-Eintrag prüfen.${restrictionText ? ` Hinweis: ${restrictionText}` : ''}`
  };

  return {
    provider: 'nara',
    provider_id: String(naId),
    type,
    title: text(record.title || `NARA ${naId}`),
    description: firstText([record.scopeAndContentNote, record.generalNotes, record.description]) || null,
    source_url: sourceUrl,
    creator: firstText([record.creator, record.creators, record.organizationNames]) || 'National Archives and Records Administration',
    creator_url: 'https://www.archives.gov',
    width: downloads[0]?.width || null,
    height: downloads[0]?.height || null,
    duration_seconds: null,
    orientation: null,
    preview_url: downloads.find((item) => item.preview_url)?.preview_url || (type === 'image' ? downloads[0]?.url : null),
    tags: uniqueStrings([
      ...collectText(record.subjects),
      ...collectText(record.topicalSubjects),
      ...collectText(record.geographicReferences),
      ...collectText(record.recordGroupNumber)
    ]).slice(0, 30),
    downloads,
    rights
  };
}

function matchesType(url, type) {
  const path = safePath(url).toLowerCase();
  if (type === 'video') return /\.(mp4|mov|m4v|webm|mpg|mpeg|avi|ogv)$/.test(path);
  return /\.(jpe?g|png|webp|gif|tiff?)$/.test(path);
}
function mime(url, type) {
  const path = safePath(url).toLowerCase();
  if (path.endsWith('.mp4') || path.endsWith('.m4v')) return 'video/mp4';
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.mov')) return 'video/quicktime';
  if (path.endsWith('.avi')) return 'video/x-msvideo';
  if (path.endsWith('.ogv')) return 'video/ogg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (/\.tiff?$/.test(path)) return 'image/tiff';
  if (path.endsWith('.gif')) return 'image/gif';
  return type === 'video' ? 'video/mpeg' : 'image/jpeg';
}
function collectText(value) {
  const out = [];
  walk(value, (item) => {
    if (typeof item === 'string' && item.trim()) out.push(text(item));
    else if (typeof item === 'number') out.push(String(item));
  });
  return out;
}
function walk(value, visit, depth = 0) {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string' || typeof value === 'number') { visit(value); return; }
  if (Array.isArray(value)) { value.forEach((item) => walk(item, visit, depth + 1)); return; }
  if (typeof value === 'object') Object.values(value).forEach((item) => walk(item, visit, depth + 1));
}
function firstText(values) {
  for (const value of values) {
    const found = collectText(value)[0];
    if (found) return found;
  }
  return null;
}
function httpsUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
  return value.replace(/^http:\/\//i, 'https://');
}
function safePath(value) { try { return new URL(value).pathname; } catch { return String(value).split('?')[0]; } }
function numeric(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
function text(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function uniqueStrings(values) { return [...new Set(values.map(text).filter(Boolean))]; }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
