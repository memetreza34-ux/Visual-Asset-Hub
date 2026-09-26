import { createScriptVisualPlan } from './script-visual-core.mjs';
import { documentaryCandidateScore, enrichDocumentaryScene, routeDocumentaryProviders } from './lib/documentary-source-router.mjs';

export function createDocumentaryVisualPlan(input = {}) {
  const base = createScriptVisualPlan({
    ...input,
    orientation: input.orientation ?? 'horizontal',
    mediaPreference: input.mediaPreference ?? 'mixed',
    depth: input.depth ?? 'deep'
  });

  const scenes = base.scenes.map((scene) => {
    const enriched = enrichDocumentaryScene(scene);
    const directions = documentarySearchDirections(scene);
    return {
      ...scene,
      documentary: {
        ...enriched.documentary,
        searchDirections: directions
      },
      queries: unique(directions.map((item) => item.query))
    };
  });

  return {
    ...base,
    format: 'visual-asset-hub-documentary-visual-plan',
    version: 2,
    mode: 'documentary',
    settings: {
      ...base.settings,
      orientation: input.orientation ?? 'horizontal',
      mediaPreference: input.mediaPreference ?? 'mixed',
      depth: input.depth ?? 'deep',
      visualDirector: 'multi-shot-v2'
    },
    scenes
  };
}

export function documentaryQueries(scene = {}) {
  return documentarySearchDirections(scene).map((item) => item.query);
}

export function documentarySearchDirections(scene = {}) {
  const original = Array.isArray(scene.queries) ? scene.queries : [];
  const entities = Array.isArray(scene.entities) ? scene.entities : [];
  const concepts = Array.isArray(scene.concepts) ? scene.concepts : [];
  const text = String(scene.originalText ?? '').trim();
  const documentary = enrichDocumentaryScene(scene).documentary;
  const evidence = documentary.evidenceLevel;
  const years = [...text.matchAll(/\b(?:18|19|20)\d{2}\b/g)].map((match) => match[0]);
  const primaryEntity = entities.find((value) => !/^\d+$/.test(String(value))) ?? '';
  const coreConcept = concepts[0] ?? '';
  const core = [primaryEntity, ...years, ...concepts.slice(0, 2)].filter(Boolean).join(' ').trim();
  const directions = [];
  const add = (kind, query, preferredMediaType = 'mixed') => {
    const clean = String(query ?? '').replace(/\s+/g, ' ').trim();
    if (clean.length >= 2) directions.push({kind, query: clean, preferredMediaType});
  };

  if (evidence === 'exact-event-or-era') {
    add('exact-archive', `${core || text} historical archive`, 'photo');
    add('archive-video', `${primaryEntity || coreConcept || text} archival footage ${years[0] || ''}`, 'video');
    add('exact-photo', `${primaryEntity || coreConcept || text} ${years[0] || ''} historical photo`, 'photo');
    add('location-context', `${primaryEntity || coreConcept || text} documentary location`, 'mixed');
    add('action-broll', `${concepts.slice(0, 3).join(' ') || core || text} documentary b roll`, 'video');
  } else if (evidence === 'exact-entity') {
    add('entity-photo', `${primaryEntity || text} documentary photo`, 'photo');
    add('entity-video', `${primaryEntity || text} archive footage`, 'video');
    add('entity-context', `${primaryEntity || text} location context`, 'mixed');
  } else if (evidence === 'exact-place') {
    add('establishing', `${core || text} documentary establishing shot`, 'video');
    add('place-photo', `${primaryEntity || text} documentary photo`, 'photo');
    add('place-aerial', `${primaryEntity || coreConcept || text} aerial footage`, 'video');
    add('map', `${primaryEntity || coreConcept || text} map`, 'photo');
  } else if (evidence === 'symbolic') {
    add('broll-wide', `${concepts.slice(0, 3).join(' ') || text} cinematic b roll`, 'video');
    add('broll-detail', `${concepts.slice(0, 2).join(' ') || text} close up b roll`, 'video');
    add('context-photo', `${concepts.slice(0, 3).join(' ') || text} documentary photo`, 'photo');
  } else {
    add('documentary-video', `${core || text} documentary footage`, 'video');
    add('documentary-photo', `${core || text} documentary photo`, 'photo');
    add('detail', `${concepts.slice(0, 2).join(' ') || core || text} detail close up`, 'mixed');
    add('establishing', `${primaryEntity || coreConcept || text} establishing shot`, 'video');
  }

  for (const query of original.slice(0, 3)) add('planner-original', query, 'mixed');
  if (text) add('literal-fallback', text, 'mixed');

  const seen = new Set();
  return directions.filter((item) => {
    const key = item.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

export function rankDocumentaryCandidates(scene = {}, candidates = []) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      documentaryScore: documentaryCandidateScore(scene, candidate)
    }))
    .sort((a, b) =>
      b.documentaryScore.score - a.documentaryScore.score ||
      Number(Boolean(a.reusedElsewhere)) - Number(Boolean(b.reusedElsewhere)) ||
      (Number(b.technicalFit) || 0) - (Number(a.technicalFit) || 0) ||
      String(a.title ?? '').localeCompare(String(b.title ?? ''), 'de')
    );
}

export function documentaryProviderOrder(scene = {}, enabledProviders = []) {
  const enabled = new Set(enabledProviders);
  return routeDocumentaryProviders(scene).filter((provider) => enabled.has(provider));
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}
