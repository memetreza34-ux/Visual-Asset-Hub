import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { loadDotEnv } from './lib/source-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
loadDotEnv(path.join(root, '.env'));
if (args.help) { help(); process.exit(0); }

const query = String(args.query || args._.join(' ')).trim();
if (!query) fail('Suchbegriff fehlt.');
const limit = integer(args.limit || '30', 1, 100, 'limit');
const includeGdelt = args.gdelt !== 'false';
const searxngUrl = cleanBaseUrl(args.searxngUrl || process.env.SEARXNG_URL || '');
const results = [];
const warnings = [];

if (includeGdelt) {
  try {
    results.push(...await searchGdelt(query, Math.min(limit, 50)));
  } catch (error) {
    warnings.push(`GDELT: ${message(error)}`);
  }
}

if (searxngUrl) {
  try {
    results.push(...await searchSearxng(searxngUrl, query, Math.min(limit, 50), args.language || 'de-DE'));
  } catch (error) {
    warnings.push(`SearXNG: ${message(error)}`);
  }
}

const deduped = dedupe(results)
  .map((item) => ({ ...item, discoveryScore: score(item, query) }))
  .sort((a, b) => b.discoveryScore - a.discoveryScore || String(a.title).localeCompare(String(b.title)))
  .slice(0, limit);

const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  query,
  policy: {
    purpose: 'story-and-source-discovery',
    autoReuseMedia: false,
    autoApproveRights: false,
    note: 'Treffer dienen zum Finden von Faktenquellen und Originalseiten. Bilder/Clips aus Artikeln werden nicht automatisch als Produktionsassets freigegeben.'
  },
  sources: {
    gdelt: includeGdelt,
    searxng: Boolean(searxngUrl),
    searxngUrl: searxngUrl || null
  },
  warnings,
  results: deduped
};

const outputDir = path.join(root, '.local-storage', 'research-discovery');
fs.mkdirSync(outputDir, { recursive: true });
const output = path.join(outputDir, `${safeName(query)}.json`);
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Research Discovery: „${query}“`);
console.log(`Treffer: ${deduped.length} · GDELT ${includeGdelt ? 'an' : 'aus'} · SearXNG ${searxngUrl ? 'an' : 'aus'}`);
for (const [index, item] of deduped.slice(0, 15).entries()) {
  console.log(`${String(index + 1).padStart(2, ' ')}. [${item.discoveryScore}] ${item.source} · ${item.title}`);
  console.log(`    ${item.url}`);
}
if (warnings.length) console.log(`Warnungen: ${warnings.join(' | ')}`);
console.log(`Report: ${relative(output)}`);

async function searchGdelt(queryText, maxRecords) {
  const params = new URLSearchParams({
    query: queryText,
    mode: 'ArtList',
    maxrecords: String(maxRecords),
    format: 'json',
    sort: 'HybridRel'
  });
  const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, { headers: userAgent() });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.articles || []).map((article) => ({
    source: 'gdelt',
    title: article.title || article.url || 'Artikel',
    url: article.url,
    domain: article.domain || domainOf(article.url),
    publishedAt: article.seendate || null,
    language: article.language || null,
    sourceCountry: article.sourcecountry || null,
    image: article.socialimage || null,
    snippet: null
  })).filter((item) => item.url);
}

async function searchSearxng(baseUrl, queryText, maxRecords, language) {
  const url = new URL('/search', `${baseUrl}/`);
  url.searchParams.set('q', queryText);
  url.searchParams.set('format', 'json');
  url.searchParams.set('language', language);
  url.searchParams.set('safesearch', '1');
  const response = await fetch(url, { headers: userAgent() });
  if (!response.ok) throw new Error(`HTTP ${response.status}. Prüfe, ob JSON in deiner SearXNG-Instanz aktiviert ist.`);
  const payload = await response.json();
  return (payload.results || []).slice(0, maxRecords).map((item) => ({
    source: 'searxng',
    title: item.title || item.url || 'Webtreffer',
    url: item.url,
    domain: domainOf(item.url),
    publishedAt: item.publishedDate || null,
    language: null,
    sourceCountry: null,
    image: item.thumbnail || null,
    snippet: item.content || null,
    engines: item.engines || (item.engine ? [item.engine] : [])
  })).filter((item) => item.url);
}

function score(item, queryText) {
  const queryWords = tokens(queryText);
  const haystack = `${item.title || ''} ${item.snippet || ''} ${item.domain || ''}`.toLowerCase();
  const matched = queryWords.filter((word) => haystack.includes(word)).length;
  let value = queryWords.length ? Math.round((matched / queryWords.length) * 35) : 0;
  if (item.source === 'searxng') value += 18;
  if (item.source === 'gdelt') value += 14;
  value += authorityBoost(item.domain);
  if (item.publishedAt) value += 4;
  if (item.image) value += 2;
  return Math.max(0, Math.min(100, value));
}

function authorityBoost(domain) {
  const value = String(domain || '').toLowerCase();
  if (!value) return 0;
  const high = ['nasa.gov','noaa.gov','usgs.gov','ntsb.gov','bea.aero','gov.uk','bund.de','europa.eu','loc.gov','si.edu'];
  if (high.some((suffix) => value === suffix || value.endsWith(`.${suffix}`))) return 35;
  if (/\.gov$|\.gov\.|\.edu$|\.ac\./.test(value)) return 24;
  return 0;
}

function dedupe(items) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = canonical(item.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}
function canonical(value) { try { const url = new URL(value); url.hash = ''; for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key); return url.toString(); } catch { return null; } }
function cleanBaseUrl(value) { if (!value) return ''; try { const url = new URL(value); if (!['http:','https:'].includes(url.protocol)) return ''; return url.origin + url.pathname.replace(/\/+$/, ''); } catch { return ''; } }
function domainOf(value) { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return null; } }
function tokens(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((x) => x.length >= 3).slice(0, 18); }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'research'; }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function userAgent() { return { 'User-Agent': 'Visual-Asset-Hub/0.12 research discovery', Accept: 'application/json' }; }
function message(error) { return error instanceof Error ? error.message : String(error); }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Research Discovery\n\n  npm run research:discover -- "Mars Climate Orbiter"\n\nKostenlos:\n- GDELT ist standardmäßig aktiv und braucht keinen Key.\n- SearXNG ist optional über SEARXNG_URL oder --searxng-url.\n\nOptionen:\n  --gdelt false\n  --searxng-url http://127.0.0.1:8080\n  --language de-DE\n  --limit 30\n\nTreffer sind Recherchequellen, keine automatisch freigegebenen Produktionsmedien.`); }
