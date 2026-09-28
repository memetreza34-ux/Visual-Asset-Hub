import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const query = String(args.query || '').trim();
if (!query) fail('--query fehlt.');
const images = String(args.images || '').split(',').map((item) => item.trim()).filter(Boolean).map((item) => path.resolve(item));
if (!images.length) fail('--images erwartet Komma-getrennte lokale Bilder.');
for (const image of images) if (!fs.existsSync(image) || !fs.statSync(image).isFile()) fail(`Bild nicht gefunden: ${image}`);

const python = detectPython();
if (!python) fail('Python 3 mit OpenCLIP fehlt. Installiere kostenlos: python3 -m pip install open_clip_torch pillow');
const output = path.resolve(args.output || path.join(root, '.local-storage', 'visual-match', `${safeName(query)}.json`));
fs.mkdirSync(path.dirname(output), { recursive: true });
const result = spawnSync(python.command, [
  'scripts/visual-match.py', '--query', query, '--images', ...images,
  '--output', output,
  '--model', args.model || 'ViT-B-32',
  '--pretrained', args.pretrained || 'laion2b_s34b_b79k'
], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
if (result.status !== 0) fail((result.stderr || result.stdout || 'OpenCLIP fehlgeschlagen.').trim());
const report = JSON.parse(fs.readFileSync(output, 'utf8'));
console.log(`Visual Match: „${query}“`);
for (const item of (report.results || []).filter((entry) => entry.clipSimilarity !== null).slice(0, 20)) {
  console.log(`${String(item.rank).padStart(2, ' ')}. ${Number(item.clipSimilarity).toFixed(4)} · ${relative(item.file)}`);
}
console.log(`Report: ${relative(output)}`);
console.log('Hinweis: CLIP bewertet Bild/Text-Ähnlichkeit, nicht die Echtheit oder Ereignisidentität. Quellenprüfung bleibt Pflicht.');

function detectPython() {
  for (const command of ['python3', 'python']) {
    const check = spawnSync(command, ['-c', 'import open_clip, torch, PIL; print("ok")'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (check.status === 0) return { command };
  }
  return null;
}
function relative(file) { const value = path.relative(root, file); return value.startsWith('..') ? file : value.split(path.sep).join('/'); }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'visual-match'; }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Visual Match – OpenCLIP\n\n  npm run visual:match -- --query "damaged satellite on factory floor" --images frame1.jpg,frame2.jpg\n\nKostenlos/lokal. Beim ersten Lauf werden die OpenCLIP-Modellgewichte geladen. Kein API-Key.\n\nBenötigt:\n  python3 -m pip install open_clip_torch pillow\n\nWichtig: Score = semantische Bild/Text-Ähnlichkeit, kein Beweis für Ereignisidentität oder Rechte.`); }
