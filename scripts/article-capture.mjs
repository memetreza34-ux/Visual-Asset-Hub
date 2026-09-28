import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
if (args.help) { help(); process.exit(0); }
const inputUrl = String(args.url || args._[0] || '').trim();
if (!inputUrl) fail('URL fehlt.');
let url;
try { url = new URL(inputUrl); } catch { fail('Ungültige URL.'); }
if (!['http:', 'https:'].includes(url.protocol)) fail('Nur http(s)-URLs sind erlaubt.');

let playwright;
try { playwright = await import('playwright'); }
catch { fail('Playwright fehlt. Installiere lokal kostenlos: npm install --no-save playwright && npx playwright install chromium'); }

const id = safeName(`${url.hostname}-${url.pathname}`);
const outputDir = path.resolve(args.outputDir || path.join(root, '.local-storage', 'article-captures', id));
fs.mkdirSync(outputDir, { recursive: true });
const screenshotPath = path.join(outputDir, 'page.png');
const metadataPath = path.join(outputDir, 'capture.json');
const textPath = path.join(outputDir, 'article.txt');

const browser = await playwright.chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: integer(args.width || '1440', 800, 2560, 'width'), height: integer(args.height || '1000', 600, 1600, 'height') },
    locale: args.locale || 'de-DE',
    userAgent: 'Mozilla/5.0 VisualAssetHub/0.12 DocumentaryResearch'
  });
  const page = await context.newPage();
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(integer(args.waitMs || '1200', 0, 10000, 'wait-ms'));

  const extracted = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() || null;
    const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || null;
    const prop = (name) => document.querySelector(`meta[property="${name}"]`)?.getAttribute('content') || null;
    const article = document.querySelector('article');
    const main = document.querySelector('main');
    const candidate = article || main || document.body;
    const bodyText = (candidate?.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    return {
      title: document.title || text('h1'),
      h1: text('h1'),
      description: meta('description') || prop('og:description'),
      author: meta('author') || prop('article:author'),
      publishedAt: prop('article:published_time') || meta('date') || null,
      ogImage: prop('og:image'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || location.href,
      text: bodyText.slice(0, 120000)
    };
  });

  await page.screenshot({ path: screenshotPath, fullPage: args.fullPage !== 'false' });
  fs.writeFileSync(textPath, `${extracted.text || ''}\n`);
  const report = {
    version: 1,
    capturedAt: new Date().toISOString(),
    inputUrl: url.toString(),
    finalUrl: page.url(),
    title: extracted.title,
    h1: extracted.h1,
    description: extracted.description,
    author: extracted.author,
    publishedAt: extracted.publishedAt,
    canonicalUrl: extracted.canonical,
    ogImage: extracted.ogImage,
    screenshot: relative(screenshotPath),
    extractedText: relative(textPath),
    policy: {
      purpose: 'research-evidence-and-editorial-insert',
      screenshotDoesNotGrantReuseRights: true,
      note: 'Vor Veröffentlichung Rechte, Zitatumfang und Kontext prüfen. Das Tool speichert eine Rechercheaufnahme, keine automatische Medienfreigabe.'
    }
  };
  fs.writeFileSync(metadataPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Artikel erfasst: ${report.title || url.hostname}`);
  console.log(`Screenshot: ${relative(screenshotPath)}`);
  console.log(`Text: ${relative(textPath)}`);
  console.log(`Metadaten: ${relative(metadataPath)}`);
} finally {
  await browser.close();
}

function relative(file) { return path.relative(root, file).split(path.sep).join('/'); }
function safeName(value) { return String(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'article'; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) fail(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
function parseArgs(values) { const result = { _: [] }; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) { result._.push(token); continue; } const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Article Capture\n\n  npm run research:capture -- "https://example.org/article"\n\nSpeichert lokal:\n- Full-page Screenshot\n- Haupttext\n- Titel/Autor/Datum/Canonical-Metadaten\n\nOptional:\n  --full-page false\n  --width 1440\n  --height 1000\n  --wait-ms 1200\n\nBenötigt Playwright + Chromium. Kein API-Key.`); }
