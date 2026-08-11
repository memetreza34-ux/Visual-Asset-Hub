import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputRoot = path.join(root, 'ALLES-GEFUNDEN');
const catalog = readJson(path.join(root, 'catalog', 'assets.json'));
const channelIndex = readJson(path.join(root, 'catalog', 'channels', 'index.json'));
const channels = (channelIndex.files ?? []).map((file) => readJson(path.join(root, file)));

const channelOrder = new Map([
  ['finance', '01-Finanzen'],
  ['ai', '02-KI'],
  ['electro', '03-Elektrotechnik'],
  ['combat-sports', '04-Kampfsport']
]);

const statusOrder = new Map([
  ['approved', '01-FREIGEGEBEN'],
  ['review', '02-REVIEW'],
  ['inbox', '02-REVIEW'],
  ['restricted', '03-EINGESCHRAENKT'],
  ['archived', '04-ARCHIV'],
]);

prepareOutput();

const rows = [];
const counters = new Map();
for (const asset of catalog.assets ?? []) {
  const placement = resolvePlacement(asset);
  const channelFolder = channelOrder.get(placement.channel?.id) ?? '99-Sonstiges';
  const collectionLabel = placement.collection?.label ?? humanizeCollectionTag(asset) ?? categoryLabel(asset.category) ?? 'Ohne-Zuordnung';
  const collectionFolder = `${String((placement.collectionIndex ?? 98) + 1).padStart(2, '0')}-${safeName(collectionLabel, 70)}`;
  const statusFolder = statusOrder.get(asset.status) ?? '99-UNBEKANNT';
  const destination = path.join(outputRoot, channelFolder, collectionFolder, statusFolder);
  fs.mkdirSync(destination, { recursive: true });

  const counterKey = `${channelFolder}|${collectionFolder}|${statusFolder}`;
  const number = (counters.get(counterKey) ?? 0) + 1;
  counters.set(counterKey, number);
  const baseName = `${String(number).padStart(3, '0')}-${safeName(asset.title || asset.subject || asset.id, 95)}-${asset.id}`;

  const localFile = locateLocalFile(asset);
  let localCopy = '';
  if (localFile) {
    const extension = path.extname(localFile) || path.extname(asset.filename ?? '');
    const target = path.join(destination, `${baseName}${extension}`);
    fs.copyFileSync(localFile, target);
    localCopy = path.relative(outputRoot, target);
  }

  const sourceUrl = asset.rights?.sourceUrl || asset.source_url || '';
  const mediaUrl = asset.storage?.externalUrl || asset.storage?.originalUrl || asset.original_url || '';
  const previewUrl = asset.storage?.previewUrl || asset.preview_url || '';
  if (sourceUrl) writeInternetShortcut(path.join(destination, `${baseName}-QUELLE.url`), sourceUrl);
  if (mediaUrl) writeInternetShortcut(path.join(destination, `${baseName}-MEDIUM.url`), mediaUrl);
  if (previewUrl) writeInternetShortcut(path.join(destination, `${baseName}-VORSCHAU.url`), previewUrl);

  const infoFile = path.join(destination, `${baseName}-INFO.md`);
  fs.writeFileSync(infoFile, assetMarkdown(asset, { channelFolder, collectionLabel, localCopy, sourceUrl, mediaUrl, previewUrl }));

  rows.push({
    id: asset.id,
    title: asset.title ?? '',
    channel: placement.channel?.label ?? 'Sonstiges',
    collection: collectionLabel,
    status: asset.status ?? 'unbekannt',
    type: asset.type ?? '',
    source: asset.rights?.sourceName ?? '',
    license: asset.rights?.licenseStatus ?? '',
    localCopy,
    info: path.relative(outputRoot, infoFile),
    sourceUrl
  });
}

writeIndexes(rows);
console.log(`Alles-gefunden-Ordner aktualisiert: ${rows.length} Assets unter ${path.relative(root, outputRoot)}/`);

