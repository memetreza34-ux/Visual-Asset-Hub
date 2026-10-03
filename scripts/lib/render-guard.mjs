export function validateFinalRenderManifest(manifest) {
  const errors = [];

  if (!manifest || !Array.isArray(manifest.items)) {
    return { ok: false, errors: ['Ungültiges Video-Manifest: items fehlt.'] };
  }

  if (manifest.status !== 'render-handoff-ready') {
    errors.push(`Manifest ist nicht render-handoff-ready: ${manifest.status ?? 'unknown'}.`);
  }

  if (Array.isArray(manifest.missing) && manifest.missing.length > 0) {
    for (const item of manifest.missing) {
      errors.push(`Beat ${item.beat_id ?? '?'} ist nicht aufgelöst: ${item.status ?? 'missing'}.`);
    }
  }

  for (const item of manifest.items) {
    if (item.status !== 'ready') {
      errors.push(`Beat ${item.beat_id ?? '?'} hat Status ${item.status ?? 'unknown'}.`);
      continue;
    }

    const selected = item.selected;
    if (!selected?.local_file) {
      errors.push(`Beat ${item.beat_id ?? '?'} besitzt kein finales visuelles Asset.`);
      continue;
    }

    if (!['ai-generated', 'real-media'].includes(selected.source_mode)) {
      errors.push(`Beat ${item.beat_id ?? '?'} verwendet unzulässigen Primärvisual-Typ: ${selected.source_mode ?? 'unknown'}.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    policy: {
      allowed_primary_visuals: ['real-image', 'real-video', 'ai-image'],
      placeholder_frames_allowed: false,
      technical_cards_allowed: false,
      missing_asset_behavior: 'BLOCK_RENDER',
      data_display_mode: 'overlay-on-valid-visual-only'
    }
  };
}
