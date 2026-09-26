import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createShotPlan } from '../web/script-planner-core.js';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const benchmark = readJson('catalog/planner-benchmark.json');
const keywords = readJson('catalog/planner-keywords.json');
const index = readJson('catalog/search-index.json');
const channels = Object.fromEntries(['finance', 'ai', 'electro', 'combat-sports'].map((id) => [id, readJson(`catalog/channels/${id}.json`)]));
const minimumTop1 = number(args['min-top1'], 0.85, 0, 1, 'min-top1');
const minimumTop3 = number(args['min-top3'], 0.98, 0, 1, 'min-top3');

const results = benchmark.cases.map((entry) => {
  const plan = createShotPlan({
    script: entry.text,
    channel: entry.channel,
    channelData: channels[entry.channel],
    records: index.records ?? [],
    keywordConfig: keywords,
    durationSeconds: 15,
    orientation: 'vertical',
    approvedOnly: false
  });
  const predicted = (plan.scenes[0]?.collections ?? []).map((item) => item.id);
  const top1 = predicted.length > 0 && entry.expected.includes(predicted[0]);
  const top3 = predicted.some((id) => entry.expected.includes(id));
  return {
    id: entry.id,
    channel: entry.channel,
    text: entry.text,
    expected: entry.expected,
    predicted,
    top1,
    top3
  };
});

const top1Hits = results.filter((item) => item.top1).length;
const top3Hits = results.filter((item) => item.top3).length;
const report = {
  format: 'visual-asset-hub-planner-benchmark',
  version: 1,
  generatedAt: new Date().toISOString(),
  caseCount: results.length,
  top1Hits,
  top3Hits,
  top1Accuracy: round(top1Hits / results.length, 4),
  top3Accuracy: round(top3Hits / results.length, 4),
  thresholds: { minimumTop1, minimumTop3 },
  passed: top1Hits / results.length >= minimumTop1 && top3Hits / results.length >= minimumTop3,
  failures: results.filter((item) => !item.top3),
  results
};

const outputDirectory = path.join(root, 'reports', 'planner-benchmark');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'benchmark.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outputDirectory, 'benchmark.md'), `${markdown(report)}\n`);
console.log(`Planer-Benchmark: Top-1 ${(report.top1Accuracy * 100).toFixed(1)} %, Top-3 ${(report.top3Accuracy * 100).toFixed(1)} %, ${report.caseCount} Fälle.`);
if (!report.passed) {
  for (const failure of results.filter((item) => !item.top1)) console.error(`${failure.id}: erwartet ${failure.expected.join('/')} · erkannt ${failure.predicted.join('/') || 'nichts'}`);
  process.exitCode = 1;
}

function markdown(value) {
  const lines = [
    '# Skript-Planer Benchmark', '',
    `Erzeugt: ${value.generatedAt}`, '',
    `- Fälle: **${value.caseCount}**`,
    `- Top-1: **${(value.top1Accuracy * 100).toFixed(1)} %**`,
    `- Top-3: **${(value.top3Accuracy * 100).toFixed(1)} %**`,
    `- Mindestwert Top-1: **${(value.thresholds.minimumTop1 * 100).toFixed(1)} %**`,
    `- Mindestwert Top-3: **${(value.thresholds.minimumTop3 * 100).toFixed(1)} %**`,
    `- Bestanden: **${value.passed ? 'ja' : 'nein'}**`, '',
    '| Fall | Kanal | Erwartet | Top 3 | Ergebnis |',
    '|---|---|---|---|---|',
    ...value.results.map((item) => `| ${item.id} | ${item.channel} | ${item.expected.join(', ')} | ${item.predicted.join(', ')} | ${item.top1 ? 'Top-1' : item.top3 ? 'Top-3' : 'Fehler'} |`)
  ];
  return lines.join('\n');
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = values[index + 1];
    result[key] = inline ?? (next && !next.startsWith('--') ? values[++index] : 'true');
  }
  return result;
}
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function number(value, fallback, min, max, label) { const parsed = value === undefined ? fallback : Number(value); if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return parsed; }
function round(value, digits) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
