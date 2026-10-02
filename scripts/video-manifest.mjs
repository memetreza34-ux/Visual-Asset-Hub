import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildUnifiedVideoManifest } from './lib/video-manifest.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  for (const key of ['visual-plan', 'production-plan', 'flow-import-report', 'real-manifest']) {
    if (!args[key]) throw new Error(`--${key} ist erforderlich.`);
  }
  const visualPlan = readJson(args['visual-plan']);
  const productionPlan = readJson(args['production-plan']);
  const flowImportReport = readJson(args['flow-import-report']);
  const realManifest = readJson(args['real-manifest']);
  const timings = args.timings ? readJson(args.timings) : null;
  const result = buildUnifiedVideoManifest({ visualPlan, productionPlan, flowImportReport, realManifest, timings });
  const output = path.resolve(args.output ?? path.join(path.dirname(path.resolve(args['production-plan'])), 'final-video-manifest.json'));
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`Video-Manifest: ${result.status}`);
  console.log(`Bereite Beats: ${result.summary.ready_beats}/${result.summary.beats}`);
  console.log(`KI: ${result.summary.ai_selected}, Real: ${result.summary.real_selected}`);
  if (!result.summary.all_beats_timed) console.log('Voiceover-Timings fehlen noch; Manifest ist Asset-ready, aber noch keine finale Render-Timeline.');
  for (const item of result.missing) console.error(`OFFEN ${item.beat_id}: ${item.status} — ${item.required_action}`);
  console.log(`Datei: ${relative(output)}`);
  if (args.strict === 'true' && result.status === 'needs-resolution') process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function readJson(file) {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) throw new Error(`Datei nicht gefunden: ${resolved}`);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = argv[i + 1];
    args[key] = inline ?? (next && !next.startsWith('--') ? argv[++i] : 'true');
  }
  return args;
}

function relative(file) {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}

function help() {
  console.log(`\nUnified Video Asset Manifest\n\nVerbindet akzeptierte Flow-Bilder und echte B-Rolls/Fotos beat-genau in einem Manifest.\n\nBeispiel:\n  npm run video:manifest -- \\\n    --visual-plan ./visual-plan.json \\\n    --production-plan ./flow/flow-production-plan.json \\\n    --flow-import-report ./flow/final-images/flow-import-report.json \\\n    --real-manifest ./real-media/remotion-real-media.json \\\n    --timings ./beat-timings.json\n\nOhne --timings entsteht ein Asset-Manifest. Mit vollständigen Timings wird es zum Render-Handoff.\n`);
}
