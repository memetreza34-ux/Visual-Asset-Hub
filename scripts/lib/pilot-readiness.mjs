export const YOUTUBE_PILOT_POLICY = {
  id: 'youtube-2min-pilot-v1',
  target_duration_seconds: [90, 150],
  cover_max_seconds: 2.2,
  cover_target_seconds: 2.0,
  intro_window_seconds: 10,
  intro_minimum_visual_starts: 4,
  minimum_primary_visuals_per_100_seconds: 24,
  target_primary_visuals_per_100_seconds: [28, 42],
  review_hold_above_seconds: 5.8,
  hard_maximum_hold_seconds: 8.0,
  recommended_max_words_per_beat: 10
};

export function buildCoverBrief(plan, { title, coverText } = {}) {
  const anchors = [];
  for (const asset of plan?.assets ?? []) {
    const value = asset?.scene_card?.topic_anchor;
    if (asset?.priority === 'fallback' || !value) continue;
    if (!anchors.includes(value)) anchors.push(value);
  }
  for (const beat of plan?.beats ?? []) {
    const value = String(beat?.text ?? '').trim();
    if (value && !anchors.includes(value)) anchors.push(value);
  }
  return {
    source: 'title+cover-text+whole-video-story-spine',
    title: String(title ?? '').trim(),
    cover_text: String(coverText ?? '').trim(),
    story_spine: anchors.slice(0, 6),
    rule: 'The cover must communicate the strongest promise, conflict or curiosity of the whole video. Do not reduce the cover concept to the literal first narration sentence.'
  };
}

export function applyPilotCoverEnhancements(result, plan, { title, coverText } = {}) {
  if (!result?.production_plan?.images?.length) return result;
  const brief = buildCoverBrief(plan, { title, coverText });
  const context = [
    'WHOLE-VIDEO COVER BRIEF — REQUIRED.',
    `Video title: "${brief.title}".`,
    `Exact cover text: "${brief.cover_text}".`,
    `Story spine: ${brief.story_spine.join(' | ')}.`,
    'Build the cover from the strongest promise, conflict or curiosity across the whole video, not merely from the first narration sentence.',
    'Keep one dominant idea, one dominant subject/relationship and a clean text zone; do not turn the cover into a collage.'
  ].join(' ');

  result.production_plan.cover_strategy = brief;
  result.production_plan.pilot_policy = YOUTUBE_PILOT_POLICY;
  result.production_plan.images[0].planned_hold_seconds = YOUTUBE_PILOT_POLICY.cover_target_seconds;
  result.production_plan.images[0].compiled_prompt = `${context} ${result.production_plan.images[0].compiled_prompt}`;
  if (result.production_plan.images[0].scene_card) {
    result.production_plan.images[0].scene_card.planned_hold_seconds = YOUTUBE_PILOT_POLICY.cover_target_seconds;
  }

  const jobs = result.generation_queue?.stage_1_cover?.jobs ?? [];
  for (const job of jobs) job.prompt = `${context} ${job.prompt}`;
  result.master_prompt = `${context}\n\n${result.master_prompt}`;
  return result;
}

