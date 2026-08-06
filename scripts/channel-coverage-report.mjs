import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const index = readJson('catalog/channels/index.json');
const searchIndex = readJson('catalog/search-index.json');
const channels = index.files.map(readJson);
const recommended = Number(index.goals?.recommendedApprovedPerCollection ?? 8);
const minimum = Number(index.goals?.minimumApprovedPerCollection ?? 4);
const records = searchIndex.records ?? [];
const channelReports = [];

for (const channel of channels) {
  const collections = channel.collections.map((collection) => {
    const channelTag = channel.channelTag;
    const collectionTag = `collection-${collection.id}`;
    const assets = records.filter((record) => record.tags.includes(channelTag) && record.tags.includes(collectionTag));
    const approved = assets.filter((record) => record.status === 'approved');
    const review = assets.filter((record) => ['inbox', 'review'].includes(record.status));
    const restricted = assets.filter((record) => ['restricted', 'archived'].includes(record.status));
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
      assetIds: assets.map((record) => record.id)
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
    targetApprovedAssets: collections.length * recommended,
    collections
  });
}

const totalCollections = channelReports.reduce((sum, channel) => sum + channel.collectionCount, 0);
const approvedAssets = channelReports.reduce((sum, channel) => sum + channel.approvedAssets, 0);
const reviewAssets = channelReports.reduce((sum, channel) => sum + channel.reviewAssets, 0);
const targetApprovedAssets = totalCollections * recommended;
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  goals: { minimumApprovedPerCollection: minimum, recommendedApprovedPerCollection: recommended },
  totals: {
    channels: channelReports.length,
    collections: totalCollections,
    approvedAssets,
    reviewAssets,
    targetApprovedAssets,
    approvedCompletionPercentage: targetApprovedAssets ? Math.round((approvedAssets / targetApprovedAssets) * 1000) / 10 : 0,
    minimumCoveredCollections: channelReports.reduce((sum, channel) => sum + channel.minimumCoveredCollections, 0),
    recommendedCoveredCollections: channelReports.reduce((sum, channel) => sum + channel.recommendedCoveredCollections, 0)
  },
  channels: channelReports
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
  `- Mindestabdeckung erreicht: **${report.totals.minimumCoveredCollections}/${report.totals.collections} Sammlungen**`, '',
  '## Kanäle',
  ...channelReports.flatMap((channel) => [
    '', `### ${channel.label}`,
    `- Freigegeben: **${channel.approvedAssets}/${channel.targetApprovedAssets}**`,
    `- Review: **${channel.reviewAssets}**`,
    `- Mindestabdeckung: **${channel.minimumCoveredCollections}/${channel.collectionCount} Sammlungen**`,
    '',
    '| Sammlung | Freigegeben | Review | Fehlt bis Minimum |',
    '|---|---:|---:|---:|',
    ...channel.collections.map((entry) => `| ${entry.label} | ${entry.approved} | ${entry.review} | ${entry.missingToMinimum} |`)
  ])
].join('\n');
fs.writeFileSync(path.join(outputDirectory, 'channel-coverage.md'), `${markdown}\n`);
console.log(`Kanal-Abdeckung: ${approvedAssets}/${targetApprovedAssets} freigegeben (${report.totals.approvedCompletionPercentage} %), ${reviewAssets} im Review.`);

function readJson(relative) { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
