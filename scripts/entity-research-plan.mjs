import process from 'node:process';

const CHANNELS = new Set(['finance', 'ai', 'electro', 'combat-sports']);
const RESEARCH_TYPES = new Set(['auto', 'person', 'organization', 'product', 'event', 'place', 'technology', 'sport', 'history', 'concept']);
const STOPWORDS = new Set([
  'aber','alle','auch','beim','eine','einem','einen','einer','eines','für','gegen','hat','haben','hier','ihm','ihn','ihre','immer','ist','mit','nach','nicht','noch','oder','sein','seine','seinen','seiner','sich','sind','über','und','von','war','waren','wird','wurde','wurden','the','and','for','from','into','that','this','with','was','were','his','her','their','about','after','before'
]);

const TYPE_LABELS = {
  person: 'Person',
  organization: 'Firma / Marke / Organisation',
  product: 'Produkt / Objekt',
  event: 'Event / Veranstaltung',
  place: 'Ort / Gebäude / Region',
  technology: 'Technik / Gerät / System',
  sport: 'Sport / Kampf / Athletik',
  history: 'Historisches Thema',
  concept: 'Allgemeines Thema / Konzept'
};

const TYPE_FACETS = {
  person: [
    ['overview', 'Allgemein & aktuelle Aufnahmen', '{topic}', 'photo'],
    ['portrait', 'Portraits & Close-ups', '{topic} portrait close up', 'photo'],
    ['career', 'Karriere & Arbeit', '{topic} career work', 'video'],
    ['interview', 'Interviews & Aussagen', '{topic} interview press conference', 'video'],
    ['event', 'Events & öffentliche Auftritte', '{topic} event appearance', 'video'],
    ['action', 'Action & typische Tätigkeit', '{topic} action', 'video'],
    ['lifestyle', 'Alltag & Lifestyle', '{topic} lifestyle candid', 'photo'],
    ['people', 'Mit anderen Personen', '{topic} with team people', 'photo'],
    ['locations', 'Wichtige Orte', '{topic} location venue', 'photo'],
    ['history', 'Frühe Jahre & Historie', '{topic} early career history', 'photo'],
    ['reaction', 'Reaktionen & Emotionen', '{topic} reaction celebration emotion', 'video'],
    ['details', 'Details & Ausrüstung', '{topic} equipment details', 'photo']
  ],
  organization: [
    ['overview', 'Allgemein', '{topic}', 'photo'],
    ['branding', 'Logo & Branding', '{topic} logo branding', 'photo'],
    ['headquarters', 'Standorte & Gebäude', '{topic} headquarters office building', 'photo'],
    ['leaders', 'Gründer & Führung', '{topic} founder CEO leadership', 'photo'],
    ['team', 'Team & Arbeit', '{topic} employees team workplace', 'video'],
    ['products', 'Produkte & Angebote', '{topic} products services', 'video'],
    ['event', 'Events & Präsentationen', '{topic} event keynote conference', 'video'],
    ['history', 'Geschichte & Entwicklung', '{topic} history timeline', 'photo'],
    ['campaign', 'Kampagnen & Werbung', '{topic} campaign advertising', 'video'],
    ['customers', 'Kunden & Nutzung', '{topic} customers using product', 'video'],
    ['technology', 'Technik & Infrastruktur', '{topic} technology infrastructure', 'photo'],
    ['news', 'News & öffentliche Auftritte', '{topic} news press', 'photo']
  ],
  product: [
    ['overview', 'Produktübersicht', '{topic} product', 'photo'],
    ['hero', 'Hero Shots & Studio', '{topic} product studio', 'photo'],
    ['closeup', 'Details & Close-ups', '{topic} detail close up', 'photo'],
    ['use', 'In Benutzung', '{topic} in use demonstration', 'video'],
    ['unboxing', 'Unboxing & Setup', '{topic} unboxing setup', 'video'],
    ['comparison', 'Vergleich & Alternativen', '{topic} comparison', 'photo'],
    ['manufacturing', 'Herstellung & Produktion', '{topic} manufacturing production', 'video'],
    ['packaging', 'Verpackung & Zubehör', '{topic} packaging accessories', 'photo'],
    ['versions', 'Modelle & Generationen', '{topic} models generations', 'photo'],
    ['repair', 'Innenleben & Reparatur', '{topic} teardown repair components', 'video'],
    ['lifestyle', 'Lifestyle & Alltag', '{topic} lifestyle', 'photo'],
    ['advertising', 'Werbung & Präsentation', '{topic} advertisement commercial', 'video']
  ],
  event: [
    ['overview', 'Event allgemein', '{topic} event', 'video'],
    ['venue', 'Ort & Venue', '{topic} venue location', 'photo'],
    ['arrival', 'Ankunft & Einlass', '{topic} arrival entrance', 'video'],
    ['action', 'Hauptgeschehen', '{topic} highlights action', 'video'],
    ['stage', 'Bühne & Präsentation', '{topic} stage presentation', 'video'],
    ['audience', 'Publikum & Atmosphäre', '{topic} crowd audience atmosphere', 'video'],
    ['press', 'Presse & Interviews', '{topic} press conference interview', 'video'],
    ['backstage', 'Backstage & Vorbereitung', '{topic} backstage preparation', 'photo'],
    ['reaction', 'Reaktionen & Emotionen', '{topic} reaction celebration', 'video'],
    ['branding', 'Poster, Logos & Branding', '{topic} poster logo branding', 'photo'],
    ['location', 'Umgebung & Außenaufnahmen', '{topic} outside exterior location', 'photo'],
    ['history', 'Frühere Ausgaben & Historie', '{topic} history previous', 'photo']
  ],
  place: [
    ['overview', 'Ort allgemein', '{topic}', 'photo'],
    ['landmark', 'Sehenswürdigkeiten & Wahrzeichen', '{topic} landmark', 'photo'],
    ['aerial', 'Luftaufnahmen & Skyline', '{topic} aerial skyline', 'video'],
    ['street', 'Straßen & Alltag', '{topic} street life', 'video'],
    ['interior', 'Innenräume', '{topic} interior', 'photo'],
    ['people', 'Menschen vor Ort', '{topic} people local life', 'video'],
    ['daynight', 'Tag & Nacht', '{topic} day night', 'photo'],
    ['transport', 'Verkehr & Anreise', '{topic} transport travel', 'video'],
    ['nature', 'Natur & Umgebung', '{topic} nature surroundings', 'photo'],
    ['history', 'Geschichte & Archiv', '{topic} history historical', 'photo'],
    ['details', 'Details & Architektur', '{topic} architecture details', 'photo'],
    ['events', 'Events am Ort', '{topic} event festival', 'video']
  ],
  technology: [
    ['overview', 'Technik allgemein', '{topic} technology', 'photo'],
    ['hardware', 'Hardware & Gerät', '{topic} hardware device', 'photo'],
    ['components', 'Komponenten & Details', '{topic} components close up', 'photo'],
    ['operation', 'Betrieb & Anwendung', '{topic} operation demonstration', 'video'],
    ['installation', 'Installation & Aufbau', '{topic} installation setup', 'video'],
    ['maintenance', 'Wartung & Reparatur', '{topic} maintenance repair', 'video'],
    ['workplace', 'Im realen Einsatz', '{topic} workplace industry', 'video'],
    ['interface', 'Display, Software & UI', '{topic} interface screen software', 'photo'],
    ['diagram', 'Diagramme & Erklärgrafiken', '{topic} diagram schematic', 'photo'],
    ['manufacturing', 'Herstellung', '{topic} manufacturing factory', 'video'],
    ['history', 'Entwicklung & Generationen', '{topic} history evolution', 'photo'],
    ['future', 'Zukunft & moderne Anwendungen', '{topic} future innovation', 'video']
  ],
  sport: [
    ['overview', 'Allgemein', '{topic}', 'photo'],
    ['training', 'Training & Vorbereitung', '{topic} training gym practice', 'video'],
    ['action', 'Wettkampf & Action', '{topic} competition action', 'video'],
    ['event', 'Events & Arena', '{topic} event arena venue', 'video'],
    ['press', 'Presse & Interviews', '{topic} press conference interview', 'video'],
    ['weigh-in', 'Wiegen & Staredown', '{topic} weigh in staredown', 'video'],
    ['walkout', 'Einlauf & Entrance', '{topic} walkout entrance', 'video'],
    ['portrait', 'Portraits', '{topic} portrait athlete', 'photo'],
    ['equipment', 'Ausrüstung & Details', '{topic} equipment gear', 'photo'],
    ['reaction', 'Sieg, Niederlage & Reaktionen', '{topic} victory defeat reaction', 'video'],
    ['team', 'Team, Trainer & Umfeld', '{topic} coach team corner', 'photo'],
    ['history', 'Karriere & Historie', '{topic} career history', 'photo']
  ],
  history: [
    ['overview', 'Historischer Überblick', '{topic} history', 'photo'],
    ['archive', 'Archivmaterial', '{topic} archival historical', 'photo'],
    ['people', 'Wichtige Personen', '{topic} historical figures people', 'photo'],
    ['places', 'Historische Orte', '{topic} historical location', 'photo'],
    ['artifacts', 'Objekte & Artefakte', '{topic} artifacts objects', 'photo'],
    ['maps', 'Karten & Dokumente', '{topic} map document', 'photo'],
    ['timeline', 'Zeitleiste & Entwicklung', '{topic} timeline evolution', 'photo'],
    ['memorial', 'Denkmäler & Erinnerung', '{topic} memorial museum', 'video'],
    ['reconstruction', 'Rekonstruktion & heutiger Zustand', '{topic} reconstruction today', 'video'],
    ['culture', 'Kultur & Alltag', '{topic} culture daily life', 'photo'],
    ['events', 'Schlüsselereignisse', '{topic} key events', 'photo'],
    ['legacy', 'Folgen & Vermächtnis', '{topic} legacy impact', 'video']
  ],
  concept: [
    ['overview', 'Allgemein', '{topic}', 'photo'],
    ['people', 'Menschen & Alltag', '{topic} people lifestyle', 'video'],
    ['objects', 'Objekte & Symbole', '{topic} objects symbols', 'photo'],
    ['action', 'Handlungen & Prozesse', '{topic} process action', 'video'],
    ['work', 'Arbeit & Praxis', '{topic} work real world', 'video'],
    ['detail', 'Details & Close-ups', '{topic} detail close up', 'photo'],
    ['environment', 'Umgebung & Kontext', '{topic} environment context', 'photo'],
    ['data', 'Daten, Charts & Grafiken', '{topic} data chart infographic', 'photo'],
    ['news', 'News & Events', '{topic} news event', 'video'],
    ['history', 'Historie & Entwicklung', '{topic} history evolution', 'photo'],
    ['future', 'Zukunft & Trends', '{topic} future trends', 'video'],
    ['metaphor', 'Symbolische B-Rolls', '{topic} concept metaphor', 'video']
  ]
};

