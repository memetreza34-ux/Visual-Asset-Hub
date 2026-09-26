import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {materializeCandidate} from './documentary-materialize.mjs';

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;

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
    strategy: 'multi-shot-v2',
    materializedAt: new Date().toISOString(),
    sceneCount: scenePlan.scenes.length,
    primaryFiles: 0,
    shotFiles: 0,
    videoFiles: 0,
    imageFiles: 0,
    alternativeFiles: 0,
    skipped: 0,
    failed: 0,
    totalBytes: 0,
    files: [],
    errors: []
  };

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
        const result = await materializeCandidate({
          projectDirectory: projectDir,
          scene,
          candidate,
          role: index === 0 ? 'primary' : `shot-${index + 1}`,
          index,
          overwrite,
          maxBytes,
          fetchImpl
        });
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
          const result = await materializeCandidate({projectDirectory: projectDir, scene, candidate, role: `alternative-${index + 1}`, index: shotTargets.length + index, overwrite, maxBytes, fetchImpl});
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
    strategy: 'multi-shot-v2',
    updatedAt: summary.materializedAt,
    primaryFiles: summary.primaryFiles,
    shotFiles: summary.shotFiles,
    videoFiles: summary.videoFiles,
    imageFiles: summary.imageFiles,
    failed: summary.failed,
    rightsStatus: 'review-required-before-publication'
  };
  writeJson(scenesFile, scenePlan);
  writeJson(path.join(projectDir, '05-PROJECT', 'materialization-summary.json'), summary);
  return {scenePlan, summary};
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
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`);
    process.exitCode = 1;
  }
}
