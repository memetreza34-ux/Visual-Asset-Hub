// Echte Screenshots, Interfaces und Originaldokumente gibt es in freien Archiven kaum rechtssicher.
const MANUAL_SOURCE_REASONS = new Set([
  'original-interface-or-document'
]);

// Exakte Marken, Produkte, Ereignisse und Geschichte: nur in Archiven suchen (nie Stock) und immer reviewen.
const ARCHIVE_SOURCE_REASONS = new Set([
  'real-event-authenticity',
  'exact-brand-or-product',
  'historical-evidence'
]);

const USABLE_LICENSES = new Set(['licensed', 'cc0', 'public-domain', 'cc-by']);
const MIN_IMAGE_EDGE = 800;

const RELEVANCE_STOPWORDS = new Set([
  'the','and','with','from','into','onto','this','that','these','those','for','to','of','in','on','at','by','a','an',
  'realistic','b','roll','close','detail','wide','establishing','shot','person','using','regional','next',
  'der','die','das','den','dem','des','ein','eine','einer','einem','einen','und','oder','aber','mit','von','zu','im','in','am','an','auf','fur','fuer','bei','durch'
]);

const RELEVANCE_SYNONYMS = {
  package: ['parcel','shipment','box'],
  packages: ['parcel','parcels','shipment','shipments','box','boxes'],
  parcel: ['package','shipment','box'],
  parcels: ['package','packages','shipment','shipments','boxes'],
  truck: ['lorry','freight','semi','tractor','delivery'],
  delivery: ['courier','shipping','shipment','truck','van'],
  van: ['delivery','courier','vehicle'],
  vehicle: ['car','van','truck','lorry'],
  conveyor: ['belt','sorting','lane'],
  belt: ['conveyor','sorting','lane'],
  sorting: ['sort','parcel','package','conveyor','lane'],
  warehouse: ['depot','distribution','fulfillment','logistics'],
  traffic: ['street','road','highway','cars','vehicles'],
  street: ['road','traffic','highway'],
  road: ['street','traffic','highway'],
  driving: ['moving','road','street','highway'],
  loading: ['dock','warehouse','freight'],
  dock: ['loading','warehouse','freight']
};

const SYNTHETIC_MEDIA_PATTERN = /\b(animation|animated|cgi|3d render|3d animation|rendered|motion graphics|cartoon)\b/i;

export function realMediaPolicy(item) {
  const reason = String(item?.reason ?? '');
  if (MANUAL_SOURCE_REASONS.has(reason)) {
    return {
      auto_search: false,
      auto_download: false,
      requires_exact_source: true,
      review_required: true,
      source_tier: null,
      reason
    };
  }

  if (ARCHIVE_SOURCE_REASONS.has(reason)) {
    return {
      auto_search: true,
      auto_download: true,
      requires_exact_source: true,
      review_required: true,
      source_tier: 'archive',
      reason
    };
  }

  return {
    auto_search: true,
    auto_download: true,
    requires_exact_source: false,
    review_required: reason === 'identifiable-real-location',
    source_tier: 'stock',
    reason
  };
}

/** Nur Treffer mit YouTube-tauglicher Lizenz und brauchbarer Auflösung kommen in die Auswahl. */
export function isUsableCandidate(asset) {
  const status = asset?.rights?.license_status;
  if (status && !USABLE_LICENSES.has(status)) return false;
  if (asset?.type === 'image') {
    const { width, height } = bestResolution(asset);
    const longest = Math.max(width, height);
    if (longest > 0 && longest < MIN_IMAGE_EDGE) return false;
  }
  return true;
}

/** Jeder Begriff (z. B. "Nokia" oder "Windows Phone") muss vollständig im Titel/Beschreibung/Tags vorkommen. */
export function matchesRequiredTerms(asset, terms = []) {
  if (!terms?.length) return true;
  const haystack = ` ${normalizeForRelevance(assetText(asset))} `;
  return terms.some((term) => {
    const tokens = normalizeForRelevance(term).split(' ').filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => haystack.includes(` ${token} `));
  });
}

