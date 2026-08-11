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
  ['archived', '04-ARCHIV']
]);

prepareOutput();

const rows = [];
const candidateRows = [];
const counters = new Map();
const catalogProviderIds = new Set();

for (const asset of catalog.assets ?? []) {
  const providerId = providerIdentityFromCatalog(asset);
  if (providerId) catalogProviderIds.add(providerId);
  writeCatalogAsset(asset);
}

writeSearchCandidates();
writeIndexes(rows, candidateRows);
console.log(`Alles-gefunden-Ordner aktualisiert: ${rows.length} Katalog-Assets + ${candidateRows.length} nicht importierte Suchkandidaten unter ${path.relative(root, outputRoot)}/`);

function writeCatalogAsset(asset) {
  const placement = resolvePlacement(asset);
  const channelFolder = channelOrder.get(placement.channel?.id) ?? '99-Sonstiges';
  const collectionLabel = placement.collection?.label ?? humanizeCollectionTag(asset) ?? categoryLabel(asset.category) ?? 'Ohne-Zuordnung';
  const collectionFolder = `${String((placement.collectionIndex ?? 98) + 1).padStart(2, '0')}-${safeName(collectionLabel, 70)}`;
  const statusFolder = statusOrder.get(asset.status) ?? '99-UNBEKANNT';
  const destination = path.join(outputRoot, channelFolder, collectionFolder, statusFolder);
  fs.mkdirSync(destination, { recursive: true });

  const counterKey = `${channelFolder}|${collectionFolder}|${statusFolder}`;
  const number = nextCounter(counterKey);
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

function writeSearchCandidates() {
  const searchRoot = path.join(root, '.local-storage', 'arsenal-web');
  if (!fs.existsSync(searchRoot)) return;
  const seen = new Set();
  for (const file of listJsonFiles(searchRoot, 2)) {
    if (file.includes(`${path.sep}pixabay-cache${path.sep}`)) continue;
    let wrapper;
    try { wrapper = readJson(file); } catch { continue; }
    const job = wrapper.arsenalJob ?? wrapper.job;
    const assets = wrapper.result?.assets ?? wrapper.assets;
    if (!job || !Array.isArray(assets)) continue;
    const provider = wrapper.provider ?? wrapper.result?.provider ?? 'unbekannt';
    const channel = channels.find((item) => item.id === job.channel);
    const collectionIndex = (channel?.collections ?? []).findIndex((item) => item.id === job.collection);
    const collection = collectionIndex >= 0 ? channel.collections[collectionIndex] : null;
    const channelFolder = channelOrder.get(channel?.id) ?? `99-${safeName(job.channelLabel || job.channel || 'Sonstiges', 40)}`;
    const collectionLabel = collection?.label ?? job.collectionLabel ?? job.collection ?? 'Ohne-Zuordnung';
    const collectionFolder = `${String((collectionIndex >= 0 ? collectionIndex : 98) + 1).padStart(2, '0')}-${safeName(collectionLabel, 70)}`;
    const providerFolder = safeName(providerLabel(provider), 50);
    const destination = path.join(outputRoot, '90-GEFUNDENE-KANDIDATEN', channelFolder, collectionFolder, providerFolder);
    fs.mkdirSync(destination, { recursive: true });

    for (const candidate of assets) {
      const providerId = String(candidate.provider_id ?? candidate.id ?? '').trim();
      if (!providerId) continue;
      const identity = `${provider}|${providerId}`;
      if (catalogProviderIds.has(identity)) continue;
      const dedupe = `${identity}|${job.channel ?? ''}|${job.collection ?? ''}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      const number = nextCounter(`candidate|${channelFolder}|${collectionFolder}|${providerFolder}`);
      const title = candidateTitle(candidate, job, provider);
      const baseName = `${String(number).padStart(3, '0')}-${safeName(title, 95)}-${safeName(providerId, 48)}`;
      const sourceUrl = candidate.source_url || candidate.page_url || '';
      const mediaUrl = candidate.original_url || bestMediaUrl(candidate.files) || '';
      const previewUrl = candidate.preview_url || '';
      if (sourceUrl) writeInternetShortcut(path.join(destination, `${baseName}-QUELLE.url`), sourceUrl);
      if (mediaUrl) writeInternetShortcut(path.join(destination, `${baseName}-MEDIUM.url`), mediaUrl);
      if (previewUrl) writeInternetShortcut(path.join(destination, `${baseName}-VORSCHAU.url`), previewUrl);
      const infoFile = path.join(destination, `${baseName}-INFO.md`);
      fs.writeFileSync(infoFile, candidateMarkdown(candidate, { provider, providerId, title, job, channel, collectionLabel, sourceUrl, mediaUrl, previewUrl, searchFile: path.relative(root, file) }));
      candidateRows.push({
        provider,
        providerId,
        title,
        channel: channel?.label ?? job.channelLabel ?? job.channel ?? 'Sonstiges',
        collection: collectionLabel,
        type: candidate.type ?? job.type ?? '',
        sourceUrl,
        info: path.relative(outputRoot, infoFile)
      });
    }
  }
}

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

function listJsonFiles(directory, maxDepth, depth = 0) {
  if (depth > maxDepth || !fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
    if (entry.isDirectory()) files.push(...listJsonFiles(full, maxDepth, depth + 1));
  }
  return files;
}

function insideRoot(file) {
  const relative = path.relative(root, file);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function assetMarkdown(asset, meta) {
  const technical = asset.technical ?? {};
  const rights = asset.rights ?? {};
  const warning = asset.status === 'approved'
    ? 'Dieses Asset ist im Katalog freigegeben. Nutzung trotzdem im konkreten Projektkontext prüfen.'
    : 'NICHT automatisch veröffentlichen. Dieses Asset ist noch nicht vollständig freigegeben.';
  return `# ${asset.title || asset.id}\n\n> ${warning}\n\n## Zuordnung\n\n- **Asset-ID:** ${asset.id}\n- **Kanal:** ${meta.channelFolder.replace(/^\\d+-/, '')}\n- **Sammlung:** ${meta.collectionLabel}\n- **Kategorie:** ${asset.category ?? '–'}\n- **Status:** ${asset.status ?? '–'}\n- **Typ:** ${asset.type ?? '–'}\n- **Ausrichtung:** ${asset.orientation ?? '–'}\n\n## Beschreibung\n\n${asset.description || 'Keine Beschreibung vorhanden.'}\n\n## Technische Daten\n\n- Auflösung: ${technical.width ?? '?'} × ${technical.height ?? '?'}\n- Dauer: ${technical.durationSeconds ?? asset.duration_seconds ?? '–'}${technical.durationSeconds || asset.duration_seconds ? ' s' : ''}\n- FPS: ${technical.fps ?? '–'}\n- Codec: ${technical.codec ?? '–'}\n- Lokale Kopie im Alles-gefunden-Ordner: ${meta.localCopy || 'nein – extern verlinkt'}\n\n## Quelle und Rechte\n\n- Quelle: ${rights.sourceName ?? '–'}\n- Lizenzstatus: ${rights.licenseStatus ?? '–'}\n- Attribution erforderlich: ${rights.attributionRequired === true ? 'ja' : rights.attributionRequired === false ? 'nein' : 'unbekannt'}\n- Attribution: ${rights.attributionText ?? '–'}\n- Nutzung: ${(rights.usageScopes ?? []).join(', ') || '–'}\n- Quellseite: ${meta.sourceUrl || '–'}\n- Lizenzseite: ${rights.licenseUrl ?? '–'}\n- Medien-URL: ${meta.mediaUrl || '–'}\n- Vorschau: ${meta.previewUrl || '–'}\n\n## Tags\n\n${(asset.tags ?? []).map((tag) => `- ${tag}`).join('\n') || '- keine'}\n\n## Prüfhinweise\n\n${rights.notes || asset.notes || 'Keine zusätzlichen Hinweise.'}\n`;
}

function candidateMarkdown(candidate, meta) {
  return `# ${meta.title}\n\n> NOCH NICHT IMPORTIERT. Dieser Treffer wurde nur bei einer Mediensuche gefunden und besitzt noch keine Freigabe im Katalog.\n\n## Fundstelle\n\n- **Quelle:** ${providerLabel(meta.provider)}\n- **Provider-ID:** ${meta.providerId}\n- **Kanal:** ${meta.channel?.label ?? meta.job.channelLabel ?? meta.job.channel ?? '–'}\n- **Sammlung:** ${meta.collectionLabel}\n- **Suchbegriff:** ${meta.job.query ?? '–'}\n- **Typ:** ${candidate.type ?? meta.job.type ?? '–'}\n- **Ausrichtung:** ${candidate.orientation ?? meta.job.orientation ?? '–'}\n- **Lokale Suchdatei:** ${meta.searchFile}\n\n## Technische Daten\n\n- Auflösung: ${candidate.width ?? '?'} × ${candidate.height ?? '?'}\n- Dauer: ${candidate.duration_seconds ?? '–'}${candidate.duration_seconds ? ' s' : ''}\n- Creator: ${candidate.creator ?? '–'}\n- Lizenzhinweis: ${candidate.license ?? '–'}\n\n## Links\n\n- Quellseite: ${meta.sourceUrl || '–'}\n- Medium: ${meta.mediaUrl || '–'}\n- Vorschau: ${meta.previewUrl || '–'}\n\n## Hinweis\n\nVor einer Nutzung muss der Treffer zuerst bewusst ausgewählt, in den Katalog importiert und nach den normalen Rechte- und Sichtprüfungen freigegeben werden.\n`;
}

function writeIndexes(assetRows, foundRows) {
  const generatedAt = new Date().toISOString();
  const byStatus = countBy(assetRows, (row) => row.status);
  const byChannel = countBy(assetRows, (row) => row.channel);
  const markdown = [
    '# Alles gefunden – Gesamtindex', '',
    `Erzeugt: ${generatedAt}`, '',
    `- Katalog-Assets insgesamt: **${assetRows.length}**`,
    `- Noch nicht importierte Suchkandidaten: **${foundRows.length}**`,
    `- Freigegeben: **${byStatus.approved ?? 0}**`,
    `- Review/Inbox: **${(byStatus.review ?? 0) + (byStatus.inbox ?? 0)}**`,
    `- Eingeschränkt: **${byStatus.restricted ?? 0}**`,
    `- Archiviert: **${byStatus.archived ?? 0}**`, '',
    '## Kanäle im Katalog', '',
    ...Object.entries(byChannel).sort().map(([name, count]) => `- ${name}: **${count}**`), '',
    '## Katalog-Assets', '',
    '| Titel | Kanal | Sammlung | Status | Typ | Quelle |',
    '|---|---|---|---|---|---|',
    ...assetRows.map((row) => `| ${escapeTable(row.title)} | ${escapeTable(row.channel)} | ${escapeTable(row.collection)} | ${row.status} | ${row.type} | ${escapeTable(row.source)} |`), '',
    '## Noch nicht importierte Suchfunde', '',
    '| Titel | Kanal | Sammlung | Quelle | Typ |',
    '|---|---|---|---|---|',
    ...foundRows.map((row) => `| ${escapeTable(row.title)} | ${escapeTable(row.channel)} | ${escapeTable(row.collection)} | ${providerLabel(row.provider)} | ${row.type} |`), '',
    '> Wichtig: Der Ordner ist ein Arbeitsarchiv. Suchkandidaten sowie Review-, Inbox-, eingeschränkte und archivierte Assets sind keine automatische Veröffentlichungserlaubnis.'
  ].join('\n');
  fs.writeFileSync(path.join(outputRoot, '00-GESAMTINDEX.md'), `${markdown}\n`);
  fs.writeFileSync(path.join(outputRoot, '00-MANIFEST.json'), `${JSON.stringify({ version: 2, generatedAt, assets: assetRows, candidates: foundRows }, null, 2)}\n`);
  const header = ['Art','ID','Titel','Kanal','Sammlung','Status','Typ','Quelle','Lizenz','Lokale Kopie','Info','Quellseite'];
  const csvRows = [
    header,
    ...assetRows.map((row) => ['asset',row.id,row.title,row.channel,row.collection,row.status,row.type,row.source,row.license,row.localCopy,row.info,row.sourceUrl]),
    ...foundRows.map((row) => ['candidate',row.providerId,row.title,row.channel,row.collection,'not-imported',row.type,providerLabel(row.provider),'','',row.info,row.sourceUrl])
  ];
  fs.writeFileSync(path.join(outputRoot, '00-GESAMTINDEX.csv'), `${csvRows.map((row) => row.map(csv).join(',')).join('\n')}\n`);
}

function providerIdentityFromCatalog(asset) {
  const source = String(asset.rights?.sourceName ?? '').toLowerCase();
  const explicit = asset.provider_id ?? asset.providerId;
  if (explicit && source) return `${normalizeProvider(source)}|${String(explicit)}`;
  const notes = `${asset.notes ?? ''} ${asset.rights?.notes ?? ''}`;
  const match = notes.match(/(?:Asset-ID|ID)\s*[:#]?\s*([A-Za-z0-9_-]{2,64})/i);
  if (match && source) return `${normalizeProvider(source)}|${match[1]}`;
  const idMatch = String(asset.id ?? '').match(/^VAH-[A-Z]+([A-Za-z0-9_-]+)$/);
  if (idMatch && source) return `${normalizeProvider(source)}|${idMatch[1]}`;
  return '';
}

function normalizeProvider(value) {
  const text = String(value).toLowerCase();
  if (text.includes('pexels')) return 'pexels';
  if (text.includes('pixabay')) return 'pixabay';
  if (text.includes('unsplash')) return 'unsplash';
  if (text.includes('openverse')) return 'openverse';
  if (text.includes('wikimedia')) return 'wikimedia';
  return text.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function candidateTitle(candidate, job, provider) {
  const raw = String(candidate.title ?? '').trim();
  const generic = !raw || new RegExp(`^${providerLabel(provider)}\\s+(Video|Foto|Bild)?\\s*\\d*$`, 'i').test(raw);
  if (!generic) return raw;
  const type = candidate.type === 'video' || job.type === 'video' ? 'Video' : 'Bild';
  const creator = candidate.creator ? ` von ${candidate.creator}` : '';
  return `${job.collectionLabel ?? job.collection ?? 'Medienfund'} – ${type}${creator}`;
}

function bestMediaUrl(files) {
  if (Array.isArray(files)) return files.find((item) => item?.url)?.url ?? '';
  if (!files || typeof files !== 'object') return '';
  for (const key of ['original','large','medium','small']) {
    const value = files[key];
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    if (value?.url) return value.url;
  }
  return '';
}

function nextCounter(key) {
  const number = (counters.get(key) ?? 0) + 1;
  counters.set(key, number);
  return number;
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
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia Commons' })[String(value ?? '').toLowerCase()] ?? String(value ?? 'Unbekannt'); }
function countBy(items, selector) { return items.reduce((acc, item) => { const key = selector(item) || 'Unbekannt'; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {}); }
function escapeTable(value) { return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' '); }
function csv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
