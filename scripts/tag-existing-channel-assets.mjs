import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const catalogPath = path.join(root, 'catalog/assets.json');
const previous = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(previous);
const mappings = new Map([
  ['VAH-P6153727', ['channel-ai', 'collection-humanoid-robots']],
  ['VAH-P8087308', ['channel-ai', 'collection-humanoid-robots']],
  ['VAH-P8328141', ['channel-ai', 'collection-humanoid-robots']],
  ['VAH-GAINET01', ['channel-ai', 'collection-neural-networks']],
  ['VAH-GBIZGR01', ['channel-finance', 'collection-investing-stocks']],
  ['VAH-GCIRCU01', ['channel-electro', 'collection-electronics-components']]
]);
let changed = 0;

for (const asset of catalog.assets ?? []) {
  const tags = mappings.get(asset.id);
  if (!tags) continue;
  const nextTags = [...new Set([...(asset.tags ?? []), ...tags])];
  if (nextTags.length !== (asset.tags ?? []).length) {
    asset.tags = nextTags;
    changed += 1;
  }
}

if (!changed) {
  console.log('Vorhandene Grundassets sind bereits Kanal-Sammlungen zugeordnet.');
  process.exit(0);
}

try {
  catalog.updatedAt = new Date().toISOString();
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  run('scripts/validate-catalog.mjs');
  run('scripts/build-index.mjs');
  console.log(`${changed} vorhandene Grundassets wurden Kanal-Sammlungen zugeordnet.`);
} catch (error) {
  fs.writeFileSync(catalogPath, previous);
  console.error(`Kanal-Zuordnung zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function run(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} fehlgeschlagen.`);
  if (result.stdout) process.stdout.write(result.stdout);
}
