import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const DOCUMENTARY_PROJECT_VERSION = 1;
export const DEFAULT_DOCUMENTARY_ROOT = path.join('ALLES-GEFUNDEN', '07-DOKU-PROJEKTE');

const REQUIRED_DIRECTORIES = [
  '01-SCRIPT',
  '02-AUDIO',
  '03-VISUALS',
  '04-SOURCES',
  '05-PROJECT',
  '06-EXPORT'
];

export function projectSlug(value) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (!slug) throw new Error('Projektname ist ungültig.');
  return slug;
}

export function documentaryProjectDirectory({
  root = process.cwd(),
  outputRoot = DEFAULT_DOCUMENTARY_ROOT,
  title,
  slug
} = {}) {
  const finalSlug = projectSlug(slug || title);
  return path.resolve(root, outputRoot, finalSlug);
}

export function createDocumentaryProject({
  root = process.cwd(),
  outputRoot = DEFAULT_DOCUMENTARY_ROOT,
  title,
  script,
  slug,
  overwrite = false
} = {}) {
  const cleanTitle = requireText(title, 'title', 1, 160);
  const cleanScript = requireText(script, 'script', 1, 100_000, false);
  const finalSlug = projectSlug(slug || cleanTitle);
  const projectDirectory = documentaryProjectDirectory({ root, outputRoot, title: cleanTitle, slug: finalSlug });

  if (fs.existsSync(projectDirectory) && !overwrite) {
    throw new Error(`Doku-Projekt existiert bereits: ${projectDirectory}`);
  }

  fs.mkdirSync(projectDirectory, { recursive: true });
  for (const directory of REQUIRED_DIRECTORIES) {
    fs.mkdirSync(path.join(projectDirectory, directory), { recursive: true });
  }

  fs.writeFileSync(path.join(projectDirectory, '01-SCRIPT', 'script.txt'), `${cleanScript.trim()}\n`, 'utf8');
  fs.writeFileSync(path.join(projectDirectory, '04-SOURCES', 'sources.txt'), '', 'utf8');
  fs.writeFileSync(
    path.join(projectDirectory, '04-SOURCES', 'licenses.csv'),
    'scene,asset,provider,creator,source_url,license,attribution_required,notes\n',
    'utf8'
  );

  const project = {
    format: 'visual-asset-hub-documentary-project',
    version: DOCUMENTARY_PROJECT_VERSION,
    title: cleanTitle,
    slug: finalSlug,
    createdAt: new Date().toISOString(),
    workflow: {
      phase1: 'script-scenes-visuals-sources',
      phase2: 'user-creates-voiceover',
      phase3: 'timing-edit-render-export'
    },
    paths: {
      script: '01-SCRIPT/script.txt',
      audio: '02-AUDIO/voiceover.mp3',
      visuals: '03-VISUALS',
      sources: '04-SOURCES/sources.txt',
      licenses: '04-SOURCES/licenses.csv',
      scenes: '05-PROJECT/scenes.json',
      wordTimings: '05-PROJECT/word-timings.json',
      timeline: '05-PROJECT/timeline.json',
      editPlan: '05-PROJECT/edit-plan.json',
      export: '06-EXPORT',
      finalVideo: '06-EXPORT/final-v1.mp4',
      youtubeTitle: '06-EXPORT/youtube-title.txt',
      youtubeDescription: '06-EXPORT/youtube-description.txt',
      youtubeTags: '06-EXPORT/youtube-tags.txt',
      thumbnailText: '06-EXPORT/thumbnail-text.txt'
    }
  };

  fs.writeFileSync(
    path.join(projectDirectory, '05-PROJECT', 'project.json'),
    `${JSON.stringify(project, null, 2)}\n`,
    'utf8'
  );

  return { projectDirectory, project };
}

