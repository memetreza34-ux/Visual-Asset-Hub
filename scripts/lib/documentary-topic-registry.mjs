import fs from 'node:fs';
import path from 'node:path';

export const TOPIC_REGISTER_VERSION = 1;
export const TOPIC_SYSTEM_DIRECTORY = '_SYSTEM';
export const TOPIC_REGISTER_JSON = 'topic-register.json';
export const TOPIC_REGISTER_TEXT = 'THEMEN-REGISTER.txt';

const STOPWORDS = new Set([
  'aber','alle','als','also','am','an','auf','aus','bei','bis','das','dass','dem','den','der','des','die','ein','eine','einem','einen','einer','eines','für','hat','haben','im','in','ist','mit','nach','nicht','noch','oder','sein','sind','so','über','um','und','unter','vom','von','vor','war','was','wie','wird','zu','zum','zur','warum','wie','wer','was','wann','wo','the','a','an','of','and','to','in','on','why','how'
]);

export function registryPaths(outputRoot) {
  const root = path.resolve(outputRoot);
  const systemDirectory = path.join(root, TOPIC_SYSTEM_DIRECTORY);
  return {
    root,
    systemDirectory,
    json: path.join(systemDirectory, TOPIC_REGISTER_JSON),
    text: path.join(systemDirectory, TOPIC_REGISTER_TEXT)
  };
}

export function loadTopicRegistry(outputRoot) {
  const paths = registryPaths(outputRoot);
  if (!fs.existsSync(paths.json)) {
    return {
      format: 'visual-asset-hub-documentary-topic-register',
      version: TOPIC_REGISTER_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      topics: []
    };
  }
  const parsed = JSON.parse(fs.readFileSync(paths.json, 'utf8'));
  if (!parsed || !Array.isArray(parsed.topics)) throw new Error(`Ungültiges Themenregister: ${paths.json}`);
  return parsed;
}

export function isDuplicateTopic(registry, candidate, {threshold = 0.72} = {}) {
  const title = String(candidate?.title ?? '').trim();
  const angle = String(candidate?.angle ?? '').trim();
  const topicKey = normalizeTopicKey(candidate?.topicKey || title);
  const candidateTokens = topicTokens(`${title} ${angle}`);

  let best = null;
  for (const existing of registry?.topics ?? []) {
    const existingKey = normalizeTopicKey(existing.topicKey || existing.title);
    const exactKey = Boolean(topicKey && existingKey && topicKey === existingKey);
    const titleExact = normalizeLoose(title) === normalizeLoose(existing.title);
    const similarity = jaccard(candidateTokens, topicTokens(`${existing.title ?? ''} ${existing.angle ?? ''}`));
    const duplicate = exactKey || titleExact || similarity >= threshold;
    if (!best || similarity > best.similarity || (duplicate && !best.duplicate)) {
      best = {duplicate, similarity, exactKey, titleExact, existing};
    }
  }
  return best ?? {duplicate: false, similarity: 0, exactKey: false, titleExact: false, existing: null};
}

export function reserveTopic(outputRoot, candidate, metadata = {}) {
  const registry = loadTopicRegistry(outputRoot);
  const duplicate = isDuplicateTopic(registry, candidate);
  if (duplicate.duplicate) {
    throw new Error(`Thema ist bereits benutzt oder zu ähnlich: "${candidate.title}" ↔ "${duplicate.existing?.title ?? 'unbekannt'}" (${Math.round(duplicate.similarity * 100)}%).`);
  }

  const now = new Date().toISOString();
  const entry = {
    id: `TOPIC-${String((registry.topics?.length ?? 0) + 1).padStart(4, '0')}`,
    title: String(candidate.title ?? '').trim(),
    topicKey: normalizeTopicKey(candidate.topicKey || candidate.title),
    angle: String(candidate.angle ?? '').trim(),
    category: String(candidate.category ?? 'documentary').trim(),
    selectedAt: now,
    status: metadata.status ?? 'reserved',
    targetDurationSeconds: Number(metadata.targetDurationSeconds) || 150,
    projectSlug: metadata.projectSlug ?? null,
    projectDirectory: metadata.projectDirectory ?? null,
    source: metadata.source ?? 'autonomous-phase1'
  };
  if (!entry.title) throw new Error('Thementitel fehlt.');
  registry.topics = [...(registry.topics ?? []), entry];
  registry.updatedAt = now;
  writeRegistry(outputRoot, registry);
  return {registry, entry};
}

export function updateTopicEntry(outputRoot, id, patch = {}) {
  const registry = loadTopicRegistry(outputRoot);
  const index = registry.topics.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error(`Thema im Register nicht gefunden: ${id}`);
  registry.topics[index] = {...registry.topics[index], ...patch, id: registry.topics[index].id};
  registry.updatedAt = new Date().toISOString();
  writeRegistry(outputRoot, registry);
  return registry.topics[index];
}

export function recentTopicsForPrompt(registry, limit = 250) {
  return [...(registry?.topics ?? [])]
    .slice(-Math.max(1, limit))
    .map((entry) => ({title: entry.title, angle: entry.angle, topicKey: entry.topicKey, status: entry.status}));
}

export function writeRegistry(outputRoot, registry) {
  const paths = registryPaths(outputRoot);
  fs.mkdirSync(paths.systemDirectory, {recursive: true});
  fs.writeFileSync(paths.json, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  const lines = [
    'DOKUMENTARY THEMEN-REGISTER',
    '==========================',
    '',
    'Dieses Register wird vor jeder automatischen Themenwahl geprüft.',
    'Bereits reservierte oder produzierte Themen werden nicht erneut verwendet.',
    ''
  ];
  for (const [index, entry] of (registry.topics ?? []).entries()) {
    lines.push(`${String(index + 1).padStart(3, '0')} | ${dateOnly(entry.selectedAt)} | ${entry.status} | ${entry.title}`);
    if (entry.angle) lines.push(`      Blickwinkel: ${entry.angle}`);
    if (entry.projectDirectory) lines.push(`      Projekt: ${entry.projectDirectory}`);
    lines.push('');
  }
  fs.writeFileSync(paths.text, `${lines.join('\n').trim()}\n`, 'utf8');
  return paths;
}

export function normalizeTopicKey(value) {
  return normalizeLoose(value)
    .split(' ')
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    .sort()
    .join('-')
    .slice(0, 160);
}

function topicTokens(value) {
  return new Set(normalizeLoose(value).split(' ').filter((word) => word.length >= 3 && !STOPWORDS.has(word)));
}

function normalizeLoose(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function dateOnly(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? '') : date.toISOString().slice(0, 10);
}
