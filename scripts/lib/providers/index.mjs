import { searchPexels } from '../pexels.mjs';
import { searchPixabay } from './pixabay.mjs';
import { searchWikimedia } from './wikimedia.mjs';
import { searchOpenverse } from './openverse.mjs';
import { searchInternetArchive } from './internet-archive.mjs';

// stock   = generische B-Roll/Fotos (Bewegung, Orte, Stimmung) – nie als exakter Beleg.
// archive = Archive mit konkreten Marken, Produkten, Orten und Ereignissen – Lizenz pro Datei.
export const PROVIDERS = Object.freeze({
  pexels: { tier: 'stock', types: ['video', 'image'], requiresKey: 'PEXELS_API_KEY', minPerPage: 1, maxPerPage: 80, maxPages: 10, downloadHosts: ['pexels.com'] },
  pixabay: { tier: 'stock', types: ['video', 'image'], requiresKey: 'PIXABAY_API_KEY', minPerPage: 3, maxPerPage: 200, maxPages: 10, downloadHosts: ['pixabay.com'] },
  wikimedia: { tier: 'archive', types: ['image', 'video'], requiresKey: null, minPerPage: 1, maxPerPage: 25, maxPages: 3, downloadHosts: ['upload.wikimedia.org', 'thumb.wikimedia.org'] },
  openverse: { tier: 'archive', types: ['image'], requiresKey: null, minPerPage: 1, maxPerPage: 20, maxPages: 2, downloadHosts: ['staticflickr.com', 'flickr.com', 'upload.wikimedia.org', 'thumb.wikimedia.org'] },
  'internet-archive': { tier: 'archive', types: ['video', 'image'], requiresKey: null, minPerPage: 1, maxPerPage: 6, maxPages: 1, downloadHosts: ['archive.org'] }
});

const PEXELS_RIGHTS = {
  license_status: 'licensed',
  license_code: 'Pexels License',
  license_url: 'https://www.pexels.com/license/',
  attribution_required: false,
  share_alike: false
};

export function providerConfig(name) {
  const config = PROVIDERS[String(name ?? '').toLowerCase()];
  if (!config) throw new Error(`Unbekannter Provider: ${name}. Erlaubt: ${Object.keys(PROVIDERS).join(', ')}`);
  return config;
}

export function hasProviderKey(name, env = process.env) {
  const { requiresKey } = providerConfig(name);
  return !requiresKey || Boolean(String(env[requiresKey] ?? '').trim());
}

/**
 * Wählt die Quellen für einen Real-Beat.
 * Exakte Marken/Produkte/Ereignisse → nur Archive. Generische B-Roll → Stock mit Key,
 * ohne Stock-Key ersatzweise die schlüssellosen Archive.
 */
export function providersFor({ tier = 'stock', assetType = 'image', reason = null, override = null, env = process.env } = {}) {
  if (override?.length) {
    return override.map((name) => String(name).trim().toLowerCase()).filter(Boolean).filter((name) => {
      providerConfig(name);
      return hasProviderKey(name, env);
    });
  }
  const archive = ['wikimedia', 'openverse'];
  if (assetType === 'video' || reason === 'historical-evidence') archive.push('internet-archive');
  if (tier === 'archive') return archive;
  const stock = ['pexels', 'pixabay'].filter((name) => hasProviderKey(name, env));
  return stock.length ? stock : archive;
}

/** Suchtypen je Provider: Archive liefern für Video-Beats zusätzlich Fotos, weil echte Videos dort selten sind. */
export function searchTypesFor(provider, assetType) {
  const { tier, types } = providerConfig(provider);
  const wanted = assetType === 'video' ? (tier === 'archive' ? ['video', 'image'] : ['video']) : ['image'];
  return wanted.filter((type) => types.includes(type));
}

export function isAllowedDownloadHost(provider, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return providerConfig(provider).downloadHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export async function searchProvider({ provider, type = 'image', query, orientation, page = 1, perPage = 20, locale = 'en-US', env = process.env, fetchImpl = globalThis.fetch }) {
  const name = String(provider ?? '').toLowerCase();
  const config = providerConfig(name);
  if (!config.types.includes(type)) throw new Error(`${name} unterstützt den Typ ${type} nicht.`);
  const size = Math.min(config.maxPerPage, Math.max(config.minPerPage, perPage));

  if (name === 'pexels') {
    const result = await searchPexels({
      apiKey: env.PEXELS_API_KEY,
      query,
      type: type === 'image' ? 'photo' : 'video',
      orientation,
      locale,
      page,
      perPage: size,
      fetchImpl
    });
    return { ...result, type, assets: result.assets.map(withPexelsDownloads) };
  }
  if (name === 'pixabay') {
    return searchPixabay({ apiKey: env.PIXABAY_API_KEY, query, type, orientation, language: String(locale).slice(0, 2).toLowerCase(), page, perPage: size, fetchImpl });
  }
  // Archive werden absichtlich nicht nach Ausrichtung gefiltert: wenige, aber exakte Treffer sind wichtiger.
  if (name === 'wikimedia') return searchWikimedia({ query, type, page, perPage: size, fetchImpl });
  if (name === 'openverse') return searchOpenverse({ query, page, perPage: size, fetchImpl });
  return searchInternetArchive({ query, type, page, perPage: size, fetchImpl });
}

/** Bringt Pexels-Treffer auf das gemeinsame Modell (downloads + rights), ohne die alten Felder zu entfernen. */
export function withPexelsDownloads(asset) {
  let downloads;
  if (asset.type === 'image') {
    const src = asset.files ?? {};
    const longest = Math.max(Number(asset.width ?? 0), Number(asset.height ?? 0)) || null;
    downloads = [
      src.large2x && { quality: 'large2x', url: src.large2x, width: longest ? Math.min(1880, longest) : null, height: null, file_type: 'image/jpeg' },
      src.original && { quality: 'original', url: src.original, width: asset.width ?? null, height: asset.height ?? null, file_type: 'image/jpeg' },
      src.large && { quality: 'large', url: src.large, width: longest ? Math.min(940, longest) : null, height: null, file_type: 'image/jpeg' }
    ].filter(Boolean);
  } else {
    downloads = (asset.files ?? []).map((file) => ({
      quality: file.quality ?? null,
      url: file.url,
      width: file.width ?? null,
      height: file.height ?? null,
      file_type: file.file_type ?? null
    }));
  }
  return {
    ...asset,
    downloads,
    rights: {
      ...PEXELS_RIGHTS,
      attribution_text: asset.creator ? `${asset.creator} via Pexels` : 'via Pexels'
    }
  };
}
