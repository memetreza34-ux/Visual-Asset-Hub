import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createDocumentaryProject, syncDocumentaryPhase1 } from './documentary-project.mjs';

function parseArgs(argv) {
  const args = { projectFile: '', outputRoot: undefined, overwrite: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--project') args.projectFile = argv[++index] ?? '';
    else if (token === '--output-root') args.outputRoot = argv[++index] ?? '';
    else if (token === '--overwrite') args.overwrite = true;
    else throw new Error(`Unbekanntes Argument: ${token}`);
  }
  if (!args.projectFile) throw new Error('Pflichtargument fehlt: --project');
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectFile = path.resolve(args.projectFile);
  if (!fs.existsSync(projectFile)) throw new Error(`Projektdatei nicht gefunden: ${projectFile}`);
  const source = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
  if (source.format !== 'visual-asset-hub-script-visual-project') {
    throw new Error('Die Datei ist kein Script-Visual-Projekt.');
  }
  if (!source.title || !source.script || !Array.isArray(source.scenes) || source.scenes.length < 1) {
    throw new Error('Script-Visual-Projekt ist unvollständig.');
  }

  const shortId = String(source.projectId ?? '').replace(/^SVP-/, '').slice(-6).toLowerCase();
  const slug = shortId ? `${source.title}-${shortId}` : source.title;
  const options = {
    title: source.title,
    script: source.script,
    slug,
    overwrite: args.overwrite
  };
  if (args.outputRoot) options.outputRoot = args.outputRoot;

  const { projectDirectory } = createDocumentaryProject(options);
  syncDocumentaryPhase1(projectDirectory, source);
  process.stdout.write(`Doku-Projekt aus Script Visual Finder erstellt: ${projectDirectory}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
