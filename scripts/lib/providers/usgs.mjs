const BASE = 'https://www.usgs.gov';
const RIGHTS_URL = 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits';

export async function searchUsgs({ query, type = 'image', page = 1, perPage = 20, fetchImpl = fetch }) {
  if (!query?.trim()) throw new Error('USGS-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('USGS unterstützt image oder video.');

  const section = type === 'video' ? 'videos' : 'images';
  const params = new URLSearchParams({ search_api_fulltext: query.trim() });
  const pageNumber = Math.max(1, Number(page) || 1);
  if (pageNumber > 1) params.set('page', String(pageNumber - 1));
  const searchUrl = `${BASE}/products/multimedia-gallery/${section}?${params}`;
  const response = await fetchImpl(searchUrl, { headers: headers('text/html') });
  if (!response.ok) throw new Error(`USGS-Multimedia-Suche fehlgeschlagen (${response.status}).`);
  const html = await response.text();
  const itemLinks = collectItemLinks(html, type).slice(0, clamp(perPage, 1, 30));
  const assets = [];

  for (const sourceUrl of itemLinks) {
    try {
      const detailResponse = await fetchImpl(sourceUrl, { headers: headers('text/html') });
      if (!detailResponse.ok) continue;
      const detailHtml = await detailResponse.text();
      const asset = normalizeDetail(sourceUrl, detailHtml, type);
      if (asset) assets.push(asset);
    } catch {
      // A single unavailable item must not break the complete provider search.
    }
  }

  return {
    provider: 'usgs',
    query: query.trim(),
    type,
    page: pageNumber,
    per_page: clamp(perPage, 1, 30),
    total_results: null,
    assets
  };
}

function normalizeDetail(sourceUrl, html, type) {
  const title = meta(html, 'og:title') || firstHeading(html) || slugLabel(sourceUrl);
  const description = meta(html, 'og:description') || extractDetailedDescription(html) || null;
  const preview = httpsUrl(meta(html, 'og:image'));
  const downloads = collectDownloads(html, type, preview);
  if (!downloads.length) return null;

  const publicDomain = /Sources\s*\/\s*Usage[\s\S]{0,1500}?Public\s+Domain\.?/i.test(html)
    || /\bPublic\s+Domain\.?\b/i.test(stripTags(html).slice(-5000));
  const creator = extractCreator(description, html) || 'U.S. Geological Survey';
  const rights = publicDomain
    ? {
        license_status: 'public-domain',
        license_code: 'usgs-public-domain',
        license_url: RIGHTS_URL,
        attribution_required: false,
        attribution_text: `U.S. Geological Survey${creator !== 'U.S. Geological Survey' ? ` — ${creator}` : ''}`,
        suggested_scopes: ['youtube', 'website', 'organic-social', 'client-work'],
        suggested_status: 'review',
        warning: 'USGS kennzeichnet dieses Multimedia-Item als Public Domain. Vor Veröffentlichung trotzdem Item-Seite auf Drittmaterial, Logos und abweichende Hinweise prüfen.'
      }
    : {
        license_status: 'unknown',
        license_code: 'usgs-rights-review',
        license_url: RIGHTS_URL,
        attribution_required: true,
        attribution_text: `U.S. Geological Survey${creator !== 'U.S. Geological Survey' ? ` — ${creator}` : ''}`,
        suggested_scopes: ['internal-only'],
        suggested_status: 'review',
        warning: 'USGS-Multimedia ist häufig Public Domain, kann aber Ausnahmen enthalten. Dieses Item besitzt keinen eindeutig erkannten Public-Domain-Hinweis und muss manuell geprüft werden.'
      };

  return {
    provider: 'usgs',
    provider_id: slugId(sourceUrl),
    type,
    title: decodeHtml(title),
    description: description ? decodeHtml(description) : null,
    source_url: sourceUrl,
    creator,
    creator_url: BASE,
    width: null,
    height: null,
    duration_seconds: null,
    orientation: null,
    preview_url: preview || downloads.find((item) => item.preview_url)?.preview_url || null,
    tags: [],
    downloads,
    rights
  };
}

function collectItemLinks(html, type) {
  const segment = type === 'video' ? '/media/videos/' : '/media/images/';
  const found = [];
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const url = absolute(match[1]);
    if (!url || !new URL(url).pathname.includes(segment)) continue;
    if (!found.includes(url)) found.push(url);
  }
  return found;
}

