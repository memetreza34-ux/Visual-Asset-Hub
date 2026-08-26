import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = path.join(root, 'reports');
const steps = [
  ['Projektprüfung', ['run', 'check']],
  ['Katalogbericht', ['run', 'report']],
  ['Testwebsite', ['run', 'site:build']]
];
const results = [];

for (const [name, args] of steps) {
  const run = spawnSync(npmCommand(), args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  results.push({ name, success: run.status === 0, output: truncate(run.stdout || run.stderr || '', 2000) });
  if (run.status !== 0) break;
}

const catalog = readJson('catalog/assets.json');
const usage = readJson('catalog/usage.json');
const reviews = readJson('catalog/reviews.json');
const assets = catalog.assets ?? [];
const videos = assets.filter((asset) => asset.type === 'video');
const images = assets.filter((asset) => asset.type === 'image');
const graphics = assets.filter((asset) => asset.type === 'graphic');
const staticVisuals = assets.filter((asset) => ['image', 'graphic'].includes(asset.type));
const approved = assets.filter((asset) => asset.status === 'approved');
const pending = assets.filter((asset) => ['inbox', 'review'].includes(asset.status));
const approvedRightsRisks = approved.filter((asset) => ['unknown', 'restricted', 'editorial-only'].includes(asset.rights?.licenseStatus));
const decisions = reviews.decisions ?? [];
const reviewedAssetIds = new Set(decisions.map((entry) => entry.assetId).filter(Boolean));
const reviewedAssets = assets.filter((asset) => reviewedAssetIds.has(asset.id));
const requiredReviewCount = 12;
const usageCount = (usage.uses ?? []).length;
const requiredChannels = ['channel-finance', 'channel-ai', 'channel-electro', 'channel-combat-sports'];
const channelCounts = Object.fromEntries(requiredChannels.map((tag) => [tag, assets.filter((asset) => asset.tags?.includes(tag)).length]));
const allChannelsRepresented = requiredChannels.every((tag) => channelCounts[tag] > 0);
const inboxAssets = assets.filter((asset) => asset.createdBy === 'local-inbox-browser');
const mediaPacks = findValidMediaPacks(path.join(root, 'exports', 'media-packs'));
const scriptPlans = findValidScriptPlans(path.join(root, '.local-storage', 'operations', 'script-plans.json'));
const scriptVisualProjects = findValidScriptVisualProjects(path.join(root, '.local-storage', 'script-visual-projects'));
const topicResearches = findValidTopicResearch(path.join(root, 'ALLES-GEFUNDEN', '05-THEMENRECHERCHEN'));
const scriptSpecificResearches = topicResearches.filter((entry) => entry.scriptSpecific);
const researchTypes = [...new Set(topicResearches.map((entry) => entry.researchType).filter(Boolean))];
const requiredResearchTypeCount = 2;

const technicalChecks = {
  projectCheck: Boolean(results.find((entry) => entry.name === 'Projektprüfung')?.success),
  reportBuild: Boolean(results.find((entry) => entry.name === 'Katalogbericht')?.success),
  siteBuild: Boolean(results.find((entry) => entry.name === 'Testwebsite')?.success),
  approvedRightsSafe: approvedRightsRisks.length === 0
};
const technicalReady = Object.values(technicalChecks).every(Boolean);
const technicalPercentage = Math.round(100 * Object.values(technicalChecks).filter(Boolean).length / Object.keys(technicalChecks).length);

const realTestChecks = {
  starterMediaPresent: videos.length >= 3 && staticVisuals.length >= 3,
  scriptPlanGenerated: scriptPlans.length >= 1,
  scriptVisualProjectGenerated: scriptVisualProjects.length >= 1,
  scriptVisualMultipleScenesSearched: scriptVisualProjects.some((entry) => entry.searchedScenes >= 2),
  scriptVisualMixedMediaFound: scriptVisualProjects.some((entry) => entry.mixedMediaScenes >= 1),
  scriptVisualReviewImported: scriptVisualProjects.some((entry) => entry.importedAssets >= 1),
  topicResearchGenerated: topicResearches.length >= 1,
  multipleResearchTypesVerified: researchTypes.length >= requiredResearchTypeCount,
  scriptSpecificTopicResearch: scriptSpecificResearches.length >= 1,
  starterAssetsReviewed: assets.length >= requiredReviewCount && reviewedAssets.length >= requiredReviewCount,
  fourChannelsRepresented: allChannelsRepresented,
  ownedInboxAssetImported: inboxAssets.length >= 1,
  approvedAsset: approved.length >= 1,
  verifiedMediaPackCreated: mediaPacks.length >= 1,
  realUsageRecorded: usageCount >= 1
};
const realTestComplete = technicalReady && Object.values(realTestChecks).every(Boolean);
const realTestPercentage = Math.round(100 * Object.values(realTestChecks).filter(Boolean).length / Object.keys(realTestChecks).length);
const overallPercentage = Math.round(technicalPercentage * 0.7 + realTestPercentage * 0.3);

const nextActions = [];
if (videos.length < 3 || staticVisuals.length < 3) nextActions.push('Mindestens drei Videos und drei statische Bilder oder Grafiken bereitstellen.');
if (scriptPlans.length < 1) nextActions.push('Ein echtes Kanalskript mit dem CLI-Planer verarbeiten und die erzeugte Shotlist prüfen.');
if (scriptVisualProjects.length < 1) nextActions.push('Ein echtes Projekt unter „Skript → Visuals“ aus einem fertigen Skript erstellen.');
if (!scriptVisualProjects.some((entry) => entry.searchedScenes >= 2)) nextActions.push('Im Script Visual Finder mindestens zwei Szenen real über Medienquellen recherchieren.');
if (!scriptVisualProjects.some((entry) => entry.mixedMediaScenes >= 1)) nextActions.push('Im Script Visual Finder mindestens eine reale Szene mit Video- und Bildkandidaten im selben Szenenboard sichten.');
if (!scriptVisualProjects.some((entry) => entry.importedAssets >= 1)) nextActions.push('Mindestens einen Script-Visual-Kandidaten bewusst als Review-Asset importieren.');
if (topicResearches.length < 1) nextActions.push('Eine echte universelle Themenrecherche durchführen, Treffer visuell prüfen und den Themenordner kontrollieren.');
if (researchTypes.length < requiredResearchTypeCount) nextActions.push(`${requiredResearchTypeCount - researchTypes.length} weitere unterschiedliche Rechercheart(en) real durchführen und im Themenarchiv nachweisen.`);
if (scriptSpecificResearches.length < 1) nextActions.push('Eine Themenrecherche mit Reel-Skript durchführen, sodass mindestens ein skriptspezifischer Recherchebereich entsteht.');
if (reviewedAssets.length < requiredReviewCount) nextActions.push(`${requiredReviewCount - reviewedAssets.length} weitere Starterassets vollständig prüfen und eine Entscheidung speichern.`);
if (!allChannelsRepresented) {
  const missing = requiredChannels.filter((tag) => channelCounts[tag] === 0).map(channelLabel);
  nextActions.push(`Mindestens einen ausgewählten Kandidaten für diese Kanäle importieren: ${missing.join(', ')}.`);
}
if (inboxAssets.length < 1) nextActions.push('Eine eigene Datei über den lokalen Inbox-Importer als Review-Asset aufnehmen.');
if (approved.length < 1) nextActions.push('Mindestens ein geprüftes Asset freigeben.');
if (mediaPacks.length < 1) nextActions.push('Aus freigegebenen Favoriten ein verifiziertes Medienpaket erstellen.');
if (usageCount < 1) nextActions.push('Ein freigegebenes Asset in einem echten Content-Projekt verwenden und dokumentieren.');
if (!technicalReady) nextActions.unshift('Fehlgeschlagene technische Prüfschritte beheben.');

const report = {
  generatedAt: new Date().toISOString(),
  technicalReady,
  realTestComplete,
  technicalPercentage,
  realTestPercentage,
  completionPercentage: overallPercentage,
  technicalChecks,
  realTestChecks,
  counts: {
    assets: assets.length,
    videos: videos.length,
    images: images.length,
    graphics: graphics.length,
    staticVisuals: staticVisuals.length,
    pending: pending.length,
    approved: approved.length,
    reviewDecisions: decisions.length,
    reviewedAssets: reviewedAssets.length,
    requiredReviewedAssets: requiredReviewCount,
    usages: usageCount,
    approvedRightsRisks: approvedRightsRisks.length,
    inboxAssets: inboxAssets.length,
    validMediaPacks: mediaPacks.length,
    validScriptPlans: scriptPlans.length,
    validScriptVisualProjects: scriptVisualProjects.length,
    validTopicResearches: topicResearches.length,
    scriptSpecificTopicResearches: scriptSpecificResearches.length,
    distinctResearchTypes: researchTypes.length,
    requiredResearchTypes: requiredResearchTypeCount,
    researchTypes,
    channelCounts
  },
  scriptPlans,
  scriptVisualProjects,
  topicResearches,
  mediaPacks,
  steps: results,
  nextActions
};

fs.mkdirSync(outputDir, { recursive: true });
const jsonPath = path.join(outputDir, 'beta-readiness.json');
const markdownPath = path.join(outputDir, 'beta-readiness.md');
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
const md = [
  '# Beta Readiness', '',
  `Erzeugt: ${report.generatedAt}`, '',
  `- Technisch bereit: **${technicalReady ? 'ja' : 'nein'}**`,
  `- Technischer Stand: **${technicalPercentage} %**`,
  `- Realtest vollständig: **${realTestComplete ? 'ja' : 'nein'}**`,
  `- Realtest-Stand: **${realTestPercentage} %**`,
  `- Gesamtstand: **${overallPercentage} %**`,
  `- Assets: **${assets.length}** (${videos.length} Videos, ${staticVisuals.length} statische Bilder/Grafiken)`,
  `- Dokumentiert geprüft: **${reviewedAssets.length}/${requiredReviewCount}**`,
  `- Freigegeben: **${approved.length}**`,
  `- Verifizierte Skriptpläne: **${scriptPlans.length}**`,
  `- Script-Visual-Projekte: **${scriptVisualProjects.length}**`,
  `- Verifizierte Themenrecherchen: **${topicResearches.length}** (${scriptSpecificResearches.length} mit Skriptbezug)`,
  `- Unterschiedliche Recherchearten: **${researchTypes.length}/${requiredResearchTypeCount}**${researchTypes.length ? ` · ${researchTypes.join(', ')}` : ''}`,
  `- Eigene Inbox-Assets: **${inboxAssets.length}**`,
  `- Verifizierte Medienpakete: **${mediaPacks.length}**`,
  `- Nutzungen: **${usageCount}**`, '',
  '## Script Visual Finder',
  ...(scriptVisualProjects.length ? scriptVisualProjects.map((entry) => `- ${entry.projectId} / ${entry.title}: **${entry.searchedScenes}/${entry.sceneCount} Szenen** · ${entry.videoCandidates} Video- und ${entry.photoCandidates} Bildkandidaten · ${entry.mixedMediaScenes} Szene(n) mit Video + Bild · ${entry.importedAssets} importiert`) : ['- Noch kein verifiziertes Script-Visual-Projekt.']), '',
  '## Kanalabdeckung',
  ...requiredChannels.map((tag) => `- ${channelLabel(tag)}: **${channelCounts[tag]} Assets**`), '',
  '## Themenrecherchen',
  ...(topicResearches.length ? topicResearches.map((entry) => `- ${entry.channel} / ${entry.topic}: **${entry.candidates} Kandidaten** · ${entry.researchType || 'Rechercheart unbekannt'} · ${entry.scriptSpecific ? 'mit Skriptbezug' : 'ohne Skriptbezug'} · ${entry.providers.join(', ') || 'Quelle unbekannt'}`) : ['- Noch keine verifizierte Themenrecherche.']), '',
  '## Prüfschritte',
  ...results.map((entry) => `- ${entry.success ? 'OK' : 'FEHLER'} – ${entry.name}`), '',
  '## Realtest-Kriterien',
  ...Object.entries(realTestChecks).map(([key, value]) => `- ${value ? 'OK' : 'OFFEN'} – ${key}`), '',
  '## Nächste Schritte',
  ...(nextActions.length ? nextActions.map((entry) => `- ${entry}`) : ['- Beta-Abnahme vollständig.'])
].join('\n');
fs.writeFileSync(markdownPath, `${md}\n`);
syncFinalReport([jsonPath, markdownPath]);
console.log(md);
if (!technicalReady) process.exitCode = 1;

function findValidScriptVisualProjects(directory) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^SVP-[A-F0-9]{12}\.json$/.test(entry.name)) continue;
    try {
      const project = JSON.parse(fs.readFileSync(path.join(directory, entry.name), 'utf8'));
      if (project.format !== 'visual-asset-hub-script-visual-project' || project.version !== 1) continue;
      if (!/^SVP-[A-F0-9]{12}$/.test(project.projectId ?? '')) continue;
      if (typeof project.script !== 'string' || project.script.length < 10 || project.script.length > 40000) continue;
      if (!/^[a-f0-9]{64}$/.test(project.scriptSha256 ?? '')) continue;
      const scriptHash = createHash('sha256').update(project.script, 'utf8').digest('hex');
      if (scriptHash !== project.scriptSha256) continue;
      if (!Array.isArray(project.scenes) || project.scenes.length < 1 || project.scenes.length > 120) continue;
      if (!project.scenes.every((scene, index) => scene.id === `SCENE-${String(index + 1).padStart(3, '0')}` && typeof scene.originalText === 'string' && scene.originalText.length > 0 && Array.isArray(scene.queries))) continue;
      const candidates = project.scenes.flatMap((scene) => Array.isArray(scene.candidates) ? scene.candidates : []);
      const importedAssets = new Set(candidates.flatMap((candidate) => candidate.importedAssetIds ?? []));
      const mixedMediaScenes = project.scenes.filter((scene) => {
        const sceneCandidates = Array.isArray(scene.candidates) ? scene.candidates : [];
        return sceneCandidates.some((candidate) => candidate.type === 'video') && sceneCandidates.some((candidate) => candidate.type !== 'video');
      }).length;
      found.push({
        projectId: project.projectId,
        title: project.title ?? project.projectId,
        sceneCount: project.scenes.length,
        searchedScenes: project.scenes.filter((scene) => scene.searchedAt && (scene.candidates?.length ?? 0) > 0).length,
        selectedScenes: project.scenes.filter((scene) => scene.selectedPrimary || (scene.selectedAlternatives?.length ?? 0) > 0).length,
        videoCandidates: candidates.filter((candidate) => candidate.type === 'video').length,
        photoCandidates: candidates.filter((candidate) => candidate.type !== 'video').length,
        mixedMediaScenes,
        importedAssets: importedAssets.size
      });
    } catch {
      // Unvollständige lokale Projekte zählen nicht als Realtest-Nachweis.
    }
  }
  return found;
}

