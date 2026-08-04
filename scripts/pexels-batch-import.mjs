import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { searchPexels } from './lib/pexels.mjs';

export function slug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function chooseExternalFile(asset) {
  if (asset.type === 'image') {
    for (const key of ['large2x', 'large', 'original', 'medium']) {
      const url = asset.files?.[key];
      if (url) return { url, extension: extensionFromUrl(url, 'jpg'), width: asset.width, height: asset.height };
    }
    throw new Error(`Pexels Foto ${asset.provider_id} enthält keine verwendbare Datei.`);
  }
  const candidates = (asset.files ?? [])
    .filter((file) => file.url && String(file.file_type ?? '').includes('mp4'))
    .sort((a, b) => scoreVideo(b) - scoreVideo(a));
  const preferred = candidates.find((file) => (file.width ?? 0) <= 1920 && (file.height ?? 0) <= 1920) ?? candidates[0];
  if (!preferred) throw new Error(`Pexels Video ${asset.provider_id} enthält keine MP4-Datei.`);
  return {
    url: preferred.url,
    extension: extensionFromType(preferred.file_type, extensionFromUrl(preferred.url, 'mp4')),
    width: preferred.width ?? asset.width,
    height: preferred.height ?? asset.height,
    fps: preferred.fps
  };
}

export function buildImportPlans({ result, catalog, taxonomy, options, now = new Date().toISOString() }) {
  const existingSourceUrls = new Set(catalog.assets.map((asset) => asset.rights?.sourceUrl).filter(Boolean));
  const plans = [];
  const querySlug = slug(options.query) || 'pexels';
  const queryTags = querySlug.split('-').filter(Boolean);
  const requestedTags = uniqueList(options.tags).map(slug).filter(Boolean);
  const tags = [...new Set([...queryTags, ...requestedTags, 'pexels'])].slice(0, 40);
  if (tags.length < 2) tags.push('stock-media');

  for (const sourceAsset of result.assets) {
    if (plans.length >= options.count) break;
    if (existingSourceUrls.has(sourceAsset.source_url)) continue;

    const selected = chooseExternalFile(sourceAsset);
    const type = sourceAsset.type === 'image' ? 'image' : 'video';
    const prefix = taxonomy.typePrefixes[type];
    const orientation = normalizeCatalogOrientation(sourceAsset.orientation, options.orientation);
    const subject = querySlug;
    const action = type === 'video' ? 'b-roll' : 'still-image';
    const shot = options.shot || (type === 'video' ? 'mixed' : 'not-applicable');
    const movement = options.movement || (type === 'video' ? 'mixed' : 'static');
    const base = `${prefix}-${options.category}-${subject}-${action}-${shot}-${orientation}`;
    const currentAssets = [...catalog.assets, ...plans.map((plan) => plan.asset)];
    const sequence = nextSequence(currentAssets, base);
    const filename = `${base}-${String(sequence).padStart(4, '0')}.${selected.extension}`;
    const creator = sourceAsset.creator || 'Unbekannter Pexels-Creator';
    const title = truncate(sourceAsset.title?.startsWith('Pexels Video')
      ? `${options.query} – B-Roll von ${creator}`
      : sourceAsset.title || `${options.query} von ${creator}`, 160);
    const previewPath = sourceAsset.preview_url ? `previews/pexels/${sourceAsset.provider_id}.jpg` : undefined;

    const asset = compact({
      id: createAssetId(new Set(currentAssets.map((entry) => entry.id))),
      filename,
      title,
      description: truncate(`Externes ${type === 'video' ? 'B-Roll-Video' : 'Stockfoto'} von Pexels zum Thema „${options.query}“. Urheber: ${creator}. Vor der endgültigen Freigabe Inhalt und Einsatzkontext prüfen.`, 1500),
      type,
      category: options.category,
      secondaryCategories: options.secondaryCategories,
      tags,
      searchAliases: uniqueList(options.aliases),
      subject,
      action,
      orientation,
      shotType: shot,
      cameraMovement: movement,
      style: options.style,
      status: options.status,
      qualityRating: options.quality,
      technical: compact({
        width: selected.width,
        height: selected.height,
        durationSeconds: sourceAsset.duration_seconds,
        fps: selected.fps,
        codec: type === 'video' ? 'h264/mp4' : selected.extension
      }),
      storage: compact({ kind: 'external', externalUrl: selected.url, previewPath }),
      rights: {
        licenseStatus: 'licensed',
        sourceName: 'Pexels',
        sourceUrl: sourceAsset.source_url,
        licenseUrl: 'https://www.pexels.com/license/',
        usageScopes: options.scopes,
        attributionRequired: false,
        attributionText: `Medien von ${creator} auf Pexels`,
        notes: 'Pexels-Lizenz beim Import dokumentiert. Marken, erkennbare Personen und sensible Einsatzkontexte separat prüfen.'
      },
      createdAt: now,
      importedAt: now,
      createdBy: options.createdBy,
      notes: `Pexels Asset-ID ${sourceAsset.provider_id}. Automatisch aus Suche „${options.query}“ importiert; Status bleibt bis zur Sichtprüfung auf review.`
    });

    plans.push({ asset, previewUrl: sourceAsset.preview_url, previewPath });
    existingSourceUrls.add(sourceAsset.source_url);
  }
  return plans;
}

