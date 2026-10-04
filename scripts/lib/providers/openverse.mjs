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
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 20) throw new Error('perPage muss ohne Openverse-Konto zwischen 1 und 20 liegen.');

  const url = new URL(API);
  url.searchParams.set('q', String(query).trim());
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(perPage));
  url.searchParams.set('mature', 'false');
  // Nur Lizenzen, die eine kommerzielle Nutzung und Bearbeitung grundsätzlich erlauben.
  url.searchParams.set('license_type', 'commercial,modification');

  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Visual-Asset-Hub/0.9 (https://github.com/memetreza34-ux/Visual-Asset-Hub)'
    }
  });
  if (!response.ok) {
    const body = await safeText(response);
    throw new Error(`Openverse-Anfrage fehlgeschlagen (${response.status}).${body ? ` ${body.slice(0, 300)}` : ''}`);
  }

  const payload = await response.json();
  let assets = (payload.results || []).map(normalizeImage).filter((asset) => asset.downloads.length);
  if (orientation) assets = assets.filter((asset) => asset.orientation === 'unknown' || asset.orientation === normalizeOrientation(orientation));

  return {
    provider: 'openverse',
    query: String(query).trim(),
    type: 'image',
    page,
    per_page: perPage,
    total_results: payload.result_count ?? assets.length,
    next_page: payload.page_count && page < payload.page_count ? page + 1 : null,
    fetched_at: new Date().toISOString(),
    assets
  };
}

export function normalizeImage(item) {
  const rights = mapRights(item);
  const direct = item.url ? [{
    quality: 'original',
    url: item.url,
    width: item.width ?? null,
    height: item.height ?? null,
    size: item.filesize ? Number(item.filesize) : null,
    file_type: item.filetype ? `image/${String(item.filetype).toLowerCase().replace('jpg', 'jpeg')}` : null
  }] : [];
  return {
    provider: 'openverse',
    provider_id: String(item.id || item.identifier || ''),
    upstream_provider: item.provider || null,
    upstream_source: item.source || null,
    type: 'image',
    title: item.title || 'Openverse Bild',
    description: item.description || null,
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

export function mapRights(item) {
  const code = String(item.license || '').toLowerCase();
  const licenseUrl = item.license_url || null;
  const attribution = item.attribution || buildAttribution(item, code);
  const base = { license_code: code ? `CC ${code.toUpperCase()}` : 'unknown', license_url: licenseUrl, attribution_text: attribution };
  if (code === 'cc0') return { ...base, license_code: 'CC0', license_status: 'cc0', attribution_required: false, share_alike: false };
  if (code === 'pdm') return { ...base, license_code: 'Public Domain Mark', license_status: 'public-domain', attribution_required: false, share_alike: false };
  if (code === 'by') return { ...base, license_status: 'cc-by', attribution_required: true, share_alike: false };
  if (code === 'by-sa') {
    return { ...base, license_status: 'cc-by', attribution_required: true, share_alike: true, warning: 'CC BY-SA: Credit nennen; Weitergabe unter gleichen Bedingungen vor Veröffentlichung prüfen.' };
  }
  return {
    ...base,
    license_status: 'restricted', attribution_required: true, share_alike: false,
    warning: 'Diese Openverse-Lizenz erlaubt keine automatische YouTube-Freigabe (NC/ND oder unbekannt).'
  };
}

function buildAttribution(item, code) {
  const title = item.title ? `„${item.title}“` : 'Werk';
  const creator = item.creator ? ` von ${item.creator}` : '';
  const license = code ? `, CC ${code.toUpperCase()}` : '';
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
