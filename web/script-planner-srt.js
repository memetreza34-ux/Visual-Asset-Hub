export function planToSrt(plan) {
  const scenes = Array.isArray(plan?.scenes) ? plan.scenes : [];
  return `${scenes.map((scene, index) => {
    const asset = scene.assets?.[0];
    const visual = asset
      ? `VISUAL: ${asset.id} | ${asset.title} | ${asset.status}`
      : `VISUAL SUCHEN: ${scene.suggestedPexelsQuery ?? ''}`;
    return [
      index + 1,
      `${toSrtTime(scene.startSeconds)} --> ${toSrtTime(scene.endSeconds)}`,
      scene.text,
      visual
    ].join('\n');
  }).join('\n\n')}\n`;
}

export function toSrtTime(value) {
  const milliseconds = Math.max(0, Math.round(Number(value || 0) * 1000));
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  const millis = milliseconds % 1000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

function pad(value, length) {
  return String(value).padStart(length, '0');
}
