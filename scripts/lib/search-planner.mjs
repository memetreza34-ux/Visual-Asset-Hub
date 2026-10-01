const CATEGORY_ALIASES = {
  'people-lifestyle': ['person', 'people', 'human', 'life', 'lifestyle', 'family', 'friends', 'mensch', 'menschen', 'alltag', 'familie', 'freunde'],
  'business-work': ['business', 'office', 'work', 'job', 'jobs', 'career', 'company', 'firma', 'arbeit', 'arbeiten', 'beruf', 'büro', 'buero', 'unternehmen'],
  'technology-ai': ['ai', 'artificial intelligence', 'ki', 'künstliche intelligenz', 'kuenstliche intelligenz', 'technology', 'tech', 'software', 'computer', 'robot', 'automation', 'coding'],
  'money-finance': ['money', 'finance', 'financial', 'bank', 'stock', 'stocks', 'investing', 'investment', 'geld', 'finanzen', 'aktie', 'aktien', 'investieren', 'börse', 'boerse'],
  'education-learning': ['education', 'learning', 'study', 'school', 'university', 'lernen', 'schule', 'studium', 'universität', 'universitaet'],
  'health-fitness': ['health', 'fitness', 'doctor', 'hospital', 'mental health', 'gesundheit', 'arzt', 'krankenhaus', 'training', 'sport'],
  'food-drink': ['food', 'drink', 'cooking', 'restaurant', 'essen', 'trinken', 'kochen', 'lebensmittel'],
  'travel-places': ['travel', 'trip', 'city', 'hotel', 'airport', 'reise', 'reisen', 'stadt', 'urlaub', 'flughafen'],
  'nature-environment': ['nature', 'environment', 'forest', 'ocean', 'climate', 'natur', 'umwelt', 'wald', 'meer', 'klima'],
  'industry-trades': ['industry', 'factory', 'electrician', 'technician', 'maintenance', 'industrie', 'fabrik', 'elektriker', 'techniker', 'instandhaltung'],
  'vehicles-transport': ['car', 'train', 'vehicle', 'transport', 'traffic', 'auto', 'zug', 'fahrzeug', 'verkehr'],
  'home-architecture': ['home', 'house', 'apartment', 'architecture', 'property', 'haus', 'wohnung', 'architektur', 'immobilie'],
  'social-media-creator': ['social media', 'youtube', 'tiktok', 'instagram', 'creator', 'influencer', 'content'],
  'news-events': ['news', 'event', 'reporter', 'press', 'interview', 'nachrichten', 'ereignis', 'presse'],
  'emotions-reactions': ['emotion', 'fear', 'stress', 'happy', 'sad', 'anger', 'psychology', 'emotionen', 'angst', 'glücklich', 'traurig', 'wut', 'psychologie', 'manipulation'],
  'science-engineering': ['science', 'physics', 'chemistry', 'biology', 'engineering', 'wissenschaft', 'physik', 'chemie', 'biologie', 'technik']
};

const PHRASE_TRANSLATIONS = [
  [/künstliche intelligenz|kuenstliche intelligenz|\bki\b/gi, 'artificial intelligence'],
  [/arbeitsplätze|arbeitsplaetze/gi, 'workplaces'],
  [/arbeitsplatz/gi, 'workplace'],
  [/arbeitsplätze verlieren|arbeitsplaetze verlieren/gi, 'job loss'],
  [/arbeitslosigkeit/gi, 'unemployment'],
  [/\barbeit\b/gi, 'work'],
  [/\bberuf\b/gi, 'career'],
  [/\bbüro\b|\bbuero\b/gi, 'office'],
  [/\bunternehmen\b|\bfirma\b/gi, 'company'],
  [/\bgeld\b/gi, 'money'],
  [/\baktien\b/gi, 'stocks'],
  [/\baktie\b/gi, 'stock'],
  [/\binvestieren\b/gi, 'investing'],
  [/\blernen\b/gi, 'learning'],
  [/\bschule\b/gi, 'school'],
  [/\bgesundheit\b/gi, 'health'],
  [/\bkrankheit\b/gi, 'illness'],
  [/\barzt\b/gi, 'doctor'],
  [/\bessen\b/gi, 'food'],
  [/\breisen\b|\breise\b/gi, 'travel'],
  [/\bstadt\b/gi, 'city'],
  [/\bnatur\b/gi, 'nature'],
  [/\bumwelt\b/gi, 'environment'],
  [/\belektriker\b/gi, 'electrician'],
  [/\btechniker\b/gi, 'technician'],
  [/\bfabrik\b/gi, 'factory'],
  [/\bzug\b/gi, 'train'],
  [/\bauto\b/gi, 'car'],
  [/\bhaus\b/gi, 'house'],
  [/\bwohnung\b/gi, 'apartment'],
  [/\bnachrichten\b/gi, 'news'],
  [/\bangst\b/gi, 'fear'],
  [/\bpsychologie\b/gi, 'psychology'],
  [/\bmanipulation\b/gi, 'manipulation'],
  [/\bphysik\b/gi, 'physics'],
  [/\bchemie\b/gi, 'chemistry'],
  [/\bbiologie\b/gi, 'biology']
];