export function mergeRealCandidate(map, asset, query, page = 1) {
  const key = `${asset.provider ?? 'unknown'}:${asset.type}:${asset.provider_id}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      ...asset,
      matched_queries: [query],
      occurrences: 1,
      first_seen_page: page
    });
    return;
  }
  existing.occurrences += 1;
  existing.first_seen_page = Math.min(existing.first_seen_page, page);
  if (!existing.matched_queries.includes(query)) existing.matched_queries.push(query);
}

export function isSyntheticMediaCandidate(asset) {
  return SYNTHETIC_MEDIA_PATTERN.test(`${asset?.title ?? ''} ${asset?.source_url ?? ''}`);
}

function assetText(asset) {
  return `${asset?.title ?? ''} ${asset?.description ?? ''} ${(asset?.tags ?? []).join(' ')} ${asset?.source_url ?? ''}`;
}

export function requiredConceptGroups(asset) {
  const queryText = normalizeForRelevance((asset?.matched_queries ?? []).join(' '));
  const groups = [];
  if (queryText.includes('zustellfahrzeug') || queryText.includes('delivery van')) {
    groups.push([' van ', ' courier van ', ' delivery van ', ' delivery vehicle ']);
  }
  if (queryText.includes('lastwagen') || queryText.includes('delivery truck')) {
    groups.push([' truck ', ' lorry ', ' semi truck ', ' freight truck ', ' tractor trailer ']);
  }
  if (queryText.includes('fliessband') || queryText.includes('conveyor belt')) {
    groups.push([' conveyor ', ' conveyor belt ', ' sorting lane ', ' sorting conveyor ']);
  }
  return groups;
}

export function passesRequiredConcepts(asset) {
  const groups = requiredConceptGroups(asset);
  if (!groups.length) return true;
  const haystack = ` ${normalizeForRelevance(`${asset?.title ?? ''} ${asset?.source_url ?? ''}`)} `;
  return groups.every((group) => group.some((needle) => haystack.includes(needle)));
}

export function scoreRealCandidate(asset, { orientation, assetType, requiredTerms = [] } = {}) {
  const resolution = bestResolution(asset);
  const queryRelevance = scoreQueryRelevance(asset);
  let score = 8;
  score += Math.min(Number(asset.matched_queries?.length ?? 0), 3) * 4;
  score += Math.min(Number(asset.occurrences ?? 1), 4) * 1.5;
  score += Math.max(0, 6 - Number(asset.first_seen_page ?? 1));

  if (orientation && asset.orientation === orientation) score += 10;
  if (assetType && normalizedAssetType(asset.type) === normalizedAssetType(assetType)) score += 8;

  const pixels = resolution.width * resolution.height;
  if (pixels >= 3840 * 2160) score += 10;
  else if (pixels >= 1920 * 1080) score += 9;
  else if (pixels >= 1280 * 720) score += 7;
  else if (pixels > 0) score += 2;

  if (asset.type === 'video') {
    const duration = Number(asset.duration_seconds ?? 0);
    if (duration >= 4 && duration <= 40) score += 10;
    else if (duration > 40 && duration <= 90) score += 5;
    else if (duration > 0 && duration < 2) score -= 10;
    else if (duration > 120) score -= 4;
  }

  score += queryRelevance;
  if (queryRelevance === 0) score -= 10;
  // Name im Dateititel ("Nokia N95 front.jpg") ist ein viel stärkeres Signal als in einer langen Beschreibung.
  // Mehrere Namen im Titel ("Nokia" + "Symbian") schlagen einen einzelnen.
  const titleMatches = (requiredTerms ?? []).filter((term) => matchesRequiredTerms({ title: asset.title }, [term])).length;
  score += Math.min(titleMatches, 2) * 12;
  if (isSyntheticMediaCandidate(asset)) score -= 35;
  if (!passesRequiredConcepts(asset)) score -= 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreQueryRelevance(asset) {
  const haystack = normalizeForRelevance(assetText(asset));
  if (!haystack) return 0;
  let best = 0;
  for (const query of asset?.matched_queries ?? []) {
    const tokens = tokenizeQuery(query);
    if (!tokens.length) continue;
    let matched = 0;
    for (const token of tokens) {
      if (matchesTokenOrSynonym(haystack, token)) matched += 1;
    }
    if (!matched) continue;
    const score = Math.min(24, 8 + matched * 5);
    best = Math.max(best, score);
  }
  return best;
}

export function rankRealCandidates(candidates, options = {}) {
  const scored = candidates.map((asset) => ({
    ...asset,
    query_relevance_score: scoreQueryRelevance(asset),
    synthetic_media_risk: isSyntheticMediaCandidate(asset),
    hard_relevance_pass: passesRequiredConcepts(asset),
    real_media_score: scoreRealCandidate(asset, options)
  }));
  const hasHardRequirements = scored.some((asset) => requiredConceptGroups(asset).length > 0);
  const eligible = (hasHardRequirements ? scored.filter((asset) => asset.hard_relevance_pass) : scored)
    .filter((asset) => isUsableCandidate(asset))
    .filter((asset) => matchesRequiredTerms(asset, options.requiredTerms));
  return eligible.sort((a, b) => b.real_media_score - a.real_media_score
    || b.query_relevance_score - a.query_relevance_score
    || Number(a.synthetic_media_risk) - Number(b.synthetic_media_risk)
    || (b.matched_queries?.length ?? 0) - (a.matched_queries?.length ?? 0)
    || String(a.provider_id).localeCompare(String(b.provider_id)));
}

/**
 * Wählt die Datei für jeden Provider: Bilder in der kleinsten Größe, die maxDimension noch abdeckt,
 * Videos bevorzugt als MP4/WebM innerhalb der Zielgröße.
 */
export function chooseDownload(asset, { maxDimension = 1920 } = {}) {
  if (!asset) return null;
  if (!Array.isArray(asset.downloads)) return choosePexelsDownload(asset, { maxDimension });
  const usable = asset.downloads.filter((file) => file?.url && isPlayableFile(file, asset.type));
  if (!usable.length) return null;
  if (asset.type === 'image') {
    const longest = (file) => Math.max(Number(file.width ?? 0), Number(file.height ?? 0));
    const covering = usable.filter((file) => longest(file) >= maxDimension).sort((a, b) => longest(a) - longest(b));
    if (covering.length) return covering[0];
    return [...usable].sort((a, b) => longest(b) - longest(a))[0];
  }
  const fitting = usable.filter((file) => {
    const edge = Math.max(Number(file.width ?? 0), Number(file.height ?? 0));
    return edge >= 720 && edge <= maxDimension;
  });
  const pool = fitting.length ? fitting : usable;
  return [...pool].sort((a, b) => downloadScore(b, maxDimension) - downloadScore(a, maxDimension))[0];
}

function isPlayableFile(file, type) {
  const mime = String(file.file_type ?? '').toLowerCase();
  const ext = String(file.url).split('?')[0].split('.').pop().toLowerCase();
  if (type === 'video') return /mp4|webm/.test(mime) || ['mp4', 'webm', 'm4v'].includes(ext);
  return /jpe?g|png|webp/.test(mime) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
}

/** Credits-Block für die YouTube-Beschreibung aus allen freigegebenen Bindings. */
export function buildCreditLines(bindings = []) {
  const lines = [];
  const seen = new Set();
  for (const binding of bindings) {
    if (binding?.status !== 'ready' || !binding.provider) continue;
    const key = `${binding.provider}:${binding.provider_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rights = binding.rights ?? {};
    const text = rights.attribution_text ?? `${binding.title ?? binding.provider_id}${binding.creator ? ` von ${binding.creator}` : ''}`;
    const license = rights.license_code && !String(text).includes(rights.license_code) ? `, ${rights.license_code}` : '';
    lines.push(`- ${text}${license} – ${binding.source_url ?? ''}`.trim());
  }
  return lines;
}

