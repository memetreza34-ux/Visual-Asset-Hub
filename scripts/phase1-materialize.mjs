import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import {PROVIDERS} from './lib/providers/index.mjs';
import {chooseDownload, downloadAsset, loadDotEnv, searchWithCache, writeSourceMetadata} from './lib/source-utils.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
loadDotEnv(path.join(root, '.env'));
if (args.help) { help(); process.exit(0); }

const projectId = slug(args.project || '');
if (!projectId) fail('--project ist erforderlich.');
const projectDir = path.join(root, 'projects', projectId);
const planFile = path.resolve(args.plan || path.join(projectDir, 'shot-plan.json'));
if (!fs.existsSync(planFile)) fail(`Shot-Plan fehlt: ${relative(planFile)}. Zuerst beat:plan ausführen.`);
const plan = readJson(planFile);
if (!Array.isArray(plan.shots) || !plan.shots.length) fail('shot-plan.json enthält keine Shots.');

const perProvider = integer(args.perProvider || '5', 1, 15, 'per-provider');
const limitPerBeat = integer(args.limitPerBeat || '12', 1, 30, 'limit-per-beat');
const includeStock = args.includeStock === 'true';
const downloadTop = integer(args.downloadTop || '0', 0, 3, 'download-top');
const refresh = args.refresh === 'true';
const outputFile = path.resolve(args.output || path.join(projectDir, 'materialization.json'));

const report = {
  version: 4,
  generatedAt: new Date().toISOString(),
  projectId,
  sourceShotPlan: relative(planFile),
  policy: {
    archiveFirst: true,
    officialProviderOrder: ['nasa','noaa','usgs','nara','smithsonian','library-of-congress'],
    archiveProviderOrder: ['europeana','wikimedia','internet-archive'],
    optionalKeyProviders: ['nara','smithsonian','europeana'],
    stockFallbackOnly: true,
    phase1DownloadsLockedMedia: true,
    phase3NetworkFetchForbidden: true,
    autoApproveExternalMedia: false,
    eventIdentityStillRequiresReview: true,
    unknownRightsBlockedFromPublish: true,
    minimumEditorialScoreForSelection: 62,
    note: 'Phase 1 lädt bekannte direkte Medien und ausgewählte Provider-Treffer lokal herunter. Download ist keine Rechtefreigabe; QC, Rechteprüfung und Binding bleiben Pflicht.'
  },
  beats: []
};

for (const [index, shot] of plan.shots.entries()) {
  console.log(`\n[${index + 1}/${plan.shots.length}] ${shot.id} · ${shot.narrationAnchor || shot.visualIntent || ''}`);
  const beat = await materializeShot(shot);
  report.beats.push(beat);
  if (downloadTop > 0 && beat.selectedCandidateId) await downloadSelected(beat, downloadTop);
  saveReport();
}
report.completedAt = new Date().toISOString();
report.summary = summarize(report.beats);
saveReport();
console.log(`\nMaterialisierung: ${relative(outputFile)}`);
console.log(`${report.summary.selected}/${report.summary.total} Shots mit Vorauswahl · ${report.summary.downloaded} Downloads · ${report.summary.blocked} blockiert`);
console.log('Nächster Schritt: visual:qc → Inbox/Katalog-Rechteprüfung → phase1:bind → youtube:workflow phase1-check.');