function findValidTopicResearch(directory) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  const allowedResearchTypes = new Set([
    'Person',
    'Firma / Marke / Organisation',
    'Produkt / Objekt',
    'Event / Veranstaltung',
    'Ort / Gebäude / Region',
    'Technik / Gerät / System',
    'Sport / Kampf / Athletik',
    'Historisches Thema',
    'Allgemeines Thema / Konzept'
  ]);
  for (const channelEntry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!channelEntry.isDirectory() || channelEntry.name.startsWith('.')) continue;
    const channelPath = path.join(directory, channelEntry.name);
    for (const topicEntry of fs.readdirSync(channelPath, { withFileTypes: true })) {
      if (!topicEntry.isDirectory() || topicEntry.name.startsWith('.')) continue;
      const topicPath = path.join(channelPath, topicEntry.name);
      const guidePath = path.join(topicPath, '00-RECHERCHEPLAN.md');
      if (!fs.existsSync(guidePath) || !fs.statSync(guidePath).isFile()) continue;
      try {
        const guide = fs.readFileSync(guidePath, 'utf8');
        if (!guide.startsWith('# Rechercheplan – ') || !guide.includes('## Rechtehinweis')) continue;
        const candidates = listFiles(topicPath, (name) => name.endsWith('-INFO.md'));
        if (!candidates.length) continue;
        const providerMatch = guide.match(/- verwendete API-Quellen: \*\*(.+?)\*\*/);
        const providers = providerMatch ? providerMatch[1].split(',').map((value) => value.trim()).filter(Boolean) : [];
        const researchTypeMatch = guide.match(/- Rechercheart: \*\*(.+?)\*\*/);
        const researchType = researchTypeMatch?.[1]?.trim() ?? '';
        found.push({
          channel: channelEntry.name,
          topic: topicEntry.name,
          candidates: candidates.length,
          researchType: allowedResearchTypes.has(researchType) ? researchType : '',
          scriptSpecific: guide.includes('**Skript:'),
          providers,
          guide: path.relative(root, guidePath)
        });
      } catch {
        // Unvollständige Themenordner zählen nicht als Realtest-Nachweis.
      }
    }
  }
  return found;
}

function listFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full, predicate));
    else if (entry.isFile() && predicate(entry.name)) files.push(full);
  }
  return files;
}

function findValidScriptPlans(evidencePath) {
  if (!fs.existsSync(evidencePath)) return [];
  try {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    if (evidence.version !== 1 || !Array.isArray(evidence.plans)) return [];
    const allowedChannels = new Set(['finance', 'ai', 'electro', 'combat-sports']);
    const valid = [];
    for (const entry of evidence.plans.slice(-100)) {
      if (!/^PLAN-[A-F0-9]{12}$/.test(entry.id ?? '')) continue;
      if (!allowedChannels.has(entry.channel)) continue;
      if (!Number.isInteger(entry.sceneCount) || entry.sceneCount < 1 || entry.sceneCount > 20) continue;
      if (!Number.isInteger(entry.durationSeconds) || entry.durationSeconds < 10 || entry.durationSeconds > 600) continue;
      if (!['vertical', 'horizontal'].includes(entry.orientation)) continue;
      if (!/^[a-f0-9]{64}$/.test(entry.scriptSha256 ?? '')) continue;
      if (typeof entry.outputDirectory !== 'string' || entry.outputDirectory.includes('..') || path.isAbsolute(entry.outputDirectory)) continue;
      const directory = path.resolve(root, ...entry.outputDirectory.split('/'));
      if (!directory.startsWith(`${path.resolve(root)}${path.sep}`)) continue;
      const required = ['shotlist.json', 'shotlist.csv', 'shotlist.md', 'shotlist.srt', 'script.txt'];
      if (!required.every((file) => fs.existsSync(path.join(directory, file)) && fs.statSync(path.join(directory, file)).isFile())) continue;
      const plan = JSON.parse(fs.readFileSync(path.join(directory, 'shotlist.json'), 'utf8'));
      if (plan.format !== 'visual-asset-hub-shot-plan' || plan.channel?.id !== entry.channel || plan.summary?.sceneCount !== entry.sceneCount) continue;
      const scriptHash = createHash('sha256').update(fs.readFileSync(path.join(directory, 'script.txt'), 'utf8').trim(), 'utf8').digest('hex');
      if (scriptHash !== entry.scriptSha256) continue;
      valid.push({
        id: entry.id,
        generatedAt: entry.generatedAt,
        channel: entry.channel,
        sceneCount: entry.sceneCount,
        durationSeconds: entry.durationSeconds,
        coveragePercentage: entry.coveragePercentage,
        approvedCoveragePercentage: entry.approvedCoveragePercentage,
        outputDirectory: entry.outputDirectory
      });
    }
    return valid;
  } catch {
    return [];
  }
}

