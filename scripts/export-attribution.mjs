import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (!args.project) { console.error('--project ist erforderlich.'); process.exit(1); }
const project = slug(args.project);
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/assets.json'), 'utf8'));
const usage = JSON.parse(fs.readFileSync(path.join(root, 'catalog/usage.json'), 'utf8'));
const rows = usage.uses.filter((item) => item.project === project).map((item) => ({ use: item, asset: catalog.assets.find((asset) => asset.id === item.assetId) })).filter((item) => item.asset);
if (!rows.length) { console.error(`Keine Nutzung für Projekt ${project} gefunden.`); process.exit(1); }
const outputDir = args.output ? path.resolve(args.output) : path.join(root, 'exports');
fs.mkdirSync(outputDir, { recursive: true });
const mdPath = path.join(outputDir, `${project}-attribution.md`);
const csvPath = path.join(outputDir, `${project}-attribution.csv`);
const title = rows[0].use.projectTitle || project;
const markdown = [`# Quellen und Attribution – ${title}`, '', `Erzeugt: ${new Date().toISOString()}`, '', ...rows.flatMap(({ asset, use }, index) => [
  `## ${index + 1}. ${asset.title}`,
  '',
  `- Asset-ID: \`${asset.id}\``,
  `- Plattform: ${use.platform}`,
  `- Quelle: ${asset.rights.sourceName}`,
  `- Quellseite: ${asset.rights.sourceUrl || 'nicht hinterlegt'}`,
  `- Lizenz: ${asset.rights.licenseStatus}`,
  `- Lizenzseite: ${asset.rights.licenseUrl || 'nicht hinterlegt'}`,
  `- Attribution: ${asset.rights.attributionText || (asset.rights.attributionRequired ? 'ERFORDERLICH – Text fehlt' : 'nicht erforderlich')}`,
  use.contentUrl ? `- Veröffentlichung: ${use.contentUrl}` : '- Veröffentlichung: noch nicht hinterlegt',
  ''
])].join('\n');
const headers = ['asset_id','title','platform','source','source_url','license','license_url','attribution_required','attribution_text','content_url'];
const csvRows = rows.map(({ asset, use }) => [asset.id,asset.title,use.platform,asset.rights.sourceName,asset.rights.sourceUrl||'',asset.rights.licenseStatus,asset.rights.licenseUrl||'',String(asset.rights.attributionRequired),asset.rights.attributionText||'',use.contentUrl||'']);
fs.writeFileSync(mdPath, `${markdown}\n`);
fs.writeFileSync(csvPath, `${headers.map(csv).join(',')}\n${csvRows.map((row)=>row.map(csv).join(',')).join('\n')}\n`);
console.log(`Attributionsdateien erzeugt:\n- ${path.relative(root, mdPath)}\n- ${path.relative(root, csvPath)}`);
function parseArgs(values){const result={};for(let i=0;i<values.length;i+=1){const token=values[i];if(!token.startsWith('--'))throw new Error(`Unbekanntes Argument: ${token}`);const[key,inline]=token.slice(2).split('=',2);const next=values[i+1];result[key]=inline??(next&&!next.startsWith('--')?values[++i]:'true');}return result;}
function slug(value){return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function csv(value){const text=String(value??'');return /[",\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;}
