import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const output = path.resolve(root, process.env.SITE_OUTPUT || 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const directory of ['web', 'catalog', 'previews', 'assets']) {
  const source = path.join(root, directory);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(output, directory), { recursive: true });
}
fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./web/"><title>Visual Asset Hub</title><a href="./web/">Visual Asset Hub öffnen</a>\n');
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Statische Testversion erzeugt: ${path.relative(root, output)}/`);
