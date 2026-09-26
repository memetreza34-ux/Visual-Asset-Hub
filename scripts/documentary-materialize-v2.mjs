import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {materializeCandidate} from './documentary-materialize.mjs';

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;
const MAX_DOWNLOAD_ATTEMPTS = 3;

export async function materializeDocumentaryVisualsV2({
  projectDirectory,
  includeAlternatives = false,
  overwrite = false,
  maxBytes = DEFAULT_MAX_BYTES,
  fetchImpl = globalThis.fetch
} = {}) {
  const projectDir = requireDirectory(projectDirectory);
  const scenesFile = path.join(projectDir, '05-PROJECT', 'scenes.json');
  if (!fs.existsSync(scenesFile)) throw new Error(`Szenenplan fehlt: ${scenesFile}`);
  const scenePlan = readJson(scenesFile);
  if (!Array.isArray(scenePlan.scenes) || !scenePlan.scenes.length) throw new Error('scenes.json enthält keine Szenen.');

  const summary = {
    format: 'visual-asset-hub-documentary-materialization-summary',
    version: 2,
    strategy: 'multi-shot-v2-resilient',
    materializedAt: new Date().toISOString(),
    sceneCount: scenePlan.scenes.length,
    primaryFiles: 0,
    shotFiles: 0,
    videoFiles: 0,
    imageFiles: 0,
    alternativeFiles: 0,
    reusedFiles: 0,
    networkDownloads: 0,
    retryCount: 0,
    skipped: 0,
    failed: 0,
    totalBytes: 0,
    files: [],
    errors: []
  };
  const materializedByIdentity = new Map();

  for (const scene of scenePlan.scenes) {
    const shotTargets = selectedShotTargets(scene);
    const localShots = [];
    scene.localVisuals = [];

    for (let index = 0; index < shotTargets.length; index += 1) {
      const target = shotTargets[index];
      const candidate = (scene.candidates ?? []).find((item) => item.key === target.candidateKey);
      if (!candidate) {
        summary.failed += 1;
        summary.errors.push({sceneId: scene.sceneId, shotId: target.shotId, error: `Kandidat ${target.candidateKey} fehlt.`});
        continue;
      }
      try {
        const identity = candidateIdentity(candidate);
        const cached = materializedByIdentity.get(identity);
        let result;
        if (cached && fs.existsSync(path.join(projectDir, cached.relativePath))) {
          result = reuseMaterializedCandidate({
            projectDirectory: projectDir,
            scene,
            cached,
            role: index === 0 ? 'primary' : `shot-${index + 1}`,
            index,
            overwrite
          });
          summary.reusedFiles += result.skipped ? 0 : 1;
        } else {
          const attemptResult = await materializeCandidateWithRetry({
            projectDirectory: projectDir,
            scene,
            candidate,
            role: index === 0 ? 'primary' : `shot-${index + 1}`,
            index,
            overwrite,
            maxBytes,
            fetchImpl
          });
          result = attemptResult.result;
          summary.retryCount += attemptResult.retries;
          if (!result.skipped) summary.networkDownloads += 1;
          materializedByIdentity.set(identity, result);
        }

        const mediaType = candidate.type === 'video' ? 'video' : 'image';
        const local = {
          shotId: target.shotId,
          role: target.role,
          candidateKey: candidate.key,
          provider: candidate.provider,
          mediaType,
          relativePath: result.relativePath,
          bytes: result.bytes,
          mimeType: result.mimeType,
          downloadedAt: result.downloadedAt,
          reused: Boolean(result.reused),
          reviewStatus: candidate.reviewStatus ?? 'review-required'
        };
        localShots.push(local);
        scene.localVisuals.push(local);
        summary.shotFiles += result.skipped ? 0 : 1;
        if (mediaType === 'video') summary.videoFiles += result.skipped ? 0 : 1;
        else summary.imageFiles += result.skipped ? 0 : 1;
        if (index === 0) summary.primaryFiles += result.skipped ? 0 : 1;
        if (result.skipped) summary.skipped += 1;
        else summary.totalBytes += result.bytes;
        summary.files.push({sceneId: scene.sceneId, shotId: target.shotId, ...result});
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({sceneId: scene.sceneId, shotId: target.shotId, provider: candidate.provider, candidateKey: candidate.key, error: errorMessage(error)});
      }
    }

    if (includeAlternatives) {
      for (let index = 0; index < (scene.recommendedAlternatives ?? []).length; index += 1) {
        const key = scene.recommendedAlternatives[index];
        const candidate = (scene.candidates ?? []).find((item) => item.key === key);
        if (!candidate) continue;
        try {
          const attemptResult = await materializeCandidateWithRetry({
            projectDirectory: projectDir,
            scene,
            candidate,
            role: `alternative-${index + 1}`,
            index: shotTargets.length + index,
            overwrite,
            maxBytes,
            fetchImpl
          });
          const result = attemptResult.result;
          summary.retryCount += attemptResult.retries;
          if (!result.skipped) summary.networkDownloads += 1;
          summary.alternativeFiles += result.skipped ? 0 : 1;
          if (result.skipped) summary.skipped += 1;
          else summary.totalBytes += result.bytes;
        } catch (error) {
          summary.failed += 1;
          summary.errors.push({sceneId: scene.sceneId, role: `alternative-${index + 1}`, error: errorMessage(error)});
        }
      }
    }

    scene.localShots = localShots;
    scene.localPrimaryFile = localShots[0]?.relativePath ?? null;
    writeSceneManifest(projectDir, scene);
  }

  scenePlan.materialization = {
    status: summary.failed ? 'completed-with-errors' : 'completed',
    version: 2,
    strategy: 'multi-shot-v2-resilient',
    updatedAt: summary.materializedAt,
    primaryFiles: summary.primaryFiles,
    shotFiles: summary.shotFiles,
    videoFiles: summary.videoFiles,
    imageFiles: summary.imageFiles,
    reusedFiles: summary.reusedFiles,
    networkDownloads: summary.networkDownloads,
    retryCount: summary.retryCount,
    failed: summary.failed,
    rightsStatus: 'review-required-before-publication'
  };
  writeJson(scenesFile, scenePlan);
  writeJson(path.join(projectDir, '05-PROJECT', 'materialization-summary.json'), summary);
  return {scenePlan, summary};
}

