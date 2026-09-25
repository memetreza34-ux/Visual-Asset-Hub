import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {buildCompleteDocumentaryPhase1} from './documentary-phase1.mjs';
import {DEFAULT_DOCUMENTARY_ROOT, projectSlug} from './documentary-project.mjs';
import {generateAutonomousDocumentaryBrief} from './lib/documentary-autonomous-brief.mjs';
import {
  loadTopicRegistry,
  reserveTopic,
  updateTopicEntry,
  registryPaths
} from './lib/documentary-topic-registry.mjs';

export const DEFAULT_TOPIC_REGISTRY_ROOT = 'documentary-registry';

export async function buildAutonomousDocumentaryPhase1({
  root = process.cwd(),
  outputRoot = DEFAULT_DOCUMENTARY_ROOT,
  registryRoot = DEFAULT_TOPIC_REGISTRY_ROOT,
  targetDurationSeconds = 150,
  depth = 'deep',
  mediaPreference = 'mixed',
  perPage,
  maxTasksPerScene,
  alternatives,
  materializeAlternatives = false,
  overwriteMedia = false,
  maxMediaBytes,
  apiKey,
  model,
  fetchImpl = globalThis.fetch
} = {}) {
  const absoluteOutputRoot = path.resolve(root, outputRoot);
  const absoluteRegistryRoot = path.resolve(root, registryRoot);
  fs.mkdirSync(absoluteOutputRoot, {recursive: true});
  fs.mkdirSync(absoluteRegistryRoot, {recursive: true});

  let registry = loadTopicRegistry(absoluteRegistryRoot);
  let reservation = findResumableReservation(registry, root);
  let brief;

  if (reservation) {
    brief = readJson(path.resolve(root, reservation.entry.briefFile));
  } else {
    brief = await generateAutonomousDocumentaryBrief({
      registry,
      targetDurationSeconds,
      apiKey,
      model,
      fetchImpl
    });
    const slug = projectSlug(brief.title);
    const reserved = reserveTopic(absoluteRegistryRoot, brief, {
      status: 'reserved',
      targetDurationSeconds,
      projectSlug: slug,
      projectDirectory: null,
      source: 'autonomous-phase1-web-research'
    });
    const briefFile = path.join(absoluteRegistryRoot, 'briefs', `${reserved.entry.id}.json`);
    fs.mkdirSync(path.dirname(briefFile), {recursive: true});
    writeJson(briefFile, brief);
    const relativeBriefFile = path.relative(root, briefFile).split(path.sep).join('/');
    const updated = updateTopicEntry(absoluteRegistryRoot, reserved.entry.id, {briefFile: relativeBriefFile});
    reservation = {entry: updated, resumed: false};
    registry = loadTopicRegistry(absoluteRegistryRoot);
  }

  try {
    const result = await buildCompleteDocumentaryPhase1({
      root,
      outputRoot: absoluteOutputRoot,
      title: brief.title,
      script: brief.script,
      depth,
      mediaPreference,
      segmentation: 'auto',
      overwrite: false,
      perPage,
      maxTasksPerScene,
      alternatives,
      materializeAlternatives,
      overwriteMedia,
      maxMediaBytes
    });

    writeAutonomousMetadata(result.projectDirectory, brief, reservation.entry);
    const relativeProject = path.relative(root, result.projectDirectory).split(path.sep).join('/');
    const updatedTopic = updateTopicEntry(absoluteRegistryRoot, reservation.entry.id, {
      status: 'phase1-complete',
      completedAt: new Date().toISOString(),
      projectDirectory: relativeProject,
      actualScriptWords: brief.generation?.actualWords ?? brief.scriptWords ?? null,
      model: brief.generation?.model ?? brief.generatedWith ?? null,
      visualSceneCount: result.phase1.scenes.length,
      materializedPrimaryFiles: result.materialization?.summary?.primaryFiles ?? 0,
      error: null
    });

    return {
      ...result,
      autonomous: {
        brief,
        resumedReservedTopic: Boolean(reservation.resumed),
        topic: updatedTopic,
        registry: registryPaths(absoluteRegistryRoot)
      }
    };
  } catch (error) {
    updateTopicEntry(absoluteRegistryRoot, reservation.entry.id, {
      status: 'phase1-failed',
      failedAt: new Date().toISOString(),
      error: String(error instanceof Error ? error.message : error).slice(0, 1000)
    });
    throw error;
  }
}

function findResumableReservation(registry, root) {
  const topics = [...(registry?.topics ?? [])].reverse();
  for (const entry of topics) {
    if (entry.status !== 'reserved' || !entry.briefFile) continue;
    const file = path.resolve(root, entry.briefFile);
    if (!isNonEmptyFile(file)) continue;
    return {entry, resumed: true};
  }
  return null;
}

