import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const now = Date.now();
const policies = [
  { directory: '.local-storage/arsenal-web', maxAgeDays: 7 },
  { directory: '.local-storage/arsenal-search', maxAgeDays: 30 },
  { directory: '.local-storage/pexels-search', maxAgeDays: 30 }
];
let removedFiles = 0;
let removedDirectories = 0;
let freedBytes = 0;

for (const policy of policies) {
  const directory = path.join(root, policy.directory);
  if (!fs.existsSync(directory)) continue;
  const cutoff = now - policy.maxAgeDays * 24 * 60 * 60 * 1000;
  for (const file of collectFiles(directory)) {
    const stat = fs.statSync(file);
    if (stat.mtimeMs >= cutoff) continue;
    freedBytes += stat.size;
    fs.rmSync(file, { force: true });
    removedFiles += 1;
  }
  removedDirectories += removeEmptyDirectories(directory, directory);
}

console.log(`Lokale Suche bereinigt: ${removedFiles} Dateien, ${removedDirectories} leere Ordner, ${formatBytes(freedBytes)} freigegeben.`);

function collectFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...collectFiles(target));
    else if (entry.isFile()) result.push(target);
  }
  return result;
}
function removeEmptyDirectories(directory, rootDirectory) {
  let count = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    count += removeEmptyDirectories(path.join(directory, entry.name), rootDirectory);
  }
  if (directory !== rootDirectory && fs.readdirSync(directory).length === 0) {
    fs.rmdirSync(directory);
    count += 1;
  }
  return count;
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}