async function main() {
  const root = process.cwd();
  loadDotEnv(path.join(root, '.env'));
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') return printHelp();

  const taxonomy = readJson(path.join(root, 'catalog/taxonomy.json'));
  const catalogPath = path.join(root, 'catalog/assets.json');
  const catalog = readJson(catalogPath);
  const options = normalizeOptions(args, taxonomy);
  const previousCatalog = fs.readFileSync(catalogPath, 'utf8');

  const result = await searchPexels({
    apiKey: process.env.PEXELS_API_KEY,
    query: options.query,
    type: options.type,
    orientation: options.orientation === 'any' ? undefined : options.orientation,
    locale: options.locale,
    page: options.page,
    perPage: Math.min(80, Math.max(options.count * 3, options.count))
  });

  const plans = buildImportPlans({ result, catalog, taxonomy, options });
  console.log(`Pexels lieferte ${result.total_results} Treffer; ${plans.length} neue Assets vorbereitet.`);
  if (!plans.length) {
    console.log('Keine neuen Assets: Die gefundenen Pexels-Seiten sind bereits katalogisiert.');
    return;
  }

  if (options.dryRun) {
    console.log(JSON.stringify(plans.map(({ asset }) => ({ id: asset.id, title: asset.title, source: asset.rights.sourceUrl })), null, 2));
    console.log('Dry-Run: Katalog wurde nicht verändert.');
    return;
  }

  const createdPreviews = [];
  try {
    for (const plan of plans) {
      if (!plan.previewUrl || !plan.previewPath) continue;
      const absolute = path.join(root, ...plan.previewPath.split('/'));
      await downloadPreview(plan.previewUrl, absolute);
      createdPreviews.push(absolute);
    }

    const nextCatalog = {
      ...catalog,
      updatedAt: new Date().toISOString(),
      assets: [...catalog.assets, ...plans.map((plan) => plan.asset)].sort((a, b) => a.id.localeCompare(b.id))
    };
    fs.writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`);
    runNode(root, 'scripts/validate-catalog.mjs');
    runNode(root, 'scripts/build-index.mjs');
    console.log(`${plans.length} Pexels-Assets wurden als externe review-Einträge aufgenommen.`);
  } catch (error) {
    fs.writeFileSync(catalogPath, previousCatalog);
    for (const preview of createdPreviews) fs.rmSync(preview, { force: true });
    throw new Error(`Import zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function downloadPreview(url, output) {
  if (fs.existsSync(output)) return;
  const response = await fetch(url, { headers: { Accept: 'image/*' } });
  if (!response.ok) throw new Error(`Vorschau konnte nicht geladen werden (${response.status}).`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`Vorschau hat unerwarteten Content-Type: ${contentType}`);
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > 8 * 1024 * 1024) throw new Error('Vorschau ist leer oder größer als 8 MB.');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, data, { flag: 'wx' });
}

