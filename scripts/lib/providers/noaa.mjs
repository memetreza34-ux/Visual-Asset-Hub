const BASE = 'https://www.noaa.gov';
const RIGHTS_URL = 'https://www.noaa.gov/disclaimer';

export async function searchNoaa({ query, type = 'image', page = 1, perPage = 20, fetchImpl = fetch }) {
  if (!query?.trim()) throw new Error('NOAA-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('NOAA unterstützt image oder video.');

  const pageNumber = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams({ search_api_fulltext: query.trim() });
  if (pageNumber > 1) params.set('page', String(pageNumber - 1));
  const searchUrl = `${BASE}/search?${params}`;
  const response = await fetchImpl(searchUrl, { headers: headers('text/html') });
  if (!response.ok) throw new Error(`NOAA-Suche fehlgeschlagen (${response.status}).`);
  const html = await response.text();
  const links = collectOfficialLinks(html, query).slice(0, Math.min(clamp(perPage, 1, 30) * 2, 40));
  const assets = [];

  for (const sourceUrl of links) {
    try {
      const detailResponse = await fetchImpl(sourceUrl, { headers: headers('text/html') });
      if (!detailResponse.ok) continue;
      const detailHtml = await detailResponse.text();
      const asset = normalizeDetail(sourceUrl, detailHtml, type);
      if (asset) assets.push(asset);
      if (assets.length >= clamp(perPage, 1, 30)) break;
    } catch {
      // Keep the provider resilient when individual NOAA pages are unavailable.
    }
  }

  return {
    provider: 'noaa',
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
  const description = meta(html, 'og:description') || meta(html, 'description') || null;
  const preview = httpsUrl(meta(html, 'og:image'));
  const downloads = collectDownloads(html, type, preview);
  if (!downloads.length) return null;

  return {
    provider: 'noaa',
    provider_id: slugId(sourceUrl),
    type,
    title: decodeHtml(title),
    description: description ? decodeHtml(description) : null,
    source_url: sourceUrl,
    creator: 'National Oceanic and Atmospheric Administration (NOAA)',
    creator_url: BASE,
    width: null,
    height: null,
    duration_seconds: null,
    orientation: null,
    preview_url: preview || null,
    tags: [],
    downloads,
    rights: {
      license_status: 'unknown',
      license_code: 'noaa-media-review',
      license_url: RIGHTS_URL,
      attribution_required: true,
      attribution_text: 'NOAA',
      suggested_scopes: ['internal-only'],
      suggested_status: 'review',
      warning: 'NOAA ist eine offizielle US-Regierungsquelle, einzelne Seiten können aber Drittmaterial, Logos oder abweichende Rechtehinweise enthalten. Vor YouTube-Nutzung muss die konkrete Quellseite geprüft werden.'
    }
  };
}

function collectOfficialLinks(html, query) {
  const terms = tokens(query);
  const found = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRe)) {
    const url = absolute(match[1]);
    if (!url) continue;
    let parsed;
    try { parsed = new URL(url); } catch { continue; }
    if (parsed.hostname !== 'www.noaa.gov' && parsed.hostname !== 'noaa.gov') continue;
    if (/^\/(search|about-our-agency|contact-us|privacy|disclaimer)\/?/i.test(parsed.pathname)) continue;
    const label = stripTags(match[2]).toLowerCase();
    const haystack = `${label} ${parsed.pathname}`.toLowerCase();
    const matched = terms.filter((term) => haystack.includes(term)).length;
    if (terms.length && matched === 0) continue;
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
  if (/\bmedium\b|large|high.?res/.test(text)) return 'large';
  if (/thumbnail|\bthumb\b|small/.test(text)) return 'small';
  return 'official';
}
function matchesMedia(url, type) {
  const value = safePath(url).toLowerCase();
  if (type === 'video') return /\.(mp4|mov|m4v|webm|mpg|mpeg)$/.test(value);
  return /\.(jpe?g|png|webp|tiff?|gif)$/.test(value);
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
function absolute(value) { if (!value) return null; try { return new URL(decodeHtml(value), BASE).toString().replace(/^http:\/\//i, 'https://'); } catch { return null; } }
function httpsUrl(value) { if (!value) return null; try { const url = new URL(value, BASE); url.protocol = 'https:'; return url.toString(); } catch { return null; } }
function safePath(value) { try { return new URL(value).pathname; } catch { return String(value).split('?')[0]; } }
function slugId(url) { return safePath(url).split('/').filter(Boolean).pop() || url; }
function slugLabel(url) { return slugId(url).replace(/[-_]+/g, ' '); }
function stripTags(value) { return decodeHtml(String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')); }
function decodeHtml(value) { return String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/gi, '/'); }
function tokens(value) { return [...new Set(String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((item) => item.length >= 3))].slice(0, 12); }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
function headers(accept) { return { 'User-Agent': 'Visual-Asset-Hub/0.15 documentary research', Accept: accept }; }
