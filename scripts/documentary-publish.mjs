import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const FALLBACK_HASHTAGS = ['Dokumentation', 'Wissen', 'Erklaert', 'Deutsch', 'Hintergrund'];
const STOPWORDS = new Set([
  'aber','alle','allem','allen','aller','alles','als','also','am','an','ander','andere','anderem','anderen','anderer','anderes','auch','auf','aus','bei','bin','bis','bist','da','damit','dann','das','dass','dein','deine','dem','den','denn','der','des','die','dies','diese','diesem','diesen','dieser','dieses','doch','dort','du','durch','ein','eine','einem','einen','einer','eines','er','es','etwas','für','hat','hatte','haben','hier','hinter','ich','im','in','ist','ja','jede','jedem','jeden','jeder','jedes','kann','kein','keine','mit','muss','nach','nicht','noch','nur','oder','ohne','sehr','sein','seine','sich','sie','sind','so','über','um','und','uns','unter','vom','von','vor','war','waren','was','weil','wenn','werden','wie','wieder','wir','wird','wo','zu','zum','zur'
]);

export function createDocumentaryPublishPackage({projectDirectory, overwrite = true} = {}) {
  if (!projectDirectory) throw new Error('projectDirectory fehlt.');
  const root = path.resolve(projectDirectory);
  const project = readJson(path.join(root, '05-PROJECT', 'project.json'));
  const script = readRequiredText(path.join(root, '01-SCRIPT', 'script.txt'), 'script.txt');
  const curatedFile = path.join(root, '05-PROJECT', 'publish.json');
  const curated = fs.existsSync(curatedFile) ? readJson(curatedFile) : null;
  const metadata = curated ? normalizeCurated(curated, project, script) : buildFallback(project, script);
  const exportDir = path.join(root, '06-EXPORT');
  fs.mkdirSync(exportDir, {recursive: true});

  writeUserText(path.join(exportDir, 'youtube-title.txt'), metadata.title, overwrite);
  writeUserText(path.join(exportDir, 'youtube-description.txt'), metadata.description, overwrite);
  writeUserText(path.join(exportDir, 'youtube-tags.txt'), metadata.tags.join(', '), overwrite);
  if (metadata.thumbnailText) writeUserText(path.join(exportDir, 'thumbnail-text.txt'), metadata.thumbnailText, overwrite);

  const state = {
    format: 'visual-asset-hub-documentary-publish-state',
    version: 1,
    generatedAt: new Date().toISOString(),
    source: curated ? '05-PROJECT/publish.json' : 'local-fallback',
    title: metadata.title,
    hashtags: metadata.hashtags,
    tagCount: metadata.tags.length,
    thumbnailText: metadata.thumbnailText,
    files: {
      title: '06-EXPORT/youtube-title.txt',
      description: '06-EXPORT/youtube-description.txt',
      tags: '06-EXPORT/youtube-tags.txt',
      thumbnailText: metadata.thumbnailText ? '06-EXPORT/thumbnail-text.txt' : null
    }
  };
  writeJson(path.join(root, '05-PROJECT', 'publish-state.json'), state);
  return {metadata, state};
}

export function buildFallback(project = {}, script = '') {
  const title = clampTitle(String(project.title || firstSentence(script) || 'Dokumentation').trim());
  const keywords = extractKeywords(`${title} ${script}`, 16);
  const hashtags = buildHashtags(keywords);
  const summary = removeHashtagTokens(summarizeLocally(script, title));
  const description = `${summary}\n\nQuellen und Bildnachweise wurden für dieses Video recherchiert und dokumentiert.\n\n${hashtags.map((tag) => `#${tag}`).join(' ')}`;
  const tags = unique([
    ...title.split(/\s+/),
    ...keywords,
    'Dokumentation',
    'Erklärvideo',
    'Wissen'
  ]).map(cleanTag).filter((tag) => tag.length >= 2).slice(0, 18);
  const thumbnailText = buildThumbnailText(title, keywords);
  return {title, description, hashtags, tags, thumbnailText};
}

