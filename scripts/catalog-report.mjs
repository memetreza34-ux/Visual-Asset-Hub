import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/assets.json'), 'utf8'));
const outputDir = path.resolve(root, process.env.REPORT_OUTPUT || 'reports');
const assets = catalog.assets;
const countBy = (selector) => Object.fromEntries([...new Set(assets.map(selector))].filter(Boolean).sort().map((value) => [value, assets.filter((asset) => selector(asset) === value).length]));
const report = {
  generatedAt: new Date().toISOString(),
  catalogUpdatedAt: catalog.updatedAt,
  totalAssets: assets.length,
  statusCounts: countBy((asset) => asset.status),
  typeCounts: countBy((asset) => asset.type),
  categoryCounts: countBy((asset) => asset.category),
  externalAssets: assets.filter((asset) => asset.storage.kind === 'external').length,
  withoutPreview: assets.filter((asset) => !asset.storage.previewPath).map((asset) => asset.id),
  needsReview: assets.filter((asset) => ['inbox', 'review'].includes(asset.status)).map((asset) => asset.id),
  rightsRisks: assets.filter((asset) => ['unknown', 'restricted', 'editorial-only'].includes(asset.rights.licenseStatus)).map((asset) => ({ id: asset.id, license: asset.rights.licenseStatus }))
};
const lines = [
  '# Visual Asset Hub – Katalogbericht', '', `Erstellt: ${report.generatedAt}`, `Katalogstand: ${report.catalogUpdatedAt}`, '',
  `- Assets insgesamt: **${report.totalAssets}**`, `- Extern referenziert: **${report.externalAssets}**`, `- Ohne Vorschau: **${report.withoutPreview.length}**`, `- Noch zu prüfen: **${report.needsReview.length}**`, `- Rechte-Risiken: **${report.rightsRisks.length}**`, '',
  '## Status', ...Object.entries(report.statusCounts).map(([key, value]) => `- ${key}: ${value}`), '',
  '## Typen', ...Object.entries(report.typeCounts).map(([key, value]) => `- ${key}: ${value}`)
];
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'catalog-report.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'catalog-report.md'), `${lines.join('\n')}\n`);
console.log(`Katalogbericht erzeugt: ${path.relative(root, outputDir)}/catalog-report.md`);
