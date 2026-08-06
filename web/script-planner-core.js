export function createShotPlan({
  script,
  channel,
  channelData,
  records = [],
  keywordConfig,
  durationSeconds = 45,
  orientation = 'vertical',
  approvedOnly = false,
  maxAssetsPerScene = 3
}) {
  const cleanScript = requireText(script, 'Skript', 10, 20000);
  if (!channelData || channelData.id !== channel) throw new Error('Kanaldefinition fehlt oder passt nicht zur Auswahl.');
  if (!keywordConfig?.channels?.[channel]) throw new Error(`Keyword-Regeln für ${channel} fehlen.`);
  const duration = integer(durationSeconds, 10, 600, 'Dauer');
  const assetLimit = integer(maxAssetsPerScene, 1, 5, 'Asset-Limit');
  const scenes = splitScript(cleanScript);
  if (!scenes.length) throw new Error('Aus dem Skript konnten keine Szenen gebildet werden.');
  const timings = allocateDurations(scenes, duration);
  const stopWords = new Set((keywordConfig.stopWords ?? []).map(normalize).filter(Boolean));
  const rules = keywordConfig.channels[channel] ?? [];
  const collectionById = new Map((channelData.collections ?? []).map((item) => [item.id, item]));
  const preparedCollections = (channelData.collections ?? []).map((collection) => prepareCollection(collection, stopWords));
  const preparedRecords = records.map((record) => prepareRecord(record, stopWords));

  const plannedScenes = scenes.map((text, index) => {
    const normalized = normalize(text);
    const tokens = contentTokens(text, stopWords);
    const collectionScores = new Map();

    for (const collection of preparedCollections) {
      let score = tokenOverlap(tokens, collection.tokens) * 1.4;
      if (normalized.includes(collection.labelNormalized)) score += 7;
      for (const phrase of collection.phrases) if (phrase.length >= 4 && normalized.includes(phrase)) score += 2.5;
      if (score > 0) collectionScores.set(collection.id, score);
    }

    for (const rule of rules) {
      const matchedTerms = (rule.terms ?? []).filter((term) => phraseMatches(normalized, tokens, term));
      if (!matchedTerms.length) continue;
      const boost = Number(rule.weight) || 8;
      for (const collectionId of rule.collections ?? []) {
        if (!collectionById.has(collectionId)) continue;
        collectionScores.set(collectionId, (collectionScores.get(collectionId) ?? 0) + boost + Math.min(4, matchedTerms.length - 1));
      }
    }

    const collections = [...collectionScores.entries()]
      .map(([id, score]) => ({ collection: collectionById.get(id), score: round(score, 2) }))
      .filter((item) => item.collection)
      .sort((a, b) => b.score - a.score || a.collection.label.localeCompare(b.collection.label, 'de'))
      .slice(0, 3);

    if (!collections.length) {
      const fallback = preparedCollections
        .map((collection) => ({ collection: collectionById.get(collection.id), score: tokenOverlap(tokens, collection.tokens) }))
        .sort((a, b) => b.score - a.score)[0];
      if (fallback?.collection) collections.push({ collection: fallback.collection, score: round(fallback.score, 2) });
    }

    const topCollectionIds = collections.map((item) => item.collection.id);
    const assets = preparedRecords
      .filter(({ record }) => !approvedOnly || record.status === 'approved')
      .map((prepared) => ({ prepared, score: scoreAsset(prepared, { tokens, normalized, orientation, channelData, topCollectionIds }) }))
      .filter((item) => item.score > 1.5)
      .sort((a, b) => b.score - a.score || statusRank(b.prepared.record.status) - statusRank(a.prepared.record.status) || (b.prepared.record.qualityRating ?? 0) - (a.prepared.record.qualityRating ?? 0))
      .slice(0, assetLimit)
      .map(({ prepared, score }) => ({
        id: prepared.record.id,
        title: prepared.record.title,
        filename: prepared.record.filename,
        type: prepared.record.type,
        status: prepared.record.status,
        orientation: prepared.record.orientation,
        preview: prepared.record.preview,
        source: prepared.record.source,
        sourcePage: prepared.record.sourcePage,
        licenseStatus: prepared.record.licenseStatus,
        attributionText: prepared.record.attributionText,
        qualityRating: prepared.record.qualityRating,
        tags: prepared.record.tags ?? [],
        score: round(score, 2)
      }));

    const primaryCollection = collections[0]?.collection ?? null;
    const approvedAssets = assets.filter((asset) => asset.status === 'approved').length;
    return {
      scene: index + 1,
      startSeconds: timings[index].start,
      endSeconds: timings[index].end,
      durationSeconds: timings[index].duration,
      text,
      recommendedMediaType: inferMediaType(text, channel),
      recommendedOrientation: orientation,
      collections: collections.map((item) => ({
        id: item.collection.id,
        label: item.collection.label,
        score: item.score,
        query: item.collection.queries?.[0] ?? '',
        alternativeQueries: (item.collection.queries ?? []).slice(1),
        reviewNotes: item.collection.reviewNotes ?? ''
      })),
      assets,
      approvedAssets,
      needsSearch: assets.length === 0 || approvedAssets === 0,
      suggestedPexelsQuery: primaryCollection?.queries?.[0] ?? buildFallbackQuery(tokens, channelData.label),
      warning: assets.some((asset) => asset.status !== 'approved')
        ? 'Vorschläge enthalten ungeprüfte Assets. Vor Veröffentlichung vollständig prüfen.'
        : null
    };
  });

  const matchedScenes = plannedScenes.filter((scene) => scene.assets.length > 0).length;
  const approvedScenes = plannedScenes.filter((scene) => scene.approvedAssets > 0).length;
  const missingCollections = unique(plannedScenes.filter((scene) => scene.needsSearch).flatMap((scene) => scene.collections.slice(0, 1).map((item) => item.id)));
  return {
    format: 'visual-asset-hub-shot-plan',
    version: 1,
    createdAt: new Date().toISOString(),
    channel: { id: channelData.id, label: channelData.label },
    settings: { durationSeconds: duration, orientation, approvedOnly, maxAssetsPerScene: assetLimit },
    summary: {
      sceneCount: plannedScenes.length,
      matchedScenes,
      approvedScenes,
      coveragePercentage: Math.round(100 * matchedScenes / plannedScenes.length),
      approvedCoveragePercentage: Math.round(100 * approvedScenes / plannedScenes.length),
      missingSceneCount: plannedScenes.length - matchedScenes,
      missingCollections
    },
    scenes: plannedScenes
  };
}

