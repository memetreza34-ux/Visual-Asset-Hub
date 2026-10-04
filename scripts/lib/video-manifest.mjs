export function buildUnifiedVideoManifest({ visualPlan, productionPlan, flowImportReport, realManifest, timings = null } = {}) {
  if (!visualPlan?.beats?.length) throw new Error('visualPlan.beats fehlt.');
  if (!productionPlan?.images?.length) throw new Error('productionPlan.images fehlt.');
  if (!flowImportReport?.items?.length) throw new Error('flowImportReport.items fehlt.');

  const aiByBeat = new Map();
  let cover = null;
  for (const item of flowImportReport.items) {
    const normalized = {
      source_mode: 'ai-generated',
      image_number: item.image_number,
      beat_id: item.beat_id,
      role: item.role,
      local_file: joinOutput(flowImportReport.output_dir, item.target),
      sha256: item.sha256 ?? null,
      fit: 'cover',
      mute: true
    };
    if (item.role === 'selected-cover' || Number(item.image_number) === 1) cover = normalized;
    if (item.beat_id) aiByBeat.set(item.beat_id, normalized);
  }

  const realByBeat = new Map();
  for (const binding of realManifest?.bindings ?? []) {
    if (binding?.beat_id) realByBeat.set(binding.beat_id, binding);
  }
  const timingByBeat = timingMap(timings);
  const items = [];
  const missing = [];

  for (const beat of visualPlan.beats) {
    const decision = beat.source_decision ?? { mode: 'ai-first' };
    const ai = aiByBeat.get(beat.id) ?? null;
    const real = realByBeat.get(beat.id) ?? null;
    const fallbackPlanned = (visualPlan.assets ?? []).some((asset) => asset.beat_id === beat.id && asset.priority === 'fallback');
    let selected = null;
    let status = 'ready';
    let requiredAction = null;

    if (decision.mode === 'real-first') {
      if (real?.status === 'ready' && real.local_file) {
        selected = normalizeReal(real);
      } else if (real?.status === 'manual-required') {
        status = 'manual-required';
        requiredAction = 'Provide the exact official/original source for this beat.';
      } else if (real?.status === 'review-required' && real.local_file) {
        status = 'review-required';
        requiredAction = 'Archive match found: check subject and license, then approve it with npm run real:review.';
      } else {
        status = fallbackPlanned ? 'fallback-generation-required' : 'unresolved';
        requiredAction = fallbackPlanned
          ? 'Real media is unavailable; generate the planned AI fallback for this beat or resolve a better real source.'
          : 'Resolve a usable real asset for this beat.';
      }
    } else if (ai?.local_file) {
      selected = ai;
    } else {
      status = 'missing-ai-image';
      requiredAction = 'Import the accepted Flow image for this beat.';
    }

    const timing = timingByBeat.get(beat.id) ?? null;
    const entry = {
      beat_id: beat.id,
      narration: beat.text,
      source_decision: decision,
      status,
      selected,
      ai_candidate: ai,
      real_candidate: real ? normalizeReal(real) : null,
      ai_fallback_planned: fallbackPlanned,
      timing,
      required_action: requiredAction
    };
    items.push(entry);
    if (status !== 'ready') missing.push({ beat_id: beat.id, status, required_action: requiredAction });
  }

  const allTimed = items.every((item) => item.timing?.start_seconds != null && item.timing?.duration_seconds != null);
  const readyAssets = missing.length === 0;
  return {
    version: 1,
    format: 'unified-video-asset-manifest',
    status: readyAssets ? (allTimed ? 'render-handoff-ready' : 'assets-ready-awaiting-voice-timings') : 'needs-resolution',
    cover,
    summary: {
      beats: items.length,
      ready_beats: items.filter((item) => item.status === 'ready').length,
      missing_or_manual_beats: missing.length,
      all_beats_timed: allTimed,
      ai_selected: items.filter((item) => item.selected?.source_mode === 'ai-generated').length,
      real_selected: items.filter((item) => item.selected?.source_mode === 'real-media').length
    },
    items,
    missing,
    remotion_bindings: items.filter((item) => item.selected).map((item) => ({
      beat_id: item.beat_id,
      source_mode: item.selected.source_mode,
      local_file: item.selected.local_file,
      asset_type: item.selected.asset_type ?? 'image',
      placement: item.timing ? {
        start_seconds: item.timing.start_seconds,
        duration_seconds: item.timing.duration_seconds,
        fit: 'cover',
        mute: item.selected.mute ?? true
      } : {
        start_seconds: null,
        duration_seconds: null,
        fit: 'cover',
        mute: item.selected.mute ?? true
      }
    }))
  };
}

function normalizeReal(binding) {
  return {
    source_mode: 'real-media',
    beat_id: binding.beat_id,
    status: binding.status,
    asset_type: binding.asset_type,
    provider: binding.provider ?? null,
    provider_id: binding.provider_id ?? null,
    local_file: binding.local_file ?? null,
    source_url: binding.source_url ?? null,
    creator: binding.creator ?? null,
    attribution: binding.attribution ?? null,
    rights: binding.rights ?? null,
    mute: binding.placement?.mute ?? binding.asset_type === 'video',
    needs_additional_fill: Boolean(binding.needs_additional_fill)
  };
}

function timingMap(payload) {
  const map = new Map();
  for (const entry of payload?.beats ?? []) {
    const id = String(entry.beat_id ?? entry.id ?? '').trim();
    if (!id) continue;
    const start = numberOrNull(entry.start_seconds ?? entry.start);
    const duration = numberOrNull(entry.duration_seconds ?? entry.duration);
    map.set(id, { start_seconds: start, duration_seconds: duration });
  }
  return map;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function joinOutput(dir, target) {
  const base = String(dir ?? '').replace(/\\/g, '/').replace(/\/$/, '');
  return base ? `${base}/${target}` : target;
}