function writeAutonomousMetadata(projectDirectory, brief, topicEntry) {
  const projectDir = path.join(projectDirectory, '05-PROJECT');
  const sourcesDir = path.join(projectDirectory, '04-SOURCES');
  fs.mkdirSync(projectDir, {recursive: true});
  fs.mkdirSync(sourcesDir, {recursive: true});

  const publish = {
    title: brief.publish.title,
    description: brief.publish.description,
    hashtags: brief.publish.hashtags,
    tags: brief.publish.tags,
    thumbnailText: brief.publish.thumbnailText
  };
  writeJson(path.join(projectDir, 'publish.json'), publish);
  writeJson(path.join(projectDir, 'topic.json'), {
    format: 'visual-asset-hub-documentary-topic',
    version: 1,
    registerId: topicEntry.id,
    title: brief.title,
    topicKey: brief.topicKey,
    angle: brief.angle,
    category: brief.category,
    targetDurationSeconds: brief.targetDurationSeconds,
    scriptWords: brief.generation?.actualWords ?? brief.scriptWords ?? null,
    generatedWith: brief.generatedWith ?? brief.generation?.model ?? null,
    researchSummary: brief.researchSummary
  });
  writeJson(path.join(projectDir, 'script-research.json'), {
    format: 'visual-asset-hub-documentary-script-research',
    version: 1,
    generatedAt: new Date().toISOString(),
    title: brief.title,
    angle: brief.angle,
    researchSummary: brief.researchSummary,
    sources: brief.sources,
    generation: brief.generation ?? null
  });

  const sourceLines = [
    `SCRIPT-RECHERCHE: ${brief.title}`,
    `Blickwinkel: ${brief.angle}`,
    '',
    ...(brief.sources ?? []).flatMap((source, index) => [
      `${index + 1}. ${source.title}`,
      `   ${source.publisher}`,
      `   ${source.url}`,
      ''
    ])
  ];
  fs.writeFileSync(path.join(sourcesDir, 'script-research-sources.txt'), `${sourceLines.join('\n').trim()}\n`, 'utf8');
}

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const args = {
    outputRoot: DEFAULT_DOCUMENTARY_ROOT,
    registryRoot: DEFAULT_TOPIC_REGISTRY_ROOT,
    targetDurationSeconds: 150,
    depth: 'deep',
    mediaPreference: 'mixed',
    perPage: undefined,
    maxTasksPerScene: undefined,
    alternatives: undefined,
    materializeAlternatives: false,
    overwriteMedia: false,
    maxMediaBytes: undefined,
    model: undefined
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--output-root') args.outputRoot = argv[++index] ?? DEFAULT_DOCUMENTARY_ROOT;
    else if (token === '--registry-root') args.registryRoot = argv[++index] ?? DEFAULT_TOPIC_REGISTRY_ROOT;
    else if (token === '--duration') args.targetDurationSeconds = Number(argv[++index]);
    else if (token === '--depth') args.depth = argv[++index] ?? 'deep';
    else if (token === '--media') args.mediaPreference = argv[++index] ?? 'mixed';
    else if (token === '--per-page') args.perPage = Number(argv[++index]);
    else if (token === '--max-tasks') args.maxTasksPerScene = Number(argv[++index]);
    else if (token === '--alternatives') args.alternatives = Number(argv[++index]);
    else if (token === '--materialize-alternatives') args.materializeAlternatives = true;
    else if (token === '--overwrite-media') args.overwriteMedia = true;
    else if (token === '--max-media-mb') args.maxMediaBytes = Number(argv[++index]) * 1024 * 1024;
    else if (token === '--model') args.model = argv[++index] ?? undefined;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!Number.isFinite(args.targetDurationSeconds) || args.targetDurationSeconds < 60 || args.targetDurationSeconds > 900) {
    throw new Error('--duration muss zwischen 60 und 900 Sekunden liegen.');
  }
  return args;
}

async function runCli() {
  const result = await buildAutonomousDocumentaryPhase1(parseArgs(process.argv.slice(2)));
  process.stdout.write(`Autonome Phase 1 fertig: ${result.projectDirectory}\n`);
  process.stdout.write(`Thema: ${result.autonomous.brief.title}\n`);
  if (result.autonomous.resumedReservedTopic) process.stdout.write('Vorhandenes reserviertes Thema fortgesetzt: ja\n');
  process.stdout.write(`Blickwinkel: ${result.autonomous.brief.angle}\n`);
  process.stdout.write(`Szenen: ${result.phase1.scenes.length}\n`);
  process.stdout.write(`Lokale Hauptvisuals: ${result.materialization?.summary?.primaryFiles ?? 0}\n`);
  process.stdout.write(`Themenregister: ${result.autonomous.registry.text}\n`);
  process.stdout.write('Naechster Nutzerschritt: 01-SCRIPT/script.txt kopieren und 02-AUDIO/voiceover.mp3 erstellen.\n');
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    await runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
