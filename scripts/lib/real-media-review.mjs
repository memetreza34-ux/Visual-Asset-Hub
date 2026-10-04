import { assetIdentityKeys, buildTimelineBinding } from './real-media.mjs';

// Ablehnen ist auch nach einer Freigabe noch möglich.
const REJECTABLE = new Set(['review-required', 'ready']);

/** Gibt Treffer frei. IDs aus `exclude` (gleichzeitig abgelehnt) werden auch bei "all" übersprungen. */
export function approveBindings({ timeline, resolution = null, approve = [], exclude = [], now = new Date() }) {
  const pending = (timeline?.bindings ?? []).filter((binding) => binding.status === 'review-required');
  const skip = new Set(exclude);
  const wanted = new Set(approve.includes('all') ? pending.map((binding) => binding.beat_id) : approve);
  const approved = [];
  for (const binding of pending) {
    if (!wanted.has(binding.beat_id) || skip.has(binding.beat_id)) continue;
    binding.status = 'ready';
    binding.review = { decision: 'approved', reviewed_at: now.toISOString() };
    approved.push(binding.beat_id);
  }
  const unknown = approve.filter((id) => id !== 'all' && !skip.has(id) && !pending.some((binding) => binding.beat_id === id));
  syncResolution(resolution, timeline);
  return { approved, unknown };
}

export function findRejectable(timeline, beatId) {
  return (timeline?.bindings ?? []).find((binding) => binding.beat_id === beatId && REJECTABLE.has(binding.status) && binding.local_file) ?? null;
}

/**
 * Nächstbeste Alternative für einen abgelehnten Treffer: ladbar, nicht schon bei einem anderen Beat
 * im Einsatz und nicht früher für diesen Beat abgelehnt.
 */
export function nextAlternate({ binding, resolutionItem, bindings = [] }) {
  const used = new Set([...(binding.rejected_keys ?? []), ...assetIdentityKeys(binding)]);
  for (const other of bindings) {
    if (other === binding || other.status === 'rejected') continue;
    for (const key of assetIdentityKeys(other)) used.add(key);
  }
  return (resolutionItem?.alternates ?? []).find((alternate) => alternate.downloads?.length
    && !assetIdentityKeys(alternate).some((key) => used.has(key))) ?? null;
}

export function dropAlternate(resolutionItem, alternate) {
  if (resolutionItem?.alternates) resolutionItem.alternates = resolutionItem.alternates.filter((entry) => entry !== alternate);
}

/** Ersetzt den Treffer eines Beats durch die geladene Alternative; sie muss erneut geprüft werden. */
export function applyAlternate({ binding, resolutionItem = null, alternate, localFile, technical = null, now = new Date() }) {
  const previous = {
    provider: binding.provider,
    provider_id: binding.provider_id,
    title: binding.title ?? null,
    source_url: binding.source_url ?? null,
    local_file: binding.local_file,
    rejected_at: now.toISOString()
  };
  const rejectedKeys = [...new Set([...(binding.rejected_keys ?? []), ...assetIdentityKeys(binding)])];
  const rebuilt = buildTimelineBinding({
    item: { id: binding.id, beat_id: binding.beat_id, reason: binding.reason, asset_type: binding.asset_type, orientation: binding.orientation },
    selected: alternate,
    localFile,
    timing: {
      start_seconds: binding.placement?.start_seconds ?? null,
      duration_seconds: binding.placement?.requested_duration_seconds ?? binding.placement?.duration_seconds ?? null
    },
    defaultDuration: binding.placement?.duration_seconds ?? 4,
    technical
  });
  delete binding.review;
  Object.assign(binding, rebuilt, {
    status: 'review-required',
    review_required: true,
    selection_score: alternate.score ?? null,
    rejected_keys: rejectedKeys,
    replaced: [...(binding.replaced ?? []), previous]
  });
  if (resolutionItem) {
    dropAlternate(resolutionItem, alternate);
    resolutionItem.replaced = [...(resolutionItem.replaced ?? []), { ...previous, replaced_by: alternate.provider_id }];
    resolutionItem.selected = alternate;
    resolutionItem.status = 'review-required';
  }
  return binding;
}

export function rejectBinding({ binding, resolutionItem = null, now = new Date() }) {
  binding.status = 'rejected';
  binding.review = { decision: 'rejected', reviewed_at: now.toISOString() };
  if (resolutionItem) resolutionItem.status = 'rejected';
  return binding;
}

/** Überträgt Status aus dem Timeline-Manifest in real-media-resolution.json und zählt neu. */
export function syncResolution(resolution, timeline) {
  if (!resolution?.items) return;
  const byBeat = new Map((timeline?.bindings ?? []).map((binding) => [binding.beat_id, binding]));
  for (const item of resolution.items) {
    const binding = byBeat.get(item.beat_id);
    if (binding && ['ready', 'review-required', 'rejected'].includes(binding.status)) item.status = binding.status;
  }
  resolution.summary ??= {};
  for (const [key, status] of [['ready', 'ready'], ['review_required', 'review-required'], ['rejected', 'rejected']]) {
    resolution.summary[key] = resolution.items.filter((item) => item.status === status).length;
  }
}