export function choosePexelsDownload(asset, { maxDimension = 1920 } = {}) {
  if (!asset) return null;
  if (asset.type === 'image') {
    const files = asset.files ?? {};
    const options = [
      ['large2x', files.large2x],
      ['large', files.large],
      ['original', files.original],
      ['medium', files.medium]
    ].filter(([, url]) => Boolean(url));
    if (!options.length) return null;
    const [quality, url] = options[0];
    return {
      url,
      quality,
      file_type: 'image/jpeg',
      width: asset.width ?? null,
      height: asset.height ?? null
    };
  }

  const files = Array.isArray(asset.files) ? asset.files : [];
  const mp4 = files.filter((file) => file?.url && String(file.file_type ?? '').includes('mp4'));
  if (!mp4.length) return null;
  const fitting = mp4.filter((file) => {
    const longest = Math.max(Number(file.width ?? 0), Number(file.height ?? 0));
    return longest >= 720 && longest <= maxDimension;
  });
  const pool = fitting.length ? fitting : mp4;
  return [...pool].sort((a, b) => downloadScore(b, maxDimension) - downloadScore(a, maxDimension))[0];
}

export function buildTimelineBinding({ item, selected, localFile = null, timing = null, defaultDuration = 4, technical = null }) {
  const requestedDuration = positiveNumber(timing?.duration_seconds) ?? defaultDuration;
  const availableDuration = selected?.type === 'video'
    ? positiveNumber(technical?.durationSeconds ?? selected?.duration_seconds)
    : null;
  const duration = availableDuration ? Math.min(requestedDuration, availableDuration) : requestedDuration;
  const start = positiveNumber(timing?.start_seconds);

  return {
    id: item.id,
    beat_id: item.beat_id,
    status: selected && localFile ? 'ready' : 'unresolved',
    source_mode: 'real-media',
    reason: item.reason ?? null,
    asset_type: selected?.type ?? item.asset_type,
    provider: selected?.provider ?? null,
    provider_id: selected?.provider_id ?? null,
    local_file: localFile,
    source_url: selected?.source_url ?? null,
    creator: selected?.creator ?? null,
    orientation: selected?.orientation ?? item.orientation ?? null,
    placement: {
      start_seconds: start ?? null,
      duration_seconds: round(duration, 3),
      trim_start_seconds: 0,
      fit: 'cover',
      mute: selected?.type === 'video'
    },
    needs_additional_fill: Boolean(availableDuration && availableDuration < requestedDuration),
    title: selected?.title ?? null,
    rights: selected?.rights ?? null,
    attribution: selected?.attribution ?? null
  };
}

