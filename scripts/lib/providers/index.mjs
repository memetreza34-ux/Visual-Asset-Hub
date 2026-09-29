import { searchPexels } from '../pexels.mjs';
import { searchPixabay } from './pixabay.mjs';
import { searchOpenverse } from './openverse.mjs';
import { searchWikimedia } from './wikimedia.mjs';
import { searchInternetArchive } from './internet-archive.mjs';
import { searchNasa } from './nasa.mjs';
import { searchLibraryOfCongress } from './library-of-congress.mjs';
import { searchNoaa } from './noaa.mjs';
import { searchUsgs } from './usgs.mjs';
import { searchSmithsonian } from './smithsonian.mjs';
import { searchEuropeana } from './europeana.mjs';
import { searchNara } from './nara.mjs';

export const PROVIDERS = Object.freeze({
  nasa: { types: ['video', 'image'], requiresKey: null, tier: 'official-archive', downloadable: true },
  noaa: { types: ['video', 'image'], requiresKey: null, tier: 'official-archive', downloadable: true },
  usgs: { types: ['video', 'image'], requiresKey: null, tier: 'official-archive', downloadable: true },
  nara: { types: ['video', 'image'], requiresKey: 'NARA_API_KEY', tier: 'official-archive', downloadable: true },
  smithsonian: { types: ['image'], requiresKey: 'SMITHSONIAN_API_KEY', tier: 'official-archive', downloadable: true },
  'library-of-congress': { types: ['video', 'image'], requiresKey: null, tier: 'official-archive', downloadable: true },
  europeana: { types: ['video', 'image'], requiresKey: 'EUROPEANA_API_KEY', tier: 'archive', downloadable: true },
  wikimedia: { types: ['video', 'image'], requiresKey: null, tier: 'archive', downloadable: true },
  'internet-archive': { types: ['video', 'image'], requiresKey: null, tier: 'archive', downloadable: true },
  openverse: { types: ['image'], requiresKey: null, tier: 'open-media', downloadable: true },
  pexels: { types: ['video', 'image'], requiresKey: 'PEXELS_API_KEY', tier: 'stock-fallback', downloadable: true },
  pixabay: { types: ['video', 'image'], requiresKey: 'PIXABAY_API_KEY', tier: 'stock-fallback', downloadable: true }
});

export async function searchProvider({ provider, type = 'video', env = process.env, ...options }) {
  const name = String(provider || '').toLowerCase();
  const config = PROVIDERS[name];
  if (!config) throw new Error(`Unbekannter Provider: ${provider}. Erlaubt: ${Object.keys(PROVIDERS).join(', ')}`);
  if (!config.types.includes(type)) throw new Error(`${name} unterstützt den Typ ${type} nicht. Erlaubt: ${config.types.join(', ')}`);

  if (name === 'nasa') {
    return searchNasa({ query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'noaa') {
    return searchNoaa({ query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'usgs') {
    return searchUsgs({ query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'nara') {
    return searchNara({ apiKey: env.NARA_API_KEY, query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'smithsonian') {
    return searchSmithsonian({ apiKey: env.SMITHSONIAN_API_KEY, query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'library-of-congress') {
    return searchLibraryOfCongress({ query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'europeana') {
    return searchEuropeana({ apiKey: env.EUROPEANA_API_KEY, query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'wikimedia') {
    return searchWikimedia({ query: options.query, type, orientation: options.orientation, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'internet-archive') {
    return searchInternetArchive({ query: options.query, type, page: options.page, perPage: options.perPage, fetchImpl: options.fetchImpl });
  }
  if (name === 'pexels') {
    const result = await searchPexels({
      apiKey: env.PEXELS_API_KEY,
      query: options.query,
      type: type === 'image' ? 'photo' : 'video',
      orientation: options.orientation,
      locale: options.locale || 'de-DE',
      page: options.page,
      perPage: options.perPage,
      fetchImpl: options.fetchImpl
    });
    return { ...result, type, assets: result.assets.map(normalizePexels) };
  }
  if (name === 'pixabay') {
    return searchPixabay({
      apiKey: env.PIXABAY_API_KEY,
      query: options.query,
      type,
      orientation: options.orientation,
      language: options.language || 'de',
      page: options.page,
      perPage: options.perPage,
      fetchImpl: options.fetchImpl
    });
  }
  return searchOpenverse({
    query: options.query,
    orientation: options.orientation,
    page: options.page,
    perPage: options.perPage,
    fetchImpl: options.fetchImpl
  });
}

function normalizePexels(asset) {
  const downloads = asset.type === 'video'
    ? (asset.files || []).map((file) => ({
        quality: file.quality || null,
        url: file.url,
        width: file.width ?? null,
        height: file.height ?? null,
        size: null,
        file_type: file.file_type || null,
        preview_url: asset.preview_url || null
      }))
    : photoDownloads(asset);
  return {
    provider: 'pexels',
    provider_id: asset.provider_id,
    type: asset.type === 'photo' ? 'image' : asset.type,
    title: asset.title,
    description: null,
    source_url: asset.source_url,
    creator: asset.creator,
    creator_url: asset.creator_url,
    width: asset.width,
    height: asset.height,
    duration_seconds: asset.duration_seconds ?? null,
    orientation: asset.orientation,
    preview_url: asset.preview_url,
    tags: [],
    downloads,
    rights: {
      license_status: 'licensed',
      license_code: 'pexels-license',
      license_url: 'https://www.pexels.com/license/',
      attribution_required: false,
      attribution_text: `${asset.type === 'video' ? 'Video' : 'Photo'} by ${asset.creator || 'Pexels contributor'} on Pexels`,
      suggested_scopes: ['organic-social', 'youtube', 'website', 'paid-ads', 'client-work'],
      suggested_status: 'approved'
    }
  };
}

function photoDownloads(asset) {
  const files = asset.files || {};
  const ordered = ['original', 'large2x', 'large', 'medium', 'small', 'portrait', 'landscape'];
  return ordered.filter((key) => files[key]).map((key) => ({
    quality: key,
    url: files[key],
    width: null,
    height: null,
    size: null,
    file_type: 'image/jpeg',
    preview_url: asset.preview_url || null
  }));
}
