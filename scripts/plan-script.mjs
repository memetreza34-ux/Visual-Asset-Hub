import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createShotPlan, planToCsv, planToMarkdown } from '../web/script-planner-core.js';
import { planToSrt } from '../web/script-planner-srt.js';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (args.help === 'true') {
  printHelp();
  process.exit(0);
}

const channel = args.channel;
if (!['finance', 'ai', 'electro', 'combat-sports'].includes(channel)) fail('--channel muss finance, ai, electro oder combat-sports sein.');
if (!args.file && !args.text) fail('Nutze --file <skript.txt> oder --text <Sprechtext>.');
if (args.file && args.text) fail('Nutze entweder --file oder --text, nicht beides gleichzeitig.');

const script = args.file ? readScriptFile(args.file) : String(args.text);
const channelData = readJson(`catalog/channels/${channel}.json`);
const keywordConfig = readJson('catalog/planner-keywords.json');
const index = readJson('catalog/search-index.json');
const plan = createShotPlan({
  script,
  channel,
  channelData,
  records: index.records ?? [],
  keywordConfig,
  durationSeconds: integer(args.duration, 45, 10, 600, 'duration'),
  orientation: orientation(args.orientation ?? 'vertical'),
  approvedOnly: boolean(args['approved-only'], false),
  maxAssetsPerScene: integer(args['max-assets'], 3, 1, 5, 'max-assets')
});

const name = slug(args.name || path.basename(args.file || `${channel}-script`, path.extname(args.file || '')) || `${channel}-script`);
const outputRoot = safeOutputDirectory(args.output || 'reports/shot-plans');
const directory = uniqueDirectory(outputRoot, `${name}-${dateStamp()}`);
fs.mkdirSync(directory, { recursive: true });

const files = {
  json: path.join(directory, 'shotlist.json'),
  csv: path.join(directory, 'shotlist.csv'),
  markdown: path.join(directory, 'shotlist.md'),
  srt: path.join(directory, 'shotlist.srt'),
  source: path.join(directory, 'script.txt')
};
fs.writeFileSync(files.json, `${JSON.stringify(plan, null, 2)}\n`);
fs.writeFileSync(files.csv, planToCsv(plan));
fs.writeFileSync(files.markdown, planToMarkdown(plan));
fs.writeFileSync(files.srt, planToSrt(plan));
fs.writeFileSync(files.source, `${script.trim()}\n`);

console.log(JSON.stringify({
  directory: path.relative(root, directory),
  channel: plan.channel,
  scenes: plan.summary.sceneCount,
  coveragePercentage: plan.summary.coveragePercentage,
  approvedCoveragePercentage: plan.summary.approvedCoveragePercentage,
  files: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, path.relative(root, file)]))
}, null, 2));

function readScriptFile(value) {
  const file = path.resolve(root, value);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`Skriptdatei nicht gefunden: ${value}`);
  const stat = fs.statSync(file);
  if (stat.size > 1024 * 1024) fail('Skriptdatei darf höchstens 1 MB groß sein.');
  return fs.readFileSync(file, 'utf8');
}

function safeOutputDirectory(value) {
  const normalized = String(value).replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) fail('--output muss ein sicherer relativer Projektpfad sein.');
  const directory = path.resolve(root, ...normalized.split('/'));
  const prefix = `${path.resolve(root)}${path.sep}`;
  if (!directory.startsWith(prefix)) fail('--output verlässt das Projektverzeichnis.');
  return directory;
}

function uniqueDirectory(parent, base) {
  let candidate = path.join(parent, base);
  for (let index = 2; fs.existsSync(candidate); index += 1) candidate = path.join(parent, `${base}-${index}`);
  return candidate;
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = values[index + 1];
    result[key] = inline ?? (next && !next.startsWith('--') ? values[++index] : 'true');
  }
  return result;
}

function orientation(value) {
  if (!['vertical', 'horizontal'].includes(value)) fail('--orientation muss vertical oder horizontal sein.');
  return value;
}

function boolean(value, fallback) {
  if (value === undefined) return fallback;
  if (!['true', 'false'].includes(String(value))) fail('Boolean-Werte müssen true oder false sein.');
  return String(value) === 'true';
}

function integer(value, fallback, min, max, label) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`);
  return number;
}

function slug(value) {
  const result = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  if (result.length < 2) fail('--name ist ungültig.');
  return result;
}

function dateStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Visual Asset Hub Skript-Planer\n\nBeispiele:\n  npm run script:plan -- --channel finance --file ./mein-reel.txt --duration 45\n  npm run script:plan -- --channel electro --text "RCD prüfen. Messung dokumentieren." --duration 30 --approved-only true\n\nAusgaben: shotlist.json, shotlist.csv, shotlist.md, shotlist.srt und script.txt unter reports/shot-plans/.`);
}
