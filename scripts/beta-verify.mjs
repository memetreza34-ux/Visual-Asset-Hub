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
const videos = assets.filter((asset) => asset.type === 'video');
const images = assets.filter((asset) => asset.type === 'image');
const approved = assets.filter((asset) => asset.status === 'approved');
const pending = assets.filter((asset) => ['inbox', 'review'].includes(asset.status));
const approvedRightsRisks = approved.filter((asset) => ['unknown', 'restricted', 'editorial-only'].includes(asset.rights?.licenseStatus));
const reviewCount = (reviews.decisions ?? []).length;
const usageCount = (usage.uses ?? []).length;

const technicalChecks = {
  projectCheck: Boolean(results.find((entry) => entry.name === 'Projektprüfung')?.success),
  reportBuild: Boolean(results.find((entry) => entry.name === 'Katalogbericht')?.success),
  siteBuild: Boolean(results.find((entry) => entry.name === 'Testwebsite')?.success),
  approvedRightsSafe: approvedRightsRisks.length === 0
};
const technicalReady = Object.values(technicalChecks).every(Boolean);
const technicalPercentage = Math.round(100 * Object.values(technicalChecks).filter(Boolean).length / Object.keys(technicalChecks).length);

const realTestChecks = {
  threeVideos: videos.length >= 3,
  threeImages: images.length >= 3,
  reviewRecorded: reviewCount >= 1,
  approvedAsset: approved.length >= 1,
  realUsageRecorded: usageCount >= 1
};
const realTestComplete = technicalReady && Object.values(realTestChecks).every(Boolean);
const realTestPercentage = Math.round(100 * Object.values(realTestChecks).filter(Boolean).length / Object.keys(realTestChecks).length);
const overallPercentage = Math.round(technicalPercentage * 0.75 + realTestPercentage * 0.25);

const nextActions = [];
if (videos.length < 3) nextActions.push(`${3 - videos.length} weitere geprüfte B-Roll-Videos importieren.`);
if (images.length < 3) nextActions.push(`${3 - images.length} geprüfte Bilder importieren.`);
if (reviewCount < 1) nextActions.push('Mindestens ein Asset vollständig ansehen und eine Review-Entscheidung protokollieren.');
if (approved.length < 1) nextActions.push('Mindestens ein geprüftes Asset freigeben.');
if (usageCount < 1) nextActions.push('Ein freigegebenes Asset in einem echten Content-Projekt verwenden und dokumentieren.');
if (!technicalReady) nextActions.unshift('Fehlgeschlagene technische Prüfschritte beheben.');

const report = {
  generatedAt: new Date().toISOString(),
  technicalReady,
  realTestComplete,
  technicalPercentage,
  realTestPercentage,
  completionPercentage: overallPercentage,
  technicalChecks,
  realTestChecks,
  counts: {
    assets: assets.length,
    videos: videos.length,
    images: images.length,
    pending: pending.length,
    approved: approved.length,
    reviews: reviewCount,
    usages: usageCount,
    approvedRightsRisks: approvedRightsRisks.length
  },
  steps: results,
  nextActions
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'beta-readiness.json'), `${JSON.stringify(report, null, 2)}\n`);
const md = [
  '# Beta Readiness', '',
  `Erzeugt: ${report.generatedAt}`, '',
  `- Technisch bereit: **${technicalReady ? 'ja' : 'nein'}**`,
  `- Technischer Stand: **${technicalPercentage} %**`,
  `- Realtest vollständig: **${realTestComplete ? 'ja' : 'nein'}**`,
  `- Realtest-Stand: **${realTestPercentage} %**`,
  `- Gesamtstand: **${overallPercentage} %**`,
  `- Assets: **${assets.length}** (${videos.length} Videos, ${images.length} Bilder)`,
  `- Freigegeben: **${approved.length}**`,
  `- Reviews: **${reviewCount}**`,
  `- Nutzungen: **${usageCount}**`, '',
  '## Prüfschritte',
  ...results.map((entry) => `- ${entry.success ? 'OK' : 'FEHLER'} – ${entry.name}`), '',
  '## Realtest-Kriterien',
  ...Object.entries(realTestChecks).map(([key, value]) => `- ${value ? 'OK' : 'OFFEN'} – ${key}`), '',
  '## Nächste Schritte',
  ...(nextActions.length ? nextActions.map((entry) => `- ${entry}`) : ['- Beta-Abnahme vollständig.'])
].join('\n');
fs.writeFileSync(path.join(outputDir, 'beta-readiness.md'), `${md}\n`);
console.log(md);
if (!technicalReady) process.exitCode = 1;

function npmCommand() { return process.platform === 'win32' ? 'npm.cmd' : 'npm'; }
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function truncate(value, max) { const text = String(value); return text.length <= max ? text : `${text.slice(0, max)}…`; }
