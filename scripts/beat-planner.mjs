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
const shots = visualPlan.beats.flatMap((beat, index) => planBeatShots(beat, index, defaultRange, insertRange));

const report = {
  version: 3,
  generatedAt: new Date().toISOString(),
  projectId: visualPlan.projectId || null,
  sourceVisualPlan: relative(planFile),
  sourceStyleProfile: args.styleProfile ? relative(path.resolve(args.styleProfile)) : null,
  policy: {
    editorialIntentWins: true,
    phase1Locked: true,
    stockFallbackOnly: true,
    realMediaFirst: true,
    multiShotPerBeat: true,
    syntheticExplainerGraphics: false,
    defaultOverlayMode: 'none',
    explicitOverlayOnly: true,
    calloutsDisabled: true,
    remotionRole: 'assembly-only',
    autoReuseUnclearedMedia: false,
    note: 'Ein Sprecher-Beat darf mehrere kurze Real-Media-Shots enthalten. Der Planner erzeugt keine automatischen Infografiken, Elektronen-/Teilchenanimationen, Pfeile, Kreise oder mittigen Textkarten.'
  },
  defaults: {
    targetVisualSeconds: defaultRange,
    insertSeconds: insertRange,
    transition: styleProfile?.editingProfile?.hardCutBias === false ? 'fade' : 'cut'
  },
  beats: visualPlan.beats.map((beat) => ({id: beat.id, shotIds: shots.filter((shot) => shot.beatId === beat.id).map((shot) => shot.id)})),
  shots
};

