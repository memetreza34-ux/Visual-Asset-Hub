import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const python = process.env.PYTHON || 'python3';
const [command = 'help', ...rest] = process.argv.slice(2);
const args = parseArgs(rest);

const helpers = {
  research: path.join(root, 'scripts', 'tooling', 'research_extract.py'),
  quality: path.join(root, 'scripts', 'tooling', 'image_quality.py'),
  memory: path.join(root, 'scripts', 'tooling', 'asset_memory.py'),
  dedupe: path.join(root, 'scripts', 'tooling', 'visual_dedupe.py'),
  crop: path.join(root, 'scripts', 'tooling', 'smart_crop.py'),
  whisperx: path.join(root, 'scripts', 'tooling', 'voiceover_precision.py')
};

const handlers = {
  doctor,
  'research-extract': researchExtract,
  archive: archiveSource,
  'media-qc': mediaQc,
  'image-prepare': imagePrepare,
  'image-quality': imageQuality,
  'asset-memory-index': assetMemoryIndex,
  'asset-memory-search': assetMemorySearch,
  'audio-prepare': audioPrepare,
  'voiceover-precision': voiceoverPrecision,
  'final-qc': finalQc,
  'safe-fetch': safeFetch,
  'visual-dedupe': visualDedupe,
  'smart-crop': smartCrop,
  enhance: enhanceImage,
  help
};

if (!handlers[command]) fail(`Unbekannter Toolbox-Befehl: ${command}\nNutze: npm run tools -- help`);
await handlers[command]();

async function doctor() {
  const checks = [
    ['FFmpeg', binary('ffmpeg'), 'core', 'Schnitt, Frames, Audio'],
    ['ffprobe', binary('ffprobe'), 'core', 'Medienmetadaten'],
    ['MediaInfo', binary('mediainfo'), 'light', 'zusätzliche technische Medien-QC'],
    ['Trafilatura', pyModule('trafilatura'), 'light', 'saubere Artikel-/Webtext-Extraktion'],
    ['ArchiveBox', binary('archivebox'), 'light', 'lokales Quellenarchiv'],
    ['Sharp/libvips', nodeModule('sharp'), 'light', 'schnelle 16:9-Crops/Resize'],
    ['sqlite-vec', pyModule('sqlite_vec'), 'light', 'lokale semantische Asset-Suche'],
    ['OpenCLIP', pyModule('open_clip'), 'light', 'Text↔Bild-Relevanz / Asset-Memory'],
    ['pyiqa', pyModule('pyiqa'), 'optional', 'Bildqualitätsmetriken'],
    ['WhisperX', pyModule('whisperx'), 'optional', 'wortgenaue Voiceover-Timings'],
    ['ffmpeg-normalize', binary('ffmpeg-normalize'), 'light', 'Loudness-Normalisierung'],
    ['VMAF', ffmpegFilter('libvmaf'), 'light', 'Final-Encode-QC mit Referenz'],
    ['gallery-dl', binary('gallery-dl'), 'optional', 'rechtegeprüfter Medienabruf'],
    ['yt-dlp', binary('yt-dlp'), 'optional', 'Referenz/erlaubte Videoquellen'],
    ['DINOv2/Transformers', pyModule('transformers'), 'heavy', 'visuelle Dubletten/Ähnlichkeit'],
    ['Segment Anything', pyModule('segment_anything'), 'heavy', 'optionaler Motiv-Crop'],
    ['Real-ESRGAN', binary('realesrgan-ncnn-vulkan'), 'heavy', 'optionales, gekennzeichnetes Upscaling']
  ];
  const rows = checks.map(([name, ok, tier, role]) => ({ name, available: ok, tier, role }));
  const result = {
    version: 1,
    generatedAt: new Date().toISOString(),
    policy: {
      coreMustWork: true,
      optionalToolsNeverBlockNormalWorkflow: true,
      heavyAiToolsDefaultOff: true,
      remotionSyntheticExplainers: false
    },
    tools: rows
  };
  printJson(result, args.output);
  const missingCore = rows.filter((x) => x.tier === 'core' && !x.available);
  if (missingCore.length) process.exitCode = 2;
}

async function researchExtract() {
  requireArg('url');
  if (!pyModule('trafilatura')) fail('Trafilatura fehlt. Optional installieren: python3 -m pip install trafilatura');
  run(python, [helpers.research, '--url', args.url, ...(args.output ? ['--output', path.resolve(args.output)] : [])], true);
}

