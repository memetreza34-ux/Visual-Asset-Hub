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
    return {
      ...scene,
      documentary: enriched.documentary,
      queries: documentaryQueries(scene)
    };
  });

  return {
    ...base,
    format: 'visual-asset-hub-documentary-visual-plan',
    version: 1,
    mode: 'documentary',
    settings: {
      ...base.settings,
      orientation: input.orientation ?? 'horizontal',
      mediaPreference: input.mediaPreference ?? 'mixed',
      depth: input.depth ?? 'deep'
    },
    scenes
  };
}

export function documentaryQueries(scene = {}) {
  const original = Array.isArray(scene.queries) ? scene.queries : [];
  const entities = Array.isArray(scene.entities) ? scene.entities : [];
  const concepts = Array.isArray(scene.concepts) ? scene.concepts : [];
  const text = String(scene.originalText ?? '').trim();
  const evidence = enrichDocumentaryScene(scene).documentary.evidenceLevel;
  const years = [...text.matchAll(/\b(?:18|19|20)\d{2}\b/g)].map((match) => match[0]);
  const primaryEntity = entities.find((value) => !/^\d+$/.test(String(value))) ?? '';
  const core = [primaryEntity, ...years, ...concepts.slice(0, 2)].filter(Boolean).join(' ').trim();
  const extra = [];

  if (evidence === 'exact-event-or-era') {
    if (core) extra.push(`${core} historical archive`);
    if (primaryEntity) extra.push(`${primaryEntity} archival footage`);
    if (years.length) extra.push(`${primaryEntity || concepts[0] || ''} ${years[0]} historical photo`.trim());
  } else if (evidence === 'exact-entity') {
    if (primaryEntity) extra.push(`${primaryEntity} documentary photo`);
    if (primaryEntity) extra.push(`${primaryEntity} public appearance archive`);
  } else if (evidence === 'exact-place') {
    if (core) extra.push(`${core} documentary establishing shot`);
    if (primaryEntity) extra.push(`${primaryEntity} location footage`);
  } else if (evidence === 'symbolic') {
    if (concepts.length) extra.push(`${concepts.slice(0, 3).join(' ')} cinematic b roll`);
    if (concepts.length) extra.push(`${concepts.slice(0, 2).join(' ')} close up b roll`);
  }

  return unique([...extra, ...original, text]).filter((query) => query.length >= 2).slice(0, 8);
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
