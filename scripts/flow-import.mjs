import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  FLOW_IMAGE_EXTENSIONS,
  buildImportMapping,
  orderFlowImages,
  validateImportPlan
} from './lib/flow-import.mjs';

const args = parseArgs(process.argv.slice(2));
if (args.help === 'true') {
  help();
  process.exit(0);
}

try {
  if (!args['production-plan']) throw new Error('--production-plan ist erforderlich.');
  if (!args.cover) throw new Error('--cover muss auf das ausgewählte Cover zeigen.');
  if (!args.source) throw new Error('--source muss auf den Stage-2-Downloadordner zeigen.');

  const productionPlanPath = path.resolve(args['production-plan']);
  const coverPath = path.resolve(args.cover);
  const sourceDir = path.resolve(args.source);
  if (!fs.existsSync(productionPlanPath)) throw new Error(`Production Plan fehlt: ${productionPlanPath}`);
  if (!fs.existsSync(coverPath)) throw new Error(`Cover fehlt: ${coverPath}`);
  if (!fs.existsSync(sourceDir)) throw new Error(`Stage-2-Ordner fehlt: ${sourceDir}`);

  const productionPlan = JSON.parse(fs.readFileSync(productionPlanPath, 'utf8'));
  const files = walkImages(sourceDir);
  validateImportPlan(productionPlan, files);
  const ordered = orderFlowImages(files, String(args.order ?? 'auto'));
  const mapping = buildImportMapping(productionPlan, ordered, coverPath);
  const outputDir = path.resolve(args['output-dir'] ?? path.join(path.dirname(productionPlanPath), 'final-images'));
  const tempDir = path.join(outputDir, '.import-temp');
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const hashes = new Set();
  const reportItems = [];
  try {
    for (const item of mapping) {
      const source = path.resolve(item.source);
      const target = path.join(tempDir, item.target);
      convertOrCopy(source, target);
      const size = fs.statSync(target).size;
      if (size < 20_000) throw new Error(`${item.target} ist verdächtig klein (${size} Bytes).`);
      const hash = sha256(target);
      if (hashes.has(hash)) throw new Error(`Exaktes Bildduplikat erkannt: ${item.target}.`);
      hashes.add(hash);
      reportItems.push({
        image_number: item.image_number,
        beat_id: item.beat_id,
        role: item.role,
        source: relative(source),
        target: item.target,
        sha256: hash,
        bytes: size
      });
    }

    fs.mkdirSync(outputDir, { recursive: true });
    for (const name of fs.readdirSync(outputDir)) {
      if (/^Bild \d+\.png$/i.test(name)) fs.rmSync(path.join(outputDir, name), { force: true });
    }
    for (const item of reportItems) {
      fs.renameSync(path.join(tempDir, item.target), path.join(outputDir, item.target));
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const report = {
    version: 1,
    strategy: 'safe-flow-final-image-import',
    production_plan: relative(productionPlanPath),
    cover_source: relative(coverPath),
    stage2_source: relative(sourceDir),
    ordering: String(args.order ?? 'auto'),
    count: reportItems.length,
    expected_count: productionPlan.images.length,
    output_dir: relative(outputDir),
    items: reportItems
  };
  const reportPath = path.join(outputDir, 'flow-import-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Flow-Import OK: ${report.count}/${report.expected_count} finale Bilder.`);
  console.log(`Ordner: ${relative(outputDir)}`);
  console.log(`Report: ${relative(reportPath)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function walkImages(root) {
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && FLOW_IMAGE_EXTENSIONS.test(entry.name)) {
        const stats = fs.statSync(full);
        out.push({ path: full, name: entry.name, relative: path.relative(root, full), mtimeMs: stats.mtimeMs });
      }
    }
  };
  visit(root);
  return out;
}

function convertOrCopy(source, target) {
  if (/\.png$/i.test(source)) {
    fs.copyFileSync(source, target);
    return;
  }
  const result = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', source, '-frames:v', '1', target], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`FFmpeg-Konvertierung fehlgeschlagen: ${(result.stderr || '').trim()}`);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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
  console.log(`\nSicherer Google-Flow-Bildimport\n\nAblauf:\n  1. Nutzer wählt Cover A/B/C.\n  2. Dieses Cover separat als --cover übergeben.\n  3. In --source liegen ausschließlich die akzeptierten Stage-2-Bilder.\n  4. Import prüft exakte Anzahl, sichere Reihenfolge, Mindestgröße und Duplikate.\n\nBeispiel:\n  npm run flow:import -- \\\n    --production-plan ./flow/flow-production-plan.json \\\n    --cover ./downloads/selected-cover.png \\\n    --source ./downloads/stage2 \\\n    --order auto\n\nAusgabe:\n  final-images/Bild 01.png ... Bild NN.png\n  final-images/flow-import-report.json\n`);
}