async function archiveSource() {
  requireArg('url');
  if (binary('archivebox')) {
    const archiveDir = path.resolve(args.dir || '.local-storage/archivebox');
    fs.mkdirSync(archiveDir, { recursive: true });
    run('archivebox', ['add', '--depth=0', args.url], true, { cwd: archiveDir });
    return;
  }
  console.warn('ArchiveBox fehlt – nutze vorhandenen Playwright-Capture als leichten Fallback.');
  const result = spawnSync(process.execPath, ['scripts/article-capture.mjs', args.url], { cwd: root, encoding: 'utf8', stdio: 'inherit' });
  if (result.status !== 0) fail('Weder ArchiveBox noch der Capture-Fallback konnten die Quelle sichern.');
}

async function mediaQc() {
  requireFile('file');
  const file = path.resolve(args.file);
  let payload;
  if (binary('mediainfo')) {
    const out = run('mediainfo', ['--Output=JSON', file], false);
    try { payload = JSON.parse(out.stdout); } catch { payload = { raw: out.stdout }; }
    payload.tool = 'MediaInfo';
  } else {
    const out = run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-print_format', 'json', file], false);
    payload = JSON.parse(out.stdout);
    payload.tool = 'ffprobe-fallback';
  }
  printJson(payload, args.output);
}

