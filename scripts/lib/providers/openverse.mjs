const API = 'https://api.openverse.org/v1/images/';

export async function searchOpenverse({
  query,
  orientation,
  page = 1,
  perPage = 20,
  fetchImpl = globalThis.fetch
}) {
  if (!query || !String(query).trim()) throw new Error('Eine Suchanfrage ist erforderlich.');
  if (!Number.isInteger(page) || page < 1) throw new Error('page muss eine positive Ganzzahl sein.');
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('perPage muss zwischen 1 und 100 liegen.');

  const url = new URL(API);
  url.searchParams.set('q', String(query).trim());
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(perPage));
  url.searchParams.set('mature', 'false');

  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Visual-Asset-Hub/0.7 (+local media research tool)'
    }
  });
  if (!response.ok) {
    const body = await safeText(response);
    throw new Error(`Openverse-Anfrage fehlgeschlagen (${response.status}).${body ? ` ${body.slice(0, 300)}` : ''}`);
  }

  const payload = await response.json();
  let assets = (payload.results || []).map(normalizeImage).filter((asset) => asset.downloads.length);
  if (orientation) assets = assets.filter((asset) => asset.orientation === normalizeOrientation(orientation));

  return {
    provider: 'openverse',
    query: String(query).trim(),
    type: 'image',
    page,
    per_page: perPage,
    total_results: payload.result_count ?? payload.resultCount ?? assets.length,
    fetched_at: new Date().toISOString(),
    assets
  };
}

function normalizeImage(item) {
  const rights = mapRights(item);
  const direct = item.url ? [{
    quality: 'original',
    url: item.url,
    width: item.width ?? null,
    height: item.height ?? null,
    size: item.filesize ? Number(item.filesize) : null,
    file_type: item.filetype || null
  }] : [];
  return {
    provider: 'openverse',
    provider_id: String(item.id || item.identifier || ''),
    upstream_provider: item.provider || null,
    upstream_source: item.source || null,
    type: 'image',
    title: item.title || 'Openverse Bild',
    description: item.description || item.meta_data?.description || null,
    source_url: item.foreign_landing_url || item.detail_url || null,
    creator: item.creator || null,
    creator_url: item.creator_url || null,
    width: item.width ?? null,
    height: item.height ?? null,
    duration_seconds: null,
    orientation: inferOrientation(item.width, item.height),
    preview_url: item.thumbnail || null,
    tags: (item.tags || []).map((tag) => typeof tag === 'string' ? tag : tag?.name).filter(Boolean),
    downloads: direct,
    rights
  };
}

function mapRights(item) {
  const code = String(item.license || '').toLowerCase();
  const licenseUrl = item.license_url || item.meta_data?.license_url || null;
  const attribution = item.attribution || buildAttribution(item, code);
  if (code === 'cc0') return {
    license_status: 'cc0', license_code: code, license_url: licenseUrl,
    attribution_required: false, attribution_text: attribution,
    suggested_scopes: ['organic-social', 'youtube', 'website', 'paid-ads', 'client-work'], suggested_status: 'approved'
  };
  if (code === 'pdm') return {
    license_status: 'public-domain', license_code: code, license_url: licenseUrl,
    attribution_required: false, attribution_text: attribution,
    suggested_scopes: ['organic-social', 'youtube', 'website', 'paid-ads', 'client-work'], suggested_status: 'approved'
  };
  if (code === 'by') return {
    license_status: 'cc-by', license_code: code, license_url: licenseUrl,
    attribution_required: true, attribution_text: attribution,
    suggested_scopes: ['organic-social', 'youtube', 'website', 'paid-ads', 'client-work'], suggested_status: 'approved'
  };
  return {
    license_status: 'restricted', license_code: code || 'unknown-open-license', license_url: licenseUrl,
    attribution_required: true, attribution_text: attribution,
    suggested_scopes: ['internal-only'], suggested_status: 'review',
    warning: 'Diese Openverse-Lizenz enthält Bedingungen, die das aktuelle Rechte-Modell nicht vollständig ausdrücken kann. Vor externer Nutzung manuell prüfen.'
  };
}

function buildAttribution(item, code) {
  const title = item.title ? `“${item.title}”` : 'Work';
  const creator = item.creator ? ` by ${item.creator}` : '';
  const license = code ? ` (${code.toUpperCase()})` : '';
  return `${title}${creator}${license}`;
}
function normalizeOrientation(value) {
  const text = String(value || '').toLowerCase();
  if (['vertical', 'portrait'].includes(text)) return 'vertical';
  if (['horizontal', 'landscape'].includes(text)) return 'horizontal';
  if (text === 'square') return 'square';
  throw new Error('orientation muss vertical, horizontal, portrait, landscape oder square sein.');
}
function inferOrientation(width, height) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}
async function safeText(response) { try { return await response.text(); } catch { return ''; } }
