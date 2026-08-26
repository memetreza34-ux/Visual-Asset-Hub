import { createHash } from 'node:crypto';

const MAX_SCRIPT_CHARS = 40000;
const MAX_UNITS = 120;
const STOPWORDS = new Set('aber alle auch beim eine einem einen einer eines fuer für gegen hat haben hier ihm ihn ihre immer ist mit nach nicht noch oder sein seine seinen seiner sich sind ueber über und von war waren wird wurde wurden der die das den dem des ein zu zum zur im in am an auf aus bei bis durch ohne um als wie so dass this that with from into about after before the and for are was were will can could would should'.split(/\s+/));

const CHANNEL_RULES = [
  ['combat-sports', ['ufc','mma','boxen','boxer','kampf','kämpfer','kickbox','wrestling','octagon','sparring','knockout','ko']],
  ['electro', ['strom','spannung','ampere','volt','rcd','leitungsschutz','sicherung','schütz','motor','transformator','elektrisch','elektrotechnik','schaltanlage','kabel','leiter']],
  ['finance', ['aktie','aktien','etf','börse','boerse','inflation','geld','investment','investieren','rendite','krypto','bitcoin','zins','finanzen','markt','trading']],
  ['ai', ['ki','künstliche intelligenz','kuenstliche intelligenz','ai','robot','roboter','machine learning','chatbot','llm','neural','algorithmus','automatisierung']]
];

const INTENT_RULES = [
  ['history', ['histor','damals','jahrhundert','krieg','archiv','gegründet','gegruendet','früher','frueher','ursprung']],
  ['place', ['stadt','land','straße','strasse','gebäude','gebaeude','ort','region','hauptstadt','insel','berg','arena','stadion']],
  ['event', ['event','konferenz','messe','wahl','finale','turnier','veranstaltung','launch','keynote','premiere']],
  ['person', ['präsident','praesident','ceo','gründer','gruender','kämpfer','kaempfer','sänger','saenger','schauspieler','forscher','politiker']],
  ['technology', ['ki','ai','roboter','robot','software','hardware','gerät','geraet','system','motor','rcd','transformator','sensor','chip','server','computer','maschine']],
  ['finance', ['aktie','etf','börse','boerse','geld','inflation','rendite','markt','bitcoin','krypto','zins']],
  ['process', ['produziert','hergestellt','montiert','arbeitet','funktioniert','operiert','trainiert','entwickelt','baut','erstellt','fährt','faehrt','läuft','laeuft']],
  ['action', ['kämpft','kaempft','kämpfte','kaempfte','besiegt','besiegte','schlägt','schlaegt','schlug','gewinnt','gewann','verliert','verlor','rennt','springt','fährt','faehrt','fliegt','bewegt','greift','schießt','schiesst','knockout']],
  ['product', ['produkt','modell','gerät','geraet','auto','smartphone','telefon','maschine','fahrzeug','app','software']],
  ['abstract', ['zukunft','gefahr','risiko','chance','verändert','veraendert','einfluss','problem','wachstum','krise','fortschritt']]
];

const INTENT_META = {
  person: { label: 'Person / Portrait / Kontext', category: 'people-lifestyle', media: 'photo', modifiers: ['portrait', 'interview', 'public appearance'] },
  product: { label: 'Produkt / Objekt / Nutzung', category: 'objects-products', media: 'photo', modifiers: ['product close up', 'in use', 'detail'] },
  place: { label: 'Ort / Umgebung / Establishing', category: 'travel-places', media: 'video', modifiers: ['city b roll', 'location establishing shot', 'street life'] },
  event: { label: 'Event / Bühne / Publikum', category: 'news-events', media: 'video', modifiers: ['event b roll', 'stage crowd', 'press conference'] },
  technology: { label: 'Technik / Gerät / Anwendung', category: 'science-engineering', media: 'video', modifiers: ['technology b roll', 'device close up', 'technology in use'] },
  finance: { label: 'Finanzen / Markt / Symbolbild', category: 'money-finance', media: 'video', modifiers: ['finance b roll', 'stock market screen', 'money business'] },
  history: { label: 'Historie / Archiv / Kontext', category: 'culture-entertainment', media: 'photo', modifiers: ['historical archive', 'historic photo', 'timeline context'] },
  process: { label: 'Prozess / Arbeit / Ablauf', category: 'industry-trades', media: 'video', modifiers: ['process b roll', 'working close up', 'production process'] },
  action: { label: 'Action / Bewegung', category: 'emotions-reactions', media: 'video', modifiers: ['action b roll', 'motion close up', 'dynamic footage'] },
  abstract: { label: 'Symbolisches / kontextuelles Visual', category: 'abstract-backgrounds', media: 'video', modifiers: ['concept b roll', 'symbolic visual', 'future technology'] },
  general: { label: 'Allgemeines B-Roll / Kontext', category: 'business-work', media: 'video', modifiers: ['b roll', 'documentary footage', 'close up'] }
};