function findValidMediaPacks(directory) {
  if (!fs.existsSync(directory)) return [];
  const packs = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const rootPath = path.join(directory, entry.name);
    const manifestPath = path.join(rootPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const entries = Array.isArray(manifest.assets) ? manifest.assets : [];
      if (manifest.format !== 'visual-asset-hub-media-pack' || entries.length < 1) continue;
      const filesExist = entries.every((asset) => {
        if (typeof asset.localPath !== 'string' || asset.localPath.includes('..') || path.isAbsolute(asset.localPath)) return false;
        const file = path.resolve(rootPath, ...asset.localPath.split('/'));
        return file.startsWith(`${path.resolve(rootPath)}${path.sep}`) && fs.existsSync(file) && fs.statSync(file).isFile() && /^[a-f0-9]{64}$/.test(asset.sha256 ?? '');
      });
      if (filesExist) packs.push({ name: manifest.name ?? entry.name, directory: path.relative(root, rootPath), assets: entries.length, totalBytes: manifest.totalBytes ?? null });
    } catch {
      // Ungültige oder unvollständige Pakete zählen nicht für die Abnahme.
    }
  }
  return packs;
}

function channelLabel(tag) {
  return ({
    'channel-finance': 'Finanzen',
    'channel-ai': 'Künstliche Intelligenz',
    'channel-electro': 'Elektrotechnik',
    'channel-combat-sports': 'Kampfsport'
  })[tag] ?? tag;
}

function syncFinalReport(files) {
  const target = path.join(root, 'dist', 'reports');
  if (!fs.existsSync(path.join(root, 'dist'))) return;
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) fs.copyFileSync(file, path.join(target, path.basename(file)));
}
function npmCommand() { return process.platform === 'win32' ? 'npm.cmd' : 'npm'; }
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
function truncate(value, max) { const text = String(value); return text.length <= max ? text : `${text.slice(0, max)}…`; }
