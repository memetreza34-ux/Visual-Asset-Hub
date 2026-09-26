import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/assets.json'), 'utf8'));
const errors = [];
const secretParameter = /(token|signature|sig|secret|api[-_]?key|access[-_]?key|credential|expires|x-amz|x-goog|policy)/i;

for (const asset of catalog.assets ?? []) {
  const previewUrl = asset.storage?.previewUrl;
  if (!previewUrl) continue;

  if (asset.storage?.kind !== 'external') {
    errors.push(`${asset.id}: previewUrl ist nur bei externem Speicher erlaubt.`);
  }

  try {
    const url = new URL(previewUrl);
    if (!['https:', 'http:'].includes(url.protocol)) {
      errors.push(`${asset.id}: previewUrl muss HTTP(S) verwenden.`);
    }
    for (const key of url.searchParams.keys()) {
      if (secretParameter.test(key)) {
        errors.push(`${asset.id}: previewUrl enthält möglicherweise vertraulichen Parameter ${key}.`);
      }
    }
  } catch {
    errors.push(`${asset.id}: previewUrl ist ungültig.`);
  }

  if (asset.storage?.previewPath) {
    errors.push(`${asset.id}: previewUrl und previewPath dürfen nicht gleichzeitig gesetzt sein.`);
  }
}

if (errors.length) {
  console.error(`Vorschau-URL-Prüfung fehlgeschlagen (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Vorschau-URL-Prüfung erfolgreich: ${(catalog.assets ?? []).filter((asset) => asset.storage?.previewUrl).length} externe Vorschauen.`);