export function splitScript(value) {
  const text = String(value ?? '').replace(/\r/g, '').trim();
  if (!text) return [];
  const raw = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/u))
    .map((item) => item.replace(/^[-–—•\d.)\s]+/, '').trim())
    .filter(Boolean);
  const merged = [];
  for (const item of raw) {
    if (wordCount(item) < 4 && merged.length && merged[merged.length - 1].length + item.length < 260) merged[merged.length - 1] += ` ${item}`;
    else merged.push(item);
  }
  if (merged.length <= 20) return merged;
  const compacted = [];
  const groupSize = Math.ceil(merged.length / 20);
  for (let index = 0; index < merged.length; index += groupSize) compacted.push(merged.slice(index, index + groupSize).join(' '));
  return compacted;
}

export function allocateDurations(scenes, totalSeconds) {
  const count = scenes.length;
  if (!count) return [];
  const floor = Math.min(2, totalSeconds / count);
  const weights = scenes.map((scene) => Math.max(1, wordCount(scene)));
  const remaining = Math.max(0, totalSeconds - floor * count);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const durations = weights.map((weight) => floor + remaining * weight / weightTotal);
  const rounded = durations.map((value) => round(value, 1));
  const difference = round(totalSeconds - rounded.reduce((sum, value) => sum + value, 0), 1);
  rounded[rounded.length - 1] = round(Math.max(0.1, rounded[rounded.length - 1] + difference), 1);
  let cursor = 0;
  return rounded.map((duration) => {
    const start = round(cursor, 1);
    cursor += duration;
    return { start, end: round(cursor, 1), duration };
  });
}

export function planToCsv(plan) {
  const rows = [['Szene', 'Start', 'Ende', 'Dauer', 'Sprechtext', 'Medientyp', 'Sammlung', 'Asset-ID', 'Asset-Titel', 'Status', 'Pexels-Suche', 'Warnung']];
  for (const scene of plan.scenes ?? []) {
    const assets = scene.assets?.length ? scene.assets : [null];
    for (const asset of assets) rows.push([
      scene.scene,
      scene.startSeconds,
      scene.endSeconds,
      scene.durationSeconds,
      scene.text,
      scene.recommendedMediaType,
      scene.collections?.[0]?.label ?? '',
      asset?.id ?? '',
      asset?.title ?? '',
      asset?.status ?? '',
      scene.suggestedPexelsQuery ?? '',
      scene.warning ?? ''
    ]);
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

export function planToMarkdown(plan) {
  const lines = [
    '# Visual Asset Hub Shotlist', '',
    `- Kanal: **${plan.channel?.label ?? ''}**`,
    `- Szenen: **${plan.summary?.sceneCount ?? 0}**`,
    `- Bibliotheksabdeckung: **${plan.summary?.coveragePercentage ?? 0} %**`,
    `- Freigegebene Abdeckung: **${plan.summary?.approvedCoveragePercentage ?? 0} %**`,
    `- Zieldauer: **${plan.settings?.durationSeconds ?? 0} Sekunden**`, ''
  ];
  for (const scene of plan.scenes ?? []) {
    lines.push(`## Szene ${scene.scene} · ${scene.startSeconds}–${scene.endSeconds} s`, '', `**Sprechtext:** ${scene.text}`, '', `**Empfohlen:** ${scene.recommendedMediaType} · ${scene.recommendedOrientation}`, '');
    if (scene.collections?.length) lines.push(`**Sammlung:** ${scene.collections.map((item) => item.label).join(', ')}`, '');
    if (scene.assets?.length) {
      lines.push('**Asset-Vorschläge:**');
      for (const asset of scene.assets) lines.push(`- ${asset.id} – ${asset.title} (${asset.status})`);
      lines.push('');
    } else lines.push(`**Fehlendes Motiv:** Pexels-Suche \`${scene.suggestedPexelsQuery}\``, '');
    if (scene.warning) lines.push(`> ${scene.warning}`, '');
  }
  return `${lines.join('\n')}\n`;
}

export function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9%€$]+/g, ' ')
    .trim();
}

