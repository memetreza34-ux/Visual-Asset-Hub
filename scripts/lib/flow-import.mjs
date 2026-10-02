export const FLOW_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

export function numericHint(name) {
  const values = [...String(name).matchAll(/(\d+)/g)].map((match) => Number(match[1]));
  return values.length ? values.at(-1) : null;
}

export function orderFlowImages(files, mode = 'auto') {
  const values = [...files];
  const byName = (a, b) => String(a.relative ?? a.name).localeCompare(String(b.relative ?? b.name), 'de', { numeric: true, sensitivity: 'base' });
  if (mode === 'filename') return values.sort(byName);
  if (mode === 'mtime') return values.sort((a, b) => Number(a.mtimeMs) - Number(b.mtimeMs) || byName(a, b));
  if (mode !== 'auto') throw new Error('order muss auto, filename oder mtime sein.');

  const hints = values.map((file) => numericHint(file.name));
  const uniqueHints = new Set(hints.filter(Number.isFinite));
  if (hints.length && hints.every(Number.isFinite) && uniqueHints.size === hints.length) {
    return values.sort((a, b) => numericHint(a.name) - numericHint(b.name) || byName(a, b));
  }
  const mtimes = new Set(values.map((file) => Number(file.mtimeMs)));
  if (values.length && mtimes.size === values.length) {
    return values.sort((a, b) => Number(a.mtimeMs) - Number(b.mtimeMs) || byName(a, b));
  }
  throw new Error('Flow-Reihenfolge ist nicht sicher erkennbar. Nutze --order filename oder --order mtime nur nach bewusster Prüfung.');
}

export function validateImportPlan(productionPlan, storyFiles) {
  if (!productionPlan?.images?.length) throw new Error('flow-production-plan.json enthält keine images.');
  const expectedStory = Math.max(0, productionPlan.images.length - 1);
  if (storyFiles.length !== expectedStory) {
    throw new Error(`Stage-2-Download enthält ${storyFiles.length} Bilder; erwartet werden exakt ${expectedStory}. Nichts wird importiert.`);
  }
  return { expected_total: productionPlan.images.length, expected_story: expectedStory };
}

export function buildImportMapping(productionPlan, orderedStoryFiles, coverPath) {
  const mapping = [{
    image_number: 1,
    beat_id: productionPlan.images[0]?.beat_id ?? null,
    source: coverPath,
    target: 'Bild 01.png',
    role: 'selected-cover'
  }];
  orderedStoryFiles.forEach((file, index) => {
    const imageNumber = index + 2;
    const planImage = productionPlan.images.find((item) => Number(item.image_number) === imageNumber);
    mapping.push({
      image_number: imageNumber,
      beat_id: planImage?.beat_id ?? null,
      source: file.path,
      source_relative: file.relative,
      target: `Bild ${String(imageNumber).padStart(2, '0')}.png`,
      role: 'story-image'
    });
  });
  return mapping;
}
