import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const inbox = path.join(root, 'inbox');
const outputDir = path.join(root, '.local-storage', 'inbox-analysis');
const supported = new Set(['.mp4','.mov','.webm','.mkv','.jpg','.jpeg','.png','.webp','.avif']);

if (!fs.existsSync(inbox)) fs.mkdirSync(inbox, { recursive: true });
const files = walk(inbox).filter((file) => supported.has(path.extname(file).toLowerCase()));
if (!files.length) {
  console.log('Inbox ist leer. Lege Videos oder Bilder unter inbox/ ab und starte den Befehl erneut.');
  process.exit(0);
}

fs.mkdirSync(outputDir, { recursive: true });
const manifest = { generatedAt: new Date().toISOString(), count: files.length, ready: [], failed: [] };
for (const file of files) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const target = path.join(outputDir, `${safeName(path.basename(file))}.json`);
  const result = spawnSync(process.execPath, ['scripts/analyze-media.mjs', '--file', rel, '--json', target], {
    cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe']
  });
  if (result.status === 0) {
    const analysis = JSON.parse(fs.readFileSync(target, 'utf8'));
    manifest.ready.push(analysis);
    console.log(`READY  ${rel}`);
  } else {
    manifest.failed.push({ file: rel, error: (result.stderr || result.stdout || 'Analyse fehlgeschlagen').trim() });
    console.error(`FAILED ${rel}`);
  }
}
const manifestPath = path.join(outputDir, 'manifest.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\n${manifest.ready.length}/${manifest.count} Assets analysiert.`);
console.log(`Manifest: ${path.relative(root, manifestPath)}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : [];
  });
}
function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'asset';
}
