import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_GOALS = {
  minimumApprovedPerCollection: 4,
  recommendedApprovedPerCollection: 8,
  minimumVideosPerCollection: 2,
  minimumPhotosPerCollection: 2
};

export function buildExpansionPlan({ channels, assets, goals = DEFAULT_GOALS }) {
  const collections = [];
  const channelsSummary = [];

  for (const channel of channels) {
    const rows = [];
    for (const collection of channel.collections ?? []) {
      const channelTag = channel.channelTag;
      const collectionTag = `collection-${collection.id}`;
      const matching = assets.filter((asset) => (asset.tags ?? []).includes(channelTag) && (asset.tags ?? []).includes(collectionTag));
      const approved = matching.filter((asset) => asset.status === 'approved');
      const review = matching.filter((asset) => ['inbox', 'review'].includes(asset.status));
      const restricted = matching.filter((asset) => asset.status === 'restricted');
      const approvedVideos = approved.filter((asset) => asset.type === 'video').length;
      const approvedPhotos = approved.filter((asset) => asset.type === 'image').length;
      const candidateVideos = matching.filter((asset) => asset.type === 'video').length;
      const candidatePhotos = matching.filter((asset) => asset.type === 'image').length;
      const approvedGap = Math.max(0, goals.recommendedApprovedPerCollection - approved.length);
      const minimumGap = Math.max(0, goals.minimumApprovedPerCollection - approved.length);
      const videoGap = Math.max(0, goals.minimumVideosPerCollection - approvedVideos);
      const photoGap = Math.max(0, goals.minimumPhotosPerCollection - approvedPhotos);
      const searchGap = Math.max(0, approvedGap - review.length);
      const providerPriority = providerPriorityFor({ searchGap, videoGap, photoGap, candidateVideos, candidatePhotos });
      const nextAction = approvedGap === 0 && videoGap === 0 && photoGap === 0
        ? 'complete'
        : review.length > 0 && searchGap === 0
          ? 'review-first'
          : 'search';
      const priorityScore = (minimumGap * 100) + (searchGap * 12) + (approvedGap * 4) + (videoGap * 4) + (photoGap * 4) - Math.min(review.length, 8);

      const row = {
        channel: channel.id,
        channelLabel: channel.label,
        collection: collection.id,
        collectionLabel: collection.label,
        category: channel.primaryCategory,
        queries: collection.queries ?? [],
        reviewNotes: collection.reviewNotes ?? '',
        counts: {
          totalCandidates: matching.length,
          approved: approved.length,
          review: review.length,
          restricted: restricted.length,
          approvedVideos,
          approvedPhotos,
          candidateVideos,
          candidatePhotos
        },
        gaps: {
          approved: approvedGap,
          minimumApproved: minimumGap,
          videos: videoGap,
          photos: photoGap,
          searchCandidates: searchGap
        },
        nextAction,
        providerPriority,
        priorityScore,
        complete: nextAction === 'complete'
      };
      collections.push(row);
      rows.push(row);
    }

    const approved = rows.reduce((sum, row) => sum + row.counts.approved, 0);
    const candidates = rows.reduce((sum, row) => sum + row.counts.totalCandidates, 0);
    const target = rows.length * goals.recommendedApprovedPerCollection;
    channelsSummary.push({
      id: channel.id,
      label: channel.label,
      collections: rows.length,
      candidates,
      approved,
      review: rows.reduce((sum, row) => sum + row.counts.review, 0),
      target,
      gap: Math.max(0, target - approved),
      completionPercent: target ? Math.min(100, Math.round((approved / target) * 100)) : 100,
      completeCollections: rows.filter((row) => row.complete).length,
      reviewFirstCollections: rows.filter((row) => row.nextAction === 'review-first').length,
      searchCollections: rows.filter((row) => row.nextAction === 'search').length,
      topPriorities: [...rows].filter((row) => row.nextAction === 'search').sort(comparePriority).slice(0, 5).map((row) => row.collection)
    });
  }

  const ordered = [...collections].sort(comparePriority);
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    goals,
    summary: {
      channels: channelsSummary.length,
      collections: collections.length,
      candidates: collections.reduce((sum, row) => sum + row.counts.totalCandidates, 0),
      approved: collections.reduce((sum, row) => sum + row.counts.approved, 0),
      review: collections.reduce((sum, row) => sum + row.counts.review, 0),
      target: collections.length * goals.recommendedApprovedPerCollection,
      completeCollections: collections.filter((row) => row.complete).length,
      reviewFirstCollections: collections.filter((row) => row.nextAction === 'review-first').length,
      searchCollections: collections.filter((row) => row.nextAction === 'search').length
    },
    channels: channelsSummary,
    priorities: ordered,
    nextReview: ordered.filter((row) => row.nextAction === 'review-first').map((row) => ({
      channel: row.channel,
      collection: row.collection,
      collectionLabel: row.collectionLabel,
      approved: row.counts.approved,
      review: row.counts.review,
      target: goals.recommendedApprovedPerCollection
    })),
    nextBatch: ordered.filter((row) => row.nextAction === 'search' && row.gaps.searchCandidates > 0).slice(0, 20).map((row) => ({
      channel: row.channel,
      collection: row.collection,
      collectionLabel: row.collectionLabel,
      approved: row.counts.approved,
      review: row.counts.review,
      target: goals.recommendedApprovedPerCollection,
      gaps: row.gaps,
      providers: row.providerPriority,
      queries: row.queries
    }))
  };
}