async function materializeCandidateWithRetry(options) {
  let lastError = null;
  let retries = 0;
  for (let attempt = 0; attempt < MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const result = await materializeCandidate(options);
      return {result, retries};
    } catch (error) {
      lastError = error;
      if (!isRetryableDownloadError(error) || attempt === MAX_DOWNLOAD_ATTEMPTS - 1) throw error;
      retries += 1;
      await sleep(Math.min(4000, 600 * (2 ** attempt)));
    }
  }
  throw lastError ?? new Error('Mediendownload fehlgeschlagen.');
}

function isRetryableDownloadError(error) {
  const message = errorMessage(error).toLowerCase();
  return /\b429\b|\b500\b|\b502\b|\b503\b|\b504\b|fetch failed|network|econnreset|etimedout|socket|terminated|temporar/.test(message);
}

function candidateIdentity(candidate) {
  if (candidate.identity) return String(candidate.identity);
  const providerId = candidate.providerId ?? candidate.provider_id ?? candidate.asset?.provider_id ?? candidate.asset?.providerId;
  if (providerId) return `${candidate.provider}|${providerId}`;
  if (candidate.mediaUrl) return `${candidate.provider}|${candidate.mediaUrl}`;
  return `${candidate.provider}|${candidate.key}`;
}

function reuseMaterializedCandidate({projectDirectory, scene, cached, role, index, overwrite}) {
  const sourceFile = path.join(projectDirectory, cached.relativePath);
  const extension = path.extname(sourceFile);
  if (!extension) throw new Error(`Lokale Quelldatei hat keine Erweiterung: ${cached.relativePath}`);
  const sceneDir = path.join(projectDirectory, '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, {recursive: true});
  const baseName = role === 'primary' ? '01-main' : `${String(index + 1).padStart(2, '0')}-alternative`;
  const finalFile = path.join(sceneDir, `${baseName}${extension}`);
  const relativePath = toPosix(path.relative(projectDirectory, finalFile));

  if (fs.existsSync(finalFile) && !overwrite) {
    const stat = fs.statSync(finalFile);
    return {...cached, relativePath, bytes: stat.size, downloadedAt: stat.mtime.toISOString(), skipped: true, reused: true, reusedFrom: cached.relativePath};
  }
  if (fs.existsSync(finalFile)) fs.rmSync(finalFile, {force: true});
  try {
    fs.linkSync(sourceFile, finalFile);
  } catch {
    fs.copyFileSync(sourceFile, finalFile);
  }
  const stat = fs.statSync(finalFile);
  return {...cached, relativePath, bytes: stat.size, downloadedAt: new Date().toISOString(), skipped: false, reused: true, reusedFrom: cached.relativePath};
}

function selectedShotTargets(scene) {
  if (Array.isArray(scene.recommendedShots) && scene.recommendedShots.length) return scene.recommendedShots;
  if (scene.recommendedPrimary) return [{shotId: 'SHOT-01', candidateKey: scene.recommendedPrimary, role: 'primary'}];
  return [];
}

function writeSceneManifest(projectDirectory, scene) {
  const sceneDir = path.join(projectDirectory, '03-VISUALS', `scene-${String(scene.sequence).padStart(3, '0')}`);
  fs.mkdirSync(sceneDir, {recursive: true});
  writeJson(path.join(sceneDir, '00-local-files.json'), {
    sceneId: scene.sceneId,
    localPrimaryFile: scene.localPrimaryFile ?? null,
    localShots: scene.localShots ?? [],
    localVisuals: scene.localVisuals ?? [],
    rightsStatus: 'review-required-before-publication'
  });
}

function requireDirectory(value) {
  if (!value) throw new Error('projectDirectory fehlt.');
  const directory = path.resolve(value);
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) throw new Error(`Projektordner nicht gefunden: ${directory}`);
  return directory;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }
function toPosix(value) { return value.split(path.sep).join('/'); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function parseArgs(argv) {
  const args = {projectDirectory: '', includeAlternatives: false, overwrite: false};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectDirectory = argv[++index] ?? '';
    else if (token === '--materialize-alternatives') args.includeAlternatives = true;
    else if (token === '--overwrite') args.overwrite = true;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectDirectory) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const result = await materializeDocumentaryVisualsV2(parseArgs(process.argv.slice(2)));
    process.stdout.write(`Lokale Shots: ${result.summary.shotFiles}\n`);
    process.stdout.write(`B-Roll-Videos: ${result.summary.videoFiles}\n`);
    process.stdout.write(`Bilder: ${result.summary.imageFiles}\n`);
    process.stdout.write(`Lokal wiederverwendet: ${result.summary.reusedFiles}\n`);
    process.stdout.write(`Download-Retries: ${result.summary.retryCount}\n`);
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}
