import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PROVIDERS } from './lib/providers/index.mjs';
import { loadDotEnv, searchWithCache } from './lib/source-utils.mjs';
import { expandEntityQuery } from './lib/wikidata.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
loadDotEnv(path.join(root, '.env'));
if (args.help) { help(); process.exit(0); }

const query = (args.query || args._.join(' ')).trim();
if (!query) fail('Suchbegriff fehlt.');
const type = args.type || 'video';
if (!['video', 'image'].includes(type)) fail('--type muss video oder image sein.');
const perProvider = integer(args.perProvider || '8', 1, 20, 'per-provider');
const includeStock = args.includeStock === 'true';
const requested = String(args.providers || '').split(',').map((x) => x.trim()).filter(Boolean);
const providers = requested.length ? requested : defaultProviders(type, includeStock);

let entityExpansion = { query, entities: [], variants: [query] };
if (args.expandEntities !== 'false') {
  try { entityExpansion = await expandEntityQuery(query, { limit: 3 }); }
  catch (error) { console.warn(`WARN Wikidata: ${error instanceof Error ? error.message : String(error)}`); }
}
const queryVariants = unique([query, ...(entityExpansion.variants || [])]).slice(0, 3);
const resultsByKey = new Map();
for (const provider of providers) {
  const config = PROVIDERS[provider];
  if (!config || !config.types.includes(type)) continue;
  if (config.requiresKey && !process.env[config.requiresKey]) {
    console.warn(`SKIP ${provider}: ${config.requiresKey} fehlt.`);
    continue;
  }
  const resultsPerVariant = Math.max(3, Math.ceil(perProvider / queryVariants.length));
  for (const searchQuery of queryVariants) {
    try {
      const result = await searchWithCache({
        root, provider, type, query: searchQuery,
        orientation: args.orientation,
        page: 1,
        perPage: resultsPerVariant,
        locale: 'de-DE', language: 'de',
        refresh: args.refresh === 'true'
      });
      for (const asset of result.assets) {
        const ranked = rankCandidate(asset, provider, query, config, searchQuery);
        const key = `${provider}:${asset.provider_id || asset.source_url || asset.title}`;
        const previous = resultsByKey.get(key);
        if (!previous || ranked.researchScore > previous.researchScore) resultsByKey.set(key, ranked);
      }
    } catch (error) {
      console.warn(`WARN ${provider} [${searchQuery}]: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const results = [...resultsByKey.values()];
results.sort((a, b) => b.researchScore - a.researchScore || String(a.title).localeCompare(String(b.title)));
const report = {
  version: 3,
  generatedAt: new Date().toISOString(),
  query,
  queryVariants,
  entityExpansion,
  type,
  policy: {
    order: ['official-archive', 'archive', 'open-media', 'stock-fallback'],
    stockIncluded: includeStock,
    autoApproveUnknownRights: false,
    visualMatchRecommended: true,
    entityExpansionEnabled: args.expandEntities !== 'false',
    note: 'Score ist nur Research-Heuristik. Vor Phase-1-Freigabe müssen Ereignisidentität, Rechte und visuelle Relevanz geprüft werden. Für lokale Frames kann visual:match (OpenCLIP) ergänzt werden.'
  },
  providers,
  candidates: results.slice(0, integer(args.limit || '40', 1, 100, 'limit'))
};
const outputDir = path.join(root, '.local-storage', 'documentary-research');
fs.mkdirSync(outputDir, { recursive: true });
const output = path.join(outputDir, `${safeName(query)}-${type}.json`);
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`\nDoku-Recherche: „${query}“ · ${type}`);
console.log(`Suchvarianten: ${queryVariants.join(' | ')}`);
console.log(`Provider: ${providers.join(', ')}`);
for (const [index, item] of report.candidates.slice(0, 15).entries()) {
  const rights = item.rights?.license_code || item.rights?.license_status || 'unknown';
  console.log(`${String(index + 1).padStart(2, ' ')}. [${item.researchScore}] ${item.provider} · ${item.title} · ${rights}`);
  console.log(`    ${item.source_url}`);
}
console.log(`\nReport: ${relative(output)}`);
console.log('Wichtig: Ein hoher Score bedeutet nur „guter Kandidat“. Vor dem Skript muss geprüft werden, ob das Material wirklich das konkrete Ereignis zeigt.');

function rankCandidate(asset, provider, queryText, config, searchQuery) {
  const words = tokens(queryText);
  const haystack = `${asset.title || ''} ${asset.description || ''} ${(asset.tags || []).join(' ')}`.toLowerCase();
  const matched = words.filter((word) => haystack.includes(word)).length;
  const exactness = words.length ? matched / words.length : 0;
  let score = tierScore(config.tier);
  score += Math.round(exactness * 30);
  if (asset.rights?.license_status === 'public-domain') score += 15;
  else if (asset.rights?.license_status === 'licensed') score += 10;
  else if (asset.rights?.license_status === 'restricted') score -= 20;
  else score -= 8;
  const width = Number(asset.width || 0), height = Number(asset.height || 0);
  if (width >= 1280 || height >= 1280) score += 5;
  if (asset.preview_url) score += 2;
  if (asset.source_url) score += 3;
  return {
    ...asset,
    researchScore: Math.max(0, Math.min(100, score)),
    researchSearchQuery: searchQuery,
    researchSignals: {
      providerTier: config.tier,
      providerTierScore: tierScore(config.tier),
      queryTermsMatched: `${matched}/${words.length}`,
      rightsStatus: asset.rights?.license_status || 'unknown',
      requiresHumanEventMatch: true,
      openClipRecommended: true
    }
  };
}
function tierScore(tier) {
  if (tier === 'official-archive') return 60;
  if (tier === 'archive') return 45;
  if (tier === 'open-media') return 28;
  if (tier === 'stock-fallback') return 5;
  return 0;
}
function defaultProviders(type, stock) {
  const base = type === 'image'
    ? ['nasa', 'library-of-congress', 'wikimedia', 'internet-archive', 'openverse']
    : ['nasa', 'library-of-congress', 'wikimedia', 'internet-archive'];
  if (stock) base.push('pexels', 'pixabay');
  return base;
}
function tokens(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((x) => x.length >= 3).slice(0, 16); }
function unique(values) { const seen = new Set(); const out = []; for (const value of values) { const text = String(value || '').trim(); const key = text.toLowerCase(); if (!text || seen.has(key)) continue; seen.add(key); out.push(text); } return out; }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'research'; }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function integer(value, min, max, label) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Documentary Research – archive-first\n\nBeispiele:\n  npm run documentary:research -- "Concorde crash Air France 4590" --type video\n  npm run documentary:research -- "Theranos Elizabeth Holmes" --type image\n  npm run documentary:research -- "warehouse accident" --type video --include-stock true\n\nStandard ohne Keys:\n  video: NASA + Library of Congress + Wikimedia Commons + Internet Archive\n  image: NASA + Library of Congress + Wikimedia Commons + Internet Archive + Openverse\n\nWikidata erweitert den Suchbegriff standardmäßig um maximal zwei passende Aliase/Labels. Abschalten mit:\n  --expand-entities false\n\nPriorität:\n  official-archive > archive > open-media > stock-fallback\n\nStock ist standardmäßig AUS. Mit --include-stock true werden Pexels/Pixabay nur als nachrangige Fallbacks ergänzt.`); }
