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

export async function buildAutonomousDocumentaryPhase1({
  root = process.cwd(),
  outputRoot = DEFAULT_DOCUMENTARY_ROOT,
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
  fs.mkdirSync(absoluteOutputRoot, {recursive: true});
  const registry = loadTopicRegistry(absoluteOutputRoot);
  const brief = await generateAutonomousDocumentaryBrief({
    registry,
    targetDurationSeconds,
    apiKey,
    model,
    fetchImpl
  });

  const slug = projectSlug(brief.title);
  const reservation = reserveTopic(absoluteOutputRoot, brief, {
    status: 'reserved',
    targetDurationSeconds,
    projectSlug: slug,
    projectDirectory: slug,
    source: 'autonomous-phase1-web-research'
  });

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
    const relativeProject = path.relative(absoluteOutputRoot, result.projectDirectory).split(path.sep).join('/');
    const updatedTopic = updateTopicEntry(absoluteOutputRoot, reservation.entry.id, {
      status: 'phase1-complete',
      completedAt: new Date().toISOString(),
      projectDirectory: relativeProject,
      actualScriptWords: brief.generation.actualWords,
      model: brief.generation.model,
      visualSceneCount: result.phase1.scenes.length,
      materializedPrimaryFiles: result.materialization?.summary?.primaryFiles ?? 0
    });

    return {
      ...result,
      autonomous: {
        brief,
        topic: updatedTopic,
        registry: registryPaths(absoluteOutputRoot)
      }
    };
  } catch (error) {
    updateTopicEntry(absoluteOutputRoot, reservation.entry.id, {
      status: 'phase1-failed',
      failedAt: new Date().toISOString(),
      error: String(error instanceof Error ? error.message : error).slice(0, 1000)
    });
    throw error;
  }
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
    scriptWords: brief.generation.actualWords,
    generatedWith: brief.generatedWith,
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
    generation: brief.generation
  });

  const sourceLines = [
    `SCRIPT-RECHERCHE: ${brief.title}`,
    `Blickwinkel: ${brief.angle}`,
    '',
    ...brief.sources.flatMap((source, index) => [
      `${index + 1}. ${source.title}`,
      `   ${source.publisher}`,
      `   ${source.url}`,
      ''
    ])
  ];
  fs.writeFileSync(path.join(sourcesDir, 'script-research-sources.txt'), `${sourceLines.join('\n').trim()}\n`, 'utf8');
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const args = {
    outputRoot: DEFAULT_DOCUMENTARY_ROOT,
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
  process.stdout.write(`Blickwinkel: ${result.autonomous.brief.angle}\n`);
  process.stdout.write(`Skript: ${result.autonomous.brief.generation.actualWords} Woerter / Ziel ${result.autonomous.brief.targetDurationSeconds}s\n`);
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
