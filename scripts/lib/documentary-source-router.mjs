const STOCK_PROVIDERS = ['pexels', 'pixabay', 'unsplash'];
const ARCHIVE_PROVIDERS = ['wikimedia', 'loc', 'openverse'];
const SCIENCE_PROVIDERS = ['nasa', 'wikimedia'];

const HISTORICAL_RE = /\b(18\d{2}|19\d{2}|200\d|201\d|histor|archive|archiv|war|krieg|revolution|disaster|katastroph|election|wahl|treaty|vertrag|apollo|chernobyl|tschernobyl|berlin wall|berliner mauer|soviet|sowjet|cold war|kalter krieg)\b/i;
const PERSON_RE = /\b(person|politician|president|scientist|actor|athlete|personality|politiker|präsident|wissenschaftler|forscher|künstler|sportler)\b/i;
const PLACE_RE = /\b(place|city|country|building|landmark|ort|stadt|land|gebäude|denkmal|karte|map)\b/i;
const NASA_RE = /\b(nasa|space|raumfahrt|moon|mond|mars|apollo|rocket|rakete|satellite|satellit|earth observation|erdbeobachtung|climate|klima|hurricane|orkan|wildfire|waldbrand|glacier|gletscher|aral|sea|lake|ozean|ocean)\b/i;
const US_ARCHIVE_RE = /\b(united states|usa|u\.s\.|america|amerikan|washington|new york|kennedy|roosevelt|lincoln|civil war|vietnam|world war|weltkrieg)\b/i;

export function documentaryEvidenceLevel(scene = {}) {
  const text = sceneText(scene);
  const intent = String(scene.visualIntentType ?? scene.intent ?? '').toLowerCase();
  if (scene.symbolic) return 'symbolic';
  if (intent === 'history' || intent === 'event' || HISTORICAL_RE.test(text)) return 'exact-event-or-era';
  if (intent === 'person' || PERSON_RE.test(text)) return 'exact-entity';
  if (intent === 'place' || PLACE_RE.test(text)) return 'exact-place';
  return 'contextual';
}

export function documentaryTopicClass(scene = {}) {
  const text = sceneText(scene);
  if (NASA_RE.test(text)) return 'science-earth-space';
  if (HISTORICAL_RE.test(text) || US_ARCHIVE_RE.test(text)) return 'history-archive';
  if (scene.symbolic) return 'symbolic-broll';
  return 'general-documentary';
}

export function routeDocumentaryProviders(scene = {}) {
  const evidenceLevel = documentaryEvidenceLevel(scene);
  const preferredMediaType = String(scene.preferredMediaType ?? '').toLowerCase();
  const text = sceneText(scene);
  const nasaRelevant = NASA_RE.test(text);
  const locRelevant = HISTORICAL_RE.test(text) || US_ARCHIVE_RE.test(text);

  if (['exact-event-or-era', 'exact-entity', 'exact-place'].includes(evidenceLevel)) {
    const ordered = [];
    if (nasaRelevant) ordered.push('nasa');
    ordered.push('wikimedia');
    if (locRelevant) ordered.push('loc');
    ordered.push('openverse');
    if (preferredMediaType === 'video') ordered.push('pexels', 'pixabay', 'unsplash');
    else ordered.push('unsplash', 'pexels', 'pixabay');
    return unique(ordered);
  }

  if (evidenceLevel === 'symbolic') {
    return preferredMediaType === 'photo'
      ? ['unsplash', 'pexels', 'pixabay', 'openverse', 'wikimedia']
      : ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'];
  }

  if (nasaRelevant) {
    return ['nasa', 'pexels', 'pixabay', 'wikimedia', 'openverse', 'unsplash'];
  }

  return preferredMediaType === 'photo'
    ? ['unsplash', 'pexels', 'pixabay', 'wikimedia', 'openverse', 'loc']
    : ['pexels', 'pixabay', 'wikimedia', 'openverse', 'unsplash', 'loc'];
}

