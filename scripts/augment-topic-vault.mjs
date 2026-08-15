import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const vaultRoot = path.join(root, 'ALLES-GEFUNDEN', '05-THEMENRECHERCHEN');
const catalog = readJson(path.join(root, 'catalog', 'assets.json'));
const channelFolders = { 'channel-finance': '01-Finanzen', 'channel-ai': '02-KI', 'channel-electro': '03-Elektrotechnik', 'channel-combat-sports': '04-Kampfsport' };
const statusFolders = { approved: '01-FREIGEGEBEN', review: '02-REVIEW', inbox: '02-REVIEW', restricted: '03-EINGESCHRAENKT', archived: '04-ARCHIV' };
const sectionOrder = { overview: 1, training: 2, fight: 3, press: 4, 'weigh-in': 5, walkout: 6, portrait: 7, celebration: 8 };

if (!fs.existsSync(vaultRoot)) process.exit(0);

const sourceUrls = new Set((catalog.assets ?? []).map((asset) => canonicalUrl(asset.rights?.sourceUrl)).filter(Boolean));
const mirrored = [];
for (const asset of catalog.assets ?? []) {
  const meta = topicMeta(asset);
  if (!meta) continue;
  const provider = safeName(asset.rights?.sourceName || 'Unbekannte Quelle', 60);
  const status = statusFolders[asset.status] ?? '99-UNBEKANNT';
  const destination = path.join(vaultRoot, meta.channelFolder, safeName(meta.topic, 80), `${String(meta.order).padStart(2, '0')}-${safeName(meta.section, 70)}`, provider, '90-IMPORTIERT', status);
  fs.mkdirSync(destination, { recursive: true });
  const base = `${safeName(asset.title || asset.id, 90)}-${asset.id}`;
  const info = path.join(destination, `${base}-KATALOG.md`);
  fs.writeFileSync(info, catalogMarkdown(asset, meta));
  if (asset.rights?.sourceUrl) writeShortcut(path.join(destination, `${base}-QUELLE.url`), asset.rights.sourceUrl);
  if (asset.storage?.externalUrl) writeShortcut(path.join(destination, `${base}-MEDIUM.url`), asset.storage.externalUrl);
  if (asset.storage?.previewUrl) writeShortcut(path.join(destination, `${base}-VORSCHAU.url`), asset.storage.previewUrl);
  const localPreview = localFile(asset.storage?.previewPath);
  if (localPreview) fs.copyFileSync(localPreview, path.join(destination, `${base}-VORSCHAU${path.extname(localPreview)}`));
  const localMedia = localFile(asset.storage?.path);
  if (localMedia) fs.copyFileSync(localMedia, path.join(destination, `${base}${path.extname(localMedia)}`));
  mirrored.push({ topic: meta.topic, section: meta.section, assetId: asset.id, status: asset.status, source: asset.rights?.sourceName ?? '' });
}

markImportedCandidates(sourceUrls);
writeImportedIndexes(mirrored);
console.log(`Themenarchiv ergänzt: ${mirrored.length} importierte Themenassets gespiegelt.`);

function topicMeta(asset) {
  const tags = new Set(asset.tags ?? []);
  if (!tags.has('entity-research')) return null;
  const channelTag = [...tags].find((tag) => channelFolders[tag]);
  const topicTag = [...tags].find((tag) => String(tag).startsWith('topic-') && !String(tag).startsWith('topic-section-'));
  const sectionTag = [...tags].find((tag) => String(tag).startsWith('topic-section-'));
  if (!channelTag || !topicTag || !sectionTag) return null;
  const topicSlug = topicTag.slice('topic-'.length);
  const sectionSlug = sectionTag.slice('topic-section-'.length);
  const labeledAlias = (asset.searchAliases ?? []).find((alias) => String(alias).includes(' · '));
  const [aliasTopic, aliasSection] = labeledAlias ? String(labeledAlias).split(' · ', 2) : [];
  const topic = aliasTopic || titleCase(topicSlug);
  const section = aliasSection || sectionLabel(sectionSlug);
  return {
    channelFolder: channelFolders[channelTag],
    topic,
    section,
    order: sectionSlug.startsWith('script-') ? 90 : sectionOrder[sectionSlug] ?? 80
  };
}

