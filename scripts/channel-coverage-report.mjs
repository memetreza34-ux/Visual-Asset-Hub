import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildExpansionPlan } from './arsenal-expansion-plan.mjs';

const root = process.cwd();
const index = readJson('catalog/channels/index.json');
const searchIndex = readJson('catalog/search-index.json');
const channels = index.files.map(readJson);
const recommended = Number(index.goals?.recommendedApprovedPerCollection ?? 8);
const minimum = Number(index.goals?.minimumApprovedPerCollection ?? 4);
const records = searchIndex.records ?? [];
const goals = {
  minimumApprovedPerCollection: minimum,
  recommendedApprovedPerCollection: recommended,
  minimumVideosPerCollection: Number(index.goals?.minimumVideosPerCollection ?? 2),
  minimumPhotosPerCollection: Number(index.goals?.minimumPhotosPerCollection ?? 2)
};
const expansion = buildExpansionPlan({ channels, assets: records, goals });
const expansionByCollection = new Map(expansion.priorities.map((entry) => [`${entry.channel}|${entry.collection}`, entry]));
const channelReports = [];

for (const channel of channels) {
  const collections = channel.collections.map((collection) => {
    const channelTag = channel.channelTag;
    const collectionTag = `collection-${collection.id}`;
    const assets = records.filter((record) => (record.tags ?? []).includes(channelTag) && (record.tags ?? []).includes(collectionTag));
    const approved = assets.filter((record) => record.status === 'approved');
    const review = assets.filter((record) => ['inbox', 'review'].includes(record.status));
    const restricted = assets.filter((record) => ['restricted', 'archived'].includes(record.status));
    const plan = expansionByCollection.get(`${channel.id}|${collection.id}`);
    return {
      id: collection.id,
      label: collection.label,
      total: assets.length,
      approved: approved.length,
      review: review.length,
      restricted: restricted.length,
      minimumReached: approved.length >= minimum,
      recommendedReached: approved.length >= recommended,
      missingToMinimum: Math.max(0, minimum - approved.length),
      missingToRecommended: Math.max(0, recommended - approved.length),
      assetIds: assets.map((record) => record.id),
      nextAction: plan?.nextAction ?? 'complete',
      searchGap: plan?.gaps?.searchCandidates ?? 0,
      videoGap: plan?.gaps?.videos ?? 0,
      photoGap: plan?.gaps?.photos ?? 0,
      recommendedSearch: plan?.recommendedSearch ?? null,
      providerPriority: plan?.providerPriority ?? []
    };
  });
  channelReports.push({
    id: channel.id,
    label: channel.label,
    category: channel.primaryCategory,
    collectionCount: collections.length,
    totalAssets: collections.reduce((sum, entry) => sum + entry.total, 0),
    approvedAssets: collections.reduce((sum, entry) => sum + entry.approved, 0),
    reviewAssets: collections.reduce((sum, entry) => sum + entry.review, 0),
    minimumCoveredCollections: collections.filter((entry) => entry.minimumReached).length,
    recommendedCoveredCollections: collections.filter((entry) => entry.recommendedReached).length,
    reviewFirstCollections: collections.filter((entry) => entry.nextAction === 'review-first').length,
    searchCollections: collections.filter((entry) => entry.nextAction === 'search').length,
    completeCollections: collections.filter((entry) => entry.nextAction === 'complete').length,
    targetApprovedAssets: collections.length * recommended,
    collections
  });
}

const totalCollections = channelReports.reduce((sum, channel) => sum + channel.collectionCount, 0);
const approvedAssets = channelReports.reduce((sum, channel) => sum + channel.approvedAssets, 0);
const reviewAssets = channelReports.reduce((sum, channel) => sum + channel.reviewAssets, 0);
const targetApprovedAssets = totalCollections * recommended;
const report = {
  version: 2,
  generatedAt: new Date().toISOString(),
  goals,
  totals: {
    channels: channelReports.length,
    collections: totalCollections,
    approvedAssets,
    reviewAssets,
    targetApprovedAssets,
    approvedCompletionPercentage: targetApprovedAssets ? Math.round((approvedAssets / targetApprovedAssets) * 1000) / 10 : 0,
    minimumCoveredCollections: channelReports.reduce((sum, channel) => sum + channel.minimumCoveredCollections, 0),
    recommendedCoveredCollections: channelReports.reduce((sum, channel) => sum + channel.recommendedCoveredCollections, 0),
    reviewFirstCollections: channelReports.reduce((sum, channel) => sum + channel.reviewFirstCollections, 0),
    searchCollections: channelReports.reduce((sum, channel) => sum + channel.searchCollections, 0),
    completeCollections: channelReports.reduce((sum, channel) => sum + channel.completeCollections, 0)
  },
  channels: channelReports,
  nextReview: expansion.nextReview,
  nextBatch: expansion.nextBatch
};

