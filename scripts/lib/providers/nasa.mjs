const API = 'https://images-api.nasa.gov';

export async function searchNasa({ query, type = 'image', page = 1, perPage = 20, fetchImpl = fetch }) {
  if (!query?.trim()) throw new Error('NASA-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('NASA unterstützt image oder video.');
  const params = new URLSearchParams({
    q: query.trim(),
    media_type: type,
    page: String(Math.max(1, Number(page) || 1)),
    page_size: String(clamp(perPage, 1, 100))
  });
  const response = await fetchImpl(`${API}/search?${params}`, { headers: userAgent() });
  if (!response.ok) throw new Error(`NASA-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const rawItems = payload.collection?.items || [];
  const assets = [];
  for (const item of rawItems) {
    const data = item.data?.[0];
    if (!data?.nasa_id || data.media_type !== type) continue;
    let downloads = [];
    try {
      const manifestResponse = await fetchImpl(`${API}/asset/${encodeURIComponent(data.nasa_id)}`, { headers: userAgent() });
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        downloads = (manifest.collection?.items || [])
          .map((entry) => normalizeDownload(entry.href, type))
          .filter(Boolean);
      }
    } catch {
      // Search result remains useful as research even if the asset manifest is temporarily unavailable.
    }
    const preview = (item.links || []).find((link) => link.rel === 'preview')?.href || null;
    assets.push({
      provider: 'nasa',
      provider_id: data.nasa_id,
      type,
      title: data.title || data.nasa_id,
      description: data.description || data.description_508 || null,
      source_url: `https://images.nasa.gov/details/${encodeURIComponent(data.nasa_id)}`,
      creator: data.photographer || data.center || 'NASA',
      creator_url: 'https://www.nasa.gov/',
      width: null,
      height: null,
      duration_seconds: null,
      orientation: null,
      preview_url: preview,
      tags: Array.isArray(data.keywords) ? data.keywords.slice(0, 30) : [],
      downloads,
      rights: {
        license_status: 'unknown',
        license_code: 'NASA-media-review',
        license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
        attribution_required: false,
        attribution_text: `Courtesy ${data.center || 'NASA'}${data.photographer ? ` / ${data.photographer}` : ''}`,
        suggested_scopes: ['internal-only'],
        suggested_status: 'review',
        warning: 'NASA-Medien sind häufig frei nutzbar, aber NASA-Kennzeichen/Logos und separat gekennzeichnetes Drittmaterial können Einschränkungen haben. Vor YouTube-Veröffentlichung die konkrete Asset-Seite und NASA Media Usage Guidelines prüfen.'
      }
    });
  }
  return {
    provider: 'nasa',
    query: query.trim(),
    type,
    page: Math.max(1, Number(page) || 1),
    per_page: clamp(perPage, 1, 100),
    total_results: Number(payload.collection?.metadata?.total_hits) || null,
    assets
  };
}

function normalizeDownload(url, type) {
  if (!url) return null;
  const lower = String(url).toLowerCase().split('?')[0];
  const ext = lower.match(/\.([a-z0-9]{2,5})$/)?.[1] || '';
  const isVideo = ['mp4','mov','m4v','webm','mpg','mpeg'].includes(ext);
  const isImage = ['jpg','jpeg','png','tif','tiff','webp'].includes(ext);
  if (type === 'video' && !isVideo) return null;
  if (type === 'image' && !isImage) return null;
  return {
    quality: qualityFromUrl(lower),
    url,
    width: null,
    height: null,
    size: null,
    file_type: mime(ext, type),
    preview_url: null
  };
}
function qualityFromUrl(url) {
  if (/~orig\.|_orig\.|original/.test(url)) return 'original';
  if (/~large\.|_large\.|large/.test(url)) return 'large';
  if (/~medium\.|_medium\.|medium/.test(url)) return 'medium';
  if (/~small\.|_small\.|small/.test(url)) return 'small';
  return 'archive';
}
function mime(ext, type) {
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (['jpg','jpeg'].includes(ext)) return 'image/jpeg';
  if (['tif','tiff'].includes(ext)) return 'image/tiff';
  return type === 'video' ? 'video/mp4' : 'image/jpeg';
}
function userAgent() { return { 'User-Agent': 'Visual-Asset-Hub/0.10 documentary research', Accept: 'application/json' }; }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
