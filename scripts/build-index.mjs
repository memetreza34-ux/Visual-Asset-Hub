import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const catalog = readJson(path.join(root, 'catalog/assets.json'));
const taxonomy = readJson(path.join(root, 'catalog/taxonomy.json'));
const usage = readOptional(path.join(root, 'catalog/usage.json'), { uses: [] });
const usesByAsset = new Map();
const staticTypes = new Set(['image', 'graphic', 'icon', 'mockup']);
for (const entry of usage.uses ?? []) {
  const entries = usesByAsset.get(entry.assetId) ?? [];
  entries.push(entry);
  usesByAsset.set(entry.assetId, entries);
}

const records = [...catalog.assets]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((asset) => {
    const uses = (usesByAsset.get(asset.id) ?? []).sort((a, b) => Date.parse(b.usedAt) - Date.parse(a.usedAt));
    const source = asset.storage.kind === 'external' ? asset.storage.externalUrl ?? null : asset.storage.path ?? null;
    const preview = asset.storage.previewPath ?? asset.storage.previewUrl ?? (staticTypes.has(asset.type) ? source : null);
    return {
      id: asset.id,
      filename: asset.filename,
      title: asset.title,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      secondaryCategories: asset.secondaryCategories ?? [],
      tags: asset.tags,
      searchAliases: asset.searchAliases ?? [],
      subject: asset.subject,
      action: asset.action,
      orientation: asset.orientation,
      shotType: asset.shotType,
      cameraMovement: asset.cameraMovement,
      style: asset.style,
      status: asset.status,
      qualityRating: asset.qualityRating,
      usageScopes: asset.rights.usageScopes,
      licenseStatus: asset.rights.licenseStatus,
      attributionRequired: asset.rights.attributionRequired,
      attributionText: asset.rights.attributionText ?? null,
      sourceName: asset.rights.sourceName,
      sourcePage: asset.rights.sourceUrl ?? null,
      licenseUrl: asset.rights.licenseUrl ?? null,
      preview,
      source,
      storageKind: asset.storage.kind,
      technical: asset.technical ?? null,
      importedAt: asset.importedAt,
      createdAt: asset.createdAt,
      usageCount: uses.length,
      lastUsedAt: uses[0]?.usedAt ?? null,
      usedInProjects: [...new Set(uses.map((entry) => entry.project))].sort(),
      usedOnPlatforms: [...new Set(uses.map((entry) => entry.platform))].sort(),
      searchableText: normalize([
        asset.id, asset.filename, asset.title, asset.description, asset.type, asset.category,
        ...(asset.secondaryCategories ?? []), ...asset.tags, ...(asset.searchAliases ?? []),
        asset.subject, asset.action, asset.orientation, asset.shotType, asset.cameraMovement,
        asset.style, asset.rights.licenseStatus, asset.rights.sourceName, ...asset.rights.usageScopes,
        ...uses.map((entry) => `${entry.project} ${entry.projectTitle ?? ''} ${entry.platform}`)
      ].join(' '))
    };
  });

const index = {
  indexVersion: 4,
  catalogVersion: catalog.catalogVersion,
  catalogUpdatedAt: catalog.updatedAt,
  usageUpdatedAt: usage.updatedAt ?? null,
  assetCount: records.length,
  reviewCount: records.filter((record) => record.status === 'review').length,
  approvedCount: records.filter((record) => record.status === 'approved').length,
  usedAssetCount: records.filter((record) => record.usageCount > 0).length,
  totalUsageCount: records.reduce((sum, record) => sum + record.usageCount, 0),
  facets: {
    types: count(records, 'type', taxonomy.assetTypes),
    categories: count(records, 'category', taxonomy.categories),
    orientations: count(records, 'orientation', taxonomy.orientations),
    styles: count(records, 'style', taxonomy.styles),
    statuses: count(records, 'status', taxonomy.lifecycleStatuses),
    licenseStatuses: count(records, 'licenseStatus', taxonomy.licenseStatuses),
    usageScopes: count(records, 'usageScopes', taxonomy.usageScopes)
  },
  records
};

const outputPath = path.join(root, 'catalog/search-index.json');
fs.writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Suchindex erzeugt: ${records.length} Assets, ${index.totalUsageCount} Nutzungen in ${path.relative(root, outputPath)}.`);

function normalize(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function count(records, field, knownValues) {
  const result = Object.fromEntries(knownValues.map((value) => [value, 0]));
  for (const record of records) {
    const values = Array.isArray(record[field]) ? record[field] : [record[field]];
    for (const value of values) result[value] = (result[value] ?? 0) + 1;
  }
  return result;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function readOptional(file, fallback) { return fs.existsSync(file) ? readJson(file) : fallback; }