export function documentaryCandidateScore(scene = {}, candidate = {}) {
  const evidenceLevel = documentaryEvidenceLevel(scene);
  const topicClass = documentaryTopicClass(scene);
  const provider = String(candidate.provider ?? '').toLowerCase();

  const contentHaystack = normalize([
    candidate.title,
    candidate.creator,
    candidate.asset?.title,
    candidate.asset?.description,
    candidate.asset?.date,
    candidate.asset?.tags?.join?.(' '),
    candidate.asset?.keywords?.join?.(' ')
  ].filter(Boolean).join(' '));

  const sceneTerms = meaningfulTerms(sceneEvidenceText(scene));
  const matchedTerms = sceneTerms.filter((term) => contentHaystack.includes(term));
  const lexical = sceneTerms.length ? matchedTerms.length / sceneTerms.length : 0;

  let sourceFit = 0.55;
  if (['exact-event-or-era', 'exact-entity', 'exact-place'].includes(evidenceLevel)) {
    if (ARCHIVE_PROVIDERS.includes(provider)) sourceFit = 1;
    else if (provider === 'nasa' && topicClass === 'science-earth-space') sourceFit = 1;
    else if (STOCK_PROVIDERS.includes(provider)) sourceFit = 0.28;
  } else if (evidenceLevel === 'symbolic') {
    sourceFit = STOCK_PROVIDERS.includes(provider) ? 1 : 0.45;
  } else if (topicClass === 'science-earth-space' && SCIENCE_PROVIDERS.includes(provider)) {
    sourceFit = 1;
  } else {
    sourceFit = STOCK_PROVIDERS.includes(provider) ? 0.9 : 0.76;
  }

  const technical = Math.max(0, Math.min(100, Number(candidate.technicalFit) || 0)) / 100;
  const reuse = candidate.reusedElsewhere ? 0 : 1;
  const exactEntityBonus = exactEntityMatch(scene, contentHaystack) ? 1 : 0;
  const yearBonus = exactYearMatch(scene, contentHaystack) ? 1 : 0;
  const directMedia = candidate.mediaUrl || candidate.asset?.files?.original ? 1 : 0;
  const videoBonus = candidate.type === 'video' && String(scene.preferredMediaType ?? '').toLowerCase() !== 'photo' ? 1 : 0;

  const score = (
    lexical * 27 +
    exactEntityBonus * 18 +
    yearBonus * 10 +
    sourceFit * 20 +
    technical * 12 +
    directMedia * 6 +
    videoBonus * 4 +
    reuse * 3
  );

  return {
    score: Math.round(score),
    evidenceLevel,
    topicClass,
    lexicalMatch: Math.round(lexical * 100),
    sourceFit: Math.round(sourceFit * 100),
    exactEntityMatch: Boolean(exactEntityBonus),
    exactYearMatch: Boolean(yearBonus),
    directMedia: Boolean(directMedia),
    videoPreferredBonus: Boolean(videoBonus),
    scoringBasis: 'result-metadata-plus-source-fit-v2'
  };
}

export function enrichDocumentaryScene(scene = {}) {
  return {
    ...scene,
    documentary: {
      evidenceLevel: documentaryEvidenceLevel(scene),
      topicClass: documentaryTopicClass(scene),
      providerPriority: routeDocumentaryProviders(scene)
    }
  };
}

function exactEntityMatch(scene, haystack) {
  const entities = Array.isArray(scene.entities) ? scene.entities : [];
  const relevant = entities
    .map((entity) => normalize(entity))
    .filter((entity) => entity.length >= 3 && !/^\d+$/.test(entity));
  return relevant.some((entity) => haystack.includes(entity));
}

function exactYearMatch(scene, haystack) {
  const years = sceneText(scene).match(/\b(?:18|19|20)\d{2}\b/g) ?? [];
  return years.some((year) => haystack.includes(year));
}

function sceneText(scene) {
  return [
    scene.originalText,
    scene.visualIntent,
    ...(Array.isArray(scene.entities) ? scene.entities : []),
    ...(Array.isArray(scene.concepts) ? scene.concepts : []),
    ...(Array.isArray(scene.queries) ? scene.queries : [])
  ].filter(Boolean).join(' ');
}

function sceneEvidenceText(scene) {
  return [
    scene.originalText,
    scene.visualIntent,
    ...(Array.isArray(scene.entities) ? scene.entities : []),
    ...(Array.isArray(scene.concepts) ? scene.concepts : [])
  ].filter(Boolean).join(' ');
}

function meaningfulTerms(value) {
  const stop = new Set(['aber','auch','dass','der','die','das','den','dem','des','ein','eine','einer','eines','einem','einen','für','ist','mit','oder','und','von','war','wie','wird','zu','the','and','for','from','into','that','this','with','was','were','are']);
  return [...new Set(normalize(value).split(/\s+/).filter((term) => term.length >= 4 && !stop.has(term)))].slice(0, 28);
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => value && !seen.has(value) && seen.add(value));
}