const CATEGORY_ANGLES = {
  'people-lifestyle': ['daily life', 'person close up', 'people interaction', 'human reaction', 'lifestyle detail'],
  'business-work': ['office worker', 'team working', 'hands typing keyboard', 'modern office wide shot', 'employee close up'],
  'technology-ai': ['computer screen close up', 'data center servers', 'technology workspace', 'coding close up', 'robotics laboratory'],
  'money-finance': ['money close up', 'financial charts screen', 'person budgeting', 'banking smartphone', 'business finance office'],
  'education-learning': ['student studying', 'notebook close up', 'classroom wide shot', 'online learning laptop', 'library study'],
  'health-fitness': ['doctor patient', 'medical close up', 'hospital corridor', 'fitness training', 'healthcare technology'],
  'food-drink': ['food close up', 'cooking hands', 'kitchen wide shot', 'grocery shopping', 'restaurant service'],
  'travel-places': ['city establishing shot', 'traveler walking', 'airport terminal', 'street b roll', 'landmark wide shot'],
  'nature-environment': ['nature wide shot', 'environment close up', 'forest aerial', 'water detail', 'climate landscape'],
  'industry-trades': ['technician working', 'industrial machine close up', 'factory wide shot', 'tools close up', 'maintenance inspection'],
  'vehicles-transport': ['vehicle moving', 'transport station', 'driving close up', 'traffic wide shot', 'vehicle detail'],
  'home-architecture': ['modern interior', 'building exterior', 'home detail', 'architecture wide shot', 'property walkthrough'],
  'social-media-creator': ['creator filming', 'smartphone social media', 'camera close up', 'editing workstation', 'content studio'],
  'news-events': ['reporter interview', 'press conference', 'crowd event', 'newspaper close up', 'public speech'],
  'emotions-reactions': ['human reaction close up', 'stressed person', 'serious face', 'emotional silhouette', 'thinking person'],
  'science-engineering': ['laboratory experiment', 'scientist close up', 'technical equipment', 'engineering workstation', 'science macro']
};

const GENERIC_ANGLES = ['person using', 'close up detail', 'wide establishing shot', 'hands working with', 'realistic b roll'];

export function translateSearchPhrase(value) {
  let output = String(value ?? '').trim();
  for (const [pattern, replacement] of PHRASE_TRANSLATIONS) output = output.replace(pattern, replacement);
  return output.replace(/\s+/g, ' ').trim();
}

export function detectCategory(topic, suggestions = {}) {
  const normalized = normalize(topic);
  let bestCategory = null;
  let bestScore = 0;

  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    const topicAliases = suggestions[category] ?? [];
    const candidates = [...aliases, ...topicAliases.map((value) => value.replaceAll('-', ' '))];
    const score = candidates.reduce((total, candidate) => total + (containsTerm(normalized, normalize(candidate)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

export function planSearchQueries({ topic, topicSuggestions = {}, maxQueries = 10 }) {
  if (!topic || !String(topic).trim()) throw new Error('topic ist erforderlich.');
  if (!Number.isInteger(maxQueries) || maxQueries < 1 || maxQueries > 30) throw new Error('maxQueries muss zwischen 1 und 30 liegen.');

  const original = String(topic).trim().replace(/\s+/g, ' ');
  const translated = translateSearchPhrase(original);
  const category = detectCategory(`${original} ${translated}`, topicSuggestions);
  const angles = CATEGORY_ANGLES[category] ?? GENERIC_ANGLES;
  const categoryTopics = (topicSuggestions[category] ?? []).slice(0, 8).map((value) => value.replaceAll('-', ' '));
  const intents = [];

  addIntent(intents, translated, 'translated-base');
  if (normalize(original) !== normalize(translated)) addIntent(intents, original, 'original-language');

  for (const angle of angles) addIntent(intents, `${translated} ${angle}`, 'visual-angle');
  for (const related of categoryTopics) {
    if (!containsTerm(normalize(translated), normalize(related))) addIntent(intents, `${translated} ${related}`, 'category-expansion');
  }

  if (intents.length < maxQueries) {
    for (const angle of GENERIC_ANGLES) addIntent(intents, `${translated} ${angle}`, 'generic-angle');
  }

  return {
    topic: original,
    translated_topic: translated,
    category,
    queries: intents.slice(0, maxQueries)
  };
}

function addIntent(target, query, reason) {
  const compact = query.replace(/\s+/g, ' ').trim();
  if (!compact) return;
  const key = normalize(compact);
  if (!target.some((entry) => normalize(entry.query) === key)) target.push({ query: compact, reason });
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function containsTerm(haystack, needle) {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `) || haystack.includes(needle);
}