function catalogMarkdown(asset, meta) {
  const rights = asset.rights ?? {};
  const warning = asset.status === 'approved'
    ? 'Im Katalog freigegeben. Der konkrete Reel-Kontext und eventuelle Personen-/Markenrechte bleiben trotzdem zu beachten.'
    : 'Im Katalog importiert, aber noch NICHT vollständig freigegeben.';
  return `# ${asset.title || asset.id}\n\n> ${warning}\n\n- **Asset-ID:** ${asset.id}\n- **Thema:** ${meta.topic}\n- **Recherchebereich:** ${meta.section}\n- **Status:** ${asset.status}\n- **Typ:** ${asset.type}\n- **Quelle:** ${rights.sourceName ?? '–'}\n- **Lizenzstatus:** ${rights.licenseStatus ?? '–'}\n- **Attribution erforderlich:** ${rights.attributionRequired === true ? 'ja' : rights.attributionRequired === false ? 'nein' : 'unbekannt'}\n- **Attribution:** ${rights.attributionText ?? '–'}\n- **Quellseite:** ${rights.sourceUrl ?? '–'}\n- **Lizenzseite:** ${rights.licenseUrl ?? '–'}\n\n## Prüfhinweis\n\n${rights.notes || asset.notes || 'Vor Veröffentlichung Inhalt, Personen, Marken, Rechte und Nutzungskontext prüfen.'}\n`;
}

function markImportedCandidates(importedSourceUrls) {
  for (const file of listFiles(vaultRoot, (name) => name.endsWith('-INFO.md'))) {
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const match = content.match(/^- Quellseite: (https?:\/\/\S+)$/m);
    if (!match || !importedSourceUrls.has(canonicalUrl(match[1]))) continue;
    if (content.includes('> NOCH NICHT IMPORTIERT.')) {
      content = content.replace('> NOCH NICHT IMPORTIERT. Dieser Treffer wurde nur bei einer Mediensuche gefunden und besitzt noch keine Freigabe im Katalog.', '> BEREITS IN DEN KATALOG IMPORTIERT. Der ursprüngliche Recherchefund bleibt als Historie erhalten; der aktuelle Status steht im Ordner `90-IMPORTIERT`.');
      fs.writeFileSync(file, content);
    }
  }
}

function writeImportedIndexes(rows) {
  const byTopic = new Map();
  for (const row of rows) {
    if (!byTopic.has(row.topic)) byTopic.set(row.topic, []);
    byTopic.get(row.topic).push(row);
  }
  for (const [topic, entries] of byTopic) {
    const topicDirectories = findDirectoriesNamed(vaultRoot, safeName(topic, 80));
    for (const directory of topicDirectories) {
      const lines = [
        `# Importierte Assets – ${topic}`, '',
        `Katalogisierte Themenassets: **${entries.length}**`, '',
        '| Asset-ID | Bereich | Status | Quelle |',
        '|---|---|---|---|',
        ...entries.map((entry) => `| ${entry.assetId} | ${entry.section} | ${entry.status} | ${entry.source || '–'} |`), '',
        '> Der Importstatus ist keine automatische Veröffentlichungsfreigabe.'
      ];
      fs.writeFileSync(path.join(directory, '00-IMPORTIERTE-ASSETS.md'), `${lines.join('\n')}\n`);
    }
  }
}

function findDirectoriesNamed(directory, name) {
  if (!fs.existsSync(directory)) return [];
  const matches = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(directory, entry.name);
    if (entry.name === name) matches.push(full);
    else matches.push(...findDirectoriesNamed(full, name));
  }
  return matches;
}

function listFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full, predicate));
    else if (entry.isFile() && predicate(entry.name)) files.push(full);
  }
  return files;
}

function localFile(relative) {
  if (!relative || typeof relative !== 'string' || relative.includes('..') || path.isAbsolute(relative)) return null;
  const file = path.resolve(root, ...relative.split('/'));
  if (!file.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return file;
}

function canonicalUrl(value) {
  if (!value || typeof value !== 'string') return '';
  try { const url = new URL(value); url.hash = ''; return url.toString(); } catch { return ''; }
}
function sectionLabel(value) {
  return ({ overview: 'Allgemein', training: 'Training & Gym', fight: 'Kämpfe & Action', press: 'Presse & Interviews', 'weigh-in': 'Wiegen & Staredown', walkout: 'Walkout & Arena', portrait: 'Portraits', celebration: 'Sieg & Reaktion' })[value] ?? (value.startsWith('script-') ? `Skript · ${titleCase(value.slice(7))}` : titleCase(value));
}
function titleCase(value) { return String(value ?? '').split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
function safeName(value, max = 80) { const text = String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim(); return (text || 'Ohne-Titel').slice(0, max).replace(/[. ]+$/g, ''); }
function writeShortcut(file, url) { if (/^https?:\/\//i.test(String(url))) fs.writeFileSync(file, `[InternetShortcut]\nURL=${String(url).replace(/[\r\n]/g, '')}\n`); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
