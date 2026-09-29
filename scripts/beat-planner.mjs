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
  version: 2,
  generatedAt: new Date().toISOString(),
  projectId: visualPlan.projectId || null,
  sourceVisualPlan: relative(planFile),
  sourceStyleProfile: args.styleProfile ? relative(path.resolve(args.styleProfile)) : null,
  policy: {
    editorialIntentWins: true,
    phase1Locked: true,
    stockFallbackOnly: true,
    realMediaFirst: true,
    syntheticExplainerGraphics: false,
    defaultOverlayMode: 'none',
    explicitOverlayOnly: true,
    remotionRole: 'assembly-only',
    autoReuseUnclearedMedia: false,
    note: 'Der Planner schneidet und bewegt recherchierte reale Medien. Er erzeugt keine automatischen Infografiken, Teilchen-/Elektronenanimationen, Pfeile, Kreise, Callouts oder mittigen Textkarten. Wenn eine Erklärung visuell nötig ist, muss Phase 1 ein echtes Foto, Video, Dokument oder offizielles Diagramm festlegen.'
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
console.log(`${shots.length} Beats · ${shots.filter((x) => x.renderer.presentation === 'vertical-blur').length} vertical · ${shots.filter((x) => x.overlays.length).length} explizite Overlays`);

function planBeat(beat, index, normalRange, insertRange) {
  const text = `${beat.narrationAnchor || ''} ${beat.visual || ''} ${beat.motion || ''}`.toLowerCase();
  const type = String(beat.visualType || '').toLowerCase();
  const presentation = presentationFor(type, text);
  const durationRange = isInsert(type, text) ? insertRange : normalRange;
  const overlays = overlaysFor(beat);
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
      motion: motionFor(presentation, type, text),
      role: 'assembly-only'
    },
    overlays,
    preprocess,
    qualityGate: {
      eventMatchRequired: true,
      minimumSemanticRelevance: 0.7,
      requireRightsReview: true,
      rejectGenericStockWhenExactMediaExists: true,
      rejectSyntheticExplainerWhenRealMediaExists: true
    }
  });
}

function presentationFor(type, text) {
  if (/article|news/.test(type)) return 'article';
  if (/document|report/.test(type)) return 'document';
  if (/map|route|trajectory/.test(type)) return 'map';
  if (/freeze/.test(type)) return 'freeze-frame';
  if (/vertical|phone|smartphone|tiktok|reel/.test(type)) return 'vertical-blur';
  if (/comparison|before-after|two-image/.test(type)) return 'auto';
  return 'auto';
}
function overlaysFor(beat) {
  if (!Array.isArray(beat.overlays)) return [];
  const allowedKinds = new Set(['source', 'label', 'number']);
  const overlays = beat.overlays
    .filter((item) => item && allowedKinds.has(String(item.kind || '')) && String(item.text || '').trim())
    .map((item) => ({
      kind: item.kind,
      text: String(item.text).trim().slice(0, 90),
      position: item.position === 'center' ? 'bottom-left' : (item.position || 'bottom-left')
    }));
  return dedupeOverlays(overlays);
}
function priorityFor(type, text) {
  if (/official-document|document|report|explainer|technical/.test(type)) return ['official-document-or-diagram', 'official-archive', 'archive', 'open-media'];
  if (/archive-video|real-video|video/.test(type)) return ['exact-event-video', 'official-archive', 'archive', 'specific-broll'];
  if (/archive|photo|image|still|before-after|detail/.test(type)) return ['exact-event-image', 'official-archive', 'archive', 'open-media'];
  if (/map|route|trajectory/.test(type)) return ['official-map-or-diagram', 'archive-diagram', 'generated-map-last-resort'];
  return ['exact-event-media', 'official-archive', 'archive', 'specific-broll', 'stock-fallback'];
}
function preprocessFor(type, presentation, text) {
  const steps = [];
  if (presentation === 'freeze-frame') steps.push({ tool: 'ffmpeg', action: 'extract-freeze-frame', required: true });
  if (presentation === 'map') steps.push({ tool: 'map', action: 'prepare-16x9-map-base', required: false });
  if (/archive-video|video/.test(type)) steps.push({ tool: 'clip:find', action: 'rank-best-subclip', required: false });
  if (/document|article/.test(presentation)) steps.push({ tool: 'research:capture', action: 'capture-source-if-needed', required: false });
  if (/comparison|before-after|two-image/.test(type)) steps.push({ tool: 'editorial', action: 'resolve-secondary-real-asset', required: true });
  if (/vertical/.test(presentation)) steps.push({ tool: 'renderer', action: 'blur-sidefill', required: true });
  return steps;
}
function motionFor(presentation, type, text) {
  if (presentation === 'freeze-frame') return 'freeze + subtle push-in';
  if (presentation === 'article' || presentation === 'document') return 'top-focus + slow document pan';
  if (presentation === 'map') return 'gentle map push';
  if (/comparison|before-after|two-image/.test(type)) return 'resolve secondary real asset, then hard-cut or simple split-screen';
  if (/fast|montage|rapid/.test(`${type} ${text}`)) return 'hard cuts using real media';
  return 'subtle documentary push/pan';
}
function isInsert(type, text) { return /insert|montage/.test(type) || /immediate cut|fast|quick|1\.\d|0\.\d/.test(text); }
function rangeFromStyle(value) { const match = String(value || '').match(/([0-9.]+)\s*-\s*([0-9.]+)/); return match ? [Number(match[1]), Number(match[2])] : null; }
function dedupeOverlays(values) { const seen = new Set(); return values.filter((item) => { const key = `${item.kind}|${item.text}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function compact(value) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${file}\n${error.message}`); } }
function relative(file) { const rel = path.relative(root, file); return rel.startsWith('..') ? file : rel.split(path.sep).join('/'); }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Editorial Beat Planner\n\n  npm run beat:plan -- --plan projects/<id>/visual-plan.json\n  npm run beat:plan -- --plan projects/<id>/visual-plan.json --style-profile .local-storage/reference-style/ref/style-profile.json\n\nErzeugt shot-plan.json mit:\n- Renderer-Präsentation\n- Quellenpriorität\n- Shot-Dauer\n- expliziten Overlays nur wenn Phase 1 sie ausdrücklich vorgibt\n- Preprocessing-Schritten\n- Qualitäts-Gates\n\nStandard: reale Medien, harte Schnitte, Crop/Trim und subtile Kamerabewegung. Keine automatisch erfundenen Infografiken, Callouts, Elektronen-/Teilchenanimationen oder mittigen Textkarten.`); }
