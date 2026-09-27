const IMAGE_API = 'https://pixabay.com/api/';
const VIDEO_API = 'https://pixabay.com/api/videos/';

export async function searchPixabay({
  apiKey,
  query,
  type = 'video',
  orientation,
  language = 'de',
  page = 1,
  perPage = 20,
  fetchImpl = globalThis.fetch
}) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('PIXABAY_API_KEY fehlt. Lege ihn lokal in .env ab.');
  if (!query || !String(query).trim()) throw new Error('Eine Suchanfrage ist erforderlich.');
  if (!['video', 'image'].includes(type)) throw new Error('type muss video oder image sein.');
  if (!Number.isInteger(page) || page < 1) throw new Error('page muss eine positive Ganzzahl sein.');
  if (!Number.isInteger(perPage) || perPage < 3 || perPage > 200) throw new Error('perPage muss zwischen 3 und 200 liegen.');

  const url = new URL(type === 'video' ? VIDEO_API : IMAGE_API);
  url.searchParams.set('key', String(apiKey).trim());
  url.searchParams.set('q', String(query).trim().slice(0, 100));
  url.searchParams.set('lang', language);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('safesearch', 'true');
  url.searchParams.set('order', 'popular');
  if (type === 'image') url.searchParams.set('image_type', 'photo');

  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const body = await safeText(response);
    throw new Error(`Pixabay-Anfrage fehlgeschlagen (${response.status}).${body ? ` ${body.slice(0, 300)}` : ''}`);
  }
  const payload = await response.json();
  let assets = (payload.hits || []).map(type === 'video' ? normalizeVideo : normalizeImage);
  if (orientation) assets = assets.filter((asset) => asset.orientation === normalizeOrientation(orientation));

  return {
    provider: 'pixabay',
    query: String(query).trim(),
    type,
    page,
    per_page: perPage,
    total_results: payload.totalHits ?? assets.length,
    fetched_at: new Date().toISOString(),
    assets
  };
}

function normalizeVideo(hit) {
  const downloads = Object.entries(hit.videos || {})
    .filter(([, value]) => value?.url)
    .map(([quality, value]) => ({
      quality,
      url: value.url,
      width: value.width ?? null,
      height: value.height ?? null,
      size: value.size ?? null,
      file_type: 'video/mp4',
      preview_url: value.thumbnail ?? null
    }));
  const preferred = downloads.find((item) => item.quality === 'medium') || downloads[0] || {};
  return {
    provider: 'pixabay',
    provider_id: String(hit.id),
    type: 'video',
    title: titleFromTags(hit.tags, `Pixabay Video ${hit.id}`),
    description: hit.tags || null,
    source_url: hit.pageURL,
    creator: hit.user || null,
    creator_url: hit.user && hit.user_id ? `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` : null,
    width: preferred.width ?? null,
    height: preferred.height ?? null,
    duration_seconds: hit.duration ?? null,
    orientation: inferOrientation(preferred.width, preferred.height),
    preview_url: preferred.preview_url ?? null,
    tags: splitTags(hit.tags),
    downloads,
    rights: {
      license_status: 'licensed',
      license_code: 'pixabay-content-license',
      license_url: 'https://pixabay.com/service/license-summary/',
      attribution_required: false,
      attribution_text: hit.user ? `by ${hit.user} via Pixabay` : 'via Pixabay',
      suggested_scopes: ['organic-social', 'youtube', 'website', 'paid-ads', 'client-work'],
      suggested_status: 'approved'
    }
  };
}

function normalizeImage(hit) {
  const downloads = [
    hit.imageURL && { quality: 'original', url: hit.imageURL, width: hit.imageWidth, height: hit.imageHeight, size: hit.imageSize, file_type: 'image/jpeg' },
    hit.fullHDURL && { quality: 'fullhd', url: hit.fullHDURL, width: Math.min(hit.imageWidth || 1920, 1920), height: null, size: null, file_type: 'image/jpeg' },
    hit.largeImageURL && { quality: 'large', url: hit.largeImageURL, width: Math.min(hit.imageWidth || 1280, 1280), height: null, size: null, file_type: 'image/jpeg' },
    hit.webformatURL && { quality: 'web', url: hit.webformatURL, width: hit.webformatWidth, height: hit.webformatHeight, size: null, file_type: 'image/jpeg' }
  ].filter(Boolean);
  return {
    provider: 'pixabay',
    provider_id: String(hit.id),
    type: 'image',
    title: titleFromTags(hit.tags, `Pixabay Bild ${hit.id}`),
    description: hit.tags || null,
    source_url: hit.pageURL,
    creator: hit.user || null,
    creator_url: hit.user && hit.user_id ? `https://pixabay.com/users/${encodeURIComponent(hit.user)}-${hit.user_id}/` : null,
    width: hit.imageWidth ?? null,
    height: hit.imageHeight ?? null,
    duration_seconds: null,
    orientation: inferOrientation(hit.imageWidth, hit.imageHeight),
    preview_url: hit.previewURL || hit.webformatURL || null,
    tags: splitTags(hit.tags),
    downloads,
    rights: {
      license_status: 'licensed',
      license_code: 'pixabay-content-license',
      license_url: 'https://pixabay.com/service/license-summary/',
      attribution_required: false,
      attribution_text: hit.user ? `by ${hit.user} via Pixabay` : 'via Pixabay',
      suggested_scopes: ['organic-social', 'youtube', 'website', 'paid-ads', 'client-work'],
      suggested_status: 'approved'
    }
  };
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
function splitTags(value) { return String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean); }
function titleFromTags(value, fallback) { return splitTags(value).slice(0, 4).join(' · ') || fallback; }
async function safeText(response) { try { return await response.text(); } catch { return ''; } }