function normalizeCurated(curated, project, script) {
  const fallback = buildFallback(project, script);
  const title = clampTitle(String(curated.title || fallback.title).trim());
  const descriptionBase = removeHashtagTokens(String(curated.description || fallback.description).trim());
  const requestedHashtags = Array.isArray(curated.hashtags) ? curated.hashtags : [];
  const hashtags = normalizeHashtags(requestedHashtags.length ? requestedHashtags : fallback.hashtags);
  const description = `${descriptionBase}\n\n${hashtags.map((tag) => `#${tag}`).join(' ')}`.trim();
  const tagsInput = Array.isArray(curated.tags)
    ? curated.tags
    : String(curated.tags || '').split(',');
  const tags = unique(tagsInput.map(cleanTag).filter(Boolean)).slice(0, 25);
  const thumbnailText = clampThumbnail(String(curated.thumbnailText || fallback.thumbnailText || '').trim());
  return {
    title,
    description,
    hashtags,
    tags: tags.length ? tags : fallback.tags,
    thumbnailText
  };
}

function buildHashtags(keywords) {
  const result = [];
  for (const word of [...keywords, ...FALLBACK_HASHTAGS]) {
    const hashtag = hashtagify(word);
    if (!hashtag || result.some((item) => item.toLowerCase() === hashtag.toLowerCase())) continue;
    result.push(hashtag);
    if (result.length === 5) break;
  }
  return result;
}

function normalizeHashtags(values) {
  const result = [];
  for (const value of [...values, ...FALLBACK_HASHTAGS]) {
    const tag = hashtagify(value);
    if (!tag || result.some((item) => item.toLowerCase() === tag.toLowerCase())) continue;
    result.push(tag);
    if (result.length === 5) break;
  }
  if (result.length !== 5) throw new Error('Es konnten nicht exakt 5 Hashtags erzeugt werden.');
  return result;
}

function summarizeLocally(script, title) {
  const clean = String(script).replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
  let summary = sentences.slice(0, 2).join(' ');
  if (!summary) summary = `Diese Dokumentation erklärt ${title}.`;
  if (summary.length > 520) summary = `${summary.slice(0, 517).replace(/\s+\S*$/, '')}...`;
  return summary;
}

function extractKeywords(text, limit) {
  const tokens = String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[A-Za-zÄÖÜäöüß0-9]{3,}/g) ?? [];
  const counts = new Map();
  const first = new Map();
  tokens.forEach((raw, index) => {
    const key = raw.toLowerCase();
    if (STOPWORDS.has(key) || /^\d+$/.test(key)) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!first.has(key)) first.set(key, index);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (first.get(a[0]) ?? 0) - (first.get(b[0]) ?? 0))
    .slice(0, limit)
    .map(([word]) => capitalize(word));
}

function buildThumbnailText(title, keywords) {
  const titleWords = String(title).split(/\s+/).map(cleanTag).filter((word) => word.length >= 2 && !STOPWORDS.has(word.toLowerCase()));
  const words = unique([...titleWords, ...keywords]).slice(0, 4);
  return clampThumbnail(words.join(' '));
}

function removeHashtagTokens(value) {
  return String(value)
    .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clampTitle(value) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 95) return clean;
  return clean.slice(0, 95).replace(/\s+\S*$/, '').trim();
}

function clampThumbnail(value) {
  return String(value).replace(/\s+/g, ' ').trim().split(' ').slice(0, 5).join(' ');
}

function hashtagify(value) {
  const clean = String(value).replace(/^#+/, '').replace(/[^\p{L}\p{N}]/gu, '').trim();
  if (clean.length < 2) return '';
  return capitalize(clean).slice(0, 40);
}

function cleanTag(value) {
  return String(value).replace(/^#+/, '').replace(/[\r\n]+/g, ' ').trim().slice(0, 80);
}

function capitalize(value) {
  const text = String(value);
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : '';
}

function firstSentence(value) {
  return String(value).replace(/\s+/g, ' ').trim().match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? '';
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const clean = String(value ?? '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function writeUserText(file, content, overwrite) {
  if (!overwrite && fs.existsSync(file)) return;
  fs.writeFileSync(file, `${String(content).trim()}\n`, 'utf8');
}

function readRequiredText(file, label) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`${label} fehlt: ${file}`);
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) throw new Error(`${label} ist leer.`);
  return text;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`JSON konnte nicht gelesen werden (${file}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const args = {projectDirectory: '', overwrite: true};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--no-overwrite') args.overwrite = false;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

function runCli() {
  const result = createDocumentaryPublishPackage(parseArgs(process.argv.slice(2)));
  process.stdout.write(`YouTube-Paket erstellt: ${result.state.source}\n`);
  process.stdout.write(`Titel: ${result.metadata.title}\n`);
  process.stdout.write(`Hashtags: ${result.metadata.hashtags.map((tag) => `#${tag}`).join(' ')}\n`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