export function analyzePilotReadiness({ visualPlan, productionPlan, targetDurationSeconds } = {}) {
  if (!visualPlan?.input?.text) throw new Error('visualPlan mit input.text ist erforderlich.');
  if (!productionPlan?.images?.length) throw new Error('productionPlan mit images ist erforderlich.');

  const words = String(visualPlan.input.text).trim().split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Number(targetDurationSeconds) > 0
    ? Number(targetDurationSeconds)
    : Math.round((words / 2.35) * 10) / 10;
  const primaryAssets = (visualPlan.assets ?? []).filter((asset) => {
    if (asset.priority === 'fallback') return false;
    return asset.source_mode === 'ai-generated' || asset.source_mode === 'stock-or-real';
  });
  const rate = estimatedDuration > 0 ? Math.round((primaryAssets.length / estimatedDuration) * 1000) / 10 : 0;
  const coverHold = Number(productionPlan.images[0]?.planned_hold_seconds ?? Infinity);
  const maxBeatHold = Math.max(0, ...(visualPlan.beats ?? []).map((beat) => Number(beat.estimated_hold_seconds ?? 0)));
  const introStarts = estimateIntroStarts(visualPlan, coverHold, YOUTUBE_PILOT_POLICY.intro_window_seconds);
  const errors = [];
  const warnings = [];

  if (!productionPlan.cover_strategy?.story_spine?.length) errors.push('Cover-Strategie nutzt noch nicht die ganze Video-Storyline.');
  if (Number(productionPlan.cover_candidates) !== 3) errors.push('Es müssen genau drei Cover-Kandidaten geplant sein.');
  if (coverHold > YOUTUBE_PILOT_POLICY.cover_max_seconds) errors.push(`Cover-Hold ${coverHold}s ist zu lang; maximal ${YOUTUBE_PILOT_POLICY.cover_max_seconds}s.`);
  if (rate < YOUTUBE_PILOT_POLICY.minimum_primary_visuals_per_100_seconds) {
    errors.push(`Bilddichte zu niedrig: ${rate} primäre Visuals pro 100s; Minimum ${YOUTUBE_PILOT_POLICY.minimum_primary_visuals_per_100_seconds}.`);
  }
  if (introStarts < YOUTUBE_PILOT_POLICY.intro_minimum_visual_starts) {
    errors.push(`Intro zu statisch: ungefähr ${introStarts} Visual-Starts in den ersten ${YOUTUBE_PILOT_POLICY.intro_window_seconds}s; Minimum ${YOUTUBE_PILOT_POLICY.intro_minimum_visual_starts}.`);
  }
  if (maxBeatHold > YOUTUBE_PILOT_POLICY.hard_maximum_hold_seconds) {
    errors.push(`Ein geplanter Beat hält ${maxBeatHold}s; Hard-Max ${YOUTUBE_PILOT_POLICY.hard_maximum_hold_seconds}s.`);
  } else if (maxBeatHold > YOUTUBE_PILOT_POLICY.review_hold_above_seconds) {
    warnings.push(`Längster Beat ${maxBeatHold}s: vor Produktion Split prüfen.`);
  }
  const [targetMin, targetMax] = YOUTUBE_PILOT_POLICY.target_primary_visuals_per_100_seconds;
  if (rate < targetMin || rate > targetMax) warnings.push(`Bilddichte ${rate}/100s liegt außerhalb des Zielkorridors ${targetMin}–${targetMax}.`);
  if (Number(visualPlan.input.maxWordsPerBeat) > YOUTUBE_PILOT_POLICY.recommended_max_words_per_beat) {
    warnings.push(`Für den 2-Minuten-Pilot sind maxWordsPerBeat <= ${YOUTUBE_PILOT_POLICY.recommended_max_words_per_beat} empfohlen.`);
  }

  return {
    version: 1,
    policy: YOUTUBE_PILOT_POLICY,
    status: errors.length ? 'not-ready' : 'ready-for-asset-pilot',
    metrics: {
      words,
      estimated_duration_seconds: estimatedDuration,
      primary_visuals: primaryAssets.length,
      primary_visuals_per_100_seconds: rate,
      estimated_intro_visual_starts: introStarts,
      cover_hold_seconds: coverHold,
      max_estimated_beat_hold_seconds: maxBeatHold
    },
    errors,
    warnings
  };
}

function estimateIntroStarts(plan, coverHold, windowSeconds) {
  const beats = plan.beats ?? [];
  if (!beats.length) return 0;
  let starts = 1;
  let cursor = Number.isFinite(coverHold) ? coverHold : 2;
  for (let index = 1; index < beats.length && cursor < windowSeconds; index += 1) {
    starts += 1;
    cursor += Math.min(
      YOUTUBE_PILOT_POLICY.hard_maximum_hold_seconds,
      Math.max(1.6, Number(beats[index].estimated_hold_seconds ?? 3))
    );
  }
  return starts;
}