const TRANSLATIONS = new Map([
  ['künstliche intelligenz','artificial intelligence'], ['kuenstliche intelligenz','artificial intelligence'], ['ki','AI'],
  ['roboter','robot'], ['robotik','robotics'], ['humanoid','humanoid'], ['automatisierung','automation'], ['industrie','industry'],
  ['fabrik','factory'], ['fabriken','factory'], ['produktion','production'], ['montage','assembly'], ['arbeit','work'], ['arbeiten','working'],
  ['arbeitsplatz','workplace'], ['arbeitsplätze','jobs'], ['arbeitsplaetze','jobs'], ['menschen','people'], ['mensch','person'],
  ['alltag','daily life'], ['haushalt','home'], ['haushalte','homes'], ['zuhause','home'],
  ['krankenhaus','hospital'], ['krankenhäuser','hospital'], ['krankenhaeuser','hospital'], ['medizin','medicine'], ['gesundheit','healthcare'],
  ['operation','surgery'], ['operationen','surgery'], ['arzt','doctor'], ['ärzte','doctors'], ['aerzte','doctors'],
  ['forschung','research'], ['forscher','researcher'], ['wissenschaft','science'], ['labor','laboratory'],
  ['zukunft','future'], ['gefahr','risk'], ['risiko','risk'], ['chance','opportunity'], ['fortschritt','progress'], ['krise','crisis'],
  ['stadt','city'], ['straße','street'], ['strasse','street'], ['gebäude','building'], ['gebaeude','building'], ['arena','arena'], ['stadion','stadium'],
  ['strom','electricity'], ['spannung','voltage'], ['motor','electric motor'], ['transformator','transformer'], ['sensor','sensor'], ['kabel','cable'],
  ['computer','computer'], ['software','software'], ['hardware','hardware'], ['chip','semiconductor chip'], ['server','server'], ['rechenzentrum','data center'], ['daten','data'],
  ['aktien','stocks'], ['aktie','stock'], ['börse','stock market'], ['boerse','stock market'], ['geld','money'], ['markt','market'], ['bank','bank'],
  ['inflation','inflation'], ['bitcoin','bitcoin'], ['krypto','cryptocurrency'], ['zins','interest rates'], ['trading','trading'],
  ['training','training'], ['kampf','fight'], ['kämpfer','fighter'], ['kaempfer','fighter'], ['boxen','boxing'], ['mma','MMA'],
  ['auto','car'], ['fahrzeug','vehicle'], ['smartphone','smartphone'], ['produkt','product'], ['modell','model'],
  ['energie','energy'], ['klima','climate'], ['umwelt','environment'], ['weltraum','space'], ['satellit','satellite'],
  ['krieg','war'], ['wahl','election'], ['politik','politics'], ['regierung','government'], ['unternehmen','company'], ['firma','company']
]);

export function createScriptVisualPlan(input = {}) {
  const script = requireScript(input.script);
  const segmentation = member(input.segmentation ?? 'auto', ['auto', 'sentence', 'paragraph'], 'segmentation');
  const orientation = member(input.orientation ?? 'vertical', ['vertical', 'horizontal'], 'orientation');
  const mediaPreference = member(input.mediaPreference ?? 'mixed', ['mixed', 'video', 'photo'], 'mediaPreference');
  const depth = member(input.depth ?? 'deep', ['quick', 'deep', 'max'], 'depth');
  const requestedChannel = member(input.channel ?? 'auto', ['auto', 'general', 'finance', 'ai', 'electro', 'combat-sports'], 'channel');
  const channel = requestedChannel === 'auto' ? inferChannel(script) : requestedChannel;
  const title = cleanTitle(input.title) || autoTitle(script);
  const pieces = segmentScript(script, segmentation);
  if (!pieces.length) throw new Error('Aus dem Skript konnten keine visuellen Einheiten gebildet werden.');
  if (pieces.length > MAX_UNITS) throw new Error(`Das Skript erzeugt ${pieces.length} visuelle Einheiten. Maximal ${MAX_UNITS} sind erlaubt; bitte Absatzmodus verwenden oder das Skript teilen.`);
  const timings = allocateTimings(pieces, input.durationSeconds);
  const sceneOptions = { orientation, mediaPreference, depth, channel };
  const scenes = buildScenes(pieces, timings, sceneOptions);
  const scriptSha256 = createHash('sha256').update(script, 'utf8').digest('hex');
  return {
    format: 'visual-asset-hub-script-visual-plan',
    version: 1,
    createdAt: new Date().toISOString(),
    title,
    script,
    scriptSha256,
    channel,
    settings: { segmentation, orientation, mediaPreference, depth, durationSeconds: timings.at(-1)?.endSeconds ?? 0 },
    summary: {
      sceneCount: scenes.length,
      videoPreferred: scenes.filter((scene) => scene.preferredMediaType === 'video').length,
      photoPreferred: scenes.filter((scene) => scene.preferredMediaType === 'photo').length,
      contextInherited: scenes.filter((scene) => scene.contextInherited).length,
      queryCount: scenes.reduce((sum, scene) => sum + scene.queries.length, 0)
    },
    scenes
  };
}

