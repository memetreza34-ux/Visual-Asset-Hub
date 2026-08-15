import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const coreScript = path.join(scriptDir, 'build-found-media-vault-core.mjs');
const vaultRoot = path.join(root, 'ALLES-GEFUNDEN');
const archives = [
  { name: 'Kandidaten', root: path.join(vaultRoot, '90-GEFUNDENE-KANDIDATEN'), backup: path.join(root, '.local-storage', 'vault-candidate-history') },
  { name: 'Themenrecherchen', root: path.join(vaultRoot, '05-THEMENRECHERCHEN'), backup: path.join(root, '.local-storage', 'vault-topic-history') }
];

fs.mkdirSync(path.join(root, '.local-storage'), { recursive: true });
for (const archive of archives) {
  fs.rmSync(archive.backup, { recursive: true, force: true });
  if (fs.existsSync(archive.root)) fs.cpSync(archive.root, archive.backup, { recursive: true });
}

const result = spawnSync(process.execPath, [coreScript], {
  cwd: root,
  encoding: 'utf8',
  shell: false,
  maxBuffer: 8 * 1024 * 1024
});

if (result.status !== 0) {
  restoreArchives();
  cleanupBackups();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

restoreArchives();
cleanupBackups();

const candidateFiles = listFiles(archives[0].root, (name) => name.endsWith('-INFO.md'));
const topicFiles = listFiles(archives[1].root, (name) => name.endsWith('-INFO.md'));
writeHistoryIndex(archives[0].root, candidateFiles, 'Historisches Kandidatenarchiv', 'Diese Liste enthält auch Funde aus älteren normalen Suchläufen.');
writeHistoryIndex(archives[1].root, topicFiles, 'Historische Themenrecherchen', 'Diese Liste enthält auch Personen-/Themenfunde aus älteren Rechercheläufen.');
augmentMainIndexes(candidateFiles, topicFiles);

if (result.stdout) process.stdout.write(result.stdout);
console.log(`Historische Suchfunde bleiben erhalten: ${candidateFiles.length} normale Kandidaten + ${topicFiles.length} Themenrecherche-Einträge.`);

function restoreArchives() {
  for (const archive of archives) {
    if (!fs.existsSync(archive.backup)) continue;
    fs.mkdirSync(archive.root, { recursive: true });
    fs.cpSync(archive.backup, archive.root, { recursive: true, force: false, errorOnExist: false });
  }
}

function cleanupBackups() {
  for (const archive of archives) fs.rmSync(archive.backup, { recursive: true, force: true });
}

function listFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full, predicate));
    else if (entry.isFile() && predicate(entry.name)) files.push(full);
  }
  return files.sort((a, b) => a.localeCompare(b, 'de'));
}

function writeHistoryIndex(directory, files, title, copy) {
  fs.mkdirSync(directory, { recursive: true });
  const lines = [
    `# ${title}`, '',
    `Aktuell erhaltene Einträge: **${files.length}**`, '',
    copy, '',
    ...files.map((file) => `- [${path.basename(file, '-INFO.md')}](${encodeRelativePath(path.relative(directory, file))})`), '',
    '> Diese Einträge sind nicht automatisch importiert oder freigegeben.'
  ];
  fs.writeFileSync(path.join(directory, '00-HISTORIE.md'), `${lines.join('\n')}\n`);
}

function augmentMainIndexes(candidateFiles, topicFiles) {
  const marker = '<!-- VAULT-HISTORY -->';
  const indexFile = path.join(vaultRoot, '00-GESAMTINDEX.md');
  if (fs.existsSync(indexFile)) {
    const existing = fs.readFileSync(indexFile, 'utf8');
    const base = existing.split(marker)[0].trimEnd();
    const extra = [
      '', '', marker,
      '## Dauerhafte lokale Archive', '',
      `- Historisch erhaltene normale Suchfunde: **${candidateFiles.length}**`,
      `- Historisch erhaltene Themen-/Personenfunde: **${topicFiles.length}**`,
      '- Normale Funde: `90-GEFUNDENE-KANDIDATEN/00-HISTORIE.md`',
      '- Themenrecherchen: `05-THEMENRECHERCHEN/00-HISTORIE.md`', '',
      '> Beide Archive bleiben lokal erhalten, auch wenn temporäre API-Suchdateien später bereinigt werden.'
    ].join('\n');
    fs.writeFileSync(indexFile, `${base}${extra}\n`);
  }

  const manifestFile = path.join(vaultRoot, '00-MANIFEST.json');
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.historicalCandidateCount = candidateFiles.length;
    manifest.historicalCandidateIndex = '90-GEFUNDENE-KANDIDATEN/00-HISTORIE.md';
    manifest.historicalTopicResearchCount = topicFiles.length;
    manifest.historicalTopicResearchIndex = '05-THEMENRECHERCHEN/00-HISTORIE.md';
    fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

function encodeRelativePath(relative) {
  return relative.split(path.sep).map((part) => encodeURIComponent(part)).join('/');
}
