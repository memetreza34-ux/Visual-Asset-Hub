const API_ROOT = 'https://images-api.nasa.gov';

export async function searchNasa({
  query,
  type = 'photo',
  page = 1,
  perPage = 8,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!query || !String(query).trim()) throw new Error('NASA-Suchanfrage fehlt.');
  if (typeof fetchImpl !== 'function') throw new Error('fetch ist nicht verfügbar.');
  const mediaType = type === 'video' ? 'video' : 'image';
  const url = new URL(`${API_ROOT}/search`);
  url.searchParams.set('q', String(query).trim());
  url.searchParams.set('media_type', mediaType);
  url.searchParams.set('page', String(Math.max(1, Number(page) || 1)));
  url.searchParams.set('page_size', String(Math.max(1, Math.min(20, Number(perPage) || 8))));

  const response = await fetchImpl(url, {headers: {Accept: 'application/json'}});
  if (!response.ok) throw new Error(`NASA-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const items = payload?.collection?.items ?? [];
  const assets = [];

  for (const item of items.slice(0, perPage)) {
    const data = item?.data?.[0] ?? {};
    const nasaId = String(data.nasa_id ?? '').trim();
    if (!nasaId) continue;
    const preview = item?.links?.find((link) => link?.rel === 'preview')?.href || item?.links?.[0]?.href || '';
    let mediaUrl = '';
    try {
      mediaUrl = await resolveNasaAsset(nasaId, mediaType, fetchImpl);
    } catch {}
    if (!mediaUrl && mediaType === 'image') mediaUrl = preview;
    if (!mediaUrl) continue;

    assets.push({
      provider: 'nasa',
      provider_id: nasaId,
      type: mediaType === 'video' ? 'video' : 'image',
      title: data.title || nasaId,
      description: data.description || data.description_508 || '',
      tags: Array.isArray(data.keywords) ? data.keywords : [],
      date: data.date_created || null,
      creator: data.secondary_creator || data.center || 'NASA',
      source_url: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
      preview_url: preview || mediaUrl,
      files: {original: mediaUrl, medium: preview || mediaUrl},
      width: null,
      height: null,
      duration_seconds: null,
      orientation: 'unknown',
      license: 'nasa-media-usage-guidelines',
      attribution: 'NASA',
      source_name: 'NASA Image and Video Library'
    });
  }

  return {
    provider: 'nasa',
    query: String(query).trim(),
    type,
    page,
    per_page: perPage,
    total_results: Number(payload?.collection?.metadata?.total_hits) || assets.length,
    fetched_at: new Date().toISOString(),
    assets
  };
}

async function resolveNasaAsset(nasaId, mediaType, fetchImpl) {
  const response = await fetchImpl(`${API_ROOT}/asset/${encodeURIComponent(nasaId)}`, {headers: {Accept: 'application/json'}});
  if (!response.ok) return '';
  const payload = await response.json();
  const hrefs = (payload?.collection?.items ?? []).map((item) => String(item?.href || '')).filter(Boolean);
  if (mediaType === 'video') {
    return hrefs.find((href) => /\.(?:mp4)(?:\?|$)/i.test(href))
      || hrefs.find((href) => /\.(?:webm)(?:\?|$)/i.test(href))
      || '';
  }
  return hrefs.find((href) => /~orig\.(?:jpg|jpeg|png|tif|tiff)(?:\?|$)/i.test(href))
    || hrefs.find((href) => /\.(?:jpg|jpeg|png|tif|tiff)(?:\?|$)/i.test(href))
    || '';
}