export function segmentScript(value, mode = 'auto') {
  const script = requireScript(value);
  const paragraphs = script.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
  if (mode === 'paragraph') return paragraphs.flatMap((part) => splitOversized(part, 70));
  const sentences = script
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap(splitScriptLine)
    .map((part) => part.trim())
    .filter(Boolean);
  if (mode === 'sentence') return sentences.flatMap((part) => splitOversized(part, 42));
  const units = [];
  for (const sentence of sentences) {
    const words = wordCount(sentence);
    if (words > 34) units.push(...splitOversized(sentence, 28));
    else if (words < 5 && units.length && wordCount(units.at(-1)) + words <= 28) units[units.length - 1] = `${units.at(-1)} ${sentence}`;
    else units.push(sentence);
  }
  return compactAutoUnits(units, MAX_UNITS);
}

export function inferChannel(value) {
  const normalized = normalize(value);
  let best = ['general', 0];
  for (const [channel, terms] of CHANNEL_RULES) {
    const score = terms.reduce((sum, term) => sum + occurrences(normalized, normalize(term)) * (term.includes(' ') ? 3 : 1), 0);
    if (score > best[1]) best = [channel, score];
  }
  return best[1] >= 2 ? best[0] : 'general';
}

export function analyzeVisualIntent(text, options = {}) {
  const normalized = normalize(text);
  let best = ['general', 0];
  for (const [intent, terms] of INTENT_RULES) {
    const score = terms.reduce((sum, term) => sum + (normalized.includes(normalize(term)) ? 1 : 0), 0);
    if (score > best[1]) best = [intent, score];
  }
  const entities = extractEntities(text);
  const concepts = extractKeywords(text, 7);
  const intent = best[0];
  const meta = INTENT_META[intent] ?? INTENT_META.general;
  const preferred = options.mediaPreference === 'video' ? 'video' : options.mediaPreference === 'photo' ? 'photo' : meta.media;
  return { intent, label: meta.label, category: meta.category, preferredMediaType: preferred, entities, concepts, symbolic: intent === 'abstract' || intent === 'general' };
}

export function generateVisualQueries(text, analysis = analyzeVisualIntent(text), depth = 'deep') {
  const limit = depth === 'quick' ? 3 : depth === 'max' ? 5 : 4;
  const meta = INTENT_META[analysis.intent] ?? INTENT_META.general;
  const entities = unique((analysis.entities ?? []).slice(0, 3));
  const concepts = unique((analysis.concepts ?? []).slice(0, 6));
  const translatedConcepts = unique(translateTerms(concepts));
  const conceptCore = unique([...translatedConcepts, ...concepts]).slice(0, 3).join(' ').trim();
  const primaryEntity = entities[0] ?? '';
  const secondaryEntity = entities[1] ?? '';
  const conciseContext = unique([primaryEntity, ...translatedConcepts.slice(0, 2)]).join(' ').trim();
  const fallbackBase = cleanQuery(conciseContext || conceptCore || text.slice(0, 90));
  const queries = [];

  if (primaryEntity) queries.push([primaryEntity, ...translatedConcepts.slice(0, 2)].filter(Boolean).join(' '));
  if (primaryEntity && secondaryEntity) queries.push([primaryEntity, secondaryEntity, translatedConcepts[0]].filter(Boolean).join(' '));
  if (conceptCore) queries.push(`${conceptCore} ${meta.modifiers[0] ?? 'b roll'}`);
  queries.push(`${fallbackBase} ${meta.modifiers[1] ?? 'documentary footage'}`);
  queries.push(`${primaryEntity || conceptCore || fallbackBase} ${meta.modifiers[2] ?? 'close up'}`);

  if (analysis.symbolic) {
    const symbolicCore = translatedConcepts.slice(0, 3).join(' ') || conceptCore || fallbackBase;
    queries.push(`${symbolicCore} symbolic b roll`);
  }

  queries.push(cleanQuery(text.slice(0, 90)));
  return unique(queries.map(cleanQuery).filter((query) => query.length >= 2)).slice(0, limit);
}

