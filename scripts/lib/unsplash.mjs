const API_BASE = 'https://api.unsplash.com';
const APP_UTM = { utm_source: 'visual_asset_hub', utm_medium: 'referral' };

function assertInteger(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} muss eine ganze Zahl zwischen ${min} und ${max} sein.`);
  }
}

function orientationForApi(value) {
  if (!value) return undefined;
  const normalized = String(value).toLowerCase();
  if (['vertical', 'portrait'].includes(normalized)) return 'portrait';
  if (['horizontal', 'landscape'].includes(normalized)) return 'landscape';
  if (['square', 'squarish'].includes(normalized)) return 'squarish';
  throw new Error('orientation muss vertical, horizontal, square, portrait, landscape oder squarish sein.');
}

function inferOrientation(width, height) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

function withUtm(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    for (const [key, entry] of Object.entries(APP_UTM)) url.searchParams.set(key, entry);
    return url.toString();
  } catch {
    return value;
  }
}

function normalizePhoto(photo) {
  const creatorName = photo.user?.name ?? photo.user?.username ?? null;
  const creatorUrl = withUtm(photo.user?.links?.html);
  const sourceUrl = withUtm(photo.links?.html);
  return {
    provider: 'unsplash',
    provider_id: String(photo.id),
    type: 'image',
    title: photo.alt_description || photo.description || `Unsplash Foto ${photo.id}`,
    source_url: sourceUrl,
    creator: creatorName,
    creator_url: creatorUrl,
    width: photo.width ?? null,
    height: photo.height ?? null,
    orientation: inferOrientation(photo.width, photo.height),
    dominant_color: photo.color ?? null,
    preview_url: photo.urls?.small ?? photo.urls?.thumb ?? null,
    files: {
      original: photo.urls?.raw ?? null,
      large: photo.urls?.full ?? photo.urls?.regular ?? null,
      medium: photo.urls?.regular ?? photo.urls?.small ?? null,
      small: photo.urls?.small ?? null,
      thumb: photo.urls?.thumb ?? null
    },
    download_location: photo.links?.download_location ?? null,
    attribution: {
      provider_name: 'Unsplash',
      provider_url: withUtm('https://unsplash.com'),
      creator_name: creatorName,
      creator_url: creatorUrl,
      asset_url: sourceUrl,
      text: creatorName ? `Foto von ${creatorName} auf Unsplash` : 'Foto auf Unsplash'
    }
  };
}

export async function searchUnsplash({
  apiKey,
  query,
  orientation,
  page = 1,
  perPage = 15,
  orderBy = 'relevant',
  contentFilter = 'high',
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('UNSPLASH_ACCESS_KEY fehlt.');
  if (!query || !String(query).trim()) throw new Error('Eine Suchanfrage ist erforderlich.');
  if (typeof fetchImpl !== 'function') throw new Error('In dieser Node.js-Version ist fetch nicht verfügbar.');
  assertInteger(page, 'page', 1, 100000);
  assertInteger(perPage, 'perPage', 1, 30);
  if (!['latest', 'relevant'].includes(orderBy)) throw new Error('orderBy muss latest oder relevant sein.');
  if (!['low', 'high'].includes(contentFilter)) throw new Error('contentFilter muss low oder high sein.');

  const url = new URL(`${API_BASE}/search/photos`);
  url.searchParams.set('query', String(query).trim());
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('order_by', orderBy);
  url.searchParams.set('content_filter', contentFilter);
  const apiOrientation = orientationForApi(orientation);
  if (apiOrientation) url.searchParams.set('orientation', apiOrientation);

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Client-ID ${String(apiKey).trim()}`,
      'Accept-Version': 'v1',
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.text()).slice(0, 300); } catch { detail = ''; }
    throw new Error(`Unsplash-Anfrage fehlgeschlagen (${response.status}).${detail ? ` ${detail}` : ''}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];
  return {
    provider: 'unsplash',
    query: String(query).trim(),
    type: 'photo',
    page,
    per_page: perPage,
    total_results: payload.total ?? results.length,
    total_pages: payload.total_pages ?? null,
    fetched_at: new Date().toISOString(),
    rate_limit: {
      limit: Number(response.headers.get('x-ratelimit-limit') || 0) || null,
      remaining: Number(response.headers.get('x-ratelimit-remaining') || 0) || null
    },
    assets: results.map(normalizePhoto)
  };
}

export async function trackUnsplashDownload({ apiKey, downloadLocation, fetchImpl = globalThis.fetch }) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('UNSPLASH_ACCESS_KEY fehlt für die Download-Meldung.');
  if (!downloadLocation) throw new Error('Unsplash download_location fehlt.');
  const url = new URL(downloadLocation);
  if (url.protocol !== 'https:' || url.hostname !== 'api.unsplash.com') throw new Error('Ungültiger Unsplash-Download-Endpunkt.');
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Client-ID ${String(apiKey).trim()}`,
      'Accept-Version': 'v1',
      Accept: 'application/json'
    }
  });
  if (!response.ok) throw new Error(`Unsplash-Download-Meldung fehlgeschlagen (${response.status}).`);
  const payload = await response.json().catch(() => ({}));
  return { ok: true, url: payload.url ?? null };
}
