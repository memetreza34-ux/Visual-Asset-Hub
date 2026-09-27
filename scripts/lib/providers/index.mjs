import { searchPexels } from '../pexels.mjs';
import { searchPixabay } from './pixabay.mjs';
import { searchOpenverse } from './openverse.mjs';

export const PROVIDERS = Object.freeze({
  pexels: { types: ['video', 'image'], requiresKey: 'PEXELS_API_KEY' },
  pixabay: { types: ['video', 'image'], requiresKey: 'PIXABAY_API_KEY' },
  openverse: { types: ['image'], requiresKey: null }
});

export async function searchProvider({ provider, type = 'video', env = process.env, ...options }) {
  const name = String(provider || '').toLowerCase();
  const config = PROVIDERS[name];
  if (!config) throw new Error(`Unbekannter Provider: ${provider}. Erlaubt: ${Object.keys(PROVIDERS).join(', ')}`);
  if (!config.types.includes(type)) throw new Error(`${name} unterstützt den Typ ${type} nicht. Erlaubt: ${config.types.join(', ')}`);

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
