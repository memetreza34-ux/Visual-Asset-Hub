import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function verifyBackup({ root = process.cwd(), backup }) {
  if (!backup) throw new Error('--backup ist erforderlich.');
  const backupsRoot = path.resolve(root, 'backups');
  const backupRoot = path.resolve(root, backup);
  if (backupRoot !== backupsRoot && !backupRoot.startsWith(`${backupsRoot}${path.sep}`)) {
    throw new Error('Das Backup muss innerhalb des Ordners backups liegen.');
  }
  const manifestPath = path.join(backupRoot, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('manifest.json fehlt im Backup.');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error('Backup-Manifest ist ungültig.');
  if (!manifest.files.some((entry) => entry.path === 'catalog/assets.json')) throw new Error('catalog/assets.json fehlt im Manifest.');

  const verified = [];
  const seen = new Set();
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== 'string' || !/^catalog\/[a-z0-9._-]+\.json$/i.test(entry.path)) {
      throw new Error(`Unsicherer oder ungültiger Manifestpfad: ${String(entry?.path)}`);
    }
    if (seen.has(entry.path)) throw new Error(`Doppelter Manifestpfad: ${entry.path}`);
    seen.add(entry.path);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256 || '')) throw new Error(`Ungültige Prüfsumme: ${entry.path}`);
    if (!Number.isInteger(entry.bytes) || entry.bytes < 1) throw new Error(`Ungültige Dateigröße: ${entry.path}`);
    const source = path.join(backupRoot, ...entry.path.split('/'));
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`Backup-Datei fehlt: ${entry.path}`);
    const stat = fs.statSync(source);
    if (stat.size !== entry.bytes) throw new Error(`Dateigröße stimmt nicht: ${entry.path}`);
    if (sha256(source) !== entry.sha256) throw new Error(`SHA-256 stimmt nicht: ${entry.path}`);
    JSON.parse(fs.readFileSync(source, 'utf8'));
    verified.push({ ...entry, source, destination: path.join(root, ...entry.path.split('/')) });
  }
  return { backupRoot, manifest, files: verified };
}

export function restoreBackup({ root = process.cwd(), backup, dryRun = false, skipSafetyBackup = false }) {
  const verified = verifyBackup({ root, backup });
  if (dryRun) return { restored: false, verifiedFiles: verified.files.length, backupRoot: verified.backupRoot };

  if (!skipSafetyBackup) runNode(root, 'scripts/catalog-backup.mjs');
  const originals = new Map();
  try {
    for (const file of verified.files) {
      originals.set(file.destination, fs.existsSync(file.destination) ? fs.readFileSync(file.destination) : null);
      fs.mkdirSync(path.dirname(file.destination), { recursive: true });
      fs.copyFileSync(file.source, file.destination);
    }
    runNode(root, 'scripts/validate-catalog.mjs');
    runNode(root, 'scripts/validate-operations.mjs');
    runNode(root, 'scripts/build-index.mjs');
    runNode(root, 'scripts/validate-catalog.mjs');
    return { restored: true, verifiedFiles: verified.files.length, backupRoot: verified.backupRoot };
  } catch (error) {
    for (const [destination, content] of originals) {
      if (content === null) fs.rmSync(destination, { force: true });
      else fs.writeFileSync(destination, content);
    }
    try { runNode(root, 'scripts/build-index.mjs'); } catch {}
    throw new Error(`Wiederherstellung zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = restoreBackup({
    root: process.cwd(),
    backup: args.backup,
    dryRun: args['dry-run'] === 'true',
    skipSafetyBackup: args['skip-safety-backup'] === 'true'
  });
  if (result.restored) console.log(`Backup wiederhergestellt: ${path.relative(process.cwd(), result.backupRoot)} (${result.verifiedFiles} Dateien)`);
  else console.log(`Backup erfolgreich geprüft: ${path.relative(process.cwd(), result.backupRoot)} (${result.verifiedFiles} Dateien). Keine Daten verändert.`);
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = values[index + 1];
    result[key] = inline ?? (next && !next.startsWith('--') ? values[++index] : 'true');
  }
  return result;
}

function runNode(root, script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 2 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} fehlgeschlagen.`);
  if (result.stdout) process.stdout.write(result.stdout);
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
