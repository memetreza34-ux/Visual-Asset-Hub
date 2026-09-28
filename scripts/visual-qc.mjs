import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const projectId = slug(args.project || '');
if (!projectId) fail('--project ist erforderlich.');
const projectDir = path.join(root, 'projects', projectId);
const materializationFile = path.resolve(args.materialization || path.join(projectDir, 'materialization.json'));
if (!fs.existsSync(materializationFile)) fail(`Materialisierung fehlt: ${relative(materializationFile)}`);
const materialization = readJson(materializationFile);
const requireClip = args.requireClip === 'true';
const minScore = number(args.minScore || '70', 0, 100, 'min-score');
const report = {
  version: 1,
  generatedAt: new Date().toISOString(),
  projectId,
  sourceMaterialization: relative(materializationFile),
  policy: {
    minimumScore: minScore,
    semanticEngine: 'OpenCLIP when locally available',
    watermarkDetection: 'manual-required',
    eventIdentity: 'manual-or-authoritative-source-review-required',
    unknownRightsPublishable: false,
    note: 'QC kombiniert technische Qualität, Rechte, Archive-Priorität, Materializer-Score und optional OpenCLIP. Kein Modell beweist Ereignisidentität oder Rechte.'
  },
  beats: []
};

const shaSeen = new Map();
for (const beat of materialization.beats || []) {
  const result = { id: beat.id, narrationAnchor: beat.narrationAnchor, visualIntent: beat.visualIntent, candidates: [] };
  const candidateById = new Map((beat.candidates || []).map((candidate) => [candidate.candidateId, candidate]));
  for (const download of beat.downloads || []) {
    if (download.status !== 'downloaded' || !download.file) continue;
    const candidate = candidateById.get(download.candidateId);
    const absolute = path.resolve(root, download.file);
    if (!fs.existsSync(absolute)) {
      result.candidates.push({ candidateId: download.candidateId, file: download.file, status: 'blocked-missing-file', score: 0, blockers: ['file-missing'] });
      continue;
    }
    const analysis = analyze(absolute);
    const semanticFile = semanticFrame(absolute, analysis);
    const semantic = semanticFile ? runClip(beat.visualIntent || beat.narrationAnchor || candidate?.title || '', semanticFile, beat.id, download.candidateId) : null;
    const qc = score({ beat, candidate, analysis, semantic, minScore, requireClip, duplicateOf: analysis.sha256 ? shaSeen.get(analysis.sha256) : null });
    if (analysis.sha256 && !shaSeen.has(analysis.sha256)) shaSeen.set(analysis.sha256, `${beat.id}:${download.candidateId}`);
    result.candidates.push({
      candidateId: download.candidateId,
      file: download.file,
      preview: analysis.previewPath || download.preview || null,
      analysis,
      semantic,
      ...qc
    });
  }
  result.bestCandidateId = result.candidates.filter((x) => !x.status.startsWith('blocked')).sort((a, b) => b.score - a.score)[0]?.candidateId || null;
  result.status = result.bestCandidateId ? 'qc-candidate-ready-for-editorial-review' : 'blocked-no-qc-candidate';
  report.beats.push(result);
}