export function buildEntityResearchPlan({ topic, channel = 'combat-sports', script = '', depth = 'deep', researchType = 'auto' } = {}) {
  const cleanTopic = validateTopic(topic);
  const cleanChannel = validateChannel(channel);
  const cleanScript = validateScript(script);
  const requestedType = validateResearchType(researchType);
  const resolvedType = requestedType === 'auto' ? inferResearchType({ topic: cleanTopic, channel: cleanChannel, script: cleanScript }) : requestedType;
  const totalLimit = depth === 'quick' ? 6 : depth === 'max' ? 12 : 8;
  const maxScriptTerms = depth === 'quick' ? 2 : depth === 'max' ? 4 : 3;
  const scriptTerms = extractScriptTerms(cleanScript, cleanTopic).slice(0, maxScriptTerms);
  const reservedScriptSlots = Math.min(scriptTerms.length, maxScriptTerms);
  const baseLimit = Math.max(1, totalLimit - reservedScriptSlots);
  const templates = TYPE_FACETS[resolvedType] ?? TYPE_FACETS.concept;
  const base = templates.slice(0, baseLimit).map(([id, label, template, preferredMedia], index) => ({
    id,
    label,
    order: index + 1,
    query: template.replace('{topic}', cleanTopic),
    preferredMedia,
    origin: 'type-template'
  }));

  const existingQueries = new Set(base.map((item) => item.query.toLowerCase()));
  const extra = [];
  for (const term of scriptTerms) {
    const query = term.toLowerCase().includes(cleanTopic.toLowerCase()) ? term : `${cleanTopic} ${term}`;
    if (existingQueries.has(query.toLowerCase())) continue;
    existingQueries.add(query.toLowerCase());
    extra.push({
      id: `script-${slug(term)}`.slice(0, 80),
      label: `Skript: ${term}`,
      order: base.length + extra.length + 1,
      query,
      preferredMedia: inferScriptMedia(term),
      origin: 'script'
    });
  }

  const facets = [...base, ...extra].slice(0, totalLimit).map((item, index) => ({ ...item, order: index + 1 }));
  return {
    version: 3,
    topic: cleanTopic,
    topicSlug: slug(cleanTopic),
    channel: cleanChannel,
    researchType: resolvedType,
    researchTypeLabel: TYPE_LABELS[resolvedType],
    requestedResearchType: requestedType,
    depth: depth === 'quick' ? 'quick' : depth === 'max' ? 'max' : 'deep',
    facets,
    providers: ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'],
    photoOnlyProviders: ['unsplash', 'openverse', 'wikimedia'],
    maxSearchTasks: facets.length * 5,
    notes: [
      'Treffer sind Recherchekandidaten und keine automatische Veröffentlichungserlaubnis.',
      'Urheber-, Personen-, Marken-, Event-, Broadcast- und Nutzungskontextrechte müssen vor Nutzung geprüft werden.',
      'Importierte Treffer starten immer im Review.'
    ]
  };
}