async function imagePrepare() {
  requireFile('file');
  const input = path.resolve(args.file);
  const width = positiveInt(args.width || '1920', 'width');
  const height = positiveInt(args.height || '1080', 'height');
  const output = path.resolve(args.output || defaultSibling(input, '-16x9.jpg'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (nodeModule('sharp')) {
    const { default: sharp } = await import('sharp');
    const position = args.smart === 'false' ? 'centre' : 'attention';
    await sharp(input).rotate().resize({ width, height, fit: 'cover', position }).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(output);
  } else {
    console.warn('Sharp fehlt – FFmpeg-Center-Crop-Fallback wird benutzt.');
    run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`, '-frames:v', '1', output], true);
  }
  writeDerivedSidecar(output, { source: rel(input), operation: 'image-prepare', width, height, syntheticContentAdded: false });
  console.log(rel(output));
}

async function imageQuality() {
  requireFile('file');
  if (!pyModule('pyiqa')) fail('pyiqa fehlt. Optional installieren: python3 -m pip install pyiqa');
  const values = [helpers.quality, '--file', path.resolve(args.file)];
  if (args.deep === 'true') values.push('--deep');
  if (args.output) values.push('--output', path.resolve(args.output));
  run(python, values, true);
}

async function assetMemoryIndex() {
  requireFile('file');
  if (!pyModule('sqlite_vec') || !pyModule('open_clip')) fail('Asset Memory benötigt sqlite-vec + OpenCLIP. Sie bleibt optional.');
  const values = [helpers.memory, 'index', '--db', path.resolve(args.db || '.local-storage/asset-memory.sqlite'), '--file', path.resolve(args.file)];
  if (args.id) values.push('--id', args.id);
  if (args.title) values.push('--title', args.title);
  run(python, values, true);
}

async function assetMemorySearch() {
  requireArg('query');
  if (!pyModule('sqlite_vec') || !pyModule('open_clip')) fail('Asset Memory benötigt sqlite-vec + OpenCLIP.');
  run(python, [helpers.memory, 'search', '--db', path.resolve(args.db || '.local-storage/asset-memory.sqlite'), '--query', args.query, '--limit', args.limit || '8'], true);
}

async function audioPrepare() {
  requireFile('file');
  const input = path.resolve(args.file);
  const output = path.resolve(args.output || defaultSibling(input, '-normalized.wav'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  if (binary('ffmpeg-normalize')) {
    run('ffmpeg-normalize', [input, '-o', output, '-f', '-nt', 'ebu', '-t', args.lufs || '-16', '-lrt', '11', '-tp', '-1.5'], true);
  } else {
    console.warn('ffmpeg-normalize fehlt – FFmpeg loudnorm Fallback wird benutzt.');
    run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-af', `loudnorm=I=${args.lufs || '-16'}:LRA=11:TP=-1.5`, output], true);
  }
  console.log(rel(output));
}

async function voiceoverPrecision() {
  requireFile('file');
  if (!pyModule('whisperx')) fail('WhisperX fehlt. Der normale whisper.cpp-Weg bleibt verfügbar: npm run voiceover:align');
  const values = [helpers.whisperx, '--file', path.resolve(args.file), '--output', path.resolve(args.output || '.local-storage/whisperx/word-timings.json')];
  if (args.language) values.push('--language', args.language);
  if (args.model) values.push('--model', args.model);
  run(python, values, true);
}

async function finalQc() {
  requireFile('file');
  const file = path.resolve(args.file);
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-print_format', 'json', file], false).stdout);
  const report = {
    version: 1,
    file: rel(file),
    generatedAt: new Date().toISOString(),
    technical: probe,
    vmaf: null,
    policy: { vmafOptional: true, finalQcDoesNotReplaceHumanEditorialReview: true }
  };
  if (args.reference) {
    const reference = path.resolve(args.reference);
    if (!fs.existsSync(reference)) fail('VMAF-Referenzdatei fehlt.');
    if (ffmpegFilter('libvmaf')) {
      const log = path.resolve(args.vmafLog || '.local-storage/final-qc/vmaf.json');
      fs.mkdirSync(path.dirname(log), { recursive: true });
      run('ffmpeg', ['-v', 'error', '-i', file, '-i', reference, '-lavfi', `[0:v][1:v]libvmaf=log_fmt=json:log_path=${escapeFilterPath(log)}`, '-f', 'null', '-'], true);
      report.vmaf = { tool: 'libvmaf', log: rel(log) };
    } else {
      report.vmaf = { skipped: true, reason: 'FFmpeg wurde ohne libvmaf gebaut.' };
    }
  }
  printJson(report, args.output);
}

async function safeFetch() {
  requireArg('url');
  if (args.rightsCleared !== 'true') fail('Download blockiert. Nutze --rights-cleared true nur für Material, dessen Nutzung vorher geprüft wurde.');
  const output = path.resolve(args.output || '.local-storage/safe-fetch');
  fs.mkdirSync(output, { recursive: true });
  const tool = args.tool || (binary('gallery-dl') ? 'gallery-dl' : 'yt-dlp');
  if (tool === 'gallery-dl') {
    if (!binary('gallery-dl')) fail('gallery-dl fehlt.');
    run('gallery-dl', ['-D', output, args.url], true);
  } else {
    if (!binary('yt-dlp')) fail('yt-dlp fehlt.');
    run('yt-dlp', ['--no-playlist', '-P', output, args.url], true);
  }
  fs.writeFileSync(path.join(output, 'RIGHTS-REVIEW.txt'), `URL: ${args.url}\nDownloaded after explicit --rights-cleared true.\nThis flag records workflow intent; it is not legal proof of rights.\n`);
}

async function visualDedupe() {
  const images = String(args.images || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => path.resolve(x));
  if (images.length < 2) fail('Nutze --images a.jpg,b.jpg,...');
  if (!pyModule('transformers')) fail('DINOv2-Dedupe ist optional und benötigt transformers + torch.');
  run(python, [helpers.dedupe, '--images', ...images, '--threshold', args.threshold || '0.94', ...(args.output ? ['--output', path.resolve(args.output)] : [])], true);
}

async function smartCrop() {
  requireFile('file');
  requireArg('prompt');
  if (!pyModule('transformers')) {
    console.warn('GroundingDINO/Transformers fehlt – nutze normalen Sharp-Attention-Crop.');
    args.output ||= defaultSibling(path.resolve(args.file), '-smartcrop.jpg');
    return imagePrepare();
  }
  const values = [helpers.crop, '--file', path.resolve(args.file), '--prompt', args.prompt, '--output', path.resolve(args.output || defaultSibling(path.resolve(args.file), '-smartcrop.jpg')), '--width', args.width || '1920', '--height', args.height || '1080'];
  if (args.sam === 'true') values.push('--sam');
  run(python, values, true);
}

async function enhanceImage() {
  requireFile('file');
  if (args.allowAiEnhancement !== 'true') fail('AI-Upscaling ist standardmäßig AUS. Für bewusstes Upscaling: --allow-ai-enhancement true');
  if (!binary('realesrgan-ncnn-vulkan')) fail('Real-ESRGAN Binary fehlt. Dieses schwere Tool bleibt optional.');
  const input = path.resolve(args.file);
  const output = path.resolve(args.output || defaultSibling(input, '-enhanced.png'));
  run('realesrgan-ncnn-vulkan', ['-i', input, '-o', output, '-s', args.scale || '2'], true);
  writeDerivedSidecar(output, {
    source: rel(input),
    operation: 'realesrgan-upscale',
    aiEnhanced: true,
    warning: 'AI-Upscaling kann Details halluzinieren. Nicht als forensische oder wissenschaftliche Detailquelle behandeln.'
  });
  console.log(rel(output));
}

function help() {
  console.log(`Visual Asset Hub – Open-Source Toolbox\n\nEinfacher Einstieg:\n  npm run tools -- doctor\n\nLeichte Produktionswerkzeuge:\n  npm run tools -- research-extract --url <URL>\n  npm run tools -- archive --url <URL>\n  npm run tools -- media-qc --file <datei>\n  npm run tools -- image-prepare --file <bild> --output <bild.jpg>\n  npm run tools -- image-quality --file <bild>\n  npm run tools -- audio-prepare --file <voiceover.wav>\n  npm run tools -- final-qc --file <final.mp4>\n\nAsset-Memory:\n  npm run tools -- asset-memory-index --file <bild> --id <asset-id>\n  npm run tools -- asset-memory-search --query "volcanic lightning"\n\nOptionale schwere Werkzeuge:\n  npm run tools -- voiceover-precision --file <voiceover.wav>\n  npm run tools -- visual-dedupe --images a.jpg,b.jpg,c.jpg\n  npm run tools -- smart-crop --file <bild> --prompt "volcano"\n  npm run tools -- enhance --file <bild> --allow-ai-enhancement true\n\nSicherer Downloader:\n  npm run tools -- safe-fetch --url <URL> --rights-cleared true\n\nGrundregel: echte Medien zuerst. Keine automatischen Remotion-Erklärgrafiken.`);
}

function binary(name) {
  const result = spawnSync(name, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return !result.error && result.status === 0;
}
function pyModule(name) {
  const result = spawnSync(python, ['-c', `import ${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return !result.error && result.status === 0;
}
function nodeModule(name) {
  const result = spawnSync(process.execPath, ['-e', `import('${name}').then(()=>process.exit(0)).catch(()=>process.exit(1))`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return !result.error && result.status === 0;
}
function ffmpegFilter(name) {
  if (!binary('ffmpeg')) return false;
  const result = spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return result.status === 0 && `${result.stdout}\n${result.stderr}`.includes(name);
}
function run(bin, values, inherit = false, options = {}) {
  const result = spawnSync(bin, values, { cwd: options.cwd || root, encoding: 'utf8', stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
  if (result.error) fail(`${bin}: ${result.error.message}`);
  if (result.status !== 0) fail((result.stderr || result.stdout || `${bin} fehlgeschlagen`).trim());
  return result;
}
function parseArgs(values) {
  const out = {};
  for (let i = 0; i < values.length; i++) {
    const token = values[i];
    if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = values[i + 1];
    if (!next || next.startsWith('--')) { out[key] = 'true'; continue; }
    out[key] = next; i++;
  }
  return out;
}
function requireArg(name) { if (!args[name]) fail(`--${toKebab(name)} fehlt.`); }
function requireFile(name) { requireArg(name); const file = path.resolve(args[name]); if (!fs.existsSync(file) || !fs.statSync(file).isFile()) fail(`Datei nicht gefunden: ${file}`); }
function positiveInt(value, label) { const n = Number(value); if (!Number.isInteger(n) || n < 1) fail(`${label} muss eine positive Ganzzahl sein.`); return n; }
function printJson(value, output) { const text = `${JSON.stringify(value, null, 2)}\n`; if (output) { const file = path.resolve(output); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); } process.stdout.write(text); }
function defaultSibling(file, suffix) { return path.join(path.dirname(file), `${path.basename(file, path.extname(file))}${suffix}`); }
function writeDerivedSidecar(output, value) { fs.writeFileSync(`${output}.derived.json`, `${JSON.stringify({ ...value, createdAt: new Date().toISOString() }, null, 2)}\n`); }
function rel(file) { const value = path.relative(root, file); return value.startsWith('..') ? file : value.split(path.sep).join('/'); }
function escapeFilterPath(value) { return value.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'"); }
function toKebab(value) { return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`); }
function fail(message) { console.error(message); process.exit(1); }
