const API = 'https://commons.wikimedia.org/w/api.php';

export async function searchWikimedia({ query, type = 'image', orientation, page = 1, perPage = 12, fetchImpl = fetch }) {
  if (!query?.trim()) throw new Error('Wikimedia-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('Wikimedia unterstützt image oder video.');
  const limit = clamp(perPage, 1, 25);
  const offset = Math.max(0, (Math.max(1, Number(page) || 1) - 1) * limit);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: query.trim(),
    gsrnamespace: '6',
    gsrlimit: String(limit),
    gsroffset: String(offset),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '960',
    origin: '*'
  });
  const response = await fetchImpl(`${API}?${params}`, {
    headers: { 'User-Agent': 'Visual-Asset-Hub/0.10 (documentary research; contact via repository)' }
  });
  if (!response.ok) throw new Error(`Wikimedia-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const assets = (payload.query?.pages || [])
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
    total_results: null,
    assets
  };
}

function normalizePage(page) {
  const info = page.imageinfo?.[0];
  if (!info?.url || !info.mime) return null;
  const type = String(info.mime).startsWith('video/') ? 'video' : String(info.mime).startsWith('image/') ? 'image' : null;
  if (!type) return null;
  const meta = info.extmetadata || {};
  const licenseName = text(meta.LicenseShortName) || text(meta.UsageTerms) || 'unknown';
  const licenseUrl = text(meta.LicenseUrl) || null;
  const rights = mapRights(licenseName, licenseUrl);
  const creator = stripHtml(text(meta.Artist) || text(meta.Credit) || 'Wikimedia Commons contributor');
  const description = stripHtml(text(meta.ImageDescription) || text(meta.ObjectName) || '');
  return {
    provider: 'wikimedia',
    provider_id: String(page.pageid ?? page.title),
    type,
    title: String(page.title || '').replace(/^File:/i, ''),
    description: description || null,
    source_url: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(page.title || '').replace(/ /g, '_'))}`,
    creator: creator || null,
    creator_url: null,
    width: Number(info.width) || null,
    height: Number(info.height) || null,
    duration_seconds: null,
    orientation: orientationFor(info.width, info.height),
    preview_url: info.thumburl || info.url,
    tags: [],
    downloads: [{
      quality: 'original',
      url: info.url,
      width: Number(info.width) || null,
      height: Number(info.height) || null,
      size: Number(info.size) || null,
      file_type: info.mime,
      preview_url: info.thumburl || null
    }],
    rights: {
      ...rights,
      license_code: licenseName,
      license_url: licenseUrl,
      attribution_text: rights.attribution_required ? `${creator || 'Wikimedia Commons contributor'} — ${page.title}` : null,
      suggested_scopes: rights.license_status === 'restricted' || rights.license_status === 'unknown' ? ['internal-only'] : ['youtube', 'organic-social', 'website'],
      suggested_status: rights.license_status === 'restricted' || rights.license_status === 'unknown' ? 'review' : 'approved',
      warning: rights.warning
    }
  };
}

function mapRights(name, url) {
  const value = `${name || ''} ${url || ''}`.toLowerCase();
  if (/public domain|cc0|zero\/1\.0|pd-/.test(value)) return { license_status: 'public-domain', attribution_required: false };
  if (/cc\s*by|creativecommons\.org\/licenses\/by\//.test(value) && !/by-nc|by-nd|noncommercial|no derivatives/.test(value)) {
    return { license_status: 'licensed', attribution_required: true };
  }
  if (/cc\s*by-sa|creativecommons\.org\/licenses\/by-sa\//.test(value)) return { license_status: 'licensed', attribution_required: true };
  if (/noncommercial|by-nc|no derivatives|by-nd/.test(value)) {
    return { license_status: 'restricted', attribution_required: true, warning: 'Lizenz enthält Bedingungen, die nicht automatisch für YouTube freigegeben werden.' };
  }
  return { license_status: 'unknown', attribution_required: true, warning: 'Wikimedia-Lizenz vor Veröffentlichung manuell prüfen.' };
}

function text(value) { return typeof value?.value === 'string' ? value.value : typeof value === 'string' ? value : ''; }
function stripHtml(value) { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim(); }
function orientationFor(width, height) { const w = Number(width), h = Number(height); if (!w || !h) return null; if (Math.abs(w - h) / Math.max(w, h) < 0.08) return 'square'; return w > h ? 'horizontal' : 'vertical'; }
function matchesOrientation(asset, orientation) { return !orientation || !asset.orientation || asset.orientation === orientation; }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