report.summary = {
  beats: report.beats.length,
  withCandidate: report.beats.filter((x) => x.bestCandidateId).length,
  blocked: report.beats.filter((x) => !x.bestCandidateId).length,
  testedFiles: report.beats.reduce((sum, x) => sum + x.candidates.length, 0)
};
const output = path.resolve(args.output || path.join(projectDir, 'visual-qc.json'));
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Visual QC: ${relative(output)}`);
console.log(`${report.summary.withCandidate}/${report.summary.beats} Beats mit QC-Kandidat · ${report.summary.testedFiles} Dateien geprüft`);

function score({ beat, candidate, analysis, semantic, minScore: threshold, requireClip: mustClip, duplicateOf }) {
  let value = Math.round(Number(candidate?.editorialScore || 0) * 0.45);
  const signals = [];
  const blockers = [];
  const longest = Math.max(Number(analysis.technical?.width || 0), Number(analysis.technical?.height || 0));
  if (longest >= 1920) { value += 14; signals.push('resolution>=1920'); }
  else if (longest >= 1280) { value += 10; signals.push('resolution>=1280'); }
  else if (longest >= 960) { value += 4; signals.push('resolution>=960'); }
  else { value -= 12; blockers.push('resolution-too-low'); }

  const orientation = analysis.orientation;
  if (beat.presentation === 'vertical-blur') {
    if (orientation === 'vertical') { value += 7; signals.push('vertical-fit'); }
  } else if (orientation === 'horizontal') { value += 5; signals.push('horizontal-fit'); }

  const rights = candidate?.rights?.license_status || 'unknown';
  if (rights === 'public-domain') { value += 15; signals.push('public-domain'); }
  else if (rights === 'licensed') { value += 10; signals.push('licensed'); }
  else if (rights === 'restricted') { value -= 35; blockers.push('restricted-rights'); }
  else { value -= 18; blockers.push('unknown-rights'); }

  if (candidate?.providerTier === 'official-archive') { value += 10; signals.push('official-archive'); }
  else if (candidate?.providerTier === 'archive') { value += 6; signals.push('archive'); }
  else if (candidate?.providerTier === 'stock-fallback') { value -= 12; signals.push('stock-fallback'); }

  const similarity = semantic?.clipSimilarity;
  if (Number.isFinite(similarity)) {
    const semanticPoints = clamp(Math.round((similarity - 0.12) * 90), -8, 18);
    value += semanticPoints;
    signals.push(`clip=${similarity}`);
    if (similarity < 0.16) blockers.push('semantic-match-weak');
  } else if (mustClip) blockers.push('semantic-qc-unavailable');

  if (duplicateOf) { value -= 20; blockers.push(`duplicate-of:${duplicateOf}`); }
  if (analysis.technical?.durationSeconds != null && analysis.technical.durationSeconds < 1.5 && candidate?.type === 'video') blockers.push('video-too-short');

  value = clamp(value, 0, 100);
  const hardBlocked = blockers.some((x) => x === 'restricted-rights' || x === 'semantic-qc-unavailable' || x === 'video-too-short' || x.startsWith('duplicate-of:'));
  const status = hardBlocked || value < threshold ? 'blocked' : rights === 'unknown' ? 'review-rights' : 'review-event-identity';
  return {
    score: value,
    status,
    signals,
    blockers,
    manualChecks: ['confirm-exact-event-or-subject', 'check-watermark-or-burned-in-logo', 'verify-source-page-and-license', 'confirm-crop-does-not-remove-required-attribution']
  };
}

function analyze(file) {
  const result = spawnSync(process.execPath, ['scripts/analyze-media.mjs', '--file', file], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) return { error: (result.stderr || result.stdout || 'analysis failed').trim(), technical: {} };
  try { return JSON.parse(result.stdout); } catch { return { error: 'invalid analysis JSON', technical: {} }; }
}

function semanticFrame(file, analysis) {
  const ext = path.extname(file).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff'].includes(ext)) return file;
  if (analysis.previewPath) {
    const preview = path.resolve(root, analysis.previewPath);
    if (fs.existsSync(preview)) return preview;
  }
  return null;
}

function runClip(query, image, beatId, candidateId) {
  if (!query || !image) return null;
  const dir = path.join(root, '.local-storage', 'visual-qc', projectId);
  fs.mkdirSync(dir, { recursive: true });
  const output = path.join(dir, `${safeName(beatId)}-${safeName(candidateId)}.json`);
  const result = spawnSync('python3', ['scripts/visual-match.py', '--query', query, '--images', image, '--output', output], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0 || !fs.existsSync(output)) return { available: false, error: (result.stderr || result.stdout || 'OpenCLIP unavailable').trim().slice(0, 1000) };
  try {
    const data = JSON.parse(fs.readFileSync(output, 'utf8'));
    const first = data.results?.[0];
    return { available: true, engine: data.engine, model: data.model, clipSimilarity: first?.clipSimilarity ?? null, relativeScore: first?.relativeScore ?? null, report: relative(output) };
  } catch { return { available: false, error: 'invalid OpenCLIP report' }; }
}

function number(value, min, max, label) { const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function safeName(value) { return String(value || 'item').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'item'; }
function slug(value) { return safeName(value); }
function relative(file) { const rel = path.relative(root, file); return rel.startsWith('..') ? file : rel.split(path.sep).join('/'); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON ungültig: ${relative(file)} – ${error.message}`); } }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Visual QC\n\n  npm run visual:qc -- --project <id>\n\nPrüft heruntergeladene Materializer-Kandidaten auf:\n- Auflösung / Orientierung / Mindestdauer\n- Rechte-Status\n- Archive-vs-Stock-Qualität\n- Duplikate\n- optional lokale OpenCLIP-Passung zum Visual-Intent\n\nOpenCLIP ist optional. Mit --require-clip true wird fehlendes OpenCLIP zum Blocker.\nWatermarks und exakte Ereignisidentität bleiben bewusst Review-Punkte.`); }