export function allocateTimings(scenes, requestedDuration) {
  const words = scenes.map(wordCount);
  const totalWords = words.reduce((sum, value) => sum + value, 0);
  const estimated = Math.max(10, Math.round(totalWords / 2.45));
  const total = Number.isFinite(Number(requestedDuration)) && Number(requestedDuration) >= 10 && Number(requestedDuration) <= 900 ? Number(requestedDuration) : estimated;
  const floor = Math.min(1.5, total / scenes.length);
  const remaining = Math.max(0, total - floor * scenes.length);
  const weightTotal = Math.max(1, totalWords);
  let cursor = 0;
  return scenes.map((scene, index) => {
    const duration = round(floor + remaining * words[index] / weightTotal, 1);
    const startSeconds = round(cursor, 1);
    cursor += duration;
    return { startSeconds, endSeconds: index === scenes.length - 1 ? round(total, 1) : round(cursor, 1), durationSeconds: duration };
  });
}

export function projectSlug(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'script-visual-project';
}

function buildScenes(pieces, timings, options) {
  const scenes = [];
  let previousContext = { entities: [], concepts: [] };
  for (let index = 0; index < pieces.length; index += 1) {
    const scene = buildScene(pieces[index], index, timings[index], options, previousContext);
    scenes.push(scene);
    const nextEntities = scene.contextInherited
      ? unique([...scene.contextEntities, ...scene.entities])
      : unique(scene.entities);
    const nextConcepts = scene.contextInherited
      ? unique([...scene.contextConcepts, ...scene.concepts])
      : unique(scene.concepts);
    previousContext = {
      entities: nextEntities.slice(0, 3),
      concepts: nextConcepts.slice(0, 5)
    };
  }
  return scenes;
}

function buildScene(originalText, index, timing, options, previousContext = { entities: [], concepts: [] }) {
  const visual = analyzeVisualIntent(originalText, options);
  const contextInherited = shouldInheritContext(originalText, previousContext);
  const contextEntities = contextInherited ? unique(previousContext.entities ?? []).slice(0, 2) : [];
  const contextConcepts = contextInherited ? unique(previousContext.concepts ?? []).slice(0, 3) : [];
  const queryAnalysis = {
    ...visual,
    entities: unique([...contextEntities, ...visual.entities]).slice(0, 3),
    concepts: unique([...visual.concepts, ...contextConcepts]).slice(0, 6)
  };
  const queries = generateVisualQueries(originalText, queryAnalysis, options.depth);
  return {
    id: `SCENE-${String(index + 1).padStart(3, '0')}`,
    sequence: index + 1,
    originalText,
    ...timing,
    visualIntent: visual.label,
    visualIntentType: visual.intent,
    category: visual.category,
    entities: visual.entities,
    concepts: visual.concepts,
    contextInherited,
    contextEntities,
    contextConcepts,
    symbolic: visual.symbolic,
    queries,
    preferredMediaType: visual.preferredMediaType,
    orientation: options.orientation,
    candidates: [],
    selectedPrimary: null,
    selectedAlternatives: [],
    searchedAt: null,
    searchRound: 0,
    searchErrors: []
  };
}

function shouldInheritContext(text, previousContext) {
  if (!(previousContext?.entities?.length || previousContext?.concepts?.length)) return false;
  const normalized = normalize(stripListPrefix(text));
  return /^(?:er|sie|es|ihn|ihm|ihnen|diese|dieser|dieses|diesen|diesem|deren|dessen|dabei|dadurch|damit|dort|dann|so|anschliessend|anschließend|spaeter|später)\b/.test(normalized);
}

function stripListPrefix(value) {
  return String(value ?? '').replace(/^\s*(?:[-–—•]\s*|\d{1,4}[.)]\s*)/u, '').trim();
}

function compactAutoUnits(units, maxUnits) {
  const result = [...units];
  while (result.length > maxUnits) {
    let bestIndex = 0;
    let bestWords = Number.POSITIVE_INFINITY;
    for (let index = 0; index < result.length - 1; index += 1) {
      const combinedWords = wordCount(result[index]) + wordCount(result[index + 1]);
      if (combinedWords < bestWords) {
        bestWords = combinedWords;
        bestIndex = index;
      }
    }
    result.splice(bestIndex, 2, `${result[bestIndex]} ${result[bestIndex + 1]}`.trim());
  }
  return result;
}

