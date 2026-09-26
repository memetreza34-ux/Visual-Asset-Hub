const API_BASE = 'https://api.openverse.org/v1/images/';
const SAFE_LICENSES = 'by,by-sa,cc0,pdm';
const SAFE_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'tif', 'tiff']);

function inferOrientation(width, height) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

function assertInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
}

function extension(value) {
  try { return new URL(value).pathname.split('.').pop()?.toLowerCase() || ''; }
  catch { return ''; }
}

function normalizeExtension(value, fallbackUrl) {
  let ext = String(value || '').toLowerCase().trim();
  if (ext.includes('/')) ext = ext.split('/').pop();
  if (!ext) ext = extension(fallbackUrl);
  if (ext === 'jpeg') ext = 'jpg';
  return ext;
}

function normalizeItem(item) {
  const license = String(item.license || '').toLowerCase();
  const original = item.url || null;
  const ext = normalizeExtension(item.filetype, original);
  if (!original || !SAFE_IMAGE_EXTENSIONS.has(ext)) return null;
  return {
    provider: 'openverse',
    provider_id: String(item.id),
    type: 'image',
    title: item.title || `Openverse Bild ${item.id}`,
    source_url: item.foreign_landing_url || item.detail_url,
    creator: item.creator || null,
    creator_url: item.creator_url || null,
    width: item.width ?? null,
    height: item.height ?? null,
    orientation: inferOrientation(item.width, item.height),
    preview_url: item.thumbnail || null,
    files: { original, medium: item.thumbnail || null },
    license,
    license_version: item.license_version || null,
    license_url: item.license_url || null,
    attribution_text: item.attribution || null,
    source_name: item.source || item.provider || 'Openverse',
    raw_category: item.category || null,
    mature: item.mature === true
  };
}

export async function searchOpenverse({ query, orientation, page = 1, perPage = 15, fetchImpl = globalThis.fetch }) {
  if (!query || !String(query).trim()) throw new Error('Eine Suchanfrage ist erforderlich.');
  if (typeof fetchImpl !== 'function') throw new Error('In dieser Node.js-Version ist fetch nicht verfügbar.');
  assertInteger(page, 'page', 1, 100);
  assertInteger(perPage, 'perPage', 1, 20);

  const url = new URL(API_BASE);
  url.searchParams.set('q', String(query).trim());
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', '20');
  url.searchParams.set('license', SAFE_LICENSES);
  url.searchParams.set('mature', 'false');
  url.searchParams.set('filter_dead', 'true');

  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Openverse-Anfrage fehlgeschlagen (${response.status}).${detail ? ` ${detail.slice(0, 300)}` : ''}`);
  }

  const payload = await response.json();
  const normalized = (payload.results ?? [])
    .map(normalizeItem)
    .filter(Boolean)
    .filter((item) => item.source_url && !item.mature)
    .filter((item) => !orientation || orientation === 'any' || item.orientation === orientation)
    .slice(0, perPage);

  return {
    provider: 'openverse',
    query: String(query).trim(),
    type: 'photo',
    page,
    per_page: perPage,
    total_results: payload.result_count ?? payload.resultCount ?? normalized.length,
    fetched_at: new Date().toISOString(),
    license_filter: SAFE_LICENSES,
    assets: normalized
  };
}
