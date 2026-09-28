import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {createRequire} from 'node:module';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }

let playwright;
try { playwright = await import('playwright'); }
catch { fail('Playwright fehlt. Installiere lokal: npm install --no-save playwright maplibre-gl && npx playwright install chromium'); }

const require = createRequire(import.meta.url);
let maplibreJs, maplibreCss;
try {
  maplibreJs = require.resolve('maplibre-gl/dist/maplibre-gl.js');
  maplibreCss = require.resolve('maplibre-gl/dist/maplibre-gl.css');
} catch {
  fail('maplibre-gl fehlt. Installiere lokal kostenlos: npm install --no-save maplibre-gl');
}

const width = integer(args.width || '1920', 960, 3840, 'width');
const height = integer(args.height || '1080', 540, 2160, 'height');
const center = coordinate(args.center || '10,50', '--center');
const zoom = number(args.zoom || '4', 0, 18, 'zoom');
const markers = values(args.marker).map(markerSpec);
const route = args.route ? routeSpec(args.route) : [];
const title = String(args.title || '').trim();
const subtitle = String(args.subtitle || '').trim();

const outputDir = path.join(root, '.local-storage', 'maps');
fs.mkdirSync(outputDir, {recursive: true});
const base = safeName(title || `${center[1]}-${center[0]}`);
let output = path.resolve(args.output || path.join(outputDir, `${base}.png`));
if (args.toInbox === 'true') {
  fs.mkdirSync(path.join(root, 'inbox'), {recursive: true});
  output = path.join(root, 'inbox', `map-${base}.png`);
}

const browser = await playwright.chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#101419}
    .maplibregl-ctrl-logo,.maplibregl-ctrl-attrib{font-family:Arial,sans-serif!important}
    .doc-title{position:absolute;left:54px;top:46px;z-index:5;color:#fff;font-family:Arial,sans-serif;text-shadow:0 4px 20px rgba(0,0,0,.72);pointer-events:none}
    .doc-title h1{font-size:54px;line-height:1;margin:0;font-weight:900;letter-spacing:-1px;max-width:1050px}
    .doc-title p{font-size:24px;line-height:1.2;margin:12px 0 0;color:rgba(255,255,255,.88);font-weight:600}
    .doc-vignette{position:absolute;inset:0;z-index:4;pointer-events:none;box-shadow:inset 0 0 150px rgba(0,0,0,.26)}
    .doc-marker{width:22px;height:22px;border-radius:50%;background:#fff;border:4px solid #111;box-shadow:0 4px 18px rgba(0,0,0,.45)}
    .doc-label{font:700 18px Arial,sans-serif;color:#fff;background:rgba(0,0,0,.74);padding:8px 10px;border-radius:8px;white-space:nowrap;transform:translate(18px,-28px);box-shadow:0 6px 18px rgba(0,0,0,.28)}
  </style></head><body><div id="map"></div><div class="doc-vignette"></div>${title || subtitle ? `<div class="doc-title"><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</div>` : ''}</body></html>`);
  await page.addStyleTag({path: maplibreCss});
  await page.addScriptTag({path: maplibreJs});
  await page.evaluate(async ({center, zoom, markers, route}) => {
    const map = new window.maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center,
      zoom,
      attributionControl: true,
      interactive: false,
      fadeDuration: 0
    });
    window.__vahMap = map;
    await new Promise((resolve, reject) => {
      map.once('load', resolve);
      map.once('error', (event) => reject(event?.error || new Error('Map load failed')));
    });
    if (route.length >= 2) {
      map.addSource('route', {type: 'geojson', data: {type: 'Feature', geometry: {type: 'LineString', coordinates: route}}});
      map.addLayer({id: 'route-shadow', type: 'line', source: 'route', paint: {'line-color': '#000000', 'line-width': 10, 'line-opacity': 0.35}});
      map.addLayer({id: 'route', type: 'line', source: 'route', paint: {'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.95}});
    }
    for (const marker of markers) {
      const wrap = document.createElement('div');
      const dot = document.createElement('div'); dot.className = 'doc-marker'; wrap.append(dot);
      if (marker.label) { const label = document.createElement('div'); label.className = 'doc-label'; label.textContent = marker.label; wrap.append(label); }
      new window.maplibregl.Marker({element: wrap, anchor: 'center'}).setLngLat([marker.lon, marker.lat]).addTo(map);
    }
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }, {center, zoom, markers, route});
  await page.screenshot({path: output, fullPage: false});
} finally {
  await browser.close();
}

if (args.toInbox === 'true') writeMetadata(output);
console.log(`Doku-Karte erstellt: ${relative(output)}`);
console.log(`Marker: ${markers.length} · Routepunkte: ${route.length}`);

function writeMetadata(file) {
  const dir = path.join(root, '.local-storage', 'inbox-source');
  fs.mkdirSync(dir, {recursive: true});
  const metadata = {
    provider: 'maplibre-openfreemap',
    providerId: path.basename(file),
    searchQuery: title || subtitle || 'documentary map',
    title: title || 'Dokumentarische Karte',
    description: subtitle || 'Mit MapLibre gerenderte Dokumentationskarte auf OpenStreetMap-basierten Tiles.',
    sourceName: 'MapLibre + OpenFreeMap / OpenStreetMap',
    sourceUrl: 'https://openfreemap.org/',
    creator: 'Visual Asset Hub',
    licenseStatus: 'licensed',
    licenseCode: 'map-data-attribution-required',
    licenseUrl: 'https://www.openstreetmap.org/copyright',
    attributionRequired: true,
    attributionText: '© OpenStreetMap contributors',
    suggestedScopes: ['youtube'],
    suggestedStatus: 'review',
    rightsWarning: 'Karte vor Veröffentlichung prüfen und die OpenStreetMap-Attribution im finalen Video/Abspann beibehalten.',
    downloadedAt: new Date().toISOString(),
    downloadedFile: relative(file)
  };
  fs.writeFileSync(path.join(dir, `${path.basename(file)}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
}

function markerSpec(value) {
  const parts = String(value).split(',');
  if (parts.length < 2) fail(`Ungültiger --marker: ${value}. Erwartet lon,lat[,label].`);
  const lon = number(parts[0], -180, 180, 'marker lon');
  const lat = number(parts[1], -90, 90, 'marker lat');
  return {lon, lat, label: parts.slice(2).join(',').trim() || null};
}
function coordinate(value, label) { const parts = String(value).split(','); if (parts.length !== 2) fail(`${label} erwartet lon,lat.`); return [number(parts[0], -180, 180, `${label} lon`), number(parts[1], -90, 90, `${label} lat`)]; }
function routeSpec(value) { return String(value).split(';').filter(Boolean).map((item) => coordinate(item, '--route')); }
function values(value) { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'map'; }
function integer(value, min, max, label) { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function number(value, min, max, label) { const n = Number(value); if (!Number.isFinite(n) || n < min || n > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return n; }
function parseArgs(values) { const result = {_: []}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); if (key === 'marker') { result.marker = [...(Array.isArray(result.marker) ? result.marker : result.marker ? [result.marker] : []), next]; } else result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Documentary Map Renderer\n\nBeispiel:\n  npm run map:render -- --center "2.35,48.86" --zoom 5 --marker "2.35,48.86,Paris" --title "Frankreich" --to-inbox true\n\nRoute:\n  --route "-43.17,-22.90;-17.0,5.0;2.35,48.86"\n\nKostenlos/lokal: Playwright + MapLibre GL + OpenFreeMap. Kein API-Key.\nBenötigt: npm install --no-save playwright maplibre-gl && npx playwright install chromium`); }