function splitScriptLine(line) {
  const match = line.match(/^(\s*(?:[-–—•]\s*|\d{1,4}[.)]\s*))(.+)$/u);
  const prefix = match?.[1] ?? '';
  const body = (match?.[2] ?? line).trim();
  const parts = body.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„“"'])/u).map((part) => part.trim()).filter(Boolean);
  if (prefix && parts.length) parts[0] = `${prefix}${parts[0]}`.trim();
  return parts;
}

function splitOversized(text, targetWords) {
  if (wordCount(text) <= targetWords) return [text.trim()];
  const parts = text.split(/(?<=[,;:])\s+|\s+(?=(?:und|aber|während|waehrend|wobei|sowie|doch|denn)\s)/iu).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return hardSplit(text, targetWords);
  const result = [];
  let current = '';
  for (const part of parts) {
    if (!current) current = part;
    else if (wordCount(`${current} ${part}`) <= targetWords) current = `${current} ${part}`;
    else { result.push(current); current = part; }
  }
  if (current) result.push(current);
  return result.flatMap((part) => wordCount(part) > targetWords * 1.5 ? hardSplit(part, targetWords) : [part]);
}

function hardSplit(text, targetWords) {
  const words = text.split(/\s+/).filter(Boolean);
  const result = [];
  for (let i = 0; i < words.length; i += targetWords) result.push(words.slice(i, i + targetWords).join(' '));
  return result;
}

function extractEntities(text) {
  const quoted = [...text.matchAll(/[„“"']([^„“"']{2,60})[„“"']/g)].map((match) => match[1].trim());
  const years = text.match(/\b(?:18|19|20)\d{2}\b/g) ?? [];
  const named = [...text.matchAll(/\b(?:[A-ZÄÖÜ][\p{L}\d&.-]{1,30})(?:\s+[A-ZÄÖÜ0-9][\p{L}\d&.-]{1,30}){0,3}\b/gu)]
    .map((match) => match[0].trim())
    .filter((value) => !/^(?:Der|Die|Das|Ein|Eine|In|Im|Am|Bis|Seit|Heute|Morgen|Wenn|Auch|Durch|Mit|Von|Für|Und|Er|Sie|Es|Diese|Dieser|Dieses|Diesen|Diesem|Dort|Dabei|Dadurch|Damit|Dann)(?:\s|$)/u.test(value));
  return unique([...quoted, ...named, ...years]).slice(0, 8);
}

function extractKeywords(text, limit) {
  const tokens = normalize(text).split(' ').filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([token]) => token).slice(0, limit);
}

function translateTerms(values) {
  return values.flatMap((value) => {
    const normalized = normalize(value);
    const exact = TRANSLATIONS.get(normalized);
    if (exact) return [exact];
    const translated = [];
    for (const [source, target] of TRANSLATIONS) if (normalized.includes(normalize(source))) translated.push(target);
    return translated.length ? translated : [value];
  });
}

function requireScript(value) {
  if (typeof value !== 'string') throw new Error('Skript muss Text sein.');
  const text = value.replace(/\r/g, '').trim();
  if (text.length < 10 || text.length > MAX_SCRIPT_CHARS) throw new Error(`Skript muss zwischen 10 und ${MAX_SCRIPT_CHARS} Zeichen lang sein.`);
  if (/[\x00]/.test(text)) throw new Error('Skript enthält ungültige Zeichen.');
  return text;
}
function cleanTitle(value) { const text = String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim(); return text.slice(0, 100); }
function autoTitle(script) { const keywords = extractKeywords(script, 5); return keywords.length ? keywords.map(capitalize).join(' ') : `Skriptprojekt ${new Date().toISOString().slice(0, 10)}`; }
function cleanQuery(value) { return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180); }
function member(value, allowed, label) { const normalized = String(value ?? '').trim(); if (!allowed.includes(normalized)) throw new Error(`${label} ist ungültig.`); return normalized; }
function wordCount(value) { return String(value ?? '').trim().split(/\s+/).filter(Boolean).length; }
function unique(values) { return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))]; }
function normalize(value) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9äöü]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function occurrences(text, term) { if (!text || !term) return 0; let count = 0; let index = 0; while ((index = text.indexOf(term, index)) >= 0) { count += 1; index += term.length; } return count; }
function capitalize(value) { return value ? value[0].toUpperCase() + value.slice(1) : value; }
function round(value, digits = 1) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
