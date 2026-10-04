const API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'Visual-Asset-Hub/0.9 (https://github.com/memetreza34-ux/Visual-Asset-Hub; documentary research)';
const USABLE_MIME = /^(image\/(jpeg|png|webp|tiff)|video\/(webm|mp4))$/i;

export async function searchWikimedia({ query, type = 'image', orientation, page = 1, perPage = 20, thumbWidth = 1920, fetchImpl = globalThis.fetch }) {
  if (!query?.trim()) throw new Error('Wikimedia-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('Wikimedia unterstützt image oder video.');
  const limit = clamp(perPage, 1, 25);
  const offset = Math.max(0, (Math.max(1, Number(page) || 1) - 1) * limit);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    // filetype:bitmap schließt SVG-Logos, Zeichnungen und PDFs bereits in der Suche aus.
    gsrsearch: `${query.trim()} filetype:${type === 'video' ? 'video' : 'bitmap'}`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    gsroffset: String(offset),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(thumbWidth),
    origin: '*'
  });
  const response = await fetchImpl(`${API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Wikimedia-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const pages = [...(payload.query?.pages || [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const assets = pages
    .map(normalizePage)
    .filter(Boolean)
    .filter((asset) => asset.type === type)
    .filter((asset) => matchesOrientation(asset, orientation));
  return {
    provider: 'wikimedia',
    query: query.trim(),
    type,
    page: Math.max(1, Number(page) || 1),
    per_page: limit,
    total_results: payload.query?.searchinfo?.totalhits ?? null,
    next_page: payload.continue ? Math.max(1, Number(page) || 1) + 1 : null,
    fetched_at: new Date().toISOString(),
    assets
  };
}

export function normalizePage(page) {
  const info = page?.imageinfo?.[0];
  if (!info?.url || !info.mime || !USABLE_MIME.test(info.mime)) return null;
  const type = String(info.mime).startsWith('video/') ? 'video' : 'image';
  const meta = info.extmetadata || {};
  const licenseName = text(meta.LicenseShortName) || text(meta.UsageTerms) || 'unknown';
  const licenseUrl = text(meta.LicenseUrl) || null;
  const rights = mapRights(licenseName, licenseUrl);
  const creator = stripHtml(text(meta.Artist) || text(meta.Credit) || '') || 'Wikimedia Commons contributor';
  const description = stripHtml(text(meta.ImageDescription) || text(meta.ObjectName) || '');
  const title = String(page.title || '').replace(/^File:/i, '');
  const downloads = [];
  // Für Bilder zuerst das serverseitig skalierte JPEG/PNG (spart Bandbreite, wandelt TIFF um).
  if (type === 'image' && info.thumburl && info.thumburl !== info.url) {
    downloads.push({
      quality: `${info.thumbwidth ?? 'thumb'}w`,
      url: info.thumburl,
      width: Number(info.thumbwidth) || null,
      height: Number(info.thumbheight) || null,
      size: null,
      file_type: mimeFromUrl(info.thumburl, 'image/jpeg')
    });
  }
  if (!/tiff/i.test(info.mime)) {
    downloads.push({
      quality: 'original',
      url: info.url,
      width: Number(info.width) || null,
      height: Number(info.height) || null,
      size: Number(info.size) || null,
      file_type: info.mime
    });
  }
  if (!downloads.length) return null;
  return {
    provider: 'wikimedia',
    provider_id: String(page.pageid ?? page.title),
    type,
    title,
    description: description || null,
    source_url: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title || '').replace(/ /g, '_'))}`,
    creator,
    creator_url: null,
    width: Number(info.width) || null,
    height: Number(info.height) || null,
    duration_seconds: Number(info.duration) || null,
    orientation: orientationFor(info.width, info.height),
    preview_url: info.thumburl || info.url,
    tags: [],
    downloads,
    rights: {
      ...rights,
      license_code: licenseName,
      license_url: licenseUrl,
      attribution_text: rights.attribution_required ? `„${title}“ von ${creator}, ${licenseName}, via Wikimedia Commons` : null
    }
  };
}

export function mapRights(name, url) {
  const value = `${name || ''} ${url || ''}`.toLowerCase();
  if (/noncommercial|by-nc|no derivatives|by-nd/.test(value)) {
    return { license_status: 'restricted', attribution_required: true, share_alike: false, warning: 'Lizenz verbietet kommerzielle Nutzung oder Bearbeitung – nicht für YouTube freigeben.' };
  }
  if (/public domain|cc0|zero\/1\.0|\bpd\b|pd-/.test(value)) return { license_status: 'public-domain', attribution_required: false, share_alike: false };
  if (/cc[\s-]*by[\s-]*sa|creativecommons\.org\/licenses\/by-sa\//.test(value)) {
    return { license_status: 'cc-by', attribution_required: true, share_alike: true, warning: 'CC BY-SA: Credit nennen; Weitergabe unter gleichen Bedingungen vor Veröffentlichung prüfen.' };
  }
  if (/cc[\s-]*by|creativecommons\.org\/licenses\/by\//.test(value)) return { license_status: 'cc-by', attribution_required: true, share_alike: false };
  return { license_status: 'unknown', attribution_required: true, share_alike: false, warning: 'Wikimedia-Lizenz unklar – vor Veröffentlichung manuell prüfen.' };
}

function text(value) { return typeof value?.value === 'string' ? value.value : typeof value === 'string' ? value : ''; }
function stripHtml(value) { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim(); }
function orientationFor(width, height) { const w = Number(width), h = Number(height); if (!w || !h) return 'unknown'; if (Math.abs(w - h) / Math.max(w, h) < 0.08) return 'square'; return w > h ? 'horizontal' : 'vertical'; }
function matchesOrientation(asset, orientation) { return !orientation || asset.orientation === 'unknown' || asset.orientation === normalizeOrientation(orientation); }
function normalizeOrientation(value) { const v = String(value).toLowerCase(); if (v === 'landscape') return 'horizontal'; if (v === 'portrait') return 'vertical'; return v; }
function mimeFromUrl(url, fallback) { const ext = String(url).split('?')[0].split('.').pop().toLowerCase(); return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : /^jpe?g$/.test(ext) ? 'image/jpeg' : fallback; }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
