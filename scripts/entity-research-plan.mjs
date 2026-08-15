import process from 'node:process';

const CHANNELS = new Set(['finance', 'ai', 'electro', 'combat-sports']);
const STOPWORDS = new Set([
  'aber','alle','auch','beim','eine','einem','einen','einer','eines','für','gegen','hat','haben','hier','ihm','ihn','ihre','immer','ist','mit','nach','nicht','noch','oder','sein','seine','seinen','seiner','sich','sind','über','und','von','war','waren','wird','wurde','wurden','the','and','for','from','into','that','this','with','was','were','his','her','their','about','after','before'
]);

const CHANNEL_FACETS = {
  'combat-sports': [
    ['overview', 'Allgemein', '{topic}', 'photo'],
    ['training', 'Training & Gym', '{topic} training gym', 'video'],
    ['fight', 'Kämpfe & Action', '{topic} fight combat', 'video'],
    ['press', 'Presse & Interviews', '{topic} press conference interview', 'video'],
    ['weigh-in', 'Wiegen & Staredown', '{topic} weigh in staredown', 'video'],
    ['walkout', 'Walkout & Arena', '{topic} walkout arena entrance', 'video'],
    ['portrait', 'Portraits', '{topic} portrait', 'photo'],
    ['celebration', 'Sieg & Reaktion', '{topic} celebration victory', 'photo']
  ],
  finance: [
    ['overview', 'Allgemein', '{topic}', 'photo'],
    ['portrait', 'Portraits', '{topic} portrait', 'photo'],
    ['interview', 'Interviews', '{topic} interview', 'video'],
    ['event', 'Events & Bühne', '{topic} conference keynote event', 'video'],
    ['office', 'Arbeit & Büro', '{topic} office work', 'photo'],
    ['charts', 'Charts & Märkte', '{topic} stock market finance', 'video']
  ],
  ai: [
    ['overview', 'Allgemein', '{topic}', 'photo'],
    ['portrait', 'Portraits', '{topic} portrait', 'photo'],
    ['interview', 'Interviews', '{topic} interview artificial intelligence', 'video'],
    ['event', 'Events & Keynotes', '{topic} AI keynote conference', 'video'],
    ['product', 'Produkte & Demos', '{topic} AI product demo', 'video'],
    ['office', 'Team & Arbeit', '{topic} technology office', 'photo']
  ],
  electro: [
    ['overview', 'Allgemein', '{topic}', 'photo'],
    ['portrait', 'Portraits', '{topic} portrait engineer', 'photo'],
    ['work', 'Arbeit & Werkstatt', '{topic} electrical engineering work', 'video'],
    ['equipment', 'Geräte & Anlagen', '{topic} electrical equipment', 'photo'],
    ['event', 'Messe & Präsentation', '{topic} engineering event presentation', 'video'],
    ['interview', 'Interviews', '{topic} engineer interview', 'video']
  ]
};

export function buildEntityResearchPlan({ topic, channel = 'combat-sports', script = '', depth = 'deep' } = {}) {
  const cleanTopic = validateTopic(topic);
  const cleanChannel = validateChannel(channel);
  const cleanScript = validateScript(script);
  const totalLimit = depth === 'quick' ? 6 : 8;
  const scriptTerms = extractScriptTerms(cleanScript, cleanTopic).slice(0, depth === 'quick' ? 2 : 3);
  const reservedScriptSlots = Math.min(scriptTerms.length, depth === 'quick' ? 2 : 3);
  const baseLimit = Math.max(1, totalLimit - reservedScriptSlots);
  const base = (CHANNEL_FACETS[cleanChannel] ?? CHANNEL_FACETS['combat-sports'])
    .slice(0, baseLimit)
    .map(([id, label, template, preferredMedia], index) => ({
      id,
      label,
      order: index + 1,
      query: template.replace('{topic}', cleanTopic),
      preferredMedia,
      origin: 'channel-template'
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
    version: 2,
    topic: cleanTopic,
    topicSlug: slug(cleanTopic),
    channel: cleanChannel,
    depth: depth === 'quick' ? 'quick' : 'deep',
    facets,
    providers: ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'],
    photoOnlyProviders: ['unsplash', 'openverse', 'wikimedia'],
    maxSearchTasks: facets.length * 5,
    notes: [
      'Treffer sind Recherchekandidaten und keine automatische Veröffentlichungserlaubnis.',
      'Broadcast-, Event-, Marken- und Personenrechte müssen vor Nutzung geprüft werden.',
      'Importierte Treffer starten immer im Review.'
    ]
  };
}

export function extractScriptTerms(script, topic = '') {
  if (!script) return [];
  const terms = [];
  const text = String(script).replace(/\s+/g, ' ').trim();
  const opponent = /\b(?:gegen|vs\.?|versus)\s+([A-ZÄÖÜ][\p{L}'’-]+(?:\s+[A-ZÄÖÜ][\p{L}'’-]+){0,3})/giu;
  for (const match of text.matchAll(opponent)) terms.push(match[1].trim());
  for (const match of text.matchAll(/\b(?:UFC|ONE|PFL|KSW|GLORY|Bellator|WWE)\s*\d{0,4}\b/g)) terms.push(match[0].trim());
  for (const match of text.matchAll(/\b(?:19|20)\d{2}\b/g)) terms.push(match[0]);
  for (const match of text.matchAll(/\b[A-ZÄÖÜ][\p{L}'’-]{2,}(?:\s+[A-ZÄÖÜ][\p{L}'’-]{2,}){1,3}\b/gu)) terms.push(match[0].trim());
  const topicParts = new Set(String(topic).toLowerCase().split(/\s+/).filter(Boolean));
  return [...new Set(terms)]
    .map((value) => value.replace(/[.,;:!?]+$/g, '').trim())
    .filter((value) => value.length >= 3 && value.length <= 80)
    .filter((value) => !STOPWORDS.has(value.toLowerCase()))
    .filter((value) => !value.toLowerCase().split(/\s+/).every((part) => topicParts.has(part)))
    .slice(0, 12);
}

export function validateTopic(value) {
  if (typeof value !== 'string') throw new Error('Thema/Person fehlt.');
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > 120) throw new Error('Thema/Person muss zwischen 2 und 120 Zeichen lang sein.');
  if (/[\u0000-\u001F\u007F]/.test(text)) throw new Error('Thema/Person enthält ungültige Zeichen.');
  return text;
}

export function validateChannel(value) {
  const channel = String(value ?? '').trim();
  if (!CHANNELS.has(channel)) throw new Error('Unbekannter Kanal für Themenrecherche.');
  return channel;
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
  return /fight|kampf|knockout|walkout|training|interview|press|conference|weigh|staredown|vs|versus/i.test(term) ? 'video' : 'photo';
}

if (process.argv[1]?.endsWith('entity-research-plan.mjs') && process.argv[2]) {
  const topic = process.argv.slice(2).join(' ');
  process.stdout.write(`${JSON.stringify(buildEntityResearchPlan({ topic }), null, 2)}\n`);
}
