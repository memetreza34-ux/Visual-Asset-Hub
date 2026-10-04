import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { isAllowedDownloadHost } from './lib/providers/index.mjs';
import { buildCreditLines, chooseDownload } from './lib/real-media.mjs';
import { analyzeVideo, downloadAsset, writeMetadata } from './lib/real-media-files.mjs';
import {
  applyAlternate,
  approveBindings,
  dropAlternate,
  findRejectable,
  nextAlternate,
  rejectBinding,
  syncResolution
} from './lib/real-media-review.mjs';

const root = process.cwd();
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
  const replace = booleanOption(args.replace, true, 'replace');

  if (approve.length || reject.length) {
    const { approved, unknown } = approveBindings({ timeline, resolution, approve, exclude: reject });
    const replaced = [];
    const rejected = [];
    for (const beatId of reject) {
      const binding = findRejectable(timeline, beatId);
      if (!binding) {
        unknown.push(beatId);
        continue;
      }
      const resolutionItem = resolution?.items?.find((item) => item.beat_id === beatId) ?? null;
      const alternate = replace ? await replaceWithAlternate({ binding, resolutionItem, timeline, resolution, dir }) : null;
      if (alternate) {
        replaced.push(`${beatId} → ${alternate.title ?? alternate.provider_id}`);
      } else {
        rejectBinding({ binding, resolutionItem });
        rejected.push(beatId);
      }
    }
    syncResolution(resolution, timeline);

    fs.writeFileSync(timelinePath, `${JSON.stringify(timeline, null, 2)}\n`);
    if (resolution) fs.writeFileSync(resolutionPath, `${JSON.stringify(resolution, null, 2)}\n`);
    const credits = buildCreditLines(timeline.bindings);
    fs.writeFileSync(path.join(dir, 'credits.txt'), credits.length ? `Bild- und Videoquellen:\n${credits.join('\n')}\n` : '');

    console.log(`Freigegeben: ${approved.join(', ') || '–'}`);
    if (replaced.length) console.log(`Durch Alternative ersetzt (bitte neu prüfen):\n  ${replaced.join('\n  ')}`);
    if (rejected.length) {
      console.log(`Abgelehnt ohne Ersatz: ${rejected.join(', ')}`);
      console.log('  Keine passende Alternative mehr. Andere Suchbegriffe bei --entities versuchen oder Quelle manuell besorgen.');
    }
    if (unknown.length) console.log(`Nicht im Review gefunden: ${unknown.join(', ')}`);
    console.log(`Credits für die YouTube-Beschreibung: ${relative(path.join(dir, 'credits.txt'))}`);
    if (replaced.length) {
      console.log('');
      printOpenReviews(timeline, dir);
    }
  } else {
    printOpenReviews(timeline, dir);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

/** Lädt die nächstbeste noch ungenutzte Alternative; gibt sie zurück oder null, wenn keine mehr ladbar ist. */
async function replaceWithAlternate({ binding, resolutionItem, timeline, resolution, dir }) {
  const maxDimension = resolution?.options?.maxDimension ?? 1920;
  let alternate;
  while ((alternate = nextAlternate({ binding, resolutionItem, bindings: timeline.bindings }))) {
    const downloads = alternate.downloads.filter((file) => isAllowedDownloadHost(alternate.provider, file.url));
    const choice = chooseDownload({ ...alternate, downloads }, { maxDimension });
    if (!choice) {
      dropAlternate(resolutionItem, alternate);
      continue;
    }
    try {
      const request = { id: binding.id, beat_id: binding.beat_id, reason: binding.reason };
      const target = await downloadAsset({ item: request, selected: alternate, download: choice, mediaDir: path.join(dir, 'files') });
      const analyzed = alternate.type === 'video' ? analyzeVideo(target, { root }) : {
        width: choice.width ?? alternate.width ?? null,
        height: choice.height ?? alternate.height ?? null,
        orientation: alternate.orientation ?? null
      };
      fs.mkdirSync(path.join(dir, 'metadata'), { recursive: true });
      writeMetadata({ item: request, selected: alternate, download: choice, target, technical: analyzed, metaDir: path.join(dir, 'metadata'), queries: resolutionItem?.queries ?? [], root });
      applyAlternate({ binding, resolutionItem, alternate, localFile: relative(target), technical: analyzed?.technical ?? analyzed });
      return alternate;
    } catch (error) {
      console.warn(`${binding.beat_id}: Alternative ${alternate.provider_id} nicht ladbar (${error instanceof Error ? error.message : String(error)}).`);
      dropAlternate(resolutionItem, alternate);
    }
  }
  return null;
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
    const round = binding.replaced?.length ? `  (Ersatz Nr. ${binding.replaced.length})` : '';
    console.log(`${binding.beat_id}  [${binding.provider}] ${binding.title ?? binding.provider_id}${round}`);
    console.log(`  Datei:   ${binding.local_file}`);
    console.log(`  Quelle:  ${binding.source_url}`);
    console.log(`  Lizenz:  ${rights.license_code ?? 'unbekannt'}${rights.attribution_required ? ' (Credit nötig)' : ''}`);
    if (rights.warning) console.log(`  Hinweis: ${rights.warning}`);
    console.log('');
  }
  const rel = relative(dir);
  console.log('Prüfen: Zeigt das Bild wirklich das Richtige? Passt die Lizenz?');
  console.log(`Freigeben: npm run real:review -- --dir ${rel} --approve ${open.map((b) => b.beat_id).join(',')}`);
  console.log(`Ablehnen:  npm run real:review -- --dir ${rel} --reject beat-XXX   (lädt automatisch die nächste Alternative)`);
}

function listOption(value) {
  if (!value || value === 'true') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function booleanOption(value, fallback, name) {
  if (value === undefined) return fallback;
  const normalized = String(value).toLowerCase();
  if (!['true', 'false'].includes(normalized)) throw new Error(`${name} muss true oder false sein.`);
  return normalized === 'true';
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
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

Beim Ablehnen wird automatisch die nächstbeste Alternative geladen (aus den bei
real:integrate gespeicherten Alternativen). Sie muss dann erneut geprüft werden.
Sind keine Alternativen mehr übrig, bekommt der Beat Status rejected.

Beispiele:
  npm run real:review -- --dir <real-media-ordner>
  npm run real:review -- --dir <real-media-ordner> --approve beat-004,beat-007
  npm run real:review -- --dir <real-media-ordner> --approve all --reject beat-010
  npm run real:review -- --dir <real-media-ordner> --reject beat-010 --replace false

Optionen:
  --dir <pfad>              real-media-Ordner (erforderlich)
  --approve <ids|all>       Treffer freigeben
  --reject <ids>            Treffer ablehnen und durch Alternative ersetzen
  --replace <true|false>    Alternative laden; Standard: true

credits.txt wird nach jeder Änderung neu geschrieben.
`);
}
