const LOC_ROOT = 'https://www.loc.gov';

export async function searchLibraryOfCongress({
  query,
  type = 'photo',
  page = 1,
  perPage = 8,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!query || !String(query).trim()) throw new Error('Library-of-Congress-Suchanfrage fehlt.');
  if (typeof fetchImpl !== 'function') throw new Error('fetch ist nicht verfügbar.');
  const endpoint = type === 'video' ? 'film-and-videos' : 'photos';
  const url = new URL(`${LOC_ROOT}/${endpoint}/`);
  url.searchParams.set('q', String(query).trim());
  url.searchParams.set('fo', 'json');
  url.searchParams.set('c', String(Math.max(1, Math.min(20, Number(perPage) || 8))));
  url.searchParams.set('sp', String(Math.max(1, Number(page) || 1)));

  const response = await fetchImpl(url, {headers: {Accept: 'application/json'}});
  if (!response.ok) throw new Error(`Library-of-Congress-Suche fehlgeschlagen (${response.status}).`);
  const payload = await response.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const assets = [];

  for (const result of results.slice(0, perPage)) {
    const sourceUrl = httpsUrl(result?.id || result?.url || '');
    if (!sourceUrl) continue;
    const previews = Array.isArray(result?.image_url) ? result.image_url.filter(Boolean) : [];
    const preview = previews.at(-1) || previews[0] || '';
    let mediaUrl = type === 'video' ? '' : preview;
    let detail = null;
    if (type === 'video' || !mediaUrl) {
      try {
        detail = await fetchLocDetail(sourceUrl, fetchImpl);
        mediaUrl = chooseMediaUrl(detail, type) || mediaUrl;
      } catch {}
    }
    if (!mediaUrl) continue;

    const rightsText = flattenText([
      result?.rights,
      result?.rights_advisory,
      detail?.item?.rights,
      detail?.item?.rights_advisory
    ]);
    const license = classifyRights(rightsText);
    const contributors = Array.isArray(result?.contributor) ? result.contributor : [];

    assets.push({
      provider: 'loc',
      provider_id: String(result?.item_id || result?.id || sourceUrl),
      type: type === 'video' ? 'video' : 'image',
      title: result?.title || 'Library of Congress item',
      description: flattenText(result?.description),
      tags: [...(result?.subject ?? []), ...(result?.partof ?? [])].filter(Boolean),
      date: result?.date || null,
      creator: contributors[0] || '',
      source_url: sourceUrl,
      preview_url: preview || mediaUrl,
      files: {original: mediaUrl, medium: preview || mediaUrl},
      width: null,
      height: null,
      duration_seconds: null,
      orientation: 'unknown',
      license,
      rights_text: rightsText,
      attribution: contributors[0] ? `${contributors[0]} / Library of Congress` : 'Library of Congress',
      source_name: 'Library of Congress'
    });
  }

  return {
    provider: 'loc',
    query: String(query).trim(),
    type,
    page,
    per_page: perPage,
    total_results: Number(payload?.pagination?.total) || assets.length,
    fetched_at: new Date().toISOString(),
    assets
  };
}

async function fetchLocDetail(sourceUrl, fetchImpl) {
  const url = new URL(sourceUrl);
  url.protocol = 'https:';
  url.searchParams.set('fo', 'json');
  const response = await fetchImpl(url, {headers: {Accept: 'application/json'}});
  if (!response.ok) return null;
  return response.json();
}

function chooseMediaUrl(detail, type) {
  const urls = [];
  collectUrls(detail?.resources, urls);
  collectUrls(detail?.resource, urls);
  const unique = [...new Set(urls.map(httpsUrl).filter(Boolean))];
  if (type === 'video') {
    return unique.find((url) => /\.(?:mp4)(?:\?|$)/i.test(url))
      || unique.find((url) => /\.(?:webm|mov|m4v)(?:\?|$)/i.test(url))
      || '';
  }
  return unique.find((url) => /\.(?:jpg|jpeg|png|webp|tif|tiff)(?:\?|$)/i.test(url)) || '';
}

function collectUrls(value, output) {
  if (!value) return;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, output);
    return;
  }
  if (typeof value === 'object') {
    for (const child of Object.values(value)) collectUrls(child, output);
  }
}

function classifyRights(value) {
  const text = String(value || '').toLowerCase();
  if (/public domain|gemeinfrei/.test(text)) return 'public-domain';
  if (/no known restrictions|keine bekannten beschränkungen/.test(text)) return 'no-known-restrictions';
  return 'loc-rights-review';
}

function flattenText(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(flattenText).filter(Boolean).join(' ');
  if (typeof value === 'object') return Object.values(value).map(flattenText).filter(Boolean).join(' ');
  return String(value).replace(/\s+/g, ' ').trim();
}

function httpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return '';
  }
}