export function inferResearchType({ topic = '', channel = 'combat-sports', script = '' } = {}) {
  const text = `${topic} ${script}`.toLowerCase();
  if (/\b(ufc|mma|boxing|boxen|kickbox|muay thai|wrestling|kampf|fight|fighter|athlete|sportler|match|bout|vs\.?|versus)\b/.test(text) || channel === 'combat-sports') return 'sport';
  if (/\b(city|stadt|land|country|region|island|insel|mountain|berg|building|gebäude|airport|flughafen|stadium|stadion|museum|park|street|straße)\b/.test(text)) return 'place';
  if (/\b(event|conference|konferenz|messe|festival|award|preisverleihung|summit|expo|gala|launch event)\b/.test(text)) return 'event';
  if (/\b(company|firma|brand|marke|corporation|corp\.?|inc\.?|gmbh|ag\b|startup|organisation|organization|verein)\b/.test(text)) return 'organization';
  if (/\b(product|produkt|phone|smartphone|car|auto|vehicle|fahrzeug|shoe|schuh|watch|uhr|camera|kamera|console|konsole|device|gerät|modell)\b/.test(text)) return 'product';
  if (/\b(history|historisch|historical|krieg|war\b|revolution|reich|empire|dynasty|jahrhundert|century|ancient|antik)\b/.test(text)) return 'history';
  if (/\b(ai|ki|artificial intelligence|robot|software|hardware|circuit|schaltung|motor|transformer|transformator|sensor|electrical|elektr|technology|technik|machine|maschine|system)\b/.test(text) || channel === 'ai' || channel === 'electro') return 'technology';
  if (/\b(ceo|founder|gründer|president|präsident|actor|schauspieler|singer|sänger|rapper|creator|influencer|professor|engineer|ingenieur)\b/.test(text)) return 'person';
  return 'concept';
}

