import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const config = readJson('catalog/planner-keywords.json');
const channelFiles = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];
const channels = Object.fromEntries(channelFiles.map((file) => {
  const channel = readJson(`catalog/channels/${file}`);
  return [channel.id, channel];
}));
const errors = [];

if (config.version !== 1) errors.push('planner-keywords.json: version muss 1 sein.');
if (!Array.isArray(config.stopWords) || config.stopWords.length < 40) errors.push('planner-keywords.json: zu wenige Stopwörter.');
if (new Set(config.stopWords.map(normalize)).size !== config.stopWords.length) errors.push('planner-keywords.json: Stopwörter enthalten Duplikate.');

for (const [channelId, channel] of Object.entries(channels)) {
  const rules = config.channels?.[channelId];
  if (!Array.isArray(rules) || rules.length < 10) {
    errors.push(`${channelId}: mindestens zehn Planerregeln erforderlich.`);
    continue;
  }
  const collectionIds = new Set((channel.collections ?? []).map((item) => item.id));
  const ruleIds = new Set();
  const seenTerms = new Map();
  for (const rule of rules) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.id ?? '')) errors.push(`${channelId}: ungültige Regel-ID ${rule.id ?? '?'}.`);
    if (ruleIds.has(rule.id)) errors.push(`${channelId}: doppelte Regel-ID ${rule.id}.`);
    ruleIds.add(rule.id);
    if (!Array.isArray(rule.terms) || rule.terms.length < 1) errors.push(`${channelId}/${rule.id}: terms fehlt.`);
    if (!Array.isArray(rule.collections) || rule.collections.length < 1) errors.push(`${channelId}/${rule.id}: collections fehlt.`);
    if (!Number.isFinite(rule.weight) || rule.weight < 1 || rule.weight > 30) errors.push(`${channelId}/${rule.id}: weight muss zwischen 1 und 30 liegen.`);
    for (const collectionId of rule.collections ?? []) if (!collectionIds.has(collectionId)) errors.push(`${channelId}/${rule.id}: unbekannte Sammlung ${collectionId}.`);
    const normalizedTerms = (rule.terms ?? []).map(normalize);
    if (normalizedTerms.some((term) => term.length < 2)) errors.push(`${channelId}/${rule.id}: ungültiger oder zu kurzer Begriff.`);
    if (new Set(normalizedTerms).size !== normalizedTerms.length) errors.push(`${channelId}/${rule.id}: doppelte Begriffe innerhalb der Regel.`);
    for (const term of normalizedTerms) {
      const owner = seenTerms.get(term);
      if (owner && owner !== rule.id) errors.push(`${channelId}: Begriff "${term}" steht in ${owner} und ${rule.id}.`);
      else seenTerms.set(term, rule.id);
    }
  }
}

const unknownChannels = Object.keys(config.channels ?? {}).filter((id) => !channels[id]);
for (const id of unknownChannels) errors.push(`Unbekannter Kanal im Planerlexikon: ${id}.`);

if (errors.length) {
  console.error(`Planerlexikon ungültig (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

const ruleCount = Object.values(config.channels).reduce((sum, rules) => sum + rules.length, 0);
const termCount = Object.values(config.channels).reduce((sum, rules) => sum + rules.reduce((inner, rule) => inner + rule.terms.length, 0), 0);
console.log(`Planerlexikon gültig: ${Object.keys(channels).length} Kanäle, ${ruleCount} Regeln, ${termCount} Begriffe.`);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function normalize(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
}
