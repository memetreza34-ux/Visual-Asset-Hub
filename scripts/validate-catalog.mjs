import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const catalogPath = path.join(root, 'catalog/assets.json');
const taxonomyPath = path.join(root, 'catalog/taxonomy.json');

const catalog = readJson(catalogPath);
const taxonomy = readJson(taxonomyPath);
const errors = [];
const warnings = [];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const idPattern = /^VAH-[A-Z0-9]{8}$/;
const shaPattern = /^[a-f0-9]{64}$/;
const filenamePattern = /^[a-z0-9][a-z0-9._-]+$/;
const secretParamPattern = /(token|signature|sig|secret|api[-_]?key|access[-_]?key|credential|expires|x-amz|x-goog|policy)/i;

const allowed = {
  types: new Set(taxonomy.assetTypes),
  categories: new Set(taxonomy.categories),
  orientations: new Set(taxonomy.orientations),
  shots: new Set(taxonomy.shotTypes),
  movements: new Set(taxonomy.cameraMovements),
  styles: new Set(taxonomy.styles),
  scopes: new Set(taxonomy.usageScopes),
  licenses: new Set(taxonomy.licenseStatuses),
  statuses: new Set(taxonomy.lifecycleStatuses)
};

if (!Number.isInteger(catalog.catalogVersion) || catalog.catalogVersion < 1) errors.push('catalogVersion muss eine positive Ganzzahl sein.');
if (!isDateTime(catalog.updatedAt)) errors.push('updatedAt muss ein gültiger ISO-Zeitstempel sein.');
if (!Array.isArray(catalog.assets)) errors.push('assets muss ein Array sein.');
const assets = Array.isArray(catalog.assets) ? catalog.assets : [];
const ids = new Set();
const filenames = new Set();
const hashes = new Map();

for (const [index, asset] of assets.entries()) {
  const ref = asset?.id || `assets[${index}]`;
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) { errors.push(`${ref}: Asset muss ein Objekt sein.`); continue; }
  requiredString(asset,'id',ref,1,20);
  requiredString(asset,'filename',ref,3,255);
  requiredString(asset,'title',ref,3,160);
  requiredString(asset,'description',ref,10,1500);
  requiredString(asset,'subject',ref,1,100);
  requiredString(asset,'action',ref,1,100);
  if (!idPattern.test(asset.id ?? '')) errors.push(`${ref}: id muss dem Format VAH-XXXXXXXX entsprechen.`);
  if (ids.has(asset.id)) errors.push(`${ref}: Asset-ID ist doppelt.`);
  ids.add(asset.id);
  if (!filenamePattern.test(asset.filename ?? '')) errors.push(`${ref}: filename enthält ungültige Zeichen.`);
  if (filenames.has(asset.filename)) errors.push(`${ref}: Dateiname ist doppelt.`);
  filenames.add(asset.filename);
  assertAllowed(asset.type,allowed.types,`${ref}: unbekannter Asset-Typ`,errors);
  assertAllowed(asset.category,allowed.categories,`${ref}: unbekannte Hauptkategorie`,errors);
  assertAllowed(asset.orientation,allowed.orientations,`${ref}: unbekannte Ausrichtung`,errors);
  assertAllowed(asset.shotType,allowed.shots,`${ref}: unbekannte Kameraeinstellung`,errors);
  assertAllowed(asset.cameraMovement,allowed.movements,`${ref}: unbekannte Kamerabewegung`,errors);
  assertAllowed(asset.style,allowed.styles,`${ref}: unbekannter Stil`,errors);
  assertAllowed(asset.status,allowed.statuses,`${ref}: unbekannter Status`,errors);
  if (!slugPattern.test(asset.subject ?? '')) errors.push(`${ref}: subject muss ein kleingeschriebener Slug sein.`);
  if (!slugPattern.test(asset.action ?? '')) errors.push(`${ref}: action muss ein kleingeschriebener Slug sein.`);
  validateSlugList(asset.secondaryCategories ?? [],`${ref}.secondaryCategories`,0,5,allowed.categories);
  validateSlugList(asset.tags,`${ref}.tags`,2,40);
  validateAliases(asset.searchAliases ?? [],`${ref}.searchAliases`);
  if (!Number.isInteger(asset.qualityRating) || asset.qualityRating < 1 || asset.qualityRating > 5) errors.push(`${ref}: qualityRating muss zwischen 1 und 5 liegen.`);
  validateFilename(asset,ref);
  validateStorage(asset,ref);
  validateRights(asset,ref);
  validateTechnical(asset,ref);
  if (!isDateTime(asset.createdAt)) errors.push(`${ref}: createdAt ist kein gültiger ISO-Zeitstempel.`);
  if (!isDateTime(asset.importedAt)) errors.push(`${ref}: importedAt ist kein gültiger ISO-Zeitstempel.`);
  if (asset.sha256 !== undefined) {
    if (!shaPattern.test(asset.sha256)) errors.push(`${ref}: sha256 muss aus 64 kleingeschriebenen Hex-Zeichen bestehen.`);
    const duplicate = hashes.get(asset.sha256);
    if (duplicate) errors.push(`${ref}: gleicher SHA-256-Hash wie ${duplicate}.`);
    hashes.set(asset.sha256,ref);
  }
}