export function extractScriptTerms(script, topic = '') {
  if (!script) return [];
  const terms = [];
  const text = String(script).replace(/\s+/g, ' ').trim();
  const opponent = /\b(?:gegen|vs\.?|versus)\s+([A-ZÄÖÜ][\p{L}'’-]+(?:\s+[A-ZÄÖÜ][\p{L}'’-]+){0,3})/giu;
  for (const match of text.matchAll(opponent)) terms.push(match[1].trim());
  for (const match of text.matchAll(/\b(?:UFC|ONE|PFL|KSW|GLORY|Bellator|WWE|CES|IFA|WWDC|GTC|MWC)\s*\d{0,4}\b/g)) terms.push(match[0].trim());
  for (const match of text.matchAll(/\b(?:19|20)\d{2}\b/g)) terms.push(match[0]);
  for (const match of text.matchAll(/\b[A-ZÄÖÜ][\p{L}'’-]{2,}(?:\s+[A-ZÄÖÜ][\p{L}'’-]{2,}){1,3}\b/gu)) terms.push(match[0].trim());
  const quoted = /[„“"']([^„“"']{3,80})[„“"']/g;
  for (const match of text.matchAll(quoted)) terms.push(match[1].trim());
  const topicParts = new Set(String(topic).toLowerCase().split(/\s+/).filter(Boolean));
  return [...new Set(terms)]
    .map((value) => value.replace(/[.,;:!?]+$/g, '').trim())
    .filter((value) => value.length >= 3 && value.length <= 80)
    .filter((value) => !STOPWORDS.has(value.toLowerCase()))
    .filter((value) => !value.toLowerCase().split(/\s+/).every((part) => topicParts.has(part)))
    .slice(0, 16);
}

export function validateTopic(value) {
  if (typeof value !== 'string') throw new Error('Thema fehlt.');
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > 120) throw new Error('Thema muss zwischen 2 und 120 Zeichen lang sein.');
  if (/[\u0000-\u001F\u007F]/.test(text)) throw new Error('Thema enthält ungültige Zeichen.');
  return text;
}

export function validateChannel(value) {
  const channel = String(value ?? '').trim();
  if (!CHANNELS.has(channel)) throw new Error('Unbekannter Kanal für Themenrecherche.');
  return channel;
}

export function validateResearchType(value) {
  const type = String(value ?? 'auto').trim();
  if (!RESEARCH_TYPES.has(type)) throw new Error('Unbekannte Rechercheart.');
  return type;
}

export function validateScript(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error('Skript muss Text sein.');
  const text = value.trim();
  if (text.length > 12000) throw new Error('Skript ist zu lang (maximal 12.000 Zeichen).');
  return text;
}

export function slug(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'thema';
}

function inferScriptMedia(term) {
  return /fight|kampf|knockout|walkout|training|interview|press|conference|event|demo|use|process|repair|installation|celebration|reaction|weigh|staredown|vs|versus/i.test(term) ? 'video' : 'photo';
}

if (process.argv[1]?.endsWith('entity-research-plan.mjs') && process.argv[2]) {
  const topic = process.argv.slice(2).join(' ');
  process.stdout.write(`${JSON.stringify(buildEntityResearchPlan({ topic }), null, 2)}\n`);
}
