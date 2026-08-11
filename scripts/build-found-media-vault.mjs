import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const coreScript = path.join(scriptDir, 'build-found-media-vault-core.mjs');
const vaultRoot = path.join(root, 'ALLES-GEFUNDEN');
const candidateRoot = path.join(vaultRoot, '90-GEFUNDENE-KANDIDATEN');
const backupRoot = path.join(root, '.local-storage', 'vault-candidate-history');

fs.mkdirSync(path.dirname(backupRoot), { recursive: true });
fs.rmSync(backupRoot, { recursive: true, force: true });
if (fs.existsSync(candidateRoot)) fs.cpSync(candidateRoot, backupRoot, { recursive: true });

const result = spawnSync(process.execPath, [coreScript], {
  cwd: root,
  encoding: 'utf8',
  shell: false,
  maxBuffer: 8 * 1024 * 1024
});

if (result.status !== 0) {
  if (fs.existsSync(backupRoot)) {
    fs.mkdirSync(candidateRoot, { recursive: true });
    fs.cpSync(backupRoot, candidateRoot, { recursive: true, force: false, errorOnExist: false });
  }
  fs.rmSync(backupRoot, { recursive: true, force: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

if (fs.existsSync(backupRoot)) {
  fs.mkdirSync(candidateRoot, { recursive: true });
  fs.cpSync(backupRoot, candidateRoot, { recursive: true, force: false, errorOnExist: false });
}
fs.rmSync(backupRoot, { recursive: true, force: true });

const historicalInfoFiles = listFiles(candidateRoot, (name) => name.endsWith('-INFO.md'));
writeHistoryIndex(historicalInfoFiles);
augmentMainIndexes(historicalInfoFiles);

if (result.stdout) process.stdout.write(result.stdout);
console.log(`Historische Suchkandidaten bleiben erhalten und sind indexiert: ${historicalInfoFiles.length} Einträge.`);

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

function writeHistoryIndex(files) {
  fs.mkdirSync(candidateRoot, { recursive: true });
  const lines = [
    '# Historisches Kandidatenarchiv', '',
    `Aktuell erhaltene Suchfunde: **${files.length}**`, '',
    'Diese Liste enthält auch Funde aus älteren Suchläufen, deren temporäre API-Suchdateien inzwischen gelöscht worden sein können.', '',
    ...files.map((file) => `- [${path.basename(file, '-INFO.md')}](${encodeRelativePath(path.relative(candidateRoot, file))})`), '',
    '> Diese Kandidaten sind nicht automatisch importiert oder freigegeben.'
  ];
  fs.writeFileSync(path.join(candidateRoot, '00-HISTORIE.md'), `${lines.join('\n')}\n`);
}

function augmentMainIndexes(files) {
  const marker = '<!-- VAULT-HISTORY -->';
  const indexFile = path.join(vaultRoot, '00-GESAMTINDEX.md');
  if (fs.existsSync(indexFile)) {
    const existing = fs.readFileSync(indexFile, 'utf8');
    const base = existing.split(marker)[0].trimEnd();
    const extra = [
      '', '', marker,
      '## Dauerhaftes Kandidatenarchiv', '',
      `- Historisch erhaltene Suchfunde: **${files.length}**`,
      '- Vollständige Liste: `90-GEFUNDENE-KANDIDATEN/00-HISTORIE.md`', '',
      '> Historische Suchfunde bleiben lokal erhalten, auch wenn temporäre API-Suchdateien später bereinigt werden.'
    ].join('\n');
    fs.writeFileSync(indexFile, `${base}${extra}\n`);
  }

  const manifestFile = path.join(vaultRoot, '00-MANIFEST.json');
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.historicalCandidateCount = files.length;
    manifest.historicalCandidateIndex = '90-GEFUNDENE-KANDIDATEN/00-HISTORIE.md';
    fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

function encodeRelativePath(relative) {
  return relative.split(path.sep).map((part) => encodeURIComponent(part)).join('/');
}