function collectDownloads(html, type, preview) {
  const found = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRe)) {
    const url = httpsUrl(decodeHtml(match[1]));
    if (!url || !matchesMedia(url, type)) continue;
    const label = stripTags(match[2]).trim().toLowerCase();
    found.push(download(url, quality(label, url), type, preview));
  }
  for (const match of html.matchAll(/https?:\/\/[^"'<>\s]+/gi)) {
    const url = httpsUrl(decodeHtml(match[0]));
    if (!url || !matchesMedia(url, type)) continue;
    found.push(download(url, quality('', url), type, preview));
  }
  if (type === 'image' && preview && matchesMedia(preview, 'image')) found.push(download(preview, 'preview', type, preview));
  return [...new Map(found.map((item) => [item.url, item])).values()].slice(0, 25);
}

function download(url, qualityValue, type, preview) {
  return {
    quality: qualityValue,
    url,
    width: null,
    height: null,
    size: null,
    file_type: mime(url, type),
    preview_url: preview || null
  };
}
function quality(label, url) {
  const text = `${label} ${url}`.toLowerCase();
  if (/\boriginal\b|full.?res|master/.test(text)) return 'original';
  if (/\bmedium\b/.test(text)) return 'medium';
  if (/thumbnail|\bthumb\b|small/.test(text)) return 'small';
  return 'archive';
}
function matchesMedia(url, type) {
  const pathname = safePath(url);
  if (type === 'video') return /\.(mp4|mov|m4v|webm|mpg|mpeg)(?:$|\?)/i.test(`${pathname}${new URL(url).search}`);
  return /\.(jpe?g|png|webp|tiff?|gif)(?:$|\?)/i.test(`${pathname}${new URL(url).search}`);
}
function mime(url, type) {
  const value = safePath(url).toLowerCase();
  if (value.endsWith('.mp4') || value.endsWith('.m4v')) return 'video/mp4';
  if (value.endsWith('.webm')) return 'video/webm';
  if (value.endsWith('.mov')) return 'video/quicktime';
  if (value.endsWith('.png')) return 'image/png';
  if (value.endsWith('.webp')) return 'image/webp';
  if (/\.tiff?$/.test(value)) return 'image/tiff';
  if (value.endsWith('.gif')) return 'image/gif';
  return type === 'video' ? 'video/mpeg' : 'image/jpeg';
}
function meta(html, property) {
  const safe = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${safe}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${safe}["']`, 'i')
  ];
  for (const pattern of patterns) { const match = html.match(pattern); if (match) return decodeHtml(match[1]); }
  return null;
}
function firstHeading(html) { const match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i); return match ? stripTags(match[1]).trim() : null; }
function extractDetailedDescription(html) {
  const match = html.match(/Detailed\s+Description[\s\S]{0,500}?<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return match ? stripTags(match[1]).trim() : null;
}
function extractCreator(description, html) {
  const text = `${description || ''} ${stripTags(html).slice(-8000)}`;
  const photo = text.match(/USGS\s+(?:photo|image|video)\s+by\s+([^.;<]+)/i);
  if (photo) return `USGS — ${photo[1].trim()}`;
  const by = text.match(/\bBy\s+([A-Z][A-Za-z .&'’\-]{2,80})(?:\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|\n)/);
  return by ? by[1].trim() : null;
}
function absolute(value) {
  if (!value) return null;
  try { return new URL(decodeHtml(value), BASE).toString().replace(/^http:\/\//i, 'https://'); } catch { return null; }
}
function httpsUrl(value) { if (!value) return null; try { const url = new URL(value, BASE); url.protocol = 'https:'; return url.toString(); } catch { return null; } }
function safePath(value) { try { return new URL(value).pathname; } catch { return String(value).split('?')[0]; } }
function slugId(url) { return safePath(url).split('/').filter(Boolean).pop() || url; }
function slugLabel(url) { return slugId(url).replace(/[-_]+/g, ' '); }
function stripTags(value) { return decodeHtml(String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')); }
function decodeHtml(value) { return String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/gi, '/'); }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
function headers(accept) { return { 'User-Agent': 'Visual-Asset-Hub/0.15 documentary research', Accept: accept }; }
