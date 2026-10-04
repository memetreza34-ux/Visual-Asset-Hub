/**
 * Setzt Review-Entscheidungen in remotion-real-media.json (und optional real-media-resolution.json).
 * Nur Bindings mit Status review-required werden verändert.
 */
export function applyReviewDecisions({ timeline, resolution = null, approve = [], reject = [], now = new Date() }) {
  const bindings = timeline?.bindings ?? [];
  const pending = bindings.filter((binding) => binding.status === 'review-required');
  const approveAll = approve.includes('all');
  const approveSet = new Set(approveAll ? pending.map((binding) => binding.beat_id) : approve);
  const rejectSet = new Set(reject);
  for (const id of rejectSet) approveSet.delete(id);

  const result = { approved: [], rejected: [], unknown: [] };
  const reviewedAt = now.toISOString();

  for (const binding of pending) {
    const id = binding.beat_id;
    if (rejectSet.has(id)) {
      binding.status = 'rejected';
      binding.review = { decision: 'rejected', reviewed_at: reviewedAt };
      result.rejected.push(id);
    } else if (approveSet.has(id)) {
      binding.status = 'ready';
      binding.review = { decision: 'approved', reviewed_at: reviewedAt };
      result.approved.push(id);
    }
  }

  const known = new Set(pending.map((binding) => binding.beat_id));
  result.unknown = [...new Set([...(approveAll ? [] : approve), ...reject])].filter((id) => !known.has(id));

  if (resolution?.items) {
    for (const item of resolution.items) {
      if (result.approved.includes(item.beat_id) && item.status === 'review-required') item.status = 'ready';
      if (result.rejected.includes(item.beat_id) && item.status === 'review-required') item.status = 'rejected';
    }
    if (resolution.summary) {
      resolution.summary.ready = resolution.items.filter((item) => item.status === 'ready').length;
      resolution.summary.review_required = resolution.items.filter((item) => item.status === 'review-required').length;
      resolution.summary.rejected = resolution.items.filter((item) => item.status === 'rejected').length;
    }
  }
  return result;
}
