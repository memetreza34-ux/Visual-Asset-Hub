import { createShotPlan, planToCsv, planToMarkdown } from './script-planner-core.js';

const section = document.querySelector('#script-planner');
const FAVORITES_KEY = 'visual-asset-hub:favorites';
const channelFiles = {
  finance: 'finance.json',
  ai: 'ai.json',
  electro: 'electro.json',
  'combat-sports': 'combat-sports.json'
};
const examples = {
  finance: 'Viele Menschen sparen jeden Monat, aber investieren ihr Geld nie. Durch die Inflation verliert Bargeld langfristig an Kaufkraft. Ein einfacher ETF-Sparplan kann das Risiko breit verteilen. Prüfe trotzdem Gebühren, Anlagehorizont und dein persönliches Risiko.',
  ai: 'Künstliche Intelligenz verändert gerade viele Bürojobs. Chatbots beantworten Anfragen, Automatisierungen übernehmen wiederkehrende Aufgaben und Entwickler arbeiten mit KI-Assistenten. Entscheidend ist nicht nur das Tool, sondern ein sinnvoller Workflow.',
  electro: 'Bevor du an einer elektrischen Anlage arbeitest, musst du sie sicher freischalten. Danach prüfst du die Spannungsfreiheit mit einem geeigneten Messgerät. RCD und Leitungsschutzschalter erfüllen unterschiedliche Schutzaufgaben. Jede Messung muss fachgerecht dokumentiert werden.',
  'combat-sports': 'Ein guter Boxer gewinnt nicht nur durch Schlagkraft. Saubere Beinarbeit schafft Winkel und hält ihn außerhalb der Gefahrenzone. Am Boxsack trainiert er Kombinationen, beim Sparring Timing und Distanz. Regeneration entscheidet, ob die Leistung langfristig steigt.'
};

if (section) init().catch((error) => renderError(error.message));