async function materializeShot(shot) {
  const mediaType = inferMediaType(shot);
  const queries = buildQueries(shot);
  const providers = providersFor(shot, mediaType, includeStock);
  const candidates = [];
  const seen = new Set();
  const warnings = [];
  if (shot.sourceUrl) candidates.push(exactSourceCandidate(shot, mediaType));

  for (const provider of providers) {
    const config = PROVIDERS[provider];
    if (!config?.types.includes(mediaType)) continue;
    if (config.requiresKey && !process.env[config.requiresKey]) { warnings.push(`${provider}: ${config.requiresKey} fehlt`); continue; }
    for (const query of queries.slice(0, 3)) {
      try {
        const result = await searchWithCache({root,provider,type:mediaType,query,orientation:'horizontal',page:1,perPage:perProvider,locale:'de-DE',language:'de',refresh});
        for (const asset of result.assets || []) {
          const key = `${provider}:${asset.provider_id || asset.source_url || asset.title}`;
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push(scoreCandidate(asset, provider, config, shot, query));
        }
      } catch (error) {
        warnings.push(`${provider} [${query}]: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  candidates.sort((a,b) => b.editorialScore - a.editorialScore || String(a.title).localeCompare(String(b.title)));
  const shortlisted = candidates.slice(0, limitPerBeat);
  const selected = shortlisted.find((candidate) => candidate.editorialScore >= 62 && candidate.rights?.license_status !== 'restricted') || null;
  const status = !selected ? 'blocked-no-candidate' : selected.rights?.license_status === 'unknown' ? 'selected-needs-rights-review' : 'selected-needs-event-review';
  console.log(`  Typ ${mediaType} · Provider ${providers.join(', ') || 'keine'} · Kandidaten ${shortlisted.length}`);
  if (selected) console.log(`  Vorauswahl [${selected.editorialScore}] ${selected.provider}: ${selected.title}`);
  else console.log('  BLOCK: kein ausreichend guter Kandidat.');
  return {
    id: shot.id,
    beatId: shot.beatId || shot.id,
    case: shot.case || null,
    narrationAnchor: shot.narrationAnchor || '',
    visualIntent: shot.visualIntent || '',
    editorialVisualType: shot.editorialVisualType || null,
    presentation: shot.renderer?.presentation || 'auto',
    mediaType,
    queries,
    providerOrder: providers,
    exactSourceUrl: shot.sourceUrl || null,
    exactDirectMediaUrl: shot.directMediaUrl || null,
    selectedCandidateId: selected?.candidateId || null,
    status,
    warnings,
    candidates: shortlisted
  };
}

function exactSourceCandidate(shot, mediaType) {
  const direct = String(shot.directMediaUrl || '').trim();
  const downloads = direct ? [{quality:'phase1-direct',url:direct,width:null,height:null,size:null,file_type:guessMime(direct, mediaType),preview_url:null}] : [];
  return {
    candidateId: `exact-source-${shot.id}`,
    provider: 'exact-source',
    providerTier: 'phase1-source',
    providerId: null,
    type: mediaType,
    title: shot.visualIntent || shot.narrationAnchor || shot.id,
    description: 'Exact source URL locked in Phase 1.',
    sourceUrl: shot.sourceUrl,
    previewUrl: null,
    creator: null,
    width: null,
    height: null,
    durationSeconds: null,
    downloads,
    rights: rightsFromHint(shot.rightsHint),
    editorialScore: 96,
    editorialSignals: {exactPhase1Source:true,hasDirectMedia:Boolean(direct),sourceTier:'phase1-source',eventIdentityReviewRequired:true},
    downloadable: Boolean(direct),
    ingestion: direct ? 'phase1-direct-download' : 'source-specific-or-manual'
  };
}

function scoreCandidate(asset, provider, config, shot, searchQuery) {
  const query = `${shot.case || ''} ${shot.narrationAnchor || ''} ${shot.visualIntent || ''}`;
  const queryWords = tokens(query);
  const haystack = `${asset.title || ''} ${asset.description || ''} ${(asset.tags || []).join(' ')}`.toLowerCase();
  const matched = queryWords.filter((word) => haystack.includes(word));
  const overlap = queryWords.length ? matched.length / queryWords.length : 0;
  let score = tierScore(config.tier) + Math.round(overlap * 32);
  const rights = asset.rights || {};
  if (rights.license_status === 'public-domain') score += 18;
  else if (rights.license_status === 'licensed') score += 10;
  else if (rights.license_status === 'restricted') score -= 35;
  else score -= 12;
  const width = Number(asset.width || 0), height = Number(asset.height || 0);
  if (Math.max(width,height) >= 1920) score += 7;
  else if (Math.max(width,height) >= 1280) score += 4;
  else if (width && height && Math.max(width,height) < 900) score -= 8;
  if (asset.preview_url) score += 2;
  if (asset.source_url) score += 3;
  if (asset.type === 'video' && Number(asset.duration_seconds || 0) >= 4) score += 3;
  const genericStockPenalty = config.tier === 'stock-fallback' ? (shot.sourceUrl ? 28 : 10) : 0;
  score -= genericStockPenalty;
  if (shot.case && haystack.includes(String(shot.case).replace(/-/g,' '))) score += 8;
  score = clamp(score, 0, 100);
  return {
    candidateId: `${provider}-${asset.provider_id || safeName(asset.title || asset.source_url)}`,
    provider, providerTier: config.tier, providerId: asset.provider_id == null ? null : String(asset.provider_id),
    type: asset.type, title: asset.title, description: asset.description || null, sourceUrl: asset.source_url || null, previewUrl: asset.preview_url || null,
    creator: asset.creator || null, creatorUrl: asset.creator_url || null, width: asset.width || null, height: asset.height || null,
    durationSeconds: asset.duration_seconds || null, orientation: asset.orientation || null, downloads: asset.downloads || [], rights,
    editorialScore: score,
    editorialSignals: {sourceTier:config.tier,query:searchQuery,queryTermsMatched:`${matched.length}/${queryWords.length}`,matchedTerms:matched.slice(0,12),rightsStatus:rights.license_status || 'unknown',genericStockPenalty,exactPhase1Source:false,eventIdentityReviewRequired:true,semanticQcRecommended:true},
    downloadable: config.downloadable !== false
  };
}

async function downloadSelected(beat, count) {
  const selectedIndex = beat.candidates.findIndex((item) => item.candidateId === beat.selectedCandidateId);
  if (selectedIndex < 0) return;
  const queue = [beat.candidates[selectedIndex], ...beat.candidates.filter((_,i) => i !== selectedIndex)].filter((item) => item.downloadable).slice(0,count);
  beat.downloads = [];
  for (const candidate of queue) {
    const download = chooseDownload(candidate, 1920);
    if (!download) { beat.downloads.push({candidateId:candidate.candidateId,status:'no-download-file'}); continue; }
    try {
      const asset = candidateToAsset(candidate);
      const downloaded = await downloadAsset({root,asset,download,provider:candidate.provider});
      const metadata = writeSourceMetadata({root,downloaded,asset,provider:candidate.provider,query:beat.queries[0] || beat.visualIntent});
      const analysis = analyzeDownloaded(downloaded.target);
      const bindingMetaDir = path.join(root,'.local-storage','beat-downloads');
      fs.mkdirSync(bindingMetaDir,{recursive:true});
      const sidecar = {projectId,beatId:beat.id,candidateId:candidate.candidateId,editorialScore:candidate.editorialScore,downloadedFile:downloaded.relativePath,sourceMetadata:metadata,analysis,status:'needs-qc-and-review'};
      const sidecarFile = path.join(bindingMetaDir,`${projectId}-${beat.id}-${safeName(candidate.candidateId)}.json`);
      fs.writeFileSync(sidecarFile,`${JSON.stringify(sidecar,null,2)}\n`);
      beat.downloads.push({candidateId:candidate.candidateId,status:'downloaded',file:downloaded.relativePath,preview:analysis.previewPath || null,sidecar:relative(sidecarFile),sha256:analysis.sha256 || null});
      console.log(`  Download: ${downloaded.relativePath}`);
    } catch (error) {
      beat.downloads.push({candidateId:candidate.candidateId,status:'failed',error:error instanceof Error ? error.message : String(error)});
    }
  }
}

function analyzeDownloaded(file) {
  const result = spawnSync(process.execPath,['scripts/analyze-media.mjs','--file',file],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if (result.status !== 0) return {error:(result.stderr || result.stdout || 'analysis failed').trim()};
  try { return JSON.parse(result.stdout); } catch { return {error:'analysis returned invalid JSON'}; }
}
function candidateToAsset(candidate) { return {provider:candidate.provider,provider_id:candidate.providerId,type:candidate.type,title:candidate.title,description:candidate.description,source_url:candidate.sourceUrl,creator:candidate.creator,creator_url:candidate.creatorUrl,width:candidate.width,height:candidate.height,duration_seconds:candidate.durationSeconds,orientation:candidate.orientation,preview_url:candidate.previewUrl,tags:[],downloads:candidate.downloads,rights:candidate.rights}; }
function providersFor(shot, mediaType, stock) {
  const priority = shot.mediaPriority || [];
  const ordered = [];
  const push = (...values) => values.forEach((value) => { if (!ordered.includes(value) && PROVIDERS[value]?.types.includes(mediaType)) ordered.push(value); });
  for (const item of priority) {
    if (/official/.test(item)) push('nasa','noaa','usgs','nara','smithsonian','library-of-congress');
    if (/archive/.test(item)) push('europeana','wikimedia','internet-archive');
    if (/open-media/.test(item)) push('openverse');
    if (/stock/.test(item) && stock) push('pexels','pixabay');
  }
  push('nasa','noaa','usgs','nara','smithsonian','library-of-congress','europeana','wikimedia','internet-archive');
  if (mediaType === 'image') push('openverse');
  if (stock) push('pexels','pixabay');
  return ordered;
}
function inferMediaType(shot) {
  const type = String(shot.editorialVisualType || '').toLowerCase();
  const presentation = String(shot.renderer?.presentation || '').toLowerCase();
  if (/video/.test(type) || presentation === 'vertical-blur') return 'video';
  if (/still|image|photo|document|map|diagram|before-after|title|number|detail|derived-frame/.test(type)) return 'image';
  return shot.mediaPriority?.some((x) => /video/.test(x)) ? 'video' : 'image';
}
function buildQueries(shot) {
  const values = [];
  if (shot.case) values.push(humanize(shot.case));
  if (shot.visualIntent) values.push(cleanQuery(shot.visualIntent));
  if (shot.narrationAnchor) values.push(cleanQuery(`${humanize(shot.case || '')} ${shot.narrationAnchor}`));
  if (shot.case && shot.editorialVisualType) values.push(`${humanize(shot.case)} ${String(shot.editorialVisualType).replace(/[-_]/g,' ')}`);
  return unique(values).filter(Boolean).slice(0,4);
}
function cleanQuery(value) { return String(value || '').replace(/https?:\/\/\S+/g,' ').replace(/["“”'`]/g,' ').replace(/\b(actual|exact|real|clean|short|simple|small|background|full screen|full-screen|visual|image|photo|video|overlay|motion)\b/gi,' ').replace(/[^A-Za-z0-9À-ÿ€$.,()\- ]+/g,' ').replace(/\s+/g,' ').trim().split(' ').slice(0,14).join(' '); }
function rightsFromHint(hint) {
  const text = String(hint || '').toLowerCase();
  if (!text) return {license_status:'unknown',warning:'Phase-1 source has no machine-readable license yet.'};
  if (/public domain|public-domain|gemeinfrei/.test(text)) return {license_status:'public-domain',warning:'Rights hint came from Phase 1 and must still be verified at source.'};
  if (/creative commons|\bcc\b/.test(text)) return {license_status:'licensed',warning:'Exact CC terms/attribution must be verified at source.'};
  return {license_status:'unknown',warning:'Rights hint requires source verification.'};
}
function guessMime(url, type) { const value = String(url).toLowerCase().split('?')[0]; if (value.endsWith('.mp4')) return 'video/mp4'; if (value.endsWith('.webm')) return 'video/webm'; if (value.endsWith('.png')) return 'image/png'; if (value.endsWith('.webp')) return 'image/webp'; return type === 'video' ? 'video/mp4' : 'image/jpeg'; }
function tierScore(tier) { if (tier === 'official-archive') return 46; if (tier === 'archive') return 34; if (tier === 'open-media') return 23; if (tier === 'stock-fallback') return 4; return 0; }
function summarize(beats) { return {total:beats.length,selected:beats.filter((x)=>x.selectedCandidateId).length,downloaded:beats.reduce((sum,x)=>sum+(x.downloads || []).filter((d)=>d.status==='downloaded').length,0),blocked:beats.filter((x)=>x.status.startsWith('blocked')).length,rightsReview:beats.filter((x)=>x.status==='selected-needs-rights-review').length,eventReview:beats.filter((x)=>x.status==='selected-needs-event-review').length}; }
function saveReport() { fs.mkdirSync(path.dirname(outputFile),{recursive:true}); fs.writeFileSync(outputFile,`${JSON.stringify(report,null,2)}\n`); }
function tokens(value) { return unique(String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter((x)=>x.length>=3)).slice(0,20); }
function humanize(value) { return String(value || '').replace(/[-_]+/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase()); }
function unique(values) { const seen=new Set(),out=[]; for(const value of values){const text=String(value || '').trim(),key=text.toLowerCase();if(!text||seen.has(key))continue;seen.add(key);out.push(text);} return out; }
function safeName(value) { return String(value || 'asset').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70) || 'asset'; }
function slug(value) { return safeName(value); }
function clamp(value,min,max) { return Math.max(min,Math.min(max,value)); }
function relative(file) { const rel=path.relative(root,file); return rel.startsWith('..') ? file : rel.split(path.sep).join('/'); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(error){ fail(`JSON ungültig: ${relative(file)} – ${error.message}`); } }
function integer(value,min,max,label) { const n=Number(value); if(!Number.isInteger(n)||n<min||n>max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function parseArgs(values) { const result={_:[]}; for(let i=0;i<values.length;i++){const token=values[i];if(!token.startsWith('--')){result._.push(token);continue;}const key=token.slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());if(key==='help'){result.help=true;continue;}const next=values[i+1];if(!next||next.startsWith('--'))fail(`Wert für ${token} fehlt.`);result[key]=next;i++;}return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Phase-1 Materializer v4\n\n  npm run phase1:materialize -- --project <id> --download-top 1\n\nBekannte directMediaUrl-Dateien aus Phase 1 werden jetzt lokal heruntergeladen. Danach folgen Visual-QC, Katalog-/Rechteprüfung und Binding. Phase 3 darf nicht mehr aus dem Internet nachladen.`); }
