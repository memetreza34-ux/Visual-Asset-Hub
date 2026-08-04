import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const assets = readJson(path.join(root, 'catalog/assets.json')).assets ?? [];
const reviews = readOptional(path.join(root, 'catalog/reviews.json'), { version: 1, decisions: [] });
const usage = readOptional(path.join(root, 'catalog/usage.json'), { version: 1, uses: [] });
const errors = [];
const assetIds = new Set(assets.map((asset) => asset.id));
const statuses = new Set(['review', 'approved', 'restricted', 'archived']);
const decisions = new Set(['approve', 'restrict', 'archive', 'send-back']);
const platforms = new Set(['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'website', 'app', 'presentation', 'client-work', 'other']);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const secretParamPattern = /(token|signature|sig|secret|api[-_]?key|access[-_]?key|credential|expires|x-amz|x-goog|policy)/i;

validateEnvelope(reviews, 'reviews', 'decisions');
validateEnvelope(usage, 'usage', 'uses');

const reviewIds = new Set();
for (const [index, entry] of (reviews.decisions ?? []).entries()) {
  const ref = entry?.id || `reviews.decisions[${index}]`;
  required(entry, 'id', ref); required(entry, 'assetId', ref); required(entry, 'reviewedAt', ref); required(entry, 'reviewer', ref);
  if (reviewIds.has(entry.id)) errors.push(`${ref}: Review-ID doppelt.`); reviewIds.add(entry.id);
  if (!assetIds.has(entry.assetId)) errors.push(`${ref}: unbekannte Asset-ID ${entry.assetId}.`);
  if (!decisions.has(entry.decision)) errors.push(`${ref}: ungültige Entscheidung ${entry.decision}.`);
  if (!statuses.has(entry.previousStatus) || !statuses.has(entry.nextStatus)) errors.push(`${ref}: ungültiger Statuswechsel.`);
  if (!isDateTime(entry.reviewedAt)) errors.push(`${ref}: reviewedAt ungültig.`);
}

const useIds = new Set();
for (const [index, entry] of (usage.uses ?? []).entries()) {
  const ref = entry?.id || `usage.uses[${index}]`;
  required(entry, 'id', ref); required(entry, 'assetId', ref); required(entry, 'project', ref); required(entry, 'platform', ref); required(entry, 'usedAt', ref);
  if (useIds.has(entry.id)) errors.push(`${ref}: Nutzungs-ID doppelt.`); useIds.add(entry.id);
  if (!assetIds.has(entry.assetId)) errors.push(`${ref}: unbekannte Asset-ID ${entry.assetId}.`);
  if (!slugPattern.test(entry.project ?? '')) errors.push(`${ref}: project muss ein Slug sein.`);
  if (!platforms.has(entry.platform)) errors.push(`${ref}: unbekannte Plattform ${entry.platform}.`);
  if (!isDateTime(entry.usedAt)) errors.push(`${ref}: usedAt ungültig.`);
  if (entry.contentUrl) validateSafeUrl(entry.contentUrl, `${ref}.contentUrl`);
}

if (errors.length) {
  console.error(`Betriebsdatenprüfung fehlgeschlagen (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Betriebsdatenprüfung erfolgreich: ${(reviews.decisions ?? []).length} Reviews, ${(usage.uses ?? []).length} Nutzungen.`);

function validateEnvelope(value, label, listField) {
  if (!Number.isInteger(value.version) || value.version < 1) errors.push(`${label}.version ungültig.`);
  if (!isDateTime(value.updatedAt)) errors.push(`${label}.updatedAt ungültig.`);
  if (!Array.isArray(value[listField])) errors.push(`${label}.${listField} muss ein Array sein.`);
}
function required(object, field, ref) { if (typeof object?.[field] !== 'string' || !object[field].trim()) errors.push(`${ref}.${field} fehlt.`); }
function isDateTime(value) { return typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value)); }
function validateSafeUrl(value, label) {
  try { const url = new URL(value); if (!['https:', 'http:'].includes(url.protocol)) errors.push(`${label}: nur HTTP(S).`); for (const key of url.searchParams.keys()) if (secretParamPattern.test(key)) errors.push(`${label}: vertraulicher Parameter ${key}.`); }
  catch { errors.push(`${label}: ungültige URL.`); }
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readOptional(file, fallback) { return fs.existsSync(file) ? readJson(file) : { ...fallback, updatedAt: new Date(0).toISOString() }; }