export function timingMapFromPayload(payload) {
  const map = new Map();
  for (const entry of payload?.beats ?? []) {
    const id = String(entry.beat_id ?? entry.id ?? '').trim();
    if (!id) continue;
    const start = positiveNumber(entry.start_seconds ?? entry.start);
    const duration = positiveNumber(entry.duration_seconds ?? entry.duration);
    map.set(id, {
      start_seconds: start ?? null,
      duration_seconds: duration ?? null
    });
  }
  return map;
}

export function extensionForDownload(url, fileType, type) {
  const mime = String(fileType ?? '').toLowerCase();
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  try {
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext)) return ext === 'jpeg' ? 'jpg' : ext;
  } catch {}
  return type === 'video' ? 'mp4' : 'jpg';
}

export function safeMediaName(value) {
  return String(value ?? 'asset')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'asset';
}

function bestResolution(asset) {
  if (asset.type === 'image') {
    return { width: Number(asset.width ?? 0), height: Number(asset.height ?? 0) };
  }
  const files = Array.isArray(asset.downloads) ? asset.downloads : Array.isArray(asset.files) ? asset.files : [];
  return files.reduce((best, file) => {
    const current = { width: Number(file.width ?? 0), height: Number(file.height ?? 0) };
    return current.width * current.height > best.width * best.height ? current : best;
  }, { width: Number(asset.width ?? 0), height: Number(asset.height ?? 0) });
}

function tokenizeQuery(value) {
  return [...new Set(normalizeForRelevance(value)
    .split(' ')
    .filter((token) => token.length >= 4 && !RELEVANCE_STOPWORDS.has(token)))];
}

function normalizeForRelevance(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/https?:\/\//g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesTokenOrSynonym(haystack, token) {
  if (` ${haystack} `.includes(` ${token} `)) return true;
  const synonyms = RELEVANCE_SYNONYMS[token] ?? [];
  return synonyms.some((candidate) => ` ${haystack} `.includes(` ${candidate} `));
}

function downloadScore(file, maxDimension) {
  const width = Number(file.width ?? 0);
  const height = Number(file.height ?? 0);
  const longest = Math.max(width, height);
  const area = width * height;
  const withinTarget = longest > 0 && longest <= maxDimension ? 2_000_000_000 : 0;
  const hdBonus = file.quality === 'hd' ? 1_000_000_000 : 0;
  const oversizePenalty = longest > maxDimension ? (longest - maxDimension) * 1_000_000 : 0;
  return withinTarget + hdBonus + area - oversizePenalty;
}

function normalizedAssetType(value) {
  return value === 'photo' ? 'image' : value;
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export const realMediaConstants = { MANUAL_SOURCE_REASONS, ARCHIVE_SOURCE_REASONS, USABLE_LICENSES, RELEVANCE_STOPWORDS, RELEVANCE_SYNONYMS, SYNTHETIC_MEDIA_PATTERN };
