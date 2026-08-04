import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { buildImportPlans } from './pexels-batch-import.mjs';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
for (const key of ['input','ids','category']) if (!args[key]) fail(`--${key} ist erforderlich.`);
const input = JSON.parse(fs.readFileSync(path.resolve(args.input), 'utf8'));
const requestedIds = unique(args.ids);
const selected = input.assets.filter((asset) => requestedIds.includes(String(asset.provider_id)));
const missing = requestedIds.filter((id) => !selected.some((asset) => String(asset.provider_id) === id));
if (missing.length) fail(`IDs nicht in der Suchdatei: ${missing.join(', ')}`);
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'catalog/taxonomy.json'), 'utf8'));
if (!taxonomy.categories.includes(args.category)) fail(`Ungültige Kategorie: ${args.category}`);
const catalogPath = path.join(root, 'catalog/assets.json');
const previousCatalog = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(previousCatalog);
const options = {
  query: args.query || input.query,
  type: input.type,
  category: args.category,
  orientation: args.orientation || 'any',
  count: selected.length,
  tags: args.tags || '', aliases: args.aliases || '', secondaryCategories: unique(args['secondary-categories'] || ''),
  scopes: unique(args.scopes || 'organic-social,youtube,website'), status: 'review', style: args.style || 'realistic',
  shot: args.shot, movement: args.movement, quality: integer(args.quality || '3', 1, 5), createdBy: args['created-by'] || 'local-selected-import'
};
const plans = buildImportPlans({ result: { ...input, assets: selected }, catalog, taxonomy, options });
if (plans.length !== selected.length) console.warn(`${selected.length - plans.length} bereits vorhandene Quellen wurden übersprungen.`);
console.log(JSON.stringify(plans.map(({asset})=>({id:asset.id,pexels:asset.rights.sourceUrl,title:asset.title})), null, 2));
if (args['dry-run'] === 'true') { console.log('Dry-Run: keine Dateien verändert.'); process.exit(0); }
const created = [];
try {
  for (const plan of plans) {
    if (!plan.previewUrl || !plan.previewPath) continue;
    const output = path.join(root, ...plan.previewPath.split('/'));
    if (fs.existsSync(output)) continue;
    const response = await fetch(plan.previewUrl, { headers: { Accept: 'image/*' } });
    if (!response.ok) throw new Error(`Vorschau ${plan.asset.id}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error(`Vorschau ${plan.asset.id} ist leer oder zu groß.`);
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, bytes, { flag: 'wx' }); created.push(output);
  }
  catalog.updatedAt = new Date().toISOString(); catalog.assets = [...catalog.assets, ...plans.map((plan)=>plan.asset)].sort((a,b)=>a.id.localeCompare(b.id));
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  run('scripts/validate-catalog.mjs'); run('scripts/build-index.mjs');
  console.log(`${plans.length} ausgewählte Pexels-Assets als review importiert.`);
} catch (error) {
  fs.writeFileSync(catalogPath, previousCatalog); for (const file of created) fs.rmSync(file,{force:true}); fail(`Import zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
}
function run(script){const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr||result.stdout);if(result.stdout)process.stdout.write(result.stdout);}
function parseArgs(values){const result={};for(let i=0;i<values.length;i+=1){const token=values[i];if(!token.startsWith('--'))fail(`Unbekanntes Argument: ${token}`);const[key,inline]=token.slice(2).split('=',2);const next=values[i+1];result[key]=inline??(next&&!next.startsWith('--')?values[++i]:'true');}return result;}
function unique(value){return[...new Set(String(value??'').split(',').map((item)=>item.trim()).filter(Boolean))];}
function integer(value,min,max){const number=Number(value);if(!Number.isInteger(number)||number<min||number>max)fail(`Zahl muss zwischen ${min} und ${max} liegen.`);return number;}
function fail(message){console.error(message);process.exit(1);}
