import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') { help(); process.exit(0); }
if (!args.id) fail('--id ist erforderlich.');
if (!args.decision) fail('--decision ist erforderlich.');
const decisionMap = { approve: 'approved', restrict: 'restricted', archive: 'archived', 'send-back': 'review' };
const nextStatus = decisionMap[args.decision];
if (!nextStatus) fail('--decision muss approve, restrict, archive oder send-back sein.');

const catalogPath = path.join(root, 'catalog/assets.json');
const reviewsPath = path.join(root, 'catalog/reviews.json');
const catalogText = fs.readFileSync(catalogPath, 'utf8');
const reviewsText = fs.existsSync(reviewsPath) ? fs.readFileSync(reviewsPath, 'utf8') : null;
const catalog = JSON.parse(catalogText);
const reviews = reviewsText ? JSON.parse(reviewsText) : { version: 1, updatedAt: new Date(0).toISOString(), decisions: [] };
const index = catalog.assets.findIndex((asset) => asset.id === args.id);
if (index < 0) fail(`Asset nicht gefunden: ${args.id}`);
const previous = catalog.assets[index];
if (args.decision === 'approve' && previous.status !== 'review' && args.force !== 'true') {
  fail(`Freigabe ist nur aus dem Status review erlaubt. Aktuell: ${previous.status}.`);
}
const next = structuredClone(previous);
next.status = nextStatus;
if (args.quality) next.qualityRating = integer(args.quality, 1, 5, 'quality');
if (args.license) next.rights.licenseStatus = args.license;
if (args.scopes) next.rights.usageScopes = unique(args.scopes);
if (args['attribution-required']) next.rights.attributionRequired = boolean(args['attribution-required']);
if (args['attribution-text']) next.rights.attributionText = args['attribution-text'].trim();
const reviewedAt = new Date().toISOString();
const reviewer = args.reviewer?.trim() || process.env.USER || process.env.USERNAME || 'local-reviewer';
const audit = `[Review ${reviewedAt} · ${reviewer} · ${args.decision}]${args.notes ? ` ${args.notes.trim()}` : ''}`;
next.notes = [next.notes, audit].filter(Boolean).join('\n');

if (nextStatus === 'approved') {
  if (['unknown', 'restricted'].includes(next.rights.licenseStatus)) fail(`Freigabe mit Lizenzstatus ${next.rights.licenseStatus} ist nicht erlaubt.`);
  if (!next.rights.usageScopes?.length) fail('Freigabe benötigt mindestens einen Nutzungsbereich.');
  if (next.rights.attributionRequired && !next.rights.attributionText?.trim()) fail('Erforderlicher Attributionstext fehlt.');
}

const review = {
  id: `REV-${randomBytes(6).toString('hex').toUpperCase()}`,
  assetId: next.id,
  decision: args.decision,
  previousStatus: previous.status,
  nextStatus,
  reviewedAt,
  reviewer,
  notes: args.notes?.trim() || ''
};

console.log(JSON.stringify({ assetId: next.id, previousStatus: previous.status, nextStatus, reviewer }, null, 2));
if (args['dry-run'] === 'true') { console.log('Dry-Run: keine Dateien verändert.'); process.exit(0); }

try {
  catalog.assets[index] = next;
  catalog.updatedAt = reviewedAt;
  reviews.updatedAt = reviewedAt;
  reviews.decisions = [...(reviews.decisions ?? []), review];
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  fs.writeFileSync(reviewsPath, `${JSON.stringify(reviews, null, 2)}\n`);
  run('scripts/validate-catalog.mjs');
  run('scripts/validate-operations.mjs');
  run('scripts/build-index.mjs');
  console.log(`Asset ${next.id} wurde auf ${nextStatus} gesetzt.`);
} catch (error) {
  fs.writeFileSync(catalogPath, catalogText);
  if (reviewsText === null) fs.rmSync(reviewsPath, { force: true }); else fs.writeFileSync(reviewsPath, reviewsText);
  fail(`Review zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
}

function run(script) { const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }); if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} fehlgeschlagen.`); if (result.stdout) process.stdout.write(result.stdout); }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 1) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const [key, inline] = token.slice(2).split('=', 2); const next = values[i + 1]; result[key] = inline ?? (next && !next.startsWith('--') ? values[++i] : 'true'); } return result; }
function unique(value) { return [...new Set(String(value).split(',').map((item) => item.trim()).filter(Boolean))]; }
function boolean(value) { if (!['true', 'false'].includes(value)) fail('Boolean muss true oder false sein.'); return value === 'true'; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Asset prüfen und Status ändern.\n\nBeispiele:\n  npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman\n  npm run asset:review -- --id VAH-XXXXXXXX --decision restrict --notes "Marke sichtbar"\n\nEntscheidungen: approve, restrict, archive, send-back.`); }
