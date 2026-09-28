import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }

const planFile = path.resolve(args.plan || args._[0] || '');
if (!planFile || !fs.existsSync(planFile)) fail('Visual-Plan fehlt. Nutze --plan projects/<id>/visual-plan.json.');
const visualPlan = readJson(planFile);
if (!Array.isArray(visualPlan.beats) || !visualPlan.beats.length) fail('visual-plan.json enthält keine beats.');

const styleProfile = args.styleProfile ? readJson(path.resolve(args.styleProfile)) : null;
const defaultRange = styleProfile?.editingProfile?.targetVisualSeconds || rangeFromStyle(visualPlan.style?.normalVisualSeconds) || [3.5, 6.5];
const insertRange = styleProfile?.editingProfile?.recommendedInsertSeconds || rangeFromStyle(visualPlan.style?.insertSeconds) || [1.5, 3.5];

const shots = visualPlan.beats.map((beat, index) => planBeat(beat, index, defaultRange, insertRange));
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  projectId: visualPlan.projectId || null,
  sourceVisualPlan: relative(planFile),
  sourceStyleProfile: args.styleProfile ? relative(path.resolve(args.styleProfile)) : null,
  policy: {
    editorialIntentWins: true,
    phase1Locked: true,
    stockFallbackOnly: true,
    autoReuseUnclearedMedia: false,
    note: 'Der Planner übersetzt bereits recherchierte Phase-1-Beats in Renderer-Spezifikationen. Er erfindet keine neue Geschichte und ersetzt keine Rechteprüfung.'
  },
  defaults: {
    targetVisualSeconds: defaultRange,
    insertSeconds: insertRange,
    transition: styleProfile?.editingProfile?.hardCutBias === false ? 'fade' : 'cut'
  },
  shots
};

