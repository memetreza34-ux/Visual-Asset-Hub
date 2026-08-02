const API_BASE = 'https://api.pexels.com/v1';

const ORIENTATION_ALIASES = {
  vertical: 'portrait',
  portrait: 'portrait',
  horizontal: 'landscape',
  landscape: 'landscape',
  square: 'square'
};

function assertInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
  }
}

export function normalizeOrientation(value) {
  if (!value) return undefined;
  const normalized = ORIENTATION_ALIASES[String(value).toLowerCase()];
  if (!normalized) {
    throw new Error('orientation muss vertical, horizontal, portrait, landscape oder square sein.');
  }
  return normalized;
}

function inferOrientation(width, height) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

function normalizeVideo(video) {
  return {
    provider: 'pexels',
    provider_id: String(video.id),
    type: 'video',
    title: `Pexels Video ${video.id}`,
    source_url: video.url,
    creator: video.user?.name ?? null,
    creator_url: video.user?.url ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    duration_seconds: video.duration ?? null,
    orientation: inferOrientation(video.width, video.height),
    preview_url: video.image ?? null,
    files: (video.video_files ?? []).map((file) => ({
      id: file.id,
      quality: file.quality ?? null,
      file_type: file.file_type ?? null,
      width: file.width ?? null,
      height: file.height ?? null,
      fps: file.fps ?? null,
      url: file.link
    })),
    preview_files: (video.video_pictures ?? []).map((picture) => ({
      id: picture.id,
      url: picture.picture,
      index: picture.nr ?? null
    })),
    attribution: {
      provider_name: 'Pexels',
      provider_url: 'https://www.pexels.com',
      creator_name: video.user?.name ?? null,
      creator_url: video.user?.url ?? null,
      asset_url: video.url
    }
  };
}

function normalizePhoto(photo) {
  return {
    provider: 'pexels',
    provider_id: String(photo.id),
    type: 'image',
    title: photo.alt || `Pexels Foto ${photo.id}`,
    source_url: photo.url,
    creator: photo.photographer ?? null,
    creator_url: photo.photographer_url ?? null,
    width: photo.width ?? null,
    height: photo.height ?? null,
    orientation: inferOrientation(photo.width, photo.height),
    dominant_color: photo.avg_color ?? null,
    preview_url: photo.src?.medium ?? photo.src?.small ?? null,
    files: photo.src ?? {},
    attribution: {
      provider_name: 'Pexels',
      provider_url: 'https://www.pexels.com',
      creator_name: photo.photographer ?? null,
      creator_url: photo.photographer_url ?? null,
      asset_url: photo.url
    }
  };
}

export async function searchPexels({
  apiKey,
  query,
  type = 'video',
  orientation,
  size,
  locale = 'de-DE',
  page = 1,
  perPage = 15,
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('PEXELS_API_KEY fehlt. Lege ihn lokal in .env ab.');
  }
  if (!query || !String(query).trim()) {
    throw new Error('Eine Suchanfrage ist erforderlich.');
  }
  if (!['video', 'photo'].includes(type)) {
    throw new Error('type muss video oder photo sein.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('In dieser Node.js-Version ist fetch nicht verfügbar.');
  }

  assertInteger(page, 'page', 1, 100000);
  assertInteger(perPage, 'perPage', 1, 80);

  const endpoint = type === 'video' ? `${API_BASE}/videos/search` : `${API_BASE}/search`;
  const url = new URL(endpoint);
  url.searchParams.set('query', String(query).trim());
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));

  const normalizedOrientation = normalizeOrientation(orientation);
  if (normalizedOrientation) url.searchParams.set('orientation', normalizedOrientation);
  if (locale) url.searchParams.set('locale', locale);
  if (size) url.searchParams.set('size', size);

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: String(apiKey).trim(),
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.text();
      detail = body ? ` ${body.slice(0, 300)}` : '';
    } catch {
      detail = '';
    }
    throw new Error(`Pexels-Anfrage fehlgeschlagen (${response.status}).${detail}`);
  }

  const payload = await response.json();
  const rawAssets = type === 'video' ? payload.videos ?? [] : payload.photos ?? [];

  return {
    provider: 'pexels',
    query: String(query).trim(),
    type,
    page: payload.page ?? page,
    per_page: payload.per_page ?? perPage,
    total_results: payload.total_results ?? rawAssets.length,
    next_page: payload.next_page ?? null,
    previous_page: payload.prev_page ?? null,
    fetched_at: new Date().toISOString(),
    assets: rawAssets.map(type === 'video' ? normalizeVideo : normalizePhoto)
  };
}
