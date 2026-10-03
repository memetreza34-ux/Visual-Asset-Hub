import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { validateFinalRenderManifest } from './lib/render-guard.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  if (!args.manifest) throw new Error('--manifest ist erforderlich.');
  const manifestPath = path.resolve(args.manifest);
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest nicht gefunden: ${manifestPath}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const result = validateFinalRenderManifest(manifest);

  if (!result.ok) {
    console.error('RENDER BLOCKIERT: Nicht alle sichtbaren Beats besitzen ein echtes finales Visual.');
    for (const error of result.errors) console.error(`- ${error}`);
    console.error('Keine Placeholder-, Slot-, Source- oder Debug-Karten als Ersatz rendern.');
    process.exitCode = 1;
  } else {
    console.log('RENDER FREIGEGEBEN: Alle Beats besitzen finale visuelle Assets.');
    console.log('Erlaubt: echte Bilder, echte B-Rolls/Videos, akzeptierte KI-Bilder.');
    console.log('Technische Platzhalterkarten: verboten.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
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

function help() {
  console.log(`\nFinal Render Guard\n\nBlockiert den finalen Video-Render, solange Beats ohne echte finale Visuals existieren.\n\nBeispiel:\n  npm run render:check -- --manifest ./final-video-manifest.json\n\nVerboten als Ersatz:\n  Placeholder-Karten, REAL SOURCE ASSET-Karten, Slot-Karten, Produktionsnotizen, Debug-Frames.\n`);
}