const output = path.resolve(args.output || path.join(path.dirname(planFile), 'shot-plan.json'));
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Shot-Plan erstellt: ${relative(output)}`);
console.log(`${shots.length} Beats · ${shots.filter((x) => x.renderer.presentation === 'vertical-blur').length} vertical · ${shots.filter((x) => x.overlays.length).length} mit Overlay`);

function planBeat(beat, index, normalRange, insertRange) {
  const text = `${beat.narrationAnchor || ''} ${beat.visual || ''} ${beat.motion || ''}`.toLowerCase();
  const type = String(beat.visualType || '').toLowerCase();
  const presentation = presentationFor(type, text);
  const durationRange = isInsert(type, text) ? insertRange : normalRange;
  const overlays = overlaysFor(beat, type, text);
  const mediaPriority = priorityFor(type, text);
  const preprocess = preprocessFor(type, presentation, text);
  const transition = /fade|dissolve/.test(String(beat.motion || '').toLowerCase()) ? 'fade' : 'cut';
  return compact({
    id: beat.id || `beat-${String(index + 1).padStart(2, '0')}`,
    case: beat.case || undefined,
    narrationAnchor: beat.narrationAnchor || '',
    approx: beat.approx || undefined,
    editorialVisualType: beat.visualType || 'real-media',
    visualIntent: beat.visual || '',
    sourceUrl: beat.sourceUrl || undefined,
    sources: beat.sources || undefined,
    rightsHint: beat.rights || undefined,
    mediaPriority,
    targetDurationSeconds: durationRange,
    renderer: {
      presentation,
      transition,
      fit: presentation === 'document' || presentation === 'article' ? 'contain' : 'cover',
      motion: motionFor(presentation, type, text)
    },
    overlays,
    preprocess,
    qualityGate: {
      eventMatchRequired: true,
      minimumSemanticRelevance: 0.7,
      requireRightsReview: true,
      rejectGenericStockWhenExactMediaExists: true
    }
  });
}

function presentationFor(type, text) {
  if (/article|headline|news/.test(type)) return 'article';
  if (/document|report/.test(type)) return 'document';
  if (/map|route|trajectory/.test(type) || /karte|route|flugbahn|bahnsteig/.test(text)) return 'map';
  if (/freeze/.test(type) || /freeze/.test(text)) return 'freeze-frame';
  if (/vertical|phone|smartphone|tiktok|reel/.test(type)) return 'vertical-blur';
  if (/comparison|before-after|two-image/.test(type)) return 'comparison';
  if (/title/.test(type)) return 'headline';
  return 'auto';
}
function overlaysFor(beat, type, text) {
  const overlays = [];
  const label = shortLabel(beat);
  if (label) overlays.push({ kind: 'label', text: label, position: 'top-left' });
  const number = extractImpactNumber(`${beat.narrationAnchor || ''} ${beat.visual || ''}`);
  if (number && /number|million|mio|euro|dollar|millimeter|bahnsteig/.test(`${type} ${text}`)) {
    overlays.push({ kind: 'number', text: number, position: 'bottom-left' });
  }
  if (/title/.test(type)) {
    const title = quoteText(beat.visual) || String(beat.narrationAnchor || '').trim();
    if (title) overlays.push({ kind: 'headline', text: title.slice(0, 90), position: 'center' });
  }
  if (/highlight|marker|callout|bolt|schraub|1\.3 mm|1,3 mm|platform edge|bahnsteigkante/.test(`${beat.motion || ''} ${text}`)) {
    overlays.push({ kind: 'callout', text: calloutText(beat), position: 'auto' });
  }
  if (beat.sourceUrl) overlays.push({ kind: 'source', text: sourceHost(beat.sourceUrl), position: 'bottom-right' });
  return dedupeOverlays(overlays);
}
function priorityFor(type, text) {
  if (/official-document|document|report/.test(type)) return ['official-document', 'official-archive', 'archive', 'open-media'];
  if (/archive-video|real-video|video/.test(type)) return ['exact-event-video', 'official-archive', 'archive', 'specific-broll'];
  if (/archive|photo|image|still|before-after/.test(type)) return ['exact-event-image', 'official-archive', 'archive', 'open-media'];
  if (/map|route|trajectory/.test(type) || /route|karte|flugbahn/.test(text)) return ['official-map-or-diagram', 'archive-diagram', 'generated-map'];
  if (/title|number|explainer|technical/.test(type)) return ['real-media-background', 'official-document', 'archive', 'generated-graphic'];
  return ['exact-event-media', 'official-archive', 'archive', 'specific-broll', 'stock-fallback'];
}
function preprocessFor(type, presentation, text) {
  const steps = [];
  if (presentation === 'freeze-frame') steps.push({ tool: 'ffmpeg', action: 'extract-freeze-frame', required: true });
  if (presentation === 'map') steps.push({ tool: 'map', action: 'prepare-16x9-map-base', required: false });
  if (/archive-video|video/.test(type)) steps.push({ tool: 'clip:find', action: 'rank-best-subclip', required: false });
  if (/document|article/.test(presentation)) steps.push({ tool: 'research:capture', action: 'capture-source-if-needed', required: false });
  if (/comparison/.test(presentation)) steps.push({ tool: 'editorial', action: 'resolve-secondary-asset', required: true });
  if (/vertical/.test(presentation)) steps.push({ tool: 'renderer', action: 'blur-sidefill', required: true });
  return steps;
}
function motionFor(presentation, type, text) {
  if (presentation === 'freeze-frame') return 'freeze + subtle push-in';
  if (presentation === 'article' || presentation === 'document') return 'top-focus + slow document pan';
  if (presentation === 'map') return /trace|route|flugbahn/.test(text) ? 'route trace + gentle map push' : 'gentle map push + marker';
  if (presentation === 'comparison') return 'split-screen + hard cut';
  if (presentation === 'headline') return 'fast scale-in + short hold';
  if (/counter|count-up|number/.test(text)) return 'impact number reveal';
  return 'subtle documentary push/pan';
}
function shortLabel(beat) {
  const anchor = String(beat.narrationAnchor || '');
  const year = anchor.match(/\b(19|20)\d{2}\b/)?.[0];
  if (beat.case && year) return `${humanize(beat.case)} · ${year}`;
  if (beat.case) return humanize(beat.case);
  return null;
}
function extractImpactNumber(value) {
  const text = String(value);
  const patterns = [
    /(?:≈|~)?\s*\d+(?:[.,]\d+)?\s*(?:MIO\.?|MILLIONEN?)\s*(?:€|\$|EURO|DOLLAR)?/i,
    /(?:≈|~)?\s*\d+(?:[.,]\d+)?\s*(?:MM|MILLIMETER)/i,
    /(?:≈|~)?\s*\d[\d. ]*\s*BAHNSTEIG(?:E|EN)?/i,
    /\b24\s+SCHRAUBEN\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim().toUpperCase();
  }
  return null;
}
function calloutText(beat) {
  const text = String(beat.narrationAnchor || beat.motion || '').trim();
  if (/24.*schraub/i.test(text)) return '24 Schrauben';
  if (/1[,.]3.*millimeter/i.test(text)) return '1,3 mm';
  if (/bahnsteig/i.test(text)) return 'Bahnsteigkante';
  return text.split(/[.!?]/)[0].slice(0, 54) || 'Detail';
}
function quoteText(value) { return String(value || '').match(/["'„“]([^"'„“]{3,100})["'„“]/)?.[1] || null; }
function sourceHost(value) { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return 'Quelle'; } }
function isInsert(type, text) { return /insert|montage|title|number|overlay/.test(type) || /immediate cut|fast|quick|1\.\d|0\.\d/.test(text); }
function rangeFromStyle(value) { const match = String(value || '').match(/([0-9.]+)\s*-\s*([0-9.]+)/); return match ? [Number(match[1]), Number(match[2])] : null; }
function dedupeOverlays(values) { const seen = new Set(); return values.filter((item) => { const key = `${item.kind}|${item.text}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function humanize(value) { return String(value).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function compact(value) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${file}\n${error.message}`); } }
function relative(file) { const rel = path.relative(root, file); return rel.startsWith('..') ? file : rel.split(path.sep).join('/'); }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Editorial Beat Planner\n\n  npm run beat:plan -- --plan projects/<id>/visual-plan.json\n  npm run beat:plan -- --plan projects/<id>/visual-plan.json --style-profile .local-storage/reference-style/ref/style-profile.json\n\nErzeugt shot-plan.json mit:\n- Renderer-Präsentation\n- Quellenpriorität\n- Shot-Dauer\n- Overlays/Callouts\n- Preprocessing-Schritten\n- Qualitäts-Gates\n\nPhase-1-Intent bleibt maßgeblich; die Automatik erfindet keine neue Story.`); }