function providerPriorityFor({ searchGap, videoGap, photoGap, candidateVideos, candidatePhotos }) {
  if (searchGap <= 0) return [];
  const result = [];
  if (videoGap > 0 || candidateVideos < 2) result.push('pexels', 'pixabay');
  if (photoGap > 0 || candidatePhotos < 2) result.push('unsplash', 'openverse', 'wikimedia');
  if (!result.length) result.push('pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia');
  return [...new Set(result)];
}

function comparePriority(a, b) {
  const actionRank = { search: 0, 'review-first': 1, complete: 2 };
  return (actionRank[a.nextAction] ?? 9) - (actionRank[b.nextAction] ?? 9) || b.priorityScore - a.priorityScore || a.counts.approved - b.counts.approved || a.counts.totalCandidates - b.counts.totalCandidates || a.channelLabel.localeCompare(b.channelLabel, 'de') || a.collectionLabel.localeCompare(b.collectionLabel, 'de');
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function csv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }

function main() {
  const root = process.cwd();
  const index = readJson(path.join(root, 'catalog/channels/index.json'));
  const channels = (index.files ?? []).map((file) => readJson(path.join(root, file)));
  const catalog = readJson(path.join(root, 'catalog/assets.json'));
  const goals = { ...DEFAULT_GOALS, ...(index.goals ?? {}) };
  const plan = buildExpansionPlan({ channels, assets: catalog.assets ?? [], goals });
  const reports = path.join(root, 'reports');
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, 'arsenal-expansion-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);
  const rows = [['Kanal','Sammlung','Aktion','Kandidaten','Freigegeben','Review','Such-Lücke','Video-Lücke','Foto-Lücke','Ziel-Lücke','Prioritätsquellen']];
  for (const item of plan.priorities) rows.push([item.channelLabel,item.collectionLabel,item.nextAction,item.counts.totalCandidates,item.counts.approved,item.counts.review,item.gaps.searchCandidates,item.gaps.videos,item.gaps.photos,item.gaps.approved,item.providerPriority.join(' + ')]);
  fs.writeFileSync(path.join(reports, 'arsenal-expansion-plan.csv'), `${rows.map((row) => row.map(csv).join(',')).join('\n')}\n`);
  console.log(`Ausbauplan: ${plan.summary.approved}/${plan.summary.target} freigegeben · ${plan.summary.review} im Review · ${plan.summary.candidates} Kandidaten.`);
  console.log(`${plan.summary.reviewFirstCollections} Sammlungen zuerst prüfen · ${plan.summary.searchCollections} Sammlungen benötigen weitere Suche.`);
  console.log('Berichte: reports/arsenal-expansion-plan.json und reports/arsenal-expansion-plan.csv');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