function normalizeOptions(args, taxonomy) {
  const query = args.query?.trim();
  if (!query) throw new Error('--query ist erforderlich.');
  const type = args.type || 'video';
  assertMember(type, ['video', 'photo'], 'type');
  const category = args.category;
  assertMember(category, taxonomy.categories, 'category');
  const orientation = args.orientation || 'any';
  assertMember(orientation, ['any', 'vertical', 'horizontal', 'square', 'portrait', 'landscape'], 'orientation');
  const status = args.status || 'review';
  assertMember(status, ['review', 'inbox'], 'status');
  const style = args.style || 'realistic';
  assertMember(style, taxonomy.styles, 'style');
  const scopes = uniqueList(args.scopes || 'organic-social,youtube,website');
  for (const scope of scopes) assertMember(scope, taxonomy.usageScopes, 'scope');
  const secondaryCategories = uniqueList(args['secondary-categories'] || '');
  for (const item of secondaryCategories) assertMember(item, taxonomy.categories, 'secondary-category');
  return {
    query, type, category, orientation,
    count: integer(args.count || '5', 1, 20, 'count'),
    page: integer(args.page || '1', 1, 100000, 'page'),
    locale: args.locale || 'de-DE',
    tags: args.tags || '', aliases: args.aliases || '', secondaryCategories, scopes, status, style,
    shot: args.shot, movement: args.movement,
    quality: integer(args.quality || '3', 1, 5, 'quality'),
    createdBy: args['created-by'] || 'github-actions/pexels-import',
    dryRun: args['dry-run'] === 'true'
  };
}

function parseArgs(argv) { const result={}; for(let i=0;i<argv.length;i+=1){const token=argv[i];if(!token.startsWith('--'))throw new Error(`Unbekanntes Argument: ${token}`);const [key,inline]=token.slice(2).split('=',2);const next=argv[i+1];result[key]=inline??(next&&!next.startsWith('--')?argv[++i]:'true');}return result; }
function loadDotEnv(filePath){if(!fs.existsSync(filePath))return;for(const rawLine of fs.readFileSync(filePath,'utf8').split(/\r?\n/)){const line=rawLine.trim();if(!line||line.startsWith('#'))continue;const separator=line.indexOf('=');if(separator<1)continue;const key=line.slice(0,separator).trim();let value=line.slice(separator+1).trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);process.env[key]??=value;}}
function normalizeCatalogOrientation(value,fallback){if(['vertical','horizontal','square'].includes(value))return value;if(value==='portrait')return'vertical';if(value==='landscape')return'horizontal';if(fallback==='portrait')return'vertical';if(fallback==='landscape')return'horizontal';if(['vertical','horizontal','square'].includes(fallback))return fallback;return'mixed';}
function scoreVideo(file){return(file.quality==='hd'?1_000_000_000:0)+((file.width??0)*(file.height??0))+(file.fps??0);}
function extensionFromType(type,fallback){const match=String(type??'').match(/\/([a-z0-9.+-]+)/i);return match?match[1].replace('jpeg','jpg'):fallback;}
function extensionFromUrl(value,fallback){try{return path.extname(new URL(value).pathname).slice(1).toLowerCase()||fallback;}catch{return fallback;}}
function nextSequence(assets,base){const pattern=new RegExp(`^${escapeRegExp(base)}-(\\d{4})\\.`);const used=assets.map(a=>a.filename.match(pattern)?.[1]).filter(Boolean).map(Number);return used.length?Math.max(...used)+1:1;}
function createAssetId(existing){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let attempt=0;attempt<100;attempt+=1){const bytes=randomBytes(8);let suffix='';for(let i=0;i<8;i+=1)suffix+=alphabet[bytes[i]%alphabet.length];const id=`VAH-${suffix}`;if(!existing.has(id))return id;}throw new Error('Keine eindeutige Asset-ID erzeugbar.');}
function uniqueList(value){return[...new Set(String(value??'').split(',').map(entry=>entry.trim()).filter(Boolean))];}
function compact(value){return Object.fromEntries(Object.entries(value).filter(([,entry])=>entry!==undefined&&entry!==''&&!(Array.isArray(entry)&&entry.length===0)));}
function integer(value,min,max,label){const number=Number(value);if(!Number.isInteger(number)||number<min||number>max)throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`);return number;}
function assertMember(value,options,label){if(!options.includes(value))throw new Error(`${label} ist ungültig: ${value}`);}
function escapeRegExp(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function truncate(value,max){const text=String(value);return text.length<=max?text:`${text.slice(0,max-1)}…`;}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function runNode(root,script){const run=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'});if(run.status!==0)throw new Error(run.stderr||run.stdout||`${script} fehlgeschlagen.`);if(run.stdout)process.stdout.write(run.stdout);}
function printHelp(){console.log(`Pexels direkt als externe Katalogeinträge importieren.\n\nBeispiel:\n  npm run pexels:import -- --query "KI Technologie" --type video --category technology-ai --orientation vertical --count 5 --tags ai,zukunft\n\nOriginale bleiben extern; kleine Vorschaubilder werden gespeichert. Alle Einträge erhalten Status review.`);}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
}
