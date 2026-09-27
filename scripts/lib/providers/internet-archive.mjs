const SEARCH = 'https://archive.org/advancedsearch.php';
const META = 'https://archive.org/metadata';

export async function searchInternetArchive({ query, type = 'video', page = 1, perPage = 8, fetchImpl = fetch }) {
  if (!query?.trim()) throw new Error('Internet-Archive-Suche benötigt einen Suchbegriff.');
  if (!['video', 'image'].includes(type)) throw new Error('Internet Archive unterstützt hier video oder image.');
  const limit = clamp(perPage, 1, 12);
  const mediatype = type === 'video' ? 'movies' : 'image';
  const q = `(${escapeQuery(query.trim())}) AND mediatype:${mediatype}`;
  const params = new URLSearchParams({
    q,
    'fl[]': 'identifier,title,description,creator,licenseurl,rights,mediatype,date,downloads,collection',
    rows: String(limit),
    page: String(Math.max(1, Number(page) || 1)),
    output: 'json'
  });
  const response = await fetchImpl(`${SEARCH}?${params}`, { headers: userAgent() });
  if (!response.ok) throw new Error(`Internet-Archive-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const docs = payload.response?.docs || [];
  const assets = [];
  for (const doc of docs) {
    try {
      const metaResponse = await fetchImpl(`${META}/${encodeURIComponent(doc.identifier)}`, { headers: userAgent() });
      if (!metaResponse.ok) continue;
      const metadata = await metaResponse.json();
      const asset = normalizeItem(doc, metadata, type);
      if (asset) assets.push(asset);
    } catch {
      // One broken archive item must not break the entire research query.
    }
  }
  return {
    provider: 'internet-archive',
    query: query.trim(),
    type,
    page: Math.max(1, Number(page) || 1),
    per_page: limit,
    total_results: Number(payload.response?.numFound) || null,
    assets
  };
}

function normalizeItem(doc, metadata, type) {
  const files = Array.isArray(metadata.files) ? metadata.files : [];
  const candidates = files
    .filter((file) => file?.name && String(file.source || '').toLowerCase() !== 'derivative' ? true : isUsefulDerivative(file, type))
    .filter((file) => matchesType(file, type))
    .map((file) => toDownload(doc.identifier, file, type))
    .filter(Boolean)
    .sort((a, b) => downloadScore(b, type) - downloadScore(a, type));
  if (!candidates.length) return null;
  const meta = metadata.metadata || {};
  const licenseUrl = scalar(meta.licenseurl) || scalar(doc.licenseurl) || null;
  const rightsText = scalar(meta.rights) || scalar(doc.rights) || '';
  const rights = mapRights(licenseUrl, rightsText);
  const creator = scalar(meta.creator) || scalar(doc.creator) || null;
  const title = scalar(meta.title) || scalar(doc.title) || doc.identifier;
  const description = stripHtml(scalar(meta.description) || scalar(doc.description) || '');
  return {
    provider: 'internet-archive',
    provider_id: doc.identifier,
    type,
    title,
    description: description || null,
    source_url: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
    creator,
    creator_url: null,
    width: candidates[0]?.width || null,
    height: candidates[0]?.height || null,
    duration_seconds: null,
    orientation: null,
    preview_url: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
    tags: array(meta.subject).slice(0, 20),
    downloads: candidates.slice(0, 8),
    rights: {
      ...rights,
      license_code: inferLicenseCode(licenseUrl, rightsText),
      license_url: licenseUrl,
      attribution_text: rights.attribution_required ? `${creator || 'Internet Archive contributor'} — ${title}` : null,
      suggested_scopes: rights.license_status === 'restricted' || rights.license_status === 'unknown' ? ['internal-only'] : ['youtube', 'organic-social', 'website'],
      suggested_status: rights.license_status === 'restricted' || rights.license_status === 'unknown' ? 'review' : 'approved',
      warning: rights.warning || (!licenseUrl && !rightsText ? 'Internet Archive hostet Material mit unterschiedlichen Rechten. Rechte vor Veröffentlichung prüfen.' : undefined)
    }
  };
}

function matchesType(file, type) {
  const name = String(file.name || '').toLowerCase();
  const format = String(file.format || '').toLowerCase();
  if (type === 'video') return /\.(mp4|m4v|ogv|webm|mov|mpeg|mpg)$/.test(name) || /mpeg4|h\.264|matroska|webm|quicktime|mpeg/.test(format);
  return /\.(jpe?g|png|webp|tif|tiff)$/.test(name) || /jpeg|png|webp|image/.test(format);
}
function isUsefulDerivative(file, type) {
  const name = String(file.name || '').toLowerCase();
  if (type === 'video') return /\.(mp4|ogv|webm)$/.test(name);
  return /\.(jpe?g|png|webp)$/.test(name) && !/thumb|spectrogram|waveform/.test(name);
}
function toDownload(identifier, file, type) {
  const name = String(file.name || '');
  const encoded = name.split('/').map(encodeURIComponent).join('/');
  const mime = mimeFor(name, type);
  return {
    quality: String(file.format || file.source || 'archive'),
    url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encoded}`,
    width: Number(file.width) || null,
    height: Number(file.height) || null,
    size: Number(file.size) || null,
    file_type: mime,
    preview_url: `https://archive.org/services/img/${encodeURIComponent(identifier)}`
  };
}
function downloadScore(item, type) {
  const name = String(item.url || '').toLowerCase();
  let score = 0;
  if (type === 'video') {
    if (name.endsWith('.mp4')) score += 1000;
    if (name.endsWith('.webm')) score += 700;
    if (name.endsWith('.ogv')) score += 500;
  } else {
    if (/\.jpe?g$/.test(name)) score += 900;
    if (name.endsWith('.png')) score += 800;
  }
  score += Math.min(Number(item.size || 0) / 1_000_000, 500);
  return score;
}
function mapRights(url, rightsText) {
  const value = `${url || ''} ${rightsText || ''}`.toLowerCase();
  if (/public domain|creativecommons\.org\/publicdomain|cc0/.test(value)) return { license_status: 'public-domain', attribution_required: false };
  if (/creativecommons\.org\/licenses\/by-sa\//.test(value) || /cc by-sa/.test(value)) return { license_status: 'licensed', attribution_required: true };
  if (/creativecommons\.org\/licenses\/by\//.test(value) || /cc by(\s|$)/.test(value)) return { license_status: 'licensed', attribution_required: true };
  if (/by-nc|noncommercial|by-nd|no derivatives/.test(value)) return { license_status: 'restricted', attribution_required: true, warning: 'Lizenzbedingungen sind für automatische YouTube-Freigabe zu restriktiv.' };
  return { license_status: 'unknown', attribution_required: true, warning: 'Rechte dieses Internet-Archive-Items müssen vor Veröffentlichung manuell geprüft werden.' };
}
function inferLicenseCode(url, text) {
  const value = `${url || ''} ${text || ''}`.toLowerCase();
  if (/cc0|publicdomain\/zero/.test(value)) return 'CC0';
  if (/public domain/.test(value)) return 'public-domain';
  if (/by-sa/.test(value)) return 'CC-BY-SA';
  if (/\/by\//.test(value) || /cc by/.test(value)) return 'CC-BY';
  return null;
}
function escapeQuery(value) { return value.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim(); }
function scalar(value) { return Array.isArray(value) ? String(value[0] ?? '') : value == null ? '' : String(value); }
function array(value) { return Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)]; }
function stripHtml(value) { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
function mimeFor(name, type) { const value = name.toLowerCase(); if (value.endsWith('.mp4') || value.endsWith('.m4v')) return 'video/mp4'; if (value.endsWith('.webm')) return 'video/webm'; if (value.endsWith('.ogv')) return 'video/ogg'; if (value.endsWith('.png')) return 'image/png'; if (value.endsWith('.webp')) return 'image/webp'; if (/\.jpe?g$/.test(value)) return 'image/jpeg'; return type === 'video' ? 'video/mp4' : 'image/jpeg'; }
function clamp(value, min, max) { const n = Number(value) || min; return Math.min(max, Math.max(min, Math.trunc(n))); }
function userAgent() { return { 'User-Agent': 'Visual-Asset-Hub/0.10 documentary research', Accept: 'application/json' }; }
