const API = 'https://www.wikidata.org/w/api.php';

export async function expandEntityQuery(query, { languages = ['de', 'en'], limit = 3, fetchImpl = fetch } = {}) {
  const input = String(query || '').trim();
  if (!input) throw new Error('Wikidata-Erweiterung benötigt einen Suchbegriff.');
  const searchLanguage = languages[0] || 'en';
  const searchParams = new URLSearchParams({
    action: 'wbsearchentities',
    search: input,
    language: searchLanguage,
    uselang: searchLanguage,
    type: 'item',
    limit: String(Math.max(1, Math.min(10, Number(limit) || 3))),
    format: 'json',
    origin: '*'
  });
  const searchResponse = await fetchImpl(`${API}?${searchParams}`, { headers: headers() });
  if (!searchResponse.ok) throw new Error(`Wikidata-Suche fehlgeschlagen (${searchResponse.status}).`);
  const searchPayload = await searchResponse.json();
  const hits = Array.isArray(searchPayload.search) ? searchPayload.search : [];
  const ids = hits.map((hit) => hit.id).filter(Boolean).slice(0, Math.max(1, Math.min(10, Number(limit) || 3)));
  if (!ids.length) return { query: input, entities: [], variants: [input] };

  const entityParams = new URLSearchParams({
    action: 'wbgetentities',
    ids: ids.join('|'),
    props: 'labels|aliases|descriptions|sitelinks',
    languages: languages.join('|'),
    format: 'json',
    formatversion: '2',
    origin: '*'
  });
  const entityResponse = await fetchImpl(`${API}?${entityParams}`, { headers: headers() });
  if (!entityResponse.ok) throw new Error(`Wikidata-Entitäten konnten nicht geladen werden (${entityResponse.status}).`);
  const entityPayload = await entityResponse.json();
  const entities = [];
  for (const entity of entityPayload.entities || []) {
    if (!entity?.id || entity.missing) continue;
    const labels = languageValues(entity.labels, languages);
    const aliases = aliasValues(entity.aliases, languages);
    const descriptions = languageValues(entity.descriptions, languages);
    const sitelinks = [entity.sitelinks?.dewiki?.title, entity.sitelinks?.enwiki?.title].filter(Boolean);
    entities.push({
      id: entity.id,
      url: `https://www.wikidata.org/wiki/${entity.id}`,
      labels,
      aliases,
      descriptions,
      sitelinks
    });
  }
  const variants = unique([
    input,
    ...entities.flatMap((entity) => [...entity.labels, ...entity.aliases, ...entity.sitelinks])
  ]).filter((value) => value.length >= 2).slice(0, 18);
  return { query: input, entities, variants };
}

function languageValues(map, languages) {
  if (!map || typeof map !== 'object') return [];
  return languages.map((language) => map[language]?.value).filter(Boolean);
}
function aliasValues(map, languages) {
  if (!map || typeof map !== 'object') return [];
  return languages.flatMap((language) => (map[language] || []).map((item) => item?.value).filter(Boolean));
}
function unique(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value || '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}
function headers() { return { 'User-Agent': 'Visual-Asset-Hub/0.11 documentary research', Accept: 'application/json' }; }
