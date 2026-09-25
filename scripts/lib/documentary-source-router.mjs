const STOCK_PROVIDERS = ['pexels', 'pixabay', 'unsplash'];
const KNOWLEDGE_PROVIDERS = ['wikimedia', 'openverse'];

const HISTORICAL_RE = /\b(18\d{2}|19\d{2}|200\d|201\d|histor|archive|archiv|war|krieg|revolution|disaster|katastroph|election|wahl|treaty|vertrag|apollo|chernobyl|tschernobyl|berlin wall|berliner mauer)\b/i;
const PERSON_RE = /\b(person|politician|president|scientist|actor|athlete|personality|politiker|präsident|wissenschaftler|forscher|künstler|sportler)\b/i;
const PLACE_RE = /\b(place|city|country|building|landmark|ort|stadt|land|gebäude|denkmal|karte|map)\b/i;

export function documentaryEvidenceLevel(scene = {}) {
  const text = sceneText(scene);
  const intent = String(scene.visualIntentType ?? scene.intent ?? '').toLowerCase();
  if (scene.symbolic) return 'symbolic';
  if (intent === 'history' || intent === 'event' || HISTORICAL_RE.test(text)) return 'exact-event-or-era';
  if (intent === 'person' || PERSON_RE.test(text)) return 'exact-entity';
  if (intent === 'place' || PLACE_RE.test(text)) return 'exact-place';
  return 'contextual';
}

export function routeDocumentaryProviders(scene = {}) {
  const evidenceLevel = documentaryEvidenceLevel(scene);
  const preferredMediaType = String(scene.preferredMediaType ?? '').toLowerCase();

  if (evidenceLevel === 'exact-event-or-era' || evidenceLevel === 'exact-entity' || evidenceLevel === 'exact-place') {
    return preferredMediaType === 'video'
      ? ['wikimedia', 'openverse', 'pexels', 'pixabay', 'unsplash']
      : ['wikimedia', 'openverse', 'unsplash', 'pexels', 'pixabay'];
  }

  if (evidenceLevel === 'symbolic') {
    return preferredMediaType === 'photo'
      ? ['unsplash', 'pexels', 'pixabay', 'openverse', 'wikimedia']
      : ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'];
  }

  return preferredMediaType === 'photo'
    ? ['unsplash', 'pexels', 'pixabay', 'openverse', 'wikimedia']
    : ['pexels', 'pixabay', 'wikimedia', 'openverse', 'unsplash'];
}

export function documentaryCandidateScore(scene = {}, candidate = {}) {
  const evidenceLevel = documentaryEvidenceLevel(scene);
  const provider = String(candidate.provider ?? '').toLowerCase();

  // Nur echte Treffer-Metadaten bewerten. Der Suchbegriff selbst ist kein Beweis,
  // dass das zurückgegebene Medium den gesprochenen Inhalt tatsächlich zeigt.
  const contentHaystack = normalize([
    candidate.title,
    candidate.creator,
    candidate.asset?.title,
    candidate.asset?.description,
    candidate.asset?.tags?.join?.(' ')
  ].filter(Boolean).join(' '));

  const sceneTerms = meaningfulTerms(sceneEvidenceText(scene));
  const matchedTerms = sceneTerms.filter((term) => contentHaystack.includes(term));
  const lexical = sceneTerms.length ? matchedTerms.length / sceneTerms.length : 0;

  let sourceFit = 0;
  if (['exact-event-or-era', 'exact-entity', 'exact-place'].includes(evidenceLevel)) {
    if (KNOWLEDGE_PROVIDERS.includes(provider)) sourceFit = 1;
    else if (STOCK_PROVIDERS.includes(provider)) sourceFit = 0.35;
  } else if (evidenceLevel === 'symbolic') {
    if (STOCK_PROVIDERS.includes(provider)) sourceFit = 1;
    else sourceFit = 0.55;
  } else {
    sourceFit = STOCK_PROVIDERS.includes(provider) ? 0.9 : 0.75;
  }

  const technical = Math.max(0, Math.min(100, Number(candidate.technicalFit) || 0)) / 100;
  const reuse = candidate.reusedElsewhere ? 0 : 1;
  const exactEntityBonus = exactEntityMatch(scene, contentHaystack) ? 1 : 0;
  const yearBonus = exactYearMatch(scene, contentHaystack) ? 1 : 0;

  const score = (
    lexical * 30 +
    exactEntityBonus * 20 +
    yearBonus * 10 +
    sourceFit * 20 +
    technical * 15 +
    reuse * 5
  );

  return {
    score: Math.round(score),
    evidenceLevel,
    lexicalMatch: Math.round(lexical * 100),
    sourceFit: Math.round(sourceFit * 100),
    exactEntityMatch: Boolean(exactEntityBonus),
    exactYearMatch: Boolean(yearBonus),
    scoringBasis: 'result-metadata-only'
  };
}

export function enrichDocumentaryScene(scene = {}) {
  return {
    ...scene,
    documentary: {
      evidenceLevel: documentaryEvidenceLevel(scene),
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
  return [...new Set(normalize(value).split(/\s+/).filter((term) => term.length >= 4 && !stop.has(term)))].slice(0, 24);
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
