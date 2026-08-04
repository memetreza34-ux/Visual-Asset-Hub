import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(root, 'backups', timestamp);
const catalogDir = path.join(root, 'catalog');
const files = fs.readdirSync(catalogDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => `catalog/${entry.name}`)
  .sort();
if (!files.includes('catalog/assets.json')) {
  console.error('catalog/assets.json fehlt; Backup wird abgebrochen.');
  process.exit(1);
}
fs.mkdirSync(target, { recursive: true });
const manifest = { version: 1, createdAt: new Date().toISOString(), files: [] };
for (const relative of files) {
  const source = path.join(root, relative);
  const destination = path.join(target, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  manifest.files.push({ path: relative, sha256: sha256(source), bytes: fs.statSync(source).size });
}
fs.writeFileSync(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Backup erstellt: ${path.relative(root, target)} (${manifest.files.length} Dateien)`);
function sha256(file){return createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
