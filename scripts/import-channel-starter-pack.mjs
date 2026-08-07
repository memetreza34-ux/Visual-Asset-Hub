import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const catalogPath = path.join(root, 'catalog/assets.json');
const previous = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(previous);
const timestamp = '2026-08-06T10:00:00.000Z';
const commonScopes = ['organic-social', 'youtube', 'website'];
const candidates = [
  {
    id: 'VAH-P6120120', filename: 'brl-finance-investing-calculator-financial-analysis-cu-vertical-0001.mp4',
    title: 'Finanzanalyse mit Taschenrechner', description: 'Vertikales Pexels-Video mit Händen, Taschenrechner und Finanz- beziehungsweise Investmentdarstellung für Budget-, Spar- und Investment-Content.',
    type: 'video', category: 'finance-investing', secondaryCategories: ['money-finance', 'business-work'],
    tags: ['channel-finance', 'collection-budgeting-saving', 'calculator', 'investment', 'banking', 'hands', 'pexels'],
    searchAliases: ['Taschenrechner Finanzen', 'Budget berechnen', 'Investment calculator', 'financial analysis'],
    subject: 'calculator', action: 'financial-analysis', orientation: 'vertical', shotType: 'cu', cameraMovement: 'mixed', style: 'realistic', status: 'review', qualityRating: 4,
    technical: { width: 720, height: 1280, durationSeconds: 7, fps: 29.97, codec: 'h264/mp4' },
    storage: { kind: 'external', previewUrl: 'https://images.pexels.com/videos/6120120/analysis-app-bank-banking-6120120.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630', externalUrl: 'https://videos.pexels.com/video-files/6120120/6120120-hd_720_1280_30fps.mp4' },
    rights: { licenseStatus: 'licensed', sourceName: 'Pexels', sourceUrl: 'https://www.pexels.com/de-de/video/hande-geschaft-taschenrechner-investition-6120120/', licenseUrl: 'https://www.pexels.com/license/', usageScopes: commonScopes, attributionRequired: false, attributionText: 'Video von Nataliya Vaitkevich auf Pexels', notes: 'Pexels-Lizenz dokumentiert. Sichtbare Bildschirminhalte und Nutzungskontext vor Freigabe prüfen.' }
  },
  {
    id: 'VAH-P7989872', filename: 'brl-artificial-intelligence-smartphone-digital-interaction-cu-vertical-0001.mp4',
    title: 'Digitale Interaktion am Smartphone', description: 'Vertikales Pexels-Video einer Hand bei einer schnellen digitalen Technologie-Interaktion, geeignet für mobile KI, Apps und digitale Zukunft.',
    type: 'video', category: 'artificial-intelligence', secondaryCategories: ['technology-ai', 'ui-apps'],
    tags: ['channel-ai', 'collection-mobile-ai', 'smartphone', 'digital-interaction', 'technology', 'mobile', 'pexels'],
    searchAliases: ['KI Smartphone', 'Hand bedient Technik', 'mobile AI', 'digital interaction'],
    subject: 'smartphone', action: 'digital-interaction', orientation: 'vertical', shotType: 'cu', cameraMovement: 'mixed', style: 'realistic', status: 'review', qualityRating: 3,
    technical: { width: 720, height: 1280, durationSeconds: 15, fps: 25, codec: 'h264/mp4' },
    storage: { kind: 'external', previewUrl: 'https://images.pexels.com/videos/7989872/abstract-access-adult-analogue-7989872.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630', externalUrl: 'https://videos.pexels.com/video-files/7989872/7989872-hd_720_1280_25fps.mp4' },
    rights: { licenseStatus: 'licensed', sourceName: 'Pexels', sourceUrl: 'https://www.pexels.com/de-de/video/hand-surfen-technologie-bewegung-7989872/', licenseUrl: 'https://www.pexels.com/license/', usageScopes: commonScopes, attributionRequired: false, attributionText: 'Video von Mikhail Nilov auf Pexels', notes: 'Pexels-Lizenz dokumentiert. Bildschirm, Geräteform und mögliche Marken vor Freigabe prüfen.' }
  },
  {
    id: 'VAH-P6153455', filename: 'brl-artificial-intelligence-bionic-arm-demonstrating-cu-vertical-0001.mp4',
    title: 'Bionischer Arm in Nahaufnahme', description: 'Vertikales Pexels-Video eines technologischen beziehungsweise bionischen Arms für Robotik-, Prothesen-, KI- und Zukunftsthemen.',
    type: 'video', category: 'artificial-intelligence', secondaryCategories: ['technology-ai', 'science-engineering'],
    tags: ['channel-ai', 'collection-humanoid-robots', 'bionic-arm', 'robotics', 'prosthetic', 'technology', 'pexels'],
    searchAliases: ['Bionischer Arm', 'Roboterarm', 'bionic arm', 'robotic prosthetic'],
    subject: 'bionic-arm', action: 'demonstrating', orientation: 'vertical', shotType: 'cu', cameraMovement: 'mixed', style: 'realistic', status: 'review', qualityRating: 4,
    technical: { width: 720, height: 1366, durationSeconds: 10, fps: 25, codec: 'h264/mp4' },
    storage: { kind: 'external', previewUrl: 'https://images.pexels.com/videos/6153455/amputee-anonymouse-arm-artificial-6153455.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630', externalUrl: 'https://videos.pexels.com/video-files/6153455/6153455-hd_720_1366_25fps.mp4' },
    rights: { licenseStatus: 'licensed', sourceName: 'Pexels', sourceUrl: 'https://www.pexels.com/de-de/video/arm-hande-technologie-gesichtslos-6153455/', licenseUrl: 'https://www.pexels.com/license/', usageScopes: commonScopes, attributionRequired: false, attributionText: 'Video von cottonbro studio auf Pexels', notes: 'Pexels-Lizenz dokumentiert. Medizinische Aussagen, sichtbare Person und sensiblen Kontext vor Freigabe prüfen.' }
  },
  {
    id: 'VAH-P6153460', filename: 'brl-artificial-intelligence-laboratory-device-demonstrating-ms-vertical-0001.mp4',
    title: 'Anonyme Technologieszene im Labor', description: 'Vertikales Pexels-Video einer gesichtslosen Wissenschafts- und Technologieszene für KI-, Forschung-, Robotik- und Innovationsinhalte.',
    type: 'video', category: 'artificial-intelligence', secondaryCategories: ['technology-ai', 'science-engineering'],
    tags: ['channel-ai', 'collection-ai-general', 'laboratory', 'science', 'innovation', 'faceless', 'pexels'],
    searchAliases: ['KI Labor', 'Technologie Forschung', 'AI laboratory', 'science technology'],
    subject: 'laboratory-device', action: 'demonstrating', orientation: 'vertical', shotType: 'ms', cameraMovement: 'mixed', style: 'realistic', status: 'review', qualityRating: 3,
    technical: { width: 720, height: 1366, durationSeconds: 8, fps: 25, codec: 'h264/mp4' },
    storage: { kind: 'external', previewUrl: 'https://images.pexels.com/videos/6153460/pexels-photo-6153460.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630', externalUrl: 'https://videos.pexels.com/video-files/6153460/6153460-hd_720_1366_25fps.mp4' },
    rights: { licenseStatus: 'licensed', sourceName: 'Pexels', sourceUrl: 'https://www.pexels.com/de-de/video/gesichtslos-wissenschaft-anonym-drinnen-6153460/', licenseUrl: 'https://www.pexels.com/license/', usageScopes: commonScopes, attributionRequired: false, attributionText: 'Video von cottonbro studio auf Pexels', notes: 'Pexels-Lizenz dokumentiert. Tatsächlichen Bildinhalt und mögliche Geräte- oder Markenmerkmale vor Freigabe prüfen.' }
  },
  {
    id: 'VAH-P6153725', filename: 'brl-artificial-intelligence-robotic-device-moving-cu-vertical-0001.mp4',
    title: 'Robotisches Gerät in Bewegung', description: 'Vertikales Pexels-Video einer Person mit einem bewegten technologischen beziehungsweise robotischen Objekt für Robotik- und KI-Erklärinhalte.',
    type: 'video', category: 'artificial-intelligence', secondaryCategories: ['technology-ai', 'science-engineering', 'people-lifestyle'],
    tags: ['channel-ai', 'collection-humanoid-robots', 'robotic-device', 'movement', 'technology', 'person', 'pexels'],
    searchAliases: ['Robotisches Gerät', 'Person mit Robotertechnik', 'robotic device', 'future technology'],
    subject: 'robotic-device', action: 'moving', orientation: 'vertical', shotType: 'cu', cameraMovement: 'mixed', style: 'realistic', status: 'review', qualityRating: 3,
    technical: { width: 720, height: 1366, durationSeconds: 10, fps: 25, codec: 'h264/mp4' },
    storage: { kind: 'external', previewUrl: 'https://images.pexels.com/videos/6153725/pexels-photo-6153725.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630', externalUrl: 'https://videos.pexels.com/video-files/6153725/6153725-hd_720_1366_25fps.mp4' },
    rights: { licenseStatus: 'licensed', sourceName: 'Pexels', sourceUrl: 'https://www.pexels.com/de-de/video/person-technologie-bewegen-wissenschaft-6153725/', licenseUrl: 'https://www.pexels.com/license/', usageScopes: commonScopes, attributionRequired: false, attributionText: 'Video von cottonbro studio auf Pexels', notes: 'Pexels-Lizenz dokumentiert. Person, Technikobjekt und Nutzungskontext vollständig prüfen.' }
  },
  {
    id: 'VAH-WBOX2021', filename: 'img-combat-sports-boxing-training-sparring-ms-horizontal-0001.jpg',
    title: 'Boxtraining im Freien', description: 'Horizontales Wikimedia-Commons-Foto mit mehreren Personen beim Boxtraining. Geeignet als generisches Boxtraining-Motiv; sichtbare Personen und möglicher Persönlichkeitsrechtskontext müssen vor Nutzung geprüft werden.',
    type: 'image', category: 'combat-sports', secondaryCategories: ['health-fitness', 'people-lifestyle'],
    tags: ['channel-combat-sports', 'collection-boxing-training', 'boxing', 'training', 'sparring', 'athlete', 'wikimedia'],
    searchAliases: ['Boxtraining', 'Boxer Training', 'boxing training', 'boxing sparring'],
    subject: 'boxing-training', action: 'sparring', orientation: 'horizontal', shotType: 'ms', cameraMovement: 'static', style: 'documentary', status: 'review', qualityRating: 4,
    technical: { width: 1849, height: 1512, codec: 'jpg' },
    storage: { kind: 'external', previewUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Boxer_training.jpg/587px-Boxer_training.jpg', externalUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Boxer_training.jpg' },
    rights: { licenseStatus: 'cc-by-sa', sourceName: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Boxer_training.jpg', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', usageScopes: commonScopes, attributionRequired: true, attributionText: 'Foto: Dotun55 / Wikimedia Commons · CC BY-SA 4.0', notes: 'CC BY-SA 4.0: Urheber nennen, Lizenz verlinken, Änderungen kennzeichnen und bei Bearbeitung Share-Alike-Bedingungen beachten. Sichtbare Personen vor Freigabe zusätzlich prüfen.' },
    notes: 'Wikimedia-Commons-Starter für Kampfsport. Status bleibt wegen sichtbarer Personen und Kontextprüfung auf review.'
  }
].map((asset) => ({
  ...asset,
  createdAt: timestamp,
  importedAt: timestamp,
  createdBy: asset.createdBy || 'channel-starter-pack',
  notes: asset.notes || 'Aus einem erfolgreich ausgeführten Pexels-API-Test übernommen. Status bleibt bis zur Sichtprüfung review.'
}));

const existingIds = new Set(catalog.assets.map((asset) => asset.id));
const existingSources = new Set(catalog.assets.map((asset) => asset.rights?.sourceUrl).filter(Boolean));
const additions = candidates.filter((asset) => !existingIds.has(asset.id) && !existingSources.has(asset.rights.sourceUrl));
if (!additions.length) { console.log('Starterpaket ist bereits vollständig im Katalog.'); process.exit(0); }

try {
  catalog.updatedAt = new Date().toISOString();
  catalog.assets = [...catalog.assets, ...additions].sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  run('scripts/validate-catalog.mjs');
  run('scripts/build-index.mjs');
  console.log(`${additions.length} echte Starterassets als review importiert.`);
} catch (error) {
  fs.writeFileSync(catalogPath, previous);
  console.error(`Starterimport zurückgerollt: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function run(script) { const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }); if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${script} fehlgeschlagen.`); if (result.stdout) process.stdout.write(result.stdout); }
