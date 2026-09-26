import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const index = readJson('catalog/channels/index.json');
const taxonomy = readJson('catalog/taxonomy.json');
const errors = [];
const channelIds = new Set();
const collectionKeys = new Set();
let queryCount = 0;
let collectionCount = 0;

if (!Array.isArray(index.files) || index.files.length === 0) errors.push('channels/index.json benötigt mindestens eine Datei.');
if (!Array.isArray(index.variants) || index.variants.length === 0) errors.push('channels/index.json benötigt Suchvarianten.');

for (const file of index.files ?? []) {
  const channel = readJson(file);
  if (!slugPattern.test(channel.id ?? '')) errors.push(`${file}: ungültige channel id.`);
  if (channelIds.has(channel.id)) errors.push(`${file}: doppelte channel id ${channel.id}.`);
  channelIds.add(channel.id);
  if (!taxonomy.channelIds?.includes(channel.id)) errors.push(`${file}: ${channel.id} fehlt in taxonomy.channelIds.`);
  if (!taxonomy.categories.includes(channel.primaryCategory)) errors.push(`${file}: Hauptkategorie ${channel.primaryCategory} fehlt in taxonomy.categories.`);
  requiredText(channel.label, `${file}.label`, 2, 80);
  requiredText(channel.description, `${file}.description`, 10, 300);
  if (!slugPattern.test(channel.channelTag ?? '')) errors.push(`${file}: channelTag ist kein Slug.`);
  if (!Array.isArray(channel.collections) || channel.collections.length < 10) errors.push(`${file}: mindestens 10 Sammlungen erforderlich.`);

  const localIds = new Set();
  for (const collection of channel.collections ?? []) {
    collectionCount += 1;
    const key = `${channel.id}/${collection.id}`;
    if (!slugPattern.test(collection.id ?? '')) errors.push(`${key}: ungültige collection id.`);
    if (localIds.has(collection.id)) errors.push(`${key}: doppelte collection id im Kanal.`);
    if (collectionKeys.has(key)) errors.push(`${key}: Sammlung doppelt.`);
    localIds.add(collection.id);
    collectionKeys.add(key);
    requiredText(collection.label, `${key}.label`, 2, 100);
    if (!Array.isArray(collection.queries) || collection.queries.length < 2 || collection.queries.length > 8) {
      errors.push(`${key}: 2 bis 8 Suchbegriffe erforderlich.`);
    }
    for (const query of collection.queries ?? []) {
      queryCount += 1;
      requiredText(query, `${key}.query`, 3, 120);
    }
    if (!Array.isArray(collection.tags) || collection.tags.length < 3 || collection.tags.length > 20) {
      errors.push(`${key}: 3 bis 20 Tags erforderlich.`);
    }
    const tagSet = new Set();
    for (const tag of collection.tags ?? []) {
      if (!slugPattern.test(tag)) errors.push(`${key}: ungültiger Tag ${String(tag)}.`);
      if (tagSet.has(tag)) errors.push(`${key}: doppelter Tag ${tag}.`);
      tagSet.add(tag);
    }
    if (collection.reviewNotes !== undefined) requiredText(collection.reviewNotes, `${key}.reviewNotes`, 5, 500);
  }
}

for (const variant of index.variants ?? []) {
  if (!slugPattern.test(variant.id ?? '')) errors.push('Ungültige variant id.');
  if (!['video', 'photo'].includes(variant.type)) errors.push(`${variant.id}: type muss video oder photo sein.`);
  if (!['vertical', 'horizontal', 'square', 'portrait', 'landscape'].includes(variant.orientation)) errors.push(`${variant.id}: ungültige orientation.`);
  if (!Number.isInteger(variant.perPage) || variant.perPage < 1 || variant.perPage > 80) errors.push(`${variant.id}: perPage muss 1 bis 80 sein.`);
}

if (errors.length) {
  console.error(`Kanalbibliothek ungültig (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Kanalbibliothek gültig: ${channelIds.size} Kanäle, ${collectionCount} Sammlungen, ${queryCount} Suchbegriffe, ${(index.variants ?? []).length} Varianten.`);

function readJson(relative) {
  const file = path.join(root, relative);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { console.error(`Datei konnte nicht gelesen werden: ${relative}\n${error instanceof Error ? error.message : String(error)}`); process.exit(1); }
}
function requiredText(value, label, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) errors.push(`${label}: Textlänge muss ${min} bis ${max} Zeichen betragen.`);
}