function prepareOutput() {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const entry of fs.readdirSync(outputRoot, { withFileTypes: true })) {
    if (entry.name === 'README.md') continue;
    fs.rmSync(path.join(outputRoot, entry.name), { recursive: true, force: true });
  }
}

function resolvePlacement(asset) {
  const tags = new Set(asset.tags ?? []);
  for (const channel of channels) {
    if (!tags.has(channel.channelTag)) continue;
    const index = (channel.collections ?? []).findIndex((collection) => tags.has(`collection-${collection.id}`));
    if (index >= 0) return { channel, collection: channel.collections[index], collectionIndex: index };
    return { channel, collection: null, collectionIndex: 98 };
  }
  for (const channel of channels) {
    const index = (channel.collections ?? []).findIndex((collection) => tags.has(`collection-${collection.id}`));
    if (index >= 0) return { channel, collection: channel.collections[index], collectionIndex: index };
  }
  return { channel: null, collection: null, collectionIndex: 98 };
}

function humanizeCollectionTag(asset) {
  const tag = (asset.tags ?? []).find((value) => String(value).startsWith('collection-'));
  return tag ? String(tag).slice('collection-'.length).replaceAll('-', ' ') : '';
}

function locateLocalFile(asset) {
  const candidates = [
    asset.storage?.localPath,
    asset.storage?.path,
    asset.storage?.relativePath,
    asset.localPath,
    asset.filename && path.join('assets', asset.filename),
    asset.filename && path.join('previews', asset.filename),
    asset.filename && path.join('inbox', asset.filename)
  ].filter(Boolean);
  for (const candidate of candidates) {
    const absolute = path.resolve(root, String(candidate));
    if (insideRoot(absolute) && fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
  }
  if (asset.filename) {
    for (const directory of ['assets', 'previews']) {
      const found = findByFilename(path.join(root, directory), path.basename(asset.filename), 5);
      if (found) return found;
    }
  }
  return null;
}

function findByFilename(directory, filename, maxDepth, depth = 0) {
  if (depth > maxDepth || !fs.existsSync(directory)) return null;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === filename) return full;
    if (entry.isDirectory()) {
      const found = findByFilename(full, filename, maxDepth, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function insideRoot(file) {
  const relative = path.relative(root, file);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function assetMarkdown(asset, meta) {
  const technical = asset.technical ?? {};
  const rights = asset.rights ?? {};
  const warning = asset.status === 'approved'
    ? 'Dieses Asset ist im Katalog freigegeben. Nutzung trotzdem im konkreten Projektkontext prüfen.'
    : 'NICHT automatisch veröffentlichen. Dieses Asset ist noch nicht vollständig freigegeben.';
  return `# ${asset.title || asset.id}\n\n> ${warning}\n\n## Zuordnung\n\n- **Asset-ID:** ${asset.id}\n- **Kanal:** ${meta.channelFolder.replace(/^\\d+-/, '')}\n- **Sammlung:** ${meta.collectionLabel}\n- **Kategorie:** ${asset.category ?? '–'}\n- **Status:** ${asset.status ?? '–'}\n- **Typ:** ${asset.type ?? '–'}\n- **Ausrichtung:** ${asset.orientation ?? '–'}\n\n## Beschreibung\n\n${asset.description || 'Keine Beschreibung vorhanden.'}\n\n## Technische Daten\n\n- Auflösung: ${technical.width ?? '?'} × ${technical.height ?? '?'}\n- Dauer: ${technical.durationSeconds ?? asset.duration_seconds ?? '–'}${technical.durationSeconds || asset.duration_seconds ? ' s' : ''}\n- FPS: ${technical.fps ?? '–'}\n- Codec: ${technical.codec ?? '–'}\n- Lokale Kopie im Alles-gefunden-Ordner: ${meta.localCopy || 'nein – extern verlinkt'}\n\n## Quelle und Rechte\n\n- Quelle: ${rights.sourceName ?? '–'}\n- Lizenzstatus: ${rights.licenseStatus ?? '–'}\n- Attribution erforderlich: ${rights.attributionRequired === true ? 'ja' : rights.attributionRequired === false ? 'nein' : 'unbekannt'}\n- Attribution: ${rights.attributionText ?? '–'}\n- Nutzung: ${(rights.usageScopes ?? []).join(', ') || '–'}\n- Quellseite: ${meta.sourceUrl || '–'}\n- Lizenzseite: ${rights.licenseUrl ?? '–'}\n- Medien-URL: ${meta.mediaUrl || '–'}\n- Vorschau: ${meta.previewUrl || '–'}\n\n## Tags\n\n${(asset.tags ?? []).map((tag) => `- ${tag}`).join('\n') || '- keine'}\n\n## Prüfhinweise\n\n${rights.notes || asset.notes || 'Keine zusätzlichen Hinweise.'}\n`;
}

function writeIndexes(rows) {
  const generatedAt = new Date().toISOString();
  const byStatus = countBy(rows, (row) => row.status);
  const byChannel = countBy(rows, (row) => row.channel);
  const markdown = [
    '# Alles gefunden – Gesamtindex', '',
    `Erzeugt: ${generatedAt}`, '',
    `- Assets insgesamt: **${rows.length}**`,
    `- Freigegeben: **${byStatus.approved ?? 0}**`,
    `- Review/Inbox: **${(byStatus.review ?? 0) + (byStatus.inbox ?? 0)}**`,
    `- Eingeschränkt: **${byStatus.restricted ?? 0}**`,
    `- Archiviert: **${byStatus.archived ?? 0}**`, '',
    '## Kanäle', '',
    ...Object.entries(byChannel).sort().map(([name, count]) => `- ${name}: **${count}**`), '',
    '## Alle Assets', '',
    '| Titel | Kanal | Sammlung | Status | Typ | Quelle |',
    '|---|---|---|---|---|---|',
    ...rows.map((row) => `| ${escapeTable(row.title)} | ${escapeTable(row.channel)} | ${escapeTable(row.collection)} | ${row.status} | ${row.type} | ${escapeTable(row.source)} |`), '',
    '> Wichtig: Der Ordner ist ein Arbeitsarchiv. Review-, Inbox-, eingeschränkte und archivierte Assets sind keine automatische Veröffentlichungserlaubnis.'
  ].join('\n');
  fs.writeFileSync(path.join(outputRoot, '00-GESAMTINDEX.md'), `${markdown}\n`);
  fs.writeFileSync(path.join(outputRoot, '00-MANIFEST.json'), `${JSON.stringify({ version: 1, generatedAt, assets: rows }, null, 2)}\n`);
  const header = ['ID','Titel','Kanal','Sammlung','Status','Typ','Quelle','Lizenz','Lokale Kopie','Info','Quellseite'];
  const csvRows = [header, ...rows.map((row) => [row.id,row.title,row.channel,row.collection,row.status,row.type,row.source,row.license,row.localCopy,row.info,row.sourceUrl])];
  fs.writeFileSync(path.join(outputRoot, '00-GESAMTINDEX.csv'), `${csvRows.map((row) => row.map(csv).join(',')).join('\n')}\n`);
}

function writeInternetShortcut(file, url) {
  if (!/^https?:\/\//i.test(String(url))) return;
  fs.writeFileSync(file, `[InternetShortcut]\nURL=${String(url).replace(/[\r\n]/g, '')}\n`);
}
function safeName(value, max = 80) {
  const text = String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return (text || 'Ohne-Titel').slice(0, max).replace(/[. ]+$/g, '');
}
function categoryLabel(value) { return String(value ?? '').replaceAll('-', ' '); }
function countBy(rows, selector) { return rows.reduce((acc, row) => { const key = selector(row) || 'Unbekannt'; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {}); }
function escapeTable(value) { return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' '); }
function csv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
