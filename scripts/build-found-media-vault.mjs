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

if (result.stdout) process.stdout.write(result.stdout);
console.log('Historische Suchkandidaten bleiben unter ALLES-GEFUNDEN/90-GEFUNDENE-KANDIDATEN erhalten.');