export function createSceneDirectories(projectDirectory, sceneCount) {
  if (!Number.isInteger(sceneCount) || sceneCount < 1 || sceneCount > 999) {
    throw new Error('sceneCount muss eine ganze Zahl zwischen 1 und 999 sein.');
  }
  const visualRoot = path.join(projectDirectory, '03-VISUALS');
  fs.mkdirSync(visualRoot, { recursive: true });
  const directories = [];
  for (let index = 1; index <= sceneCount; index += 1) {
    const directory = path.join(visualRoot, `scene-${String(index).padStart(3, '0')}`);
    fs.mkdirSync(directory, { recursive: true });
    directories.push(directory);
  }
  return directories;
}

export function syncDocumentaryPhase1(projectDirectory, scriptVisualProject) {
  if (!scriptVisualProject || !Array.isArray(scriptVisualProject.scenes)) {
    throw new Error('Script-Visual-Projekt ist ungültig.');
  }
  fs.mkdirSync(path.join(projectDirectory, '05-PROJECT'), { recursive: true });
  fs.mkdirSync(path.join(projectDirectory, '01-SCRIPT'), { recursive: true });
  fs.writeFileSync(
    path.join(projectDirectory, '01-SCRIPT', 'script.txt'),
    `${String(scriptVisualProject.script ?? '').trim()}\n`,
    'utf8'
  );
  createSceneDirectories(projectDirectory, scriptVisualProject.scenes.length);

  const scenePlan = {
    format: 'visual-asset-hub-documentary-scenes',
    version: 1,
    sourceProjectId: scriptVisualProject.projectId ?? null,
    title: scriptVisualProject.title ?? '',
    scriptSha256: scriptVisualProject.scriptSha256 ?? null,
    generatedAt: new Date().toISOString(),
    timing: 'semantic-only-until-final-voiceover',
    scenes: scriptVisualProject.scenes.map((scene) => ({
      sceneId: scene.id,
      sequence: scene.sequence,
      originalText: scene.originalText,
      visualIntent: scene.visualIntent,
      visualIntentType: scene.visualIntentType,
      preferredMediaType: scene.preferredMediaType,
      symbolic: Boolean(scene.symbolic),
      queries: [...(scene.queries ?? [])],
      selectedPrimary: scene.selectedPrimary ?? null,
      selectedAlternatives: [...(scene.selectedAlternatives ?? [])]
    }))
  };

  fs.writeFileSync(
    path.join(projectDirectory, '05-PROJECT', 'scenes.json'),
    `${JSON.stringify(scenePlan, null, 2)}\n`,
    'utf8'
  );
  return scenePlan;
}

function requireText(value, field, min, max, trim = true) {
  const text = String(value ?? '');
  const normalized = trim ? text.trim() : text;
  if (normalized.trim().length < min) throw new Error(`${field} fehlt.`);
  if (normalized.length > max) throw new Error(`${field} ist zu lang.`);
  return normalized;
}

function parseArgs(argv) {
  const args = { title: '', scriptFile: '', outputRoot: DEFAULT_DOCUMENTARY_ROOT, overwrite: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--title') args.title = argv[++index] ?? '';
    else if (token === '--script-file') args.scriptFile = argv[++index] ?? '';
    else if (token === '--output-root') args.outputRoot = argv[++index] ?? '';
    else if (token === '--overwrite') args.overwrite = true;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.title) throw new Error('Pflichtargument fehlt: --title');
  if (!args.scriptFile) throw new Error('Pflichtargument fehlt: --script-file');
  return args;
}

function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const scriptPath = path.resolve(args.scriptFile);
  if (!fs.existsSync(scriptPath)) throw new Error(`Skriptdatei nicht gefunden: ${scriptPath}`);
  const script = fs.readFileSync(scriptPath, 'utf8');
  const result = createDocumentaryProject({
    title: args.title,
    script,
    outputRoot: args.outputRoot,
    overwrite: args.overwrite
  });
  process.stdout.write(`Doku-Projekt erstellt: ${result.projectDirectory}\n`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
