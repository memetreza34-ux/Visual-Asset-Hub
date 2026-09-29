const BASE = 'https://api.europeana.eu/record/v2/search.json';
const SITE = 'https://www.europeana.eu';

export async function searchEuropeana({ apiKey, query, type = 'image', page = 1, perPage = 20, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('EUROPEANA_API_KEY fehlt. Kostenlosen Europeana-Key eintragen.');
  if (!query?.trim()) throw new Error('Europeana-Suche benötigt einen Suchbegriff.');
  if (!['image', 'video'].includes(type)) throw new Error('Europeana unterstützt image oder video.');

  const rows = clamp(perPage, 1, 50);
  const pageNumber = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams({
    wskey: apiKey,
    query: query.trim(),
    rows: String(rows),
    start: String((pageNumber - 1) * rows + 1),
    profile: 'rich',
    media: 'true'
  });
  params.append('qf', `TYPE:${type === 'video' ? 'VIDEO' : 'IMAGE'}`);
  const response = await fetchImpl(`${BASE}?${params}`, { headers: headers() });
  if (!response.ok) throw new Error(`Europeana-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const assets = (payload?.items || []).map((item) => normalizeItem(item, type)).filter(Boolean);

  return {
    provider: 'europeana',
    query: query.trim(),
    type,
    page: pageNumber,
    per_page: rows,
    total_results: Number(payload?.totalResults) || null,
    assets
  };
}

function normalizeItem(item, type) {
  const sourceUrl = sourceFor(item);
  if (!sourceUrl) return null;
  const preview = firstHttps(item?.edmPreview);
  const media = uniqueHttps([
    ...asArray(item?.edmIsShownBy),
    ...asArray(item?.edmObject),
    ...(type === 'image' ? asArray(item?.edmPreview) : [])
  ]);
  const downloads = media.filter((url) => likelyMedia(url, type) || url === preview).map((url, index) => ({
    quality: index === 0 && url !== preview ? 'original' : (url === preview ? 'preview' : 'archive'),
    url,
    width: null,
    height: null,
    size: null,
    file_type: mime(url, type),
    preview_url: preview || null
  }));
  if (!downloads.length) return null;

  const rightsUri = firstText(item?.rights) || firstText(item?.edmRights) || null;
  const rights = mapRights(rightsUri, item);
  const title = firstText(item?.title) || firstText(item?.dcTitle) || item?.id || 'Europeana item';
  const creator = firstText(item?.dcCreator) || firstText(item?.dataProvider) || firstText(item?.provider) || 'Europeana provider';

  return {
    provider: 'europeana',
    provider_id: String(item?.id || slugId(sourceUrl)),
    type,
    title,
    description: firstText(item?.dcDescription) || firstText(item?.description) || null,
    source_url: sourceUrl,
    creator,
    creator_url: firstHttps(item?.edmIsShownAt) || SITE,
    width: null,
    height: null,
    duration_seconds: null,
    orientation: null,
    preview_url: preview || downloads[0]?.preview_url || null,
    tags: uniqueStrings([
      ...asArray(item?.dcSubject),
      ...asArray(item?.what),
      ...asArray(item?.where),
      ...asArray(item?.year)
    ]).slice(0, 30),
    downloads,
    rights
  };
}

function sourceFor(item) {
  const shownAt = firstHttps(item?.edmIsShownAt);
  if (shownAt) return stripKey(shownAt);
  const id = String(item?.id || '').replace(/^\/+/, '');
  return id ? `${SITE}/item/${id}` : null;
}

function mapRights(uri, item) {
  const value = String(uri || '').toLowerCase();
  const provider = firstText(item?.dataProvider) || firstText(item?.provider) || 'Europeana provider';
  const base = {
    license_url: uri || 'https://www.europeana.eu/rights/',
    attribution_text: provider,
    suggested_status: 'review'
  };
  if (/creativecommons\.org\/publicdomain\/zero|creativecommons\.org\/publicdomain\/mark/.test(value)) {
    return {
      ...base,
      license_status: 'public-domain',
      license_code: /zero/.test(value) ? 'cc0-1.0' : 'public-domain',
      attribution_required: false,
      suggested_scopes: ['youtube', 'website', 'organic-social', 'client-work'],
      warning: 'Europeana meldet einen Public-Domain/CC0-Rechtehinweis. Vor Veröffentlichung Rechte-URI und Original-Datenprovider prüfen.'
    };
  }
  if (/creativecommons\.org\/licenses\//.test(value)) {
    const code = ccCode(value);
    const restricted = /-nc(?:-|$)|-nd(?:-|$)/.test(code);
    if (restricted) {
      return {
        ...base,
        license_status: 'restricted',
        license_code: code,
        attribution_required: true,
        suggested_scopes: ['internal-only'],
        warning: 'Diese Creative-Commons-Lizenz enthält NC und/oder ND. Sie wird für den normalen YouTube-Produktionsworkflow blockiert, bis eine bewusste Rechteprüfung etwas anderes ergibt.'
      };
    }
    return {
      ...base,
      license_status: 'licensed',
      license_code: code,
      attribution_required: true,
      suggested_scopes: ['youtube', 'website', 'organic-social', 'client-work'],
      warning: 'Europeana meldet eine offene Creative-Commons-Lizenz ohne erkannte NC/ND-Beschränkung. Exakte Version, Attribution und Original-Datenprovider trotzdem prüfen.'
    };
  }
  return {
    ...base,
    license_status: 'unknown',
    license_code: 'europeana-rights-review',
    attribution_required: true,
    suggested_scopes: ['internal-only'],
    warning: 'Europeana aggregiert Inhalte vieler Institutionen. Für dieses Item wurde keine eindeutig offene Standardlizenz erkannt; Original-Datenprovider prüfen.'
  };
}
function ccCode(value) {
  const match = value.match(/creativecommons\.org\/licenses\/([^/]+)\/([0-9.]+)/);
  return match ? `cc-${match[1]}-${match[2]}` : 'creative-commons';
}
function likelyMedia(url, type) {
  const p = safePath(url).toLowerCase();
  if (type === 'video') return /\.(mp4|webm|mov|m4v|mpg|mpeg|ogv)$/.test(p);
  return /\.(jpe?g|png|webp|gif|tiff?)$/.test(p) || /image|iiif|thumbnail|preview/i.test(url);
}
function mime(url, type) {
  const p = safePath(url).toLowerCase();
  if (p.endsWith('.mp4') || p.endsWith('.m4v')) return 'video/mp4';
  if (p.endsWith('.webm')) return 'video/webm';
  if (p.endsWith('.mov')) return 'video/quicktime';
  if (p.endsWith('.ogv')) return 'video/ogg';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  if (/\.tiff?$/.test(p)) return 'image/tiff';
  if (p.endsWith('.gif')) return 'image/gif';
  return type === 'video' ? 'video/mpeg' : 'image/jpeg';
}
function stripKey(value) {
  try {
    const url = new URL(value);
    url.searchParams.delete('wskey');
    return url.toString();
  } catch { return value; }
}
function firstHttps(value) { return uniqueHttps(asArray(value))[0] || null; }
function uniqueHttps(values) {
  const out = [];
  for (const value of values) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) continue;
    const normalized = stripKey(value.replace(/^http:\/\//i, 'https://'));
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out;
}
function firstText(value) { return asArray(value).find((v) => typeof v === 'string' && v.trim())?.trim() || null; }
function asArray(value) { return Array.isArray(value) ? value.flat(Infinity) : value == null ? [] : [value]; }
function uniqueStrings(values) { return [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))]; }
function safePath(value) { try { return new URL(value).pathname; } catch { return String(value).split('?')[0]; } }
function slugId(value) { return safePath(value).split('/').filter(Boolean).pop() || value; }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
function headers() { return { 'User-Agent': 'Visual-Asset-Hub/0.16 documentary research', Accept: 'application/json' }; }