const outputDirectory = path.join(root, 'reports');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'channel-coverage.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# Kanal-Arsenal-Abdeckung', '',
  `Erzeugt: ${report.generatedAt}`, '',
  `- Kanäle: **${report.totals.channels}**`,
  `- Sammlungen: **${report.totals.collections}**`,
  `- Freigegebene Kanal-Assets: **${report.totals.approvedAssets}/${report.totals.targetApprovedAssets}**`,
  `- Offene Review-Assets: **${report.totals.reviewAssets}**`,
  `- Gesamtfortschritt: **${report.totals.approvedCompletionPercentage} %**`,
  `- Mindestabdeckung erreicht: **${report.totals.minimumCoveredCollections}/${report.totals.collections} Sammlungen**`,
  `- Review zuerst: **${report.totals.reviewFirstCollections} Sammlungen**`,
  `- Weitere Suche nötig: **${report.totals.searchCollections} Sammlungen**`,
  `- Empfohlenes Ziel erreicht: **${report.totals.completeCollections} Sammlungen**`, '',
  '## Kanäle',
  ...channelReports.flatMap((channel) => [
    '', `### ${channel.label}`,
    `- Freigegeben: **${channel.approvedAssets}/${channel.targetApprovedAssets}**`,
    `- Review: **${channel.reviewAssets}**`,
    `- Mindestabdeckung: **${channel.minimumCoveredCollections}/${channel.collectionCount} Sammlungen**`,
    `- Review zuerst: **${channel.reviewFirstCollections}**`,
    `- Weitere Suche: **${channel.searchCollections}**`,
    '',
    '| Sammlung | Freigegeben | Review | Aktion | Such-Lücke | Medien-Lücke | Primärquelle |',
    '|---|---:|---:|---|---:|---|---|',
    ...channel.collections.map((entry) => `| ${entry.label} | ${entry.approved} | ${entry.review} | ${actionLabel(entry.nextAction)} | ${entry.searchGap} | ${mediaGapLabel(entry)} | ${entry.providerPriority[0] ? providerLabel(entry.providerPriority[0]) : '–'} |`)
  ]),
  '',
  '## Nächste Review-Aufgaben',
  ...(report.nextReview.length ? report.nextReview.slice(0, 20).map((entry) => `- ${entry.channel} / ${entry.collectionLabel}: ${entry.review} Review-Kandidaten bei ${entry.approved}/${entry.target} Freigaben`) : ['- Keine priorisierten Review-Aufgaben.']),
  '',
  '## Nächste Suchaufgaben',
  ...(report.nextBatch.length ? report.nextBatch.map((entry) => `- ${entry.channel} / ${entry.collectionLabel}: ${entry.mediaType} · ${providerLabel(entry.primaryProvider)}${entry.fallbackProviders.length ? ` → ${entry.fallbackProviders.map(providerLabel).join(' → ')}` : ''} · Such-Lücke ${entry.gaps.searchCandidates}`) : ['- Keine priorisierten Suchaufgaben.'])
].join('\n');
fs.writeFileSync(path.join(outputDirectory, 'channel-coverage.md'), `${markdown}\n`);
console.log(`Kanal-Abdeckung: ${approvedAssets}/${targetApprovedAssets} freigegeben (${report.totals.approvedCompletionPercentage} %), ${reviewAssets} im Review.`);
console.log(`${report.totals.reviewFirstCollections} Sammlungen zuerst prüfen · ${report.totals.searchCollections} Sammlungen weiter suchen.`);

function actionLabel(value) {
  return ({ 'review-first': 'Review zuerst', search: 'Suchen', complete: 'Ziel erreicht' })[value] ?? value;
}
function mediaGapLabel(entry) {
  const parts = [];
  if (entry.videoGap) parts.push(`Video ${entry.videoGap}`);
  if (entry.photoGap) parts.push(`Foto ${entry.photoGap}`);
  return parts.join(' + ') || '–';
}
function providerLabel(value) {
  return ({ pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia' })[value] ?? value;
}
function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