async function init() {
  const [indexResponse, keywordResponse, channelEntries] = await Promise.all([
    fetch('../catalog/search-index.json', { cache: 'no-store' }),
    fetch('../catalog/planner-keywords.json', { cache: 'no-store' }),
    Promise.all(Object.entries(channelFiles).map(async ([id, file]) => {
      const response = await fetch(`../catalog/channels/${file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return [id, await response.json()];
    }))
  ]);
  if (!indexResponse.ok || !keywordResponse.ok) throw new Error('Planerdaten konnten nicht geladen werden.');
  render({ index: await indexResponse.json(), keywords: await keywordResponse.json(), channels: Object.fromEntries(channelEntries) });
}

function render({ index, keywords, channels }) {
  section.hidden = false;
  const header = element('div', 'planner-header');
  const intro = element('div');
  intro.append(element('span', 'eyebrow', 'Reel- und Skript-Planer'), element('h2', '', 'Sprechtext automatisch mit B-Rolls planen'), element('p', '', 'Dein Text bleibt lokal im Browser. Der Planer ordnet Sätze passenden Sammlungen und Assets zu und zeigt fehlende Motive.'));
  const privacy = element('span', 'planner-privacy', 'Lokal · keine KI-API · kein Upload');
  header.append(intro, privacy);

  const form = document.createElement('form');
  form.className = 'planner-form';
  const channel = selectField('Kanal', Object.values(channels).map((item) => [item.id, item.label]));
  const platform = selectField('Format', [['reel', 'Reel / TikTok / Short'], ['youtube', 'YouTube horizontal'], ['presentation', 'Präsentation / Website']]);
  const duration = inputField('Zieldauer in Sekunden', 'number', { min: 10, max: 600, value: 45, required: true });
  const approvedOnly = checkboxField('Nur freigegebene Assets verwenden', false);
  const script = textareaField('Sprechtext oder Szenen', 'Jeden Satz oder jede Szene in eine neue Zeile schreiben. Satzzeichen werden ebenfalls erkannt.');
  script.input.maxLength = 20000;
  script.input.required = true;
  const actions = element('div', 'planner-form-actions');
  const example = button('Beispiel laden');
  const submit = button('Shotlist erstellen', 'planner-primary');
  submit.type = 'submit';
  actions.append(example, submit);
  const status = element('p', 'planner-form-status');
  status.hidden = true;
  form.append(channel.wrapper, platform.wrapper, duration.wrapper, approvedOnly.wrapper, script.wrapper, actions, status);

  const results = element('div', 'planner-results');
  section.replaceChildren(header, form, results);
  let currentPlan = null;

  channel.input.addEventListener('change', () => {
    if (!script.input.value.trim()) script.input.placeholder = examples[channel.input.value];
  });
  example.addEventListener('click', () => {
    script.input.value = examples[channel.input.value];
    duration.input.value = channel.input.value === 'combat-sports' ? '50' : '45';
    script.input.focus();
  });
  platform.input.addEventListener('change', () => {
    if (platform.input.value === 'youtube' && Number(duration.input.value) < 60) duration.input.value = '90';
    if (platform.input.value === 'reel' && Number(duration.input.value) > 90) duration.input.value = '45';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      currentPlan = createShotPlan({
        script: script.input.value,
        channel: channel.input.value,
        channelData: channels[channel.input.value],
        records: index.records ?? [],
        keywordConfig: keywords,
        durationSeconds: Number(duration.input.value),
        orientation: platform.input.value === 'reel' ? 'vertical' : 'horizontal',
        approvedOnly: approvedOnly.input.checked,
        maxAssetsPerScene: 3
      });
      status.hidden = true;
      renderPlan(results, currentPlan);
    } catch (error) {
      showStatus(status, error.message, false);
      results.replaceChildren();
    }
  });

  document.addEventListener('vah:catalog-updated', () => location.reload());
}

function renderPlan(container, plan) {
  const summary = element('div', 'planner-summary');
  const stats = [
    ['Szenen', plan.summary.sceneCount],
    ['mit Vorschlag', `${plan.summary.coveragePercentage} %`],
    ['freigegeben abgedeckt', `${plan.summary.approvedCoveragePercentage} %`],
    ['Lücken', plan.summary.missingSceneCount]
  ];
  for (const [label, value] of stats) {
    const card = element('div');
    card.append(element('strong', '', String(value)), element('span', '', label));
    summary.append(card);
  }

  const toolbar = element('div', 'planner-export-bar');
  const text = element('div');
  text.append(element('strong', '', `${plan.channel.label} · ${plan.settings.durationSeconds} Sekunden`), element('span', '', plan.settings.approvedOnly ? 'Nur freigegebene Assets' : 'Freigegebene und ungeprüfte Vorschläge'));
  const exports = element('div');
  const json = button('JSON');
  const csv = button('CSV');
  const markdown = button('Markdown');
  json.addEventListener('click', () => download(`${JSON.stringify(plan, null, 2)}\n`, fileName(plan, 'json'), 'application/json'));
  csv.addEventListener('click', () => download(planToCsv(plan), fileName(plan, 'csv'), 'text/csv'));
  markdown.addEventListener('click', () => download(planToMarkdown(plan), fileName(plan, 'md'), 'text/markdown'));
  exports.append(json, csv, markdown);
  toolbar.append(text, exports);

  const warning = plan.summary.approvedCoveragePercentage < 100
    ? element('p', 'planner-warning', 'Nicht jede Szene ist mit einem freigegebenen Asset abgedeckt. Review-Medien vor Veröffentlichung prüfen oder fehlende Motive suchen.')
    : null;
  const timeline = element('div', 'planner-timeline');
  for (const scene of plan.scenes) timeline.append(sceneCard(scene, plan.channel.id));
  container.replaceChildren(summary, toolbar, ...(warning ? [warning] : []), timeline);
}

function sceneCard(scene, channelId) {
  const article = element('article', `planner-scene${scene.needsSearch ? ' needs-search' : ''}`);
  const top = element('div', 'planner-scene-top');
  const number = element('div', 'planner-scene-number');
  number.append(element('strong', '', `Szene ${scene.scene}`), element('span', '', `${formatTime(scene.startSeconds)}–${formatTime(scene.endSeconds)} · ${scene.durationSeconds} s`));
  const type = element('span', 'planner-media-type', scene.recommendedMediaType);
  top.append(number, type);
  const speech = element('blockquote', '', scene.text);

  const collectionBox = element('div', 'planner-collections');
  for (const collection of scene.collections) {
    const item = element('div', 'planner-collection');
    const info = element('div');
    info.append(element('strong', '', collection.label), element('code', '', collection.query));
    const search = button('Motiv suchen');
    search.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('vah:select-arsenal-collection', { detail: { channel: channelId, collection: collection.id } }));
      document.querySelector('#arsenal-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    item.append(info, search);
    collectionBox.append(item);
  }

  const assetGrid = element('div', 'planner-asset-grid');
  if (scene.assets.length) {
    for (const asset of scene.assets) assetGrid.append(assetCard(asset));
  } else {
    const empty = element('div', 'planner-missing');
    empty.append(element('strong', '', 'Noch kein passendes Asset'), element('span', '', `Empfohlene Suche: ${scene.suggestedPexelsQuery}`));
    const copy = button('Suchbegriff kopieren');
    copy.addEventListener('click', async () => copyText(copy, scene.suggestedPexelsQuery));
    empty.append(copy);
    assetGrid.append(empty);
  }

  article.append(top, speech, collectionBox, assetGrid);
  if (scene.warning) article.append(element('p', 'planner-scene-warning', scene.warning));
  return article;
}

function assetCard(asset) {
  const card = element('article', `planner-asset status-${asset.status}`);
  const visual = element('div', 'planner-asset-preview');
  if (asset.preview) {
    const image = document.createElement('img');
    image.src = resolveAssetUrl(asset.preview);
    image.alt = '';
    image.loading = 'lazy';
    visual.append(image);
  } else visual.textContent = asset.type;
  const body = element('div', 'planner-asset-body');
  const title = element('strong', '', asset.title);
  const meta = element('span', '', `${asset.id} · ${statusLabel(asset.status)} · ★ ${asset.qualityRating ?? '–'}`);
  const actions = element('div', 'planner-asset-actions');
  const open = button('In Bibliothek öffnen');
  open.addEventListener('click', () => openInLibrary(asset.id));
  const favorite = button(isFavorite(asset.id) ? '★ Favorit' : '☆ Favorit');
  favorite.addEventListener('click', () => toggleFavorite(asset.id, favorite));
  actions.append(open, favorite);
  body.append(title, meta, actions);
  card.append(visual, body);
  return card;
}

function openInLibrary(id) {
  const search = document.querySelector('#search');
  if (!search) return;
  search.value = id;
  search.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#asset-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleFavorite(id, control) {
  const favorites = readFavorites();
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  control.textContent = favorites.has(id) ? '★ Favorit' : '☆ Favorit';
  document.dispatchEvent(new CustomEvent('vah:favorites-changed'));
}

function readFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
  catch { return new Set(); }
}
function isFavorite(id) { return readFavorites().has(id); }

function inputField(labelText, type, attributes = {}) {
  const wrapper = element('label', 'planner-field');
  const label = element('span', '', labelText);
  const input = document.createElement('input');
  input.type = type;
  for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value));
  wrapper.append(label, input);
  return { wrapper, input };
}
function textareaField(labelText, placeholder) {
  const wrapper = element('label', 'planner-field planner-script-field');
  const label = element('span', '', labelText);
  const input = document.createElement('textarea');
  input.rows = 8;
  input.placeholder = placeholder;
  wrapper.append(label, input);
  return { wrapper, input };
}
function selectField(labelText, options) {
  const wrapper = element('label', 'planner-field');
  const label = element('span', '', labelText);
  const input = document.createElement('select');
  for (const [value, text] of options) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; input.append(option);
  }
  wrapper.append(label, input);
  return { wrapper, input };
}
function checkboxField(labelText, checked) {
  const wrapper = element('label', 'planner-check');
  const input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked;
  wrapper.append(input, element('span', '', labelText));
  return { wrapper, input };
}
function button(text, className = '') { const control = document.createElement('button'); control.type = 'button'; control.textContent = text; if (className) control.className = className; return control; }
function element(tag, className = '', text = '') { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function showStatus(node, message, success) { node.hidden = false; node.className = `planner-form-status ${success ? 'success' : 'error'}`; node.textContent = message; }
function renderError(message) { if (!section) return; section.hidden = false; section.replaceChildren(element('p', 'planner-form-status error', message)); }
function resolveAssetUrl(value) { return /^https?:\/\//i.test(value) ? value : `../${String(value).replace(/^\.\//, '')}`; }
function statusLabel(status) { return ({ approved: 'Freigegeben', review: 'Review', inbox: 'Eingang', restricted: 'Eingeschränkt', archived: 'Archiviert' })[status] ?? status; }
function formatTime(seconds) { const minutes = Math.floor(seconds / 60); const rest = Math.round((seconds % 60) * 10) / 10; return minutes ? `${minutes}:${String(rest).padStart(4, '0')}` : `${rest}s`; }
function fileName(plan, extension) { return `shotlist-${plan.channel.id}-${new Date().toISOString().slice(0, 10)}.${extension}`; }
function download(content, filename, type) { const blob = new Blob([content], { type: `${type};charset=utf-8` }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
async function copyText(control, text) { const original = control.textContent; try { await navigator.clipboard.writeText(text); control.textContent = 'Kopiert'; } catch { control.textContent = 'Nicht möglich'; } setTimeout(() => { control.textContent = original; }, 1200); }
