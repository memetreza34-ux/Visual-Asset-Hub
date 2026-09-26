import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { trackUnsplashDownload } from './lib/unsplash.mjs';

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/tiff', 'tif'],
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
  ['video/quicktime', 'mov']
]);

export async function materializeDocumentaryVisuals({
  projectDirectory,
  includeAlternatives = false,
  overwrite = false,
  maxBytes = DEFAULT_MAX_BYTES,
  fetchImpl = globalThis.fetch,
  keys = readProviderKeys(),
  tracker = trackUnsplashDownload
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch ist in dieser Node.js-Version nicht verfügbar.');
  const projectDir = requireDirectory(projectDirectory);
  const scenesFile = path.join(projectDir, '05-PROJECT', 'scenes.json');
  if (!fs.existsSync(scenesFile)) throw new Error(`Szenenplan fehlt: ${scenesFile}`);

  const scenePlan = readJson(scenesFile);
  if (!Array.isArray(scenePlan.scenes) || !scenePlan.scenes.length) throw new Error('scenes.json enthält keine Szenen.');

  const summary = {
    format: 'visual-asset-hub-documentary-materialization-summary',
    version: 1,
    materializedAt: new Date().toISOString(),
    sceneCount: scenePlan.scenes.length,
    primaryFiles: 0,
    alternativeFiles: 0,
    skipped: 0,
    failed: 0,
    totalBytes: 0,
    files: [],
    errors: []
  };

  for (const scene of scenePlan.scenes) {
    const targets = selectionTargets(scene, includeAlternatives);
    scene.localVisuals = Array.isArray(scene.localVisuals) ? scene.localVisuals : [];

    for (const target of targets) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === target.key);
      if (!candidate) {
        summary.failed += 1;
        summary.errors.push({ sceneId: scene.sceneId, role: target.role, error: `Kandidat ${target.key} fehlt.` });
        continue;
      }

      try {
        const result = await materializeCandidate({
          projectDirectory: projectDir,
          scene,
          candidate,
          role: target.role,
          index: target.index,
          overwrite,
          maxBytes,
          fetchImpl,
          keys,
          tracker
        });

        scene.localVisuals = scene.localVisuals.filter((item) => item.role !== target.role || item.candidateKey !== candidate.key);
        scene.localVisuals.push({
          role: target.role,
          candidateKey: candidate.key,
          provider: candidate.provider,
          relativePath: result.relativePath,
          bytes: result.bytes,
          mimeType: result.mimeType,
          downloadedAt: result.downloadedAt,
          reviewStatus: candidate.reviewStatus ?? 'review-required'
        });

        if (target.role === 'primary') {
          scene.localPrimaryFile = result.relativePath;
          summary.primaryFiles += result.skipped ? 0 : 1;
        } else {
          summary.alternativeFiles += result.skipped ? 0 : 1;
        }
        if (result.skipped) summary.skipped += 1;
        else summary.totalBytes += result.bytes;
        summary.files.push({ sceneId: scene.sceneId, role: target.role, ...result });
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({
          sceneId: scene.sceneId,
          role: target.role,
          provider: candidate.provider,
          candidateKey: candidate.key,
          error: errorMessage(error)
        });
      }
    }

    writeSceneManifest(projectDir, scene);
  }

  scenePlan.materialization = {
    status: summary.failed ? 'completed-with-errors' : 'completed',
    updatedAt: summary.materializedAt,
    primaryFiles: summary.primaryFiles,
    alternativeFiles: summary.alternativeFiles,
    failed: summary.failed,
    rightsStatus: 'review-required-before-publication'
  };

  fs.writeFileSync(scenesFile, `${JSON.stringify(scenePlan, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(projectDir, '05-PROJECT', 'materialization-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8'
  );

  return { scenePlan, summary };
}

export async function materializeCandidate({
  projectDirectory,
  scene,
  candidate,
  role = 'primary',
  index = 1,
  overwrite = false,
  maxBytes = DEFAULT_MAX_BYTES,
  fetchImpl = globalThis.fetch,
  keys = readProviderKeys(),
  tracker = trackUnsplashDownload
} = {}) {
  if (!candidate?.provider) throw new Error('Provider fehlt am Kandidaten.');
  const sceneDir = path.join(projectDirectory, '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, { recursive: true });

  const downloadUrl = await resolveDownloadUrl({ candidate, keys, fetchImpl, tracker });
  const response = await fetchWithValidatedRedirects(downloadUrl, { provider: candidate.provider, fetchImpl });
  if (!response.ok) throw new Error(`Medien-Download fehlgeschlagen (${response.status}).`);

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength && contentLength > maxBytes) throw new Error(`Datei ist zu groß (${contentLength} Bytes).`);

  const mimeType = normalizeMime(response.headers.get('content-type'));
  const extension = extensionFor(mimeType, response.url || downloadUrl, candidate.type);
  if (!extension) throw new Error(`Nicht unterstützter Medientyp: ${mimeType || 'unbekannt'}.`);

  const baseName = role === 'primary'
    ? '01-main'
    : `${String(index + 1).padStart(2, '0')}-alternative`;
  const finalFile = path.join(sceneDir, `${baseName}.${extension}`);
  const relativePath = toPosix(path.relative(projectDirectory, finalFile));

  if (fs.existsSync(finalFile) && !overwrite) {
    const stat = fs.statSync(finalFile);
    return {
      relativePath,
      bytes: stat.size,
      mimeType,
      downloadedAt: stat.mtime.toISOString(),
      skipped: true,
      sourceUrl: candidate.sourceUrl || '',
      provider: candidate.provider,
      candidateKey: candidate.key
    };
  }

  const tempFile = `${finalFile}.part-${process.pid}-${Date.now()}`;
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > maxBytes) return callback(new Error(`Datei überschreitet das Limit von ${maxBytes} Bytes.`));
      callback(null, chunk);
    }
  });

  try {
    if (!response.body) throw new Error('Download-Antwort enthält keinen Datenstrom.');
    await pipeline(Readable.fromWeb(response.body), limiter, fs.createWriteStream(tempFile, { flags: 'wx' }));
    if (bytes <= 0) throw new Error('Heruntergeladene Datei ist leer.');
    if (fs.existsSync(finalFile)) fs.rmSync(finalFile, { force: true });
    fs.renameSync(tempFile, finalFile);
  } catch (error) {
    fs.rmSync(tempFile, { force: true });
    throw error;
  }

  return {
    relativePath,
    bytes,
    mimeType,
    downloadedAt: new Date().toISOString(),
    skipped: false,
    sourceUrl: candidate.sourceUrl || '',
    provider: candidate.provider,
    candidateKey: candidate.key
  };
}

async function resolveDownloadUrl({ candidate, keys, fetchImpl, tracker }) {
  if (candidate.provider === 'unsplash') {
    const apiKey = keys.unsplash || '';
    const downloadLocation = candidate.asset?.download_location || candidate.asset?.downloadLocation || '';
    if (!apiKey) throw new Error('UNSPLASH_ACCESS_KEY fehlt für den regelkonformen Download.');
    if (!downloadLocation) throw new Error('Unsplash download_location fehlt.');
    const tracked = await tracker({ apiKey, downloadLocation, fetchImpl });
    const trackedUrl = tracked?.url || '';
    if (!trackedUrl) throw new Error('Unsplash hat keine Download-URL zurückgegeben.');
    return requireHttpsUrl(trackedUrl);
  }

  const mediaUrl = candidate.mediaUrl || bestMediaUrl(candidate.asset?.files);
  if (!mediaUrl) throw new Error('Kandidat hat keine direkte Medien-URL.');
  return requireHttpsUrl(mediaUrl);
}

async function fetchWithValidatedRedirects(initialUrl, { provider, fetchImpl }) {
  let current = requireHttpsUrl(initialUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    validateRemoteUrl(current, provider);
    const response = await fetchImpl(current, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'image/avif,image/webp,image/*,video/mp4,video/webm,video/*;q=0.9,*/*;q=0.5',
        'User-Agent': 'Visual-Asset-Hub/0.4 documentary-materializer'
      }
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirect ohne Location-Header.');
    current = requireHttpsUrl(new URL(location, current).toString());
  }
  throw new Error(`Zu viele Weiterleitungen (>${MAX_REDIRECTS}).`);
}

function validateRemoteUrl(value, provider) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Nur HTTPS-Mediendownloads sind erlaubt.');
  if (url.username || url.password) throw new Error('Medien-URL darf keine Zugangsdaten enthalten.');
  if (url.port && url.port !== '443') throw new Error('Nicht standardmäßiger HTTPS-Port ist nicht erlaubt.');

  const host = url.hostname.toLowerCase();
  if (isLocalOrPrivateHost(host)) throw new Error('Lokale oder private Netzwerkziele sind als Medienquelle nicht erlaubt.');

  const knownHostRules = {
    pexels: (name) => name === 'images.pexels.com' || name === 'videos.pexels.com' || name.endsWith('.pexels.com'),
    pixabay: (name) => name === 'pixabay.com' || name.endsWith('.pixabay.com'),
    unsplash: (name) => name === 'images.unsplash.com' || name.endsWith('.unsplash.com'),
    wikimedia: (name) => name === 'upload.wikimedia.org' || name.endsWith('.wikimedia.org')
  };
  const rule = knownHostRules[provider];
  if (rule && !rule(host)) throw new Error(`Unerwarteter Download-Host für ${provider}: ${host}`);
  // Openverse verweist absichtlich auf viele unterschiedliche Ursprungsarchive.
  // Dort gilt deshalb HTTPS + Private-Netz-Sperre statt einer starren Hostliste.
}

function isLocalOrPrivateHost(host) {
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '::1' || host === '[::1]') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match172 = host.match(/^172\.(\d{1,3})\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
  if (/^169\.254\./.test(host) || /^0\./.test(host)) return true;
  if (/^(?:fc|fd)[0-9a-f]{2}:/i.test(host) || /^fe8[0-9a-f]:/i.test(host)) return true;
  return false;
}

function selectionTargets(scene, includeAlternatives) {
  const targets = [];
  if (scene.recommendedPrimary) targets.push({ role: 'primary', key: scene.recommendedPrimary, index: 0 });
  if (includeAlternatives) {
    for (let index = 0; index < (scene.recommendedAlternatives ?? []).length; index += 1) {
      targets.push({ role: `alternative-${index + 1}`, key: scene.recommendedAlternatives[index], index: index + 1 });
    }
  }
  return targets;
}

function writeSceneManifest(projectDirectory, scene) {
  const sceneDir = path.join(projectDirectory, '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, { recursive: true });
  fs.writeFileSync(path.join(sceneDir, '00-local-files.json'), `${JSON.stringify({
    sceneId: scene.sceneId,
    localPrimaryFile: scene.localPrimaryFile ?? null,
    localVisuals: scene.localVisuals ?? [],
    rightsStatus: 'review-required-before-publication'
  }, null, 2)}\n`, 'utf8');
}

function normalizeMime(value) {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

function extensionFor(mimeType, urlValue, candidateType) {
  if (ALLOWED_MIME.has(mimeType)) return ALLOWED_MIME.get(mimeType);
  let ext = '';
  try { ext = new URL(urlValue).pathname.split('.').pop()?.toLowerCase() || ''; } catch { ext = ''; }
  if (ext === 'jpeg') ext = 'jpg';
  const safe = new Set(['jpg', 'png', 'webp', 'avif', 'tif', 'mp4', 'webm', 'mov']);
  if (safe.has(ext)) return ext;
  if (candidateType === 'video' && mimeType === 'application/octet-stream') return 'mp4';
  return '';
}

function bestMediaUrl(files) {
  if (Array.isArray(files)) {
    const usable = files.filter((item) => item?.url);
    usable.sort((a, b) => (Number(b.width) || 0) * (Number(b.height) || 0) - (Number(a.width) || 0) * (Number(a.height) || 0));
    return usable[0]?.url ?? '';
  }
  if (!files || typeof files !== 'object') return '';
  for (const key of ['original', 'large', 'full', 'regular', 'medium', 'small']) {
    const value = files[key];
    if (typeof value === 'string' && value) return value;
    if (value?.url) return value.url;
  }
  return '';
}

function requireHttpsUrl(value) {
  const url = new URL(String(value || ''));
  if (url.protocol !== 'https:') throw new Error('Nur HTTPS-URLs sind erlaubt.');
  return url.toString();
}

function readProviderKeys(env = process.env) {
  return { unsplash: env.UNSPLASH_ACCESS_KEY || env.UNSPLASH_API || '' };
}

function requireDirectory(value) {
  if (!value) throw new Error('projectDirectory fehlt.');
  const directory = path.resolve(value);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`Projektordner nicht gefunden: ${directory}`);
  return directory;
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function toPosix(value) { return value.split(path.sep).join('/'); }
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }

function parseArgs(argv) {
  const args = { projectDirectory: '', includeAlternatives: false, overwrite: false, maxBytes: DEFAULT_MAX_BYTES };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--alternatives') args.includeAlternatives = true;
    else if (token === '--overwrite') args.overwrite = true;
    else if (token === '--max-mb') args.maxBytes = Number(argv[++index]) * 1024 * 1024;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  if (!Number.isFinite(args.maxBytes) || args.maxBytes < 1024 * 1024 || args.maxBytes > 2 * 1024 * 1024 * 1024) {
    throw new Error('--max-mb muss zwischen 1 und 2048 liegen.');
  }
  return args;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = await materializeDocumentaryVisuals(args);
  process.stdout.write(`Lokale Hauptvisuals: ${result.summary.primaryFiles}\n`);
  process.stdout.write(`Lokale Alternativen: ${result.summary.alternativeFiles}\n`);
  process.stdout.write(`Fehler: ${result.summary.failed}\n`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try { await runCli(); }
  catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}
