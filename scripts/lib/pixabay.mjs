const IMAGE_API = 'https://pixabay.com/api/';
const VIDEO_API = 'https://pixabay.com/api/videos/';

function assertInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
  }
}

function inferOrientation(width, height) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

function normalizeOrientation(value) {
  if (!value || value === 'any' || value === 'all') return undefined;
  const normalized = String(value).toLowerCase();
  if (['vertical', 'portrait'].includes(normalized)) return 'vertical';
  if (['horizontal', 'landscape'].includes(normalized)) return 'horizontal';
  if (normalized === 'square') return 'square';
  throw new Error('orientation muss vertical, horizontal, square oder any sein.');
}

function normalizeVideo(hit) {
  const renditions = Object.entries(hit.videos ?? {})
    .filter(([, file]) => file?.url)
    .map(([quality, file]) => ({
      id: `${hit.id}-${quality}`,
      quality,
      file_type: 'video/mp4',
      width: file.width ?? null,
      height: file.height ?? null,
      fps: null,
      size: file.size ?? null,
      thumbnail: file.thumbnail ?? null,
      url: file.url
    }));
  const preferred = renditions.find((item) => item.quality === 'medium') ?? renditions[0];
  const width = preferred?.width ?? null;
  const height = preferred?.height ?? null;
  return {
    provider: 'pixabay',
    provider_id: String(hit.id),
    type: 'video',
    title: `Pixabay Video ${hit.id}`,
    source_url: hit.pageURL,
    creator: hit.user ?? null,
    creator_url: hit.user_id && hit.user ? `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` : null,
    width,
    height,
    duration_seconds: hit.duration ?? null,
    orientation: inferOrientation(width, height),
    preview_url: preferred?.thumbnail ?? null,
    files: renditions,
    views: hit.views ?? null,
    downloads: hit.downloads ?? null,
    likes: hit.likes ?? null,
    attribution: {
      provider_name: 'Pixabay',
      provider_url: 'https://pixabay.com',
      creator_name: hit.user ?? null,
      creator_url: hit.user_id && hit.user ? `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` : null,
      asset_url: hit.pageURL
    }
  };
}

function normalizeImage(hit) {
  const width = hit.imageWidth ?? hit.webformatWidth ?? hit.previewWidth ?? null;
  const height = hit.imageHeight ?? hit.webformatHeight ?? hit.previewHeight ?? null;
  return {
    provider: 'pixabay',
    provider_id: String(hit.id),
    type: 'image',
    title: hit.tags ? `Pixabay: ${hit.tags}` : `Pixabay Bild ${hit.id}`,
    source_url: hit.pageURL,
    creator: hit.user ?? null,
    creator_url: hit.user_id && hit.user ? `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` : null,
    width,
    height,
    orientation: inferOrientation(width, height),
    preview_url: hit.webformatURL ?? hit.previewURL ?? null,
    files: {
      original: hit.imageURL ?? null,
      large: hit.fullHDURL ?? hit.largeImageURL ?? null,
      medium: hit.webformatURL ?? null,
      small: hit.previewURL ?? null
    },
    image_type: hit.type ?? null,
    views: hit.views ?? null,
    downloads: hit.downloads ?? null,
    likes: hit.likes ?? null,
    attribution: {
      provider_name: 'Pixabay',
      provider_url: 'https://pixabay.com',
      creator_name: hit.user ?? null,
      creator_url: hit.user_id && hit.user ? `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` : null,
      asset_url: hit.pageURL
    }
  };
}

export async function searchPixabay({
  apiKey,
  query,
  type = 'video',
  orientation,
  locale = 'de',
  page = 1,
  perPage = 15,
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('PIXABY_API fehlt.');
  if (!query || !String(query).trim()) throw new Error('Eine Suchanfrage ist erforderlich.');
  if (!['video', 'photo'].includes(type)) throw new Error('type muss video oder photo sein.');
  if (typeof fetchImpl !== 'function') throw new Error('In dieser Node.js-Version ist fetch nicht verfügbar.');
  assertInteger(page, 'page', 1, 100000);
  assertInteger(perPage, 'perPage', 3, 200);

  const requestedOrientation = normalizeOrientation(orientation);
  const url = new URL(type === 'video' ? VIDEO_API : IMAGE_API);
  url.searchParams.set('key', String(apiKey).trim());
  url.searchParams.set('q', String(query).trim().slice(0, 100));
  url.searchParams.set('lang', String(locale || 'de').slice(0, 5));
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('order', 'popular');
  if (type === 'photo') {
    url.searchParams.set('image_type', 'all');
    if (requestedOrientation && requestedOrientation !== 'square') url.searchParams.set('orientation', requestedOrientation);
  } else {
    url.searchParams.set('video_type', 'all');
  }

  const response = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Pixabay-Anfrage fehlgeschlagen (${response.status}).${detail ? ` ${detail.slice(0, 300)}` : ''}`);
  }

  const payload = await response.json();
  const normalized = (payload.hits ?? []).map(type === 'video' ? normalizeVideo : normalizeImage);
  const assets = requestedOrientation
    ? normalized.filter((asset) => asset.orientation === requestedOrientation)
    : normalized;

  return {
    provider: 'pixabay',
    query: String(query).trim(),
    type,
    page,
    per_page: perPage,
    total_results: payload.totalHits ?? payload.total ?? assets.length,
    next_page: null,
    previous_page: page > 1 ? page - 1 : null,
    fetched_at: new Date().toISOString(),
    cache_ttl_hours: 24,
    assets
  };
}