if (warnings.length) console.warn(`Katalogwarnungen (${warnings.length}):\n- ${warnings.join('\n- ')}`);
if (errors.length) { console.error(`Katalogprüfung fehlgeschlagen (${errors.length}):\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log(`Katalogprüfung erfolgreich: ${assets.length} Assets, ${warnings.length} Warnungen.`);

function validateFilename(asset, ref) {
  const prefix = taxonomy.typePrefixes?.[asset.type];
  if (!prefix) return;
  const extension = path.extname(asset.filename).slice(1).toLowerCase();
  const stem = asset.filename.slice(0,-(extension.length+1));
  const expectedStart = `${prefix}-${asset.category}-${asset.subject}-${asset.action}-${asset.shotType}-${asset.orientation}-`;
  if (!stem.startsWith(expectedStart) || !/\d{4}$/.test(stem)) errors.push(`${ref}: Dateiname muss mit ${expectedStart} beginnen und vierstellig enden.`);
  const extensions = {
    video:['mp4','mov','webm','mkv'], image:['jpg','jpeg','png','webp','avif','tif','tiff'], animation:['mp4','mov','webm','gif','json'], overlay:['webm','mov','png','webp'], 'screen-recording':['mp4','mov','webm','mkv'], graphic:['svg','png','webp','pdf'], icon:['svg','png','webp'], mockup:['png','jpg','jpeg','webp','psd']
  };
  if (!(extensions[asset.type] ?? []).includes(extension)) errors.push(`${ref}: Dateiendung .${extension || '?'} passt nicht zum Typ ${asset.type}.`);
}

function validateStorage(asset, ref) {
  const storage=asset.storage;
  if (!storage || typeof storage !== 'object' || Array.isArray(storage)) { errors.push(`${ref}: storage fehlt oder ist ungültig.`); return; }
  if (!['repository','git-lfs','external'].includes(storage.kind)) { errors.push(`${ref}: storage.kind ist ungültig.`); return; }
  if (storage.kind === 'external') {
    if (!storage.externalUrl) errors.push(`${ref}: externer Speicher benötigt externalUrl.`);
    if (storage.path) warnings.push(`${ref}: externer Speicher sollte keinen lokalen Originalpfad verwenden.`);
  } else {
    if (!storage.path) errors.push(`${ref}: Repository- oder LFS-Speicher benötigt path.`);
    if (storage.externalUrl) warnings.push(`${ref}: lokaler Speicher enthält zusätzlich externalUrl.`);
  }
  if (storage.path) {
    validateRelativePath(storage.path,`${ref}.storage.path`);
    if (!storage.path.startsWith('assets/')) errors.push(`${ref}: Originalpfad muss unter assets/ liegen.`);
    if (path.posix.basename(storage.path) !== asset.filename) errors.push(`${ref}: storage.path endet nicht mit filename.`);
  }
  if (storage.previewPath) {
    validateRelativePath(storage.previewPath,`${ref}.storage.previewPath`);
    if (!storage.previewPath.startsWith('previews/')) errors.push(`${ref}: Vorschaupfad muss unter previews/ liegen.`);
  }
  if (storage.externalUrl) validateSafeUrl(storage.externalUrl,`${ref}.storage.externalUrl`);
}

function validateRights(asset, ref) {
  const rights=asset.rights;
  if (!rights || typeof rights !== 'object' || Array.isArray(rights)) { errors.push(`${ref}: rights fehlt oder ist ungültig.`); return; }
  assertAllowed(rights.licenseStatus,allowed.licenses,`${ref}: unbekannter Lizenzstatus`,errors);
  requiredString(rights,'sourceName',`${ref}.rights`,2,200);
  const usageScopes=Array.isArray(rights.usageScopes)?rights.usageScopes:[];
  if (!usageScopes.length) errors.push(`${ref}: mindestens ein Nutzungsbereich ist erforderlich.`);
  else {
    if (new Set(usageScopes).size !== usageScopes.length) errors.push(`${ref}: Nutzungsbereiche enthalten Duplikate.`);
    for (const scope of usageScopes) assertAllowed(scope,allowed.scopes,`${ref}: unbekannter Nutzungsbereich`,errors);
  }
  if (typeof rights.attributionRequired !== 'boolean') errors.push(`${ref}: attributionRequired muss true oder false sein.`);
  if (rights.attributionRequired && !rights.attributionText?.trim()) errors.push(`${ref}: notwendiger Attributionstext fehlt.`);
  if (/^cc-by/.test(rights.licenseStatus || '') && rights.attributionRequired !== true) errors.push(`${ref}: ${rights.licenseStatus} erfordert dokumentierte Attribution.`);
  if (rights.sourceUrl) validateSafeUrl(rights.sourceUrl,`${ref}.rights.sourceUrl`);
  if (rights.licenseUrl) validateSafeUrl(rights.licenseUrl,`${ref}.rights.licenseUrl`);
  if (rights.licenseCode !== undefined && (typeof rights.licenseCode !== 'string' || rights.licenseCode.trim().length < 2 || rights.licenseCode.length > 80)) errors.push(`${ref}: licenseCode ist ungültig.`);
  if (rights.licenseVersion !== undefined && (typeof rights.licenseVersion !== 'string' || rights.licenseVersion.length > 30)) errors.push(`${ref}: licenseVersion ist ungültig.`);
  for (const field of ['commercialUse','derivativesAllowed','shareAlike']) if (rights[field] !== undefined && typeof rights[field] !== 'boolean') errors.push(`${ref}: ${field} muss true oder false sein.`);
  if (rights.checkedAt !== undefined && !isDateTime(rights.checkedAt)) errors.push(`${ref}: checkedAt ist kein gültiger ISO-Zeitstempel.`);
  if (rights.evidencePath !== undefined) validateRelativePath(rights.evidencePath,`${ref}.rights.evidencePath`);
  if (rights.expiresAt) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rights.expiresAt) || Number.isNaN(Date.parse(`${rights.expiresAt}T00:00:00Z`))) errors.push(`${ref}: expiresAt ist kein gültiges Datum.`);
    else if (asset.status === 'approved' && Date.parse(`${rights.expiresAt}T23:59:59Z`) < Date.now()) errors.push(`${ref}: freigegebenes Asset besitzt eine abgelaufene Lizenz.`);
  }
  if (asset.status === 'approved' && ['unknown','restricted'].includes(rights.licenseStatus)) errors.push(`${ref}: approved ist mit Lizenzstatus ${rights.licenseStatus} nicht erlaubt.`);
  if (rights.licenseStatus === 'editorial-only' && usageScopes.some((scope)=>!['editorial','internal-only'].includes(scope))) errors.push(`${ref}: editorial-only darf nicht für kommerzielle Nutzungsbereiche freigegeben werden.`);
  if (/\bcc-by-nc/.test(rights.licenseStatus || '') && usageScopes.some((scope)=>['youtube','paid-ads','client-work'].includes(scope))) errors.push(`${ref}: ${rights.licenseStatus} ist für potenziell kommerzielle Nutzung nicht automatisch freigegeben.`);
  if (rights.commercialUse === false && usageScopes.some((scope)=>['youtube','paid-ads','client-work'].includes(scope))) errors.push(`${ref}: commercialUse=false widerspricht dem gewählten Nutzungsbereich.`);
  if (asset.status === 'approved') {
    if (!rights.checkedAt) warnings.push(`${ref}: approved ohne rights.checkedAt; v0.18-Importe sollten einen Prüfzeitpunkt speichern.`);
    if (!rights.evidencePath) warnings.push(`${ref}: approved ohne rights.evidencePath; v0.18-Importe sollten eine Evidence-Akte besitzen.`);
    if (rights.sourceUrl && !rights.licenseCode && !['owned','public-domain'].includes(rights.licenseStatus)) warnings.push(`${ref}: präziser licenseCode fehlt.`);
  }
  if (asset.status === 'restricted' && rights.licenseStatus === 'owned') warnings.push(`${ref}: Status restricted trotz eigenem Asset prüfen.`);
}

function validateTechnical(asset, ref) {
  if (asset.technical === undefined) return;
  const technical=asset.technical;
  if (!technical || typeof technical !== 'object' || Array.isArray(technical)) { errors.push(`${ref}: technical muss ein Objekt sein.`); return; }
  for (const field of ['width','height']) if (technical[field] !== undefined && (!Number.isInteger(technical[field]) || technical[field] < 1)) errors.push(`${ref}: technical.${field} muss eine positive Ganzzahl sein.`);
  for (const field of ['durationSeconds','fps']) if (technical[field] !== undefined && (typeof technical[field] !== 'number' || technical[field] < 0)) errors.push(`${ref}: technical.${field} muss eine nichtnegative Zahl sein.`);
  if (technical.width && technical.height) {
    if (asset.orientation === 'vertical' && technical.width >= technical.height) warnings.push(`${ref}: Auflösung wirkt nicht vertikal.`);
    if (['horizontal','landscape'].includes(asset.orientation) && technical.width <= technical.height) warnings.push(`${ref}: Auflösung wirkt nicht horizontal.`);
    if (asset.orientation === 'square' && technical.width !== technical.height) warnings.push(`${ref}: Auflösung ist nicht quadratisch.`);
  }
}

function validateSlugList(value,label,min,max,membership) {
  if (!Array.isArray(value)) { errors.push(`${label} muss ein Array sein.`); return; }
  if (value.length < min || value.length > max) errors.push(`${label} benötigt ${min} bis ${max} Einträge.`);
  if (new Set(value).size !== value.length) errors.push(`${label} enthält Duplikate.`);
  for (const item of value) {
    if (typeof item !== 'string' || !slugPattern.test(item)) errors.push(`${label}: ${String(item)} ist kein gültiger Slug.`);
    if (membership && !membership.has(item)) errors.push(`${label}: ${String(item)} ist nicht in der Taxonomie.`);
  }
}
function validateAliases(value,label) {
  if (!Array.isArray(value) || value.length > 30) { errors.push(`${label} muss ein Array mit höchstens 30 Einträgen sein.`); return; }
  if (new Set(value).size !== value.length) errors.push(`${label} enthält Duplikate.`);
  for (const alias of value) if (typeof alias !== 'string' || alias.trim().length < 2 || alias.length > 80) errors.push(`${label}: ungültiger Suchalias.`);
}
function validateRelativePath(value,label) { if (typeof value !== 'string' || !value || value.includes('\\') || value.startsWith('/') || value.includes('..')) errors.push(`${label} muss ein sicherer relativer POSIX-Pfad sein.`); }
function validateSafeUrl(value,label) { try { const url=new URL(value); if (!['https:','http:'].includes(url.protocol)) errors.push(`${label}: nur HTTP(S)-URLs sind erlaubt.`); for (const key of url.searchParams.keys()) if (secretParamPattern.test(key)) errors.push(`${label}: möglicherweise vertraulicher URL-Parameter ${key}.`); } catch { errors.push(`${label}: ungültige URL.`); } }
function requiredString(object,field,ref,min,max) { const value=object?.[field]; if (typeof value !== 'string' || value.trim().length < min || value.length > max) errors.push(`${ref}.${field}: Textlänge muss zwischen ${min} und ${max} liegen.`); }
function assertAllowed(value,set,message,target) { if (!set.has(value)) target.push(`${message}: ${String(value)}.`); }
function isDateTime(value) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.includes('T'); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(error) { console.error(`Datei konnte nicht gelesen werden: ${file}\n${error instanceof Error ? error.message : String(error)}`); process.exit(1); } }