function prepareCollection(collection, stopWords) {
  const phrases = [collection.label, ...(collection.tags ?? []), ...(collection.queries ?? [])].map(normalize).filter(Boolean);
  return {
    id: collection.id,
    labelNormalized: normalize(collection.label),
    phrases,
    tokens: new Set(contentTokens(phrases.join(' '), stopWords))
  };
}

function prepareRecord(record, stopWords) {
  const text = record.searchableText || [record.title, record.description, ...(record.tags ?? []), ...(record.searchAliases ?? [])].join(' ');
  return { record, normalized: normalize(text), tokens: new Set(contentTokens(text, stopWords)) };
}

function scoreAsset(prepared, { tokens, normalized, orientation, channelData, topCollectionIds }) {
  const { record } = prepared;
  let score = tokenOverlap(tokens, prepared.tokens) * 1.2;
  if ((record.tags ?? []).includes(channelData.channelTag)) score += 5;
  topCollectionIds.forEach((id, index) => {
    if ((record.tags ?? []).includes(`collection-${id}`)) score += [12, 7, 4][index] ?? 2;
  });
  if (record.orientation === orientation || (orientation === 'vertical' && record.orientation === 'portrait') || (orientation === 'horizontal' && record.orientation === 'landscape')) score += 3;
  if (record.status === 'approved') score += 4;
  else if (record.status === 'review') score += 1;
  else if (record.status === 'restricted' || record.status === 'archived') score -= 10;
  score += Math.max(0, Number(record.qualityRating) || 0) * 0.45;
  if (normalized.length > 5 && prepared.normalized.includes(normalized)) score += 4;
  return score;
}

function phraseMatches(sceneNormalized, sceneTokens, term) {
  const phrase = normalize(term);
  if (!phrase) return false;
  if (sceneNormalized.includes(phrase)) return true;
  const terms = phrase.split(' ').filter(Boolean);
  return terms.length > 1 && terms.every((token) => sceneTokens.includes(token));
}

function contentTokens(value, stopWords) {
  return unique(normalize(value).split(' ').filter((token) => token.length >= 2 && !stopWords.has(token)));
}

function tokenOverlap(left, right) {
  let count = 0;
  for (const token of left) if (right.has(token)) count += token.length >= 7 ? 1.5 : 1;
  return count;
}

function inferMediaType(text, channel) {
  const normalized = normalize(text);
  if (/[0-9%€$]/.test(text) || /(steigt|fallt|vergleich|statistik|prozent|zahl|kurs|chart|entwicklung)/.test(normalized)) return 'Grafik oder Screen-Recording';
  if (channel === 'combat-sports' || /(trainiert|schlagt|kick|rennt|kampft|bewegt|montiert|misst|verdrahtet)/.test(normalized)) return 'B-Roll-Video';
  if (/(erklar|definition|grund|warum|fazit|regel)/.test(normalized)) return 'B-Roll plus Textgrafik';
  return 'B-Roll oder Bild';
}

function buildFallbackQuery(tokens, channelLabel) {
  return [...tokens.slice(0, 5), channelLabel].filter(Boolean).join(' ');
}

function statusRank(status) {
  return ({ approved: 4, review: 3, inbox: 2, restricted: 1, archived: 0 })[status] ?? 0;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function unique(values) { return [...new Set(values)]; }
function wordCount(value) { return normalize(value).split(' ').filter(Boolean).length; }
function round(value, digits) { const factor = 10 ** digits; return Math.round(value * factor) / factor; }
function requireText(value, label, min, max) { const text = String(value ?? '').trim(); if (text.length < min || text.length > max) throw new Error(`${label} muss zwischen ${min} und ${max} Zeichen lang sein.`); return text; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
