import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.join(root, 'reports');
const steps = [
  ['Projektprüfung', ['run', 'check']],
  ['Katalogbericht', ['run', 'report']],
  ['Testwebsite', ['run', 'site:build']]
];
const results = [];
for (const [name, args] of steps) {
  const run = spawnSync(npmCommand(), args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  results.push({ name, success: run.status === 0, output: truncate(run.stdout || run.stderr || '', 2000) });
  if (run.status !== 0) break;
}
const catalog = readJson('catalog/assets.json');
const usage = readJson('catalog/usage.json');
const reviews = readJson('catalog/reviews.json');
const assets = catalog.assets ?? [];
const approved = assets.filter((asset) => asset.status === 'approved');
const pending = assets.filter((asset) => ['inbox', 'review'].includes(asset.status));
const approvedRightsRisks = approved.filter((asset) => ['unknown', 'restricted', 'editorial-only'].includes(asset.rights?.licenseStatus));
const technicalReady = results.every((entry) => entry.success) && approvedRightsRisks.length === 0;
const realTestComplete = technicalReady && assets.length > 0 && approved.length > 0 && (usage.uses ?? []).length > 0 && (reviews.decisions ?? []).length > 0;
let percentage = technicalReady ? 75 : 45;
if (assets.length > 0) percentage += 8;
if ((reviews.decisions ?? []).length > 0) percentage += 6;
if (approved.length > 0) percentage += 6;
if ((usage.uses ?? []).length > 0) percentage += 5;
percentage = Math.min(100, percentage);
const report = {
  generatedAt: new Date().toISOString(), technicalReady, realTestComplete, completionPercentage: percentage,
  counts: { assets: assets.length, pending: pending.length, approved: approved.length, reviews: (reviews.decisions ?? []).length, usages: (usage.uses ?? []).length, approvedRightsRisks: approvedRightsRisks.length },
  steps: results,
  nextActions: realTestComplete ? [] : [
    ...(assets.length ? [] : ['Mindestens drei gezielt ausgewählte Pexels-Assets importieren.']),
    ...((reviews.decisions ?? []).length ? [] : ['Mindestens ein Asset visuell prüfen und Entscheidung protokollieren.']),
    ...(approved.length ? [] : ['Mindestens ein geprüftes Asset freigeben.']),
    ...((usage.uses ?? []).length ? [] : ['Ein freigegebenes Asset in einem echten Projekt verwenden und dokumentieren.'])
  ]
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'beta-readiness.json'), `${JSON.stringify(report, null, 2)}\n`);
const md = [
  '# Beta Readiness', '', `Erzeugt: ${report.generatedAt}`, '',
  `- Technisch bereit: **${technicalReady ? 'ja' : 'nein'}**`,
  `- Realtest vollständig: **${realTestComplete ? 'ja' : 'nein'}**`,
  `- Fertigstellung: **${percentage} %**`,
  `- Assets: **${assets.length}**`, `- Freigegeben: **${approved.length}**`, `- Reviews: **${(reviews.decisions ?? []).length}**`, `- Nutzungen: **${(usage.uses ?? []).length}**`, '',
  '## Prüfschritte', ...results.map((entry) => `- ${entry.success ? 'OK' : 'FEHLER'} – ${entry.name}`), '',
  '## Nächste Schritte', ...(report.nextActions.length ? report.nextActions.map((entry) => `- ${entry}`) : ['- Beta-Abnahme vollständig.'])
].join('\n');
fs.writeFileSync(path.join(outputDir, 'beta-readiness.md'), `${md}\n`);
console.log(md);
if (!technicalReady) process.exitCode = 1;

function npmCommand() { return process.platform === 'win32' ? 'npm.cmd' : 'npm'; }
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function truncate(value, max) { const text = String(value); return text.length <= max ? text : `${text.slice(0, max)}…`; }
