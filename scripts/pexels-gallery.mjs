import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export function renderGallery(result) {
  const cards = result.assets.map((asset) => renderCard(asset)).join('\n');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Pexels-Ergebnisse: ${escapeHtml(result.query)}</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#090b10;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#18233b,transparent 45rem),#090b10}header{max-width:1400px;margin:0 auto 24px}h1{margin:.25rem 0;font-size:clamp(2rem,5vw,4rem)}p{color:#aab4c7}.grid{max-width:1400px;margin:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}.card{border:1px solid #283247;border-radius:18px;overflow:hidden;background:#121722}.media{aspect-ratio:9/14;background:#0d1119;display:grid;place-items:center;overflow:hidden}.media img,.media video{width:100%;height:100%;object-fit:cover}.body{padding:16px}.meta{display:flex;justify-content:space-between;gap:8px;color:#98a3b8;font-size:.8rem}.id{font-family:ui-monospace,monospace;color:#a8ffce}.links{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.links a{padding:9px 11px;border-radius:10px;background:#7c9cff;color:#09101f;text-decoration:none;font-weight:700}.links a.secondary{background:#202a3d;color:#dce4f5}.note{max-width:1400px;margin:24px auto;color:#98a3b8;font-size:.9rem}
</style>
</head>
<body>
<header><span class="id">PEXELS SEARCH</span><h1>${escapeHtml(result.query)}</h1><p>${result.assets.length} von ${result.total_results} Treffern · ${escapeHtml(result.type)} · Seite ${result.page}</p></header>
<main class="grid">${cards || '<p>Keine Ergebnisse.</p>'}</main>
<p class="note">Diese Galerie ist nur eine Vorschau. Vor Verwendung Inhalt, erkennbare Personen, Marken und den konkreten Einsatz prüfen. Die Pexels-Quelle bleibt bei jedem Eintrag verlinkt.</p>
</body></html>`;
}

function renderCard(asset) {
  const media = `<img src="${escapeAttribute(asset.preview_url || '')}" alt="${asset.type === 'image' ? escapeAttribute(asset.title || '') : ''}" loading="lazy" />`;
  const direct = choosePreviewLink(asset);
  return `<article class="card"><div class="media">${media}</div><div class="body"><div class="meta"><span>${escapeHtml(asset.type)}</span><span>${escapeHtml(asset.orientation || 'unknown')}</span></div><h2>${escapeHtml(asset.title || `Pexels ${asset.provider_id}`)}</h2><p>Urheber: ${escapeHtml(asset.creator || 'unbekannt')}<br><span class="id">ID ${escapeHtml(asset.provider_id)}</span></p><div class="links"><a href="${escapeAttribute(asset.source_url)}" target="_blank" rel="noopener noreferrer">Pexels öffnen</a>${direct ? `<a class="secondary" href="${escapeAttribute(direct)}" target="_blank" rel="noopener noreferrer">Datei ansehen</a>` : ''}</div></div></article>`;
}

function choosePreviewLink(asset) {
  if (asset.type === 'image') return asset.files?.large || asset.files?.medium || asset.preview_url;
  const files = (asset.files || []).filter((file) => file.url);
  const preferred = files.find((file) => file.quality === 'hd' && (file.width || 0) <= 1920) || files[0];
  return preferred?.url || null;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = argv[index + 1];
    args[key] = inline ?? (next && !next.startsWith('--') ? argv[++index] : 'true');
  }
  return args;
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function escapeAttribute(value) { return escapeHtml(value); }

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error('--input ist erforderlich.');
  const result = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const output = args.output || path.join(path.dirname(args.input), 'gallery.html');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, renderGallery(result));
  console.log(`Pexels-Galerie erzeugt: ${output}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