const output = path.resolve(args.output || path.join(path.dirname(planFile), 'shot-plan.json'));
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Shot-Plan erstellt: ${relative(output)}`);
console.log(`${visualPlan.beats.length} Beats → ${shots.length} Real-Media-Shots · ${shots.filter((x) => x.renderer.presentation === 'vertical-blur').length} vertical`);

function planBeatShots(beat, beatIndex, normalRange, insertRange) {
  const explicit = Array.isArray(beat.shots) && beat.shots.length ? beat.shots : null;
  const count = explicit ? explicit.length : shotCountFor(beat);
  const variants = explicit || Array.from({length: count}, (_, index) => automaticVariant(beat, index, count));
  return variants.map((variant, shotIndex) => planOneShot(beat, variant, beatIndex, shotIndex, count, normalRange, insertRange));
}

function planOneShot(beat, variant, beatIndex, shotIndex, shotCount, normalRange, insertRange) {
  const baseId = beat.id || `beat-${String(beatIndex + 1).padStart(2, '0')}`;
  const id = shotCount === 1 ? baseId : `${baseId}-s${String(shotIndex + 1).padStart(2, '0')}`;
  const visualType = variant.visualType || beat.visualType || 'real-media';
  const visual = variant.visual || variant.description || beat.visual || '';
  const text = `${beat.narrationAnchor || ''} ${visual} ${variant.motion || beat.motion || ''}`.toLowerCase();
  const type = String(visualType).toLowerCase();
  const presentation = variant.presentation || presentationFor(type, text);
  const durationRange = isInsert(type, text) ? insertRange : normalRange;
  const mediaPriority = variant.mediaPriority || priorityFor(type, text);
  const transition = /fade|dissolve/.test(String(variant.motion || beat.motion || '').toLowerCase()) ? 'fade' : 'cut';
  const sourceUrl = variant.sourceUrl || sourceForShot(beat, shotIndex);
  const directMediaUrl = variant.directMediaUrl || directMediaForShot(beat, shotIndex);
  const renderer = {
    presentation,
    transition,
    fit: presentation === 'document' || presentation === 'article' ? 'contain' : 'cover',
    motion: variant.motion || beat.motion || motionFor(presentation, type, text),
    focus: normalizeFocus(variant.focus || beat.focus),
    role: 'assembly-only'
  };

  return compact({
    id,
    beatId: baseId,
    shotIndex: shotIndex + 1,
    shotCount,
    variant: variant.variant || variant.role || automaticVariantName(shotIndex, shotCount),
    case: beat.case || undefined,
    narrationAnchor: beat.narrationAnchor || '',
    approx: beat.approx || undefined,
    editorialVisualType: visualType,
    visualIntent: visual,
    sourceUrl,
    directMediaUrl,
    sources: beat.sources || undefined,
    rightsHint: variant.rights || beat.rights || undefined,
    mediaPriority,
    targetDurationSeconds: variant.targetDurationSeconds || durationRange,
    renderer,
    overlays: overlaysFor({...beat, overlays: variant.overlays || beat.overlays}),
    preprocess: preprocessFor(type, presentation),
    qualityGate: {
      eventMatchRequired: true,
      minimumSemanticRelevance: 0.7,
      requireRightsReview: true,
      rejectGenericStockWhenExactMediaExists: true,
      rejectSyntheticExplainerWhenRealMediaExists: true
    }
  });
}

function shotCountFor(beat) {
  if (Number.isInteger(beat.shotCount) && beat.shotCount >= 1 && beat.shotCount <= 6) return beat.shotCount;
  const type = String(beat.visualType || '').toLowerCase();
  const motion = String(beat.motion || '').toLowerCase();
  const visual = String(beat.visual || '');
  if (/montage|rapid|fast/.test(`${type} ${motion}`)) return Math.min(5, Array.isArray(beat.sources) && beat.sources.length ? beat.sources.length : 4);
  if (/comparison|before-after|two-image/.test(type)) return 2;
  if (visual.length > 220) return 3;
  if (visual.length > 125) return 2;
  return 1;
}

function automaticVariant(beat, index, count) {
  const names = count === 1 ? ['primary'] : ['wide-primary', 'detail', 'alternate-context', 'alternate-detail', 'closing-impact'];
  const name = names[Math.min(index, names.length - 1)];
  let visual = beat.visual || '';
  if (index === 1) visual = `${visual} Use a distinct tighter real-media detail or crop; do not invent graphics.`;
  else if (index === 2) visual = `${visual} Use a distinct alternate real-media angle/context from an approved source.`;
  else if (index >= 3) visual = `${visual} Use another clearly different approved real-media moment; avoid visual repetition.`;
  return {variant: name, visual};
}
function automaticVariantName(index, count) { return count === 1 ? 'primary' : `variant-${index + 1}`; }
function sourceForShot(beat, index) {
  if (Array.isArray(beat.sources) && beat.sources[index]) return beat.sources[index];
  if (index === 0 && beat.sourceUrl) return beat.sourceUrl;
  return undefined;
}
function directMediaForShot(beat, index) { return index === 0 ? beat.directMediaUrl : undefined; }

function presentationFor(type, text) {
  if (/article|news/.test(type)) return 'article';
  if (/document|report/.test(type)) return 'document';
  if (/map|route|trajectory/.test(type)) return 'map';
  if (/freeze|derived-frame/.test(type)) return 'freeze-frame';
  if (/vertical|phone|smartphone|tiktok|reel/.test(type)) return 'vertical-blur';
  return 'auto';
}
function overlaysFor(beat) {
  if (!Array.isArray(beat.overlays)) return [];
  const allowedKinds = new Set(['source', 'label', 'number']);
  return dedupeOverlays(beat.overlays
    .filter((item) => item && allowedKinds.has(String(item.kind || '')) && String(item.text || '').trim())
    .map((item) => ({kind: item.kind, text: String(item.text).trim().slice(0, 90), position: item.position === 'center' ? 'bottom-left' : (item.position || 'bottom-left')})));
}
function priorityFor(type) {
  if (/official-document|document|report|explainer|technical/.test(type)) return ['official-document-or-diagram', 'official-archive', 'archive', 'open-media'];
  if (/archive-video|real-video|video/.test(type)) return ['exact-event-video', 'official-archive', 'archive', 'specific-broll'];
  if (/archive|photo|image|still|before-after|detail|derived-frame/.test(type)) return ['exact-event-image', 'official-archive', 'archive', 'open-media'];
  if (/map|route|trajectory/.test(type)) return ['official-map-or-diagram', 'archive-diagram', 'generated-map-last-resort'];
  return ['exact-event-media', 'official-archive', 'archive', 'specific-broll', 'stock-fallback'];
}
function preprocessFor(type, presentation) {
  const steps = [];
  if (presentation === 'freeze-frame') steps.push({tool: 'ffmpeg', action: 'extract-freeze-frame', required: true});
  if (presentation === 'map') steps.push({tool: 'map', action: 'prepare-16x9-map-base', required: false});
  if (/archive-video|video/.test(type)) steps.push({tool: 'clip:find', action: 'rank-best-subclip', required: false});
  if (presentation === 'document' || presentation === 'article') steps.push({tool: 'research:capture', action: 'capture-source-if-needed', required: false});
  if (presentation === 'vertical-blur') steps.push({tool: 'renderer', action: 'blur-sidefill', required: true});
  return steps;
}
function motionFor(presentation, type) {
  if (presentation === 'freeze-frame') return 'freeze + subtle push-in';
  if (presentation === 'article' || presentation === 'document') return 'top-focus + slow document pan';
  if (presentation === 'map') return 'gentle map push';
  if (/fast|montage|rapid/.test(type)) return 'hard cuts using real media';
  return 'subtle documentary push/pan';
}
function normalizeFocus(value) {
  if (!value || typeof value !== 'object') return undefined;
  const x = clampNumber(value.x ?? value.focusX, 0, 100);
  const y = clampNumber(value.y ?? value.focusY, 0, 100);
  if (x == null || y == null) return undefined;
  return {x, y};
}
function clampNumber(value, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : null; }
function isInsert(type, text) { return /insert/.test(type) || /immediate cut|0\.\d/.test(text); }
function rangeFromStyle(value) { const match = String(value || '').match(/([0-9.]+)\s*-\s*([0-9.]+)/); return match ? [Number(match[1]), Number(match[2])] : null; }
function dedupeOverlays(values) { const seen = new Set(); return values.filter((item) => { const key = `${item.kind}|${item.text}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function compact(value) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON konnte nicht gelesen werden: ${file}\n${error.message}`); } }
function relative(file) { const rel = path.relative(root, file); return rel.startsWith('..') ? file : rel.split(path.sep).join('/'); }
function parseArgs(values) { const result = {_: []}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Editorial Beat Planner v3\n\n  npm run beat:plan -- --plan projects/<id>/visual-plan.json\n\nNeu: Ein Sprecher-Beat darf mehrere Real-Media-Shots enthalten. Explizit über beat.shots[] / beat.shotCount oder automatisch bei Montagen, Vergleichen und längeren Visual-Intents. Jeder Shot bekommt beatId + eigene Shot-ID. Keine automatisch erfundenen Erklärgrafiken.`); }
