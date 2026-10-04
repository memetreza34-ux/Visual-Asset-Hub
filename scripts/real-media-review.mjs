import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildCreditLines } from './lib/real-media.mjs';
import { applyReviewDecisions } from './lib/real-media-review.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  if (!args.dir) throw new Error('--dir muss auf den real-media-Ordner zeigen (enthält remotion-real-media.json).');
  const dir = path.resolve(String(args.dir));
  const timelinePath = path.join(dir, 'remotion-real-media.json');
  const resolutionPath = path.join(dir, 'real-media-resolution.json');
  if (!fs.existsSync(timelinePath)) throw new Error(`Nicht gefunden: ${timelinePath}`);

  const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const resolution = fs.existsSync(resolutionPath) ? JSON.parse(fs.readFileSync(resolutionPath, 'utf8')) : null;
  const approve = listOption(args.approve);
  const reject = listOption(args.reject);

  if (approve.length || reject.length) {
    const result = applyReviewDecisions({ timeline, resolution, approve, reject });
    fs.writeFileSync(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`);
    if (resolution) fs.writeFileSync(resolutionPath, `${JSON.stringify(resolution, null, 2)}\n`);
    const credits = buildCreditLines(timeline.bindings);
    fs.writeFileSync(path.join(dir, 'credits.txt'), credits.length ? `Bild- und Videoquellen:\n${credits.join('\n')}\n` : '');
    console.log(`Freigegeben: ${result.approved.join(', ') || '–'}`);
    console.log(`Abgelehnt: ${result.rejected.join(', ') || '–'}`);
    if (result.unknown.length) console.log(`Nicht im Review gefunden: ${result.unknown.join(', ')}`);
    console.log(`Credits für die YouTube-Beschreibung: ${path.relative(process.cwd(), path.join(dir, 'credits.txt'))}`);
  } else {
    printOpenReviews(timeline, dir);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function printOpenReviews(timeline, dir) {
  const open = (timeline.bindings ?? []).filter((binding) => binding.status === 'review-required');
  if (!open.length) {
    console.log('Nichts zu prüfen.');
    return;
  }
  console.log(`${open.length} Treffer warten auf deine Prüfung:\n`);
  for (const binding of open) {
    const rights = binding.rights ?? {};
    console.log(`${binding.beat_id}  [${binding.provider}] ${binding.title ?? binding.provider_id}`);
    console.log(`  Datei:   ${binding.local_file}`);
    console.log(`  Quelle:  ${binding.source_url}`);
    console.log(`  Lizenz:  ${rights.license_code ?? 'unbekannt'}${rights.attribution_required ? ' (Credit nötig)' : ''}`);
    if (rights.warning) console.log(`  Hinweis: ${rights.warning}`);
    console.log('');
  }
  const rel = path.relative(process.cwd(), dir);
  console.log('Prüfen: Zeigt das Bild wirklich das Richtige? Passt die Lizenz?');
  console.log(`Freigeben: npm run real:review -- --dir ${rel} --approve ${open.map((b) => b.beat_id).join(',')}`);
  console.log(`Ablehnen:  npm run real:review -- --dir ${rel} --reject beat-XXX`);
}

function listOption(value) {
  if (!value || value === 'true') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = argv[index + 1];
    parsed[key] = inline ?? (next && !next.startsWith('--') ? argv[++index] : 'true');
  }
  return parsed;
}

function help() {
  console.log(`
Real Media Review

Zeigt alle Archiv-Treffer (Marken, Produkte, Ereignisse, Geschichte), die vor dem
Render geprüft werden müssen, und gibt sie frei oder lehnt sie ab.

Beispiele:
  npm run real:review -- --dir <real-media-ordner>
  npm run real:review -- --dir <real-media-ordner> --approve beat-004,beat-007
  npm run real:review -- --dir <real-media-ordner> --approve all
  npm run real:review -- --dir <real-media-ordner> --reject beat-010

Freigegebene Treffer bekommen Status ready, abgelehnte Status rejected
(der Beat braucht dann eine andere Quelle). credits.txt wird neu geschrieben.
`);
}
