import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const files = [
  ...collect(path.join(root, 'scripts'), (file) => file.endsWith('.mjs')),
  ...collect(path.join(root, 'tests'), (file) => file.endsWith('.mjs')),
  path.join(root, 'web/app.js')
].sort();

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) failures.push(`${path.relative(root, file)}\n${result.stderr || result.stdout}`);
}

if (failures.length) {
  console.error(`Syntaxprüfung fehlgeschlagen (${failures.length}):\n\n${failures.join('\n\n')}`);
  process.exit(1);
}
console.log(`Syntaxprüfung erfolgreich: ${files.length} JavaScript-Dateien.`);

function collect(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...collect(target, predicate));
    else if (entry.isFile() && predicate(target)) result.push(target);
  }
  return result;
}
