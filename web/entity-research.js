const section = document.querySelector('#entity-research');
const researchKeys = new Map();
const providerLabels = { pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia Commons' };

if (section) init().catch((error) => {
  section.hidden = false;
  section.textContent = `Themenrecherche konnte nicht geladen werden: ${error.message}`;
});

async function init() {
  const healthResponse = await fetch('../api/health', { cache: 'no-store' });
  if (!healthResponse.ok) throw new Error('Lokale Verwaltung nicht verfügbar.');
  const health = await healthResponse.json();
  if (!health.localAdmin || !health.token) throw new Error('Lokales Verwaltungstoken fehlt.');
  render(health);
}

function render(health) {
  section.hidden = false;
  const header = el('div', 'entity-header');
  const headerCopy = el('div');
  headerCopy.append(
    text('span', 'Personen- & Themenrecherche', 'eyebrow'),
    text('h2', 'Ein Reel-Thema → eigene Medienrecherche'),
    text('p', 'Beispiel: „Conor McGregor“. Der Hub baut automatisch mehrere Suchbereiche auf, durchsucht die verfügbaren Quellen und legt alle Funde dauerhaft unter ALLES-GEFUNDEN/05-THEMENRECHERCHEN ab. Treffer sind noch keine Freigabe.')
  );
  header.append(headerCopy);

  const form = document.createElement('form');
  form.className = 'entity-form';
  const topic = field('Person oder Thema', 'text', { required: true, minlength: 2, maxlength: 120, placeholder: 'z. B. Conor McGregor' });
  const channel = selectField('Kanal', [
    ['combat-sports', 'Kampfsport'],
    ['finance', 'Finanzen'],
    ['ai', 'Künstliche Intelligenz'],
    ['electro', 'Elektrotechnik']
  ]);
  const depth = selectField('Recherche', [['deep', 'Tief · bis 8 Suchbereiche'], ['quick', 'Schnell · bis 6 Suchbereiche']]);
  const perPage = field('Treffer je Suche', 'number', { min: 3, max: 12, value: 6, required: true });
  const script = textareaField('Optional: Reel-Skript', { maxlength: 12000, placeholder: 'Skript einfügen. Namen, Gegner, Events und Jahreszahlen werden als zusätzliche Suchbegriffe erkannt.' });
  script.wrapper.classList.add('entity-script-field');

  const pexels = field('Pexels Key · optional', 'password', { minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur für diese Sitzung' });
  const pixabay = field('Pixabay Key · optional', 'password', { minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur für diese Sitzung' });
  const unsplash = field('Unsplash Key · optional', 'password', { minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur für diese Sitzung' });
  const keyFields = { pexels, pixabay, unsplash };
  for (const [provider, item] of Object.entries(keyFields)) {
    item.input.addEventListener('input', () => {
      const value = item.input.value.trim();
      if (value) researchKeys.set(provider, value);
    });
  }

  const planButton = button('Rechercheplan anzeigen');
  const searchButton = button('Alles recherchieren', 'entity-primary');
  searchButton.type = 'submit';
  const clearKeys = button('Sitzungs-Keys löschen');
  const status = text('p', '', 'entity-status');
  status.hidden = true;
  const planArea = el('div', 'entity-plan');
  const results = el('div', 'entity-results');

  clearKeys.addEventListener('click', () => {
    researchKeys.clear();
    for (const item of Object.values(keyFields)) {
      item.input.value = '';
      item.input.placeholder = 'Nur für diese Sitzung';
    }
    showStatus(status, 'Alle Recherche-Keys wurden aus dem Arbeitsspeicher dieser Seite gelöscht.', true);
  });

  planButton.addEventListener('click', async () => {
    if (!topic.input.reportValidity()) return;
    setBusy(true);
    try {
      const data = await post('/entity-api/plan', payload(), health.token);
      renderPlan(planArea, data.plan);
      showStatus(status, `${data.plan.facets.length} Suchbereiche für „${data.plan.topic}“ vorbereitet.`, true);
    } catch (error) {
      showStatus(status, error.message, false);
    } finally { setBusy(false); }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    rememberTypedKeys();
    setBusy(true);
    results.replaceChildren();
    showStatus(status, 'Recherche läuft sequenziell über alle verfügbaren Quellen. Das kann bei tiefer Recherche etwas dauern …', true);
    try {
      const data = await post('/entity-api/search', { ...payload(), keys: Object.fromEntries(researchKeys), perPage: Number(perPage.input.value) }, health.token);
      clearVisibleKeys();
      renderPlan(planArea, data.plan);
      renderResults(results, data, health.token);
      const skipped = data.skippedProviders.length ? ` · ohne Key ausgelassen: ${data.skippedProviders.map(providerLabel).join(', ')}` : '';
      const errors = data.errors.length ? ` · ${data.errors.length} Einzelsuchen mit Fehler` : '';
      showStatus(status, `${data.assets} eindeutige Treffer aus ${data.searches} erfolgreichen Suchgruppen gespeichert${skipped}${errors}. Alles liegt zusätzlich unter ALLES-GEFUNDEN/05-THEMENRECHERCHEN/${safeDisplay(data.research.topic)}.`, true);
    } catch (error) {
      clearVisibleKeys();
      showStatus(status, error.message, false);
    } finally { setBusy(false); }
  });

  function payload() {
    return { topic: topic.input.value.trim(), channel: channel.input.value, depth: depth.input.value, script: script.input.value.trim() };
  }

  function rememberTypedKeys() {
    for (const [provider, item] of Object.entries(keyFields)) {
      const value = item.input.value.trim();
      if (value) researchKeys.set(provider, value);
    }
  }

  function clearVisibleKeys() {
    for (const [provider, item] of Object.entries(keyFields)) {
      item.input.value = '';
      item.input.placeholder = researchKeys.has(provider) ? 'Für diese Sitzung gespeichert' : 'Nur für diese Sitzung';
    }
  }

  function setBusy(value) {
    planButton.disabled = value;
    searchButton.disabled = value;
    clearKeys.disabled = value;
  }

  form.append(topic.wrapper, channel.wrapper, depth.wrapper, perPage.wrapper, pexels.wrapper, pixabay.wrapper, unsplash.wrapper, script.wrapper, planButton, searchButton, clearKeys, status);
  section.replaceChildren(header, form, planArea, results);
}

function renderPlan(container, plan) {
  const title = text('strong', `Rechercheplan · ${plan.topic}`);
  const note = text('span', `${plan.facets.length} Bereiche · ${plan.depth === 'deep' ? 'tiefe' : 'schnelle'} Recherche · maximal ${plan.maxSearchTasks} Provider-Suchen`);
  const chips = el('div', 'entity-plan-chips');
  for (const facet of plan.facets) {
    const chip = el('div', 'entity-plan-chip');
    chip.append(text('b', `${facet.order}. ${facet.label}`), text('span', facet.query), text('small', facet.preferredMedia === 'video' ? 'Video bevorzugt' : 'Foto bevorzugt'));
    chips.append(chip);
  }
  const warning = text('p', 'Wichtig: Personen-, Event-, Marken- und Broadcastrechte werden nicht automatisch freigegeben. Die Recherche sammelt Kandidaten; Veröffentlichung bleibt eine bewusste Review-Entscheidung.', 'entity-rights-warning');
  container.replaceChildren(title, note, chips, warning);
}

function renderResults(container, data, token) {
  const toolbar = el('div', 'entity-result-toolbar');
  const copy = el('div');
  copy.append(text('strong', `${data.assets} Treffer · ${data.research.topic}`), text('span', `${data.searchedProviders.map(providerLabel).join(' · ')} · Videos direkt abspielbar · Rechte weiterhin prüfen`));
  const importAll = button('Alle markierten als Review importieren', 'entity-primary');
  toolbar.append(copy, importAll);
  const importStatus = text('p', '', 'entity-status');
  importStatus.hidden = true;
  const grouped = el('div', 'entity-result-groups');

  const bySection = new Map();
  for (const group of data.groups) {
    const key = group.research?.section ?? group.job.researchSection ?? group.job.collection;
    if (!bySection.has(key)) bySection.set(key, []);
    bySection.get(key).push(group);
  }

  for (const groups of bySection.values()) {
    const first = groups[0];
    const sectionBlock = el('section', 'entity-result-section');
    const heading = el('div', 'entity-section-heading');
    heading.append(text('h3', first.research?.sectionLabel ?? first.job.researchSectionLabel ?? first.job.collectionLabel), text('span', first.job.query));
    sectionBlock.append(heading);
    for (const group of groups) sectionBlock.append(renderProviderGroup(group));
    grouped.append(sectionBlock);
  }

  importAll.addEventListener('click', async () => {
    const selections = [];
    for (const groupElement of grouped.querySelectorAll('[data-search-id]')) {
      const ids = [...groupElement.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')].map((input) => input.value);
      if (!ids.length) continue;
      selections.push({ searchId: groupElement.dataset.searchId, provider: groupElement.dataset.provider, element: groupElement, ids });
    }
    if (!selections.length) return showStatus(importStatus, 'Bitte mindestens einen Treffer markieren.', false);
    if (selections.some((item) => item.provider === 'unsplash') && !researchKeys.get('unsplash')) return showStatus(importStatus, 'Für den Unsplash-Import fehlt der Sitzung-Key. Bitte Unsplash erneut mit Key recherchieren.', false);
    importAll.disabled = true;
    let imported = 0;
    let skipped = 0;
    try {
      for (let index = 0; index < selections.length; index += 1) {
        const item = selections[index];
        showStatus(importStatus, `${index + 1}/${selections.length} Gruppen werden importiert …`, true);
        const response = await post('/arsenal-api/import', {
          searchId: item.searchId,
          ids: item.ids,
          apiKey: item.provider === 'unsplash' ? researchKeys.get('unsplash') : undefined
        }, token);
        imported += response.imported ?? 0;
        skipped += response.skipped ?? 0;
        markImported(item.element, item.ids);
      }
      showStatus(importStatus, `${imported} Treffer als Review importiert · ${skipped} übersprungen. Seite wird einmal neu geladen.`, true);
      setTimeout(() => location.reload(), 1100);
    } catch (error) {
      importAll.disabled = false;
      showStatus(importStatus, error.message, false);
    }
  });

  if (data.errors.length) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${data.errors.length} fehlgeschlagene Einzelsuchen anzeigen`;
    const list = document.createElement('ul');
    for (const item of data.errors) {
      const li = document.createElement('li');
      li.textContent = `${providerLabel(item.provider)} · ${item.section}: ${item.error}`;
      list.append(li);
    }
    details.append(summary, list);
    container.replaceChildren(toolbar, importStatus, details, grouped);
  } else {
    container.replaceChildren(toolbar, importStatus, grouped);
  }
}

function renderProviderGroup(group) {
  const wrapper = el('div', 'entity-provider-group');
  wrapper.dataset.searchId = group.searchId;
  wrapper.dataset.provider = group.provider;
  const top = el('div', 'entity-provider-top');
  const copy = el('div');
  copy.append(text('strong', providerLabel(group.provider)), text('span', `${group.assets.length} Treffer · ${group.job.type === 'video' ? 'Video' : 'Foto'}`));
  const selectAll = button('Alle markieren');
  top.append(copy, selectAll);
  const grid = el('div', 'entity-result-grid');
  for (const asset of rankAssets(group.assets, group.job)) grid.append(resultCard(asset, group));
  selectAll.addEventListener('click', () => {
    const boxes = [...grid.querySelectorAll('input[type="checkbox"]:not(:disabled)')];
    const select = boxes.some((box) => !box.checked);
    for (const box of boxes) box.checked = select;
    selectAll.textContent = select ? 'Auswahl aufheben' : 'Alle markieren';
  });
  wrapper.append(top, grid);
  return wrapper;
}

function resultCard(item, group) {
  const asset = item.asset;
  const card = document.createElement('label');
  card.className = 'entity-result-card';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.value = asset.provider_id;
  const preview = el('div', 'entity-result-preview');
  const videoUrl = asset.type === 'video' ? playableVideoUrl(asset.files) : '';
  if (videoUrl) {
    const video = document.createElement('video');
    video.src = videoUrl;
    if (asset.preview_url) video.poster = asset.preview_url;
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.addEventListener('click', (event) => event.stopPropagation());
    video.addEventListener('pointerdown', (event) => event.stopPropagation());
    preview.append(video);
  } else if (asset.preview_url) {
    const img = document.createElement('img');
    img.src = asset.preview_url;
    img.alt = asset.title || '';
    img.loading = 'lazy';
    preview.append(img);
  } else {
    preview.append(text('span', asset.type === 'video' ? 'Video ohne direkte Vorschau' : 'Keine Vorschau', 'entity-no-preview'));
  }
  const body = el('div', 'entity-result-body');
  const rights = rightsHint(group.provider, group.job.researchSection);
  body.append(
    text('strong', asset.title || `${providerLabel(group.provider)} ${asset.provider_id}`),
    text('span', `${asset.type === 'video' ? 'Video' : 'Bild'} · ${asset.width ?? '?'} × ${asset.height ?? '?'}${asset.duration_seconds ? ` · ${asset.duration_seconds}s` : ''}`),
    text('span', `Technischer Fit ${item.score}/100`, 'entity-fit'),
    text('small', rights, 'entity-rights-hint')
  );
  if (asset.creator) body.append(text('small', `Creator: ${asset.creator}`));
  if (asset.source_url) {
    const link = document.createElement('a');
    link.href = asset.source_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Quelle öffnen';
    link.addEventListener('click', (event) => event.stopPropagation());
    body.append(link);
  }
  card.append(check, preview, body);
  return card;
}

function rankAssets(assets, job) {
  return (assets ?? []).map((asset, index) => ({ asset, index, score: techScore(asset, job) })).sort((a, b) => b.score - a.score || a.index - b.index);
}

function techScore(asset, job) {
  let score = 0;
  const width = Number(asset.width) || 0;
  const height = Number(asset.height) || 0;
  const orientation = asset.orientation || (width && height ? (height > width ? 'vertical' : width > height ? 'horizontal' : 'square') : 'unknown');
  if (orientation === 'vertical') score += 25;
  else if (orientation === 'square' || orientation === 'unknown') score += 10;
  const short = width && height ? Math.min(width, height) : 0;
  if (short >= 1080) score += 30;
  else if (short >= 720) score += 22;
  else if (short >= 480) score += 12;
  if (asset.preview_url) score += 10;
  if (asset.source_url) score += 10;
  if (asset.creator) score += 5;
  if (job.type === 'video') {
    const duration = Number(asset.duration_seconds) || 0;
    if (duration >= 3 && duration <= 20) score += 20;
    else if (duration >= 2 && duration <= 30) score += 15;
    else if (duration) score += 7;
  } else {
    const pixels = width * height;
    if (pixels >= 2_000_000) score += 20;
    else if (pixels >= 1_000_000) score += 15;
    else if (pixels) score += 7;
  }
  return Math.min(100, score);
}

function playableVideoUrl(files) {
  if (!Array.isArray(files)) return '';
  const choices = files.filter((item) => item?.url && /^https?:\/\//i.test(item.url));
  if (!choices.length) return '';
  const sorted = [...choices].sort((a, b) => mediaArea(a) - mediaArea(b));
  const suitable = sorted.find((item) => Math.min(Number(item.width) || 0, Number(item.height) || 0) >= 720);
  return (suitable ?? sorted.at(-1))?.url ?? '';
}

function mediaArea(item) { return (Number(item?.width) || 0) * (Number(item?.height) || 0); }

function rightsHint(provider, section) {
  if (provider === 'openverse' || provider === 'wikimedia') return 'Offene Lizenz möglich · konkrete Lizenz/Attribution vor Nutzung prüfen.';
  if (['fight', 'press', 'weigh-in', 'walkout'].includes(section)) return 'Person/Event/Broadcast/Marken-Kontext besonders prüfen; Quelle allein bedeutet keine Nutzungsfreigabe.';
  return 'Quellenlizenz, Person und Marken vor Nutzung prüfen.';
}

function markImported(container, ids) {
  const set = new Set(ids.map(String));
  for (const input of container.querySelectorAll('input[type="checkbox"]')) {
    if (!set.has(input.value)) continue;
    input.checked = false;
    input.disabled = true;
    input.closest('.entity-result-card')?.classList.add('imported');
  }
}

async function post(endpoint, payload, token) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-VAH-Token': token }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function field(label, type, attributes = {}) { const wrapper = document.createElement('label'); wrapper.className = 'entity-field'; const span = text('span', label); const input = document.createElement('input'); input.type = type; for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value)); wrapper.append(span, input); return { wrapper, input }; }
function textareaField(label, attributes = {}) { const wrapper = document.createElement('label'); wrapper.className = 'entity-field'; const span = text('span', label); const input = document.createElement('textarea'); for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value)); wrapper.append(span, input); return { wrapper, input }; }
function selectField(label, options) { const wrapper = document.createElement('label'); wrapper.className = 'entity-field'; const span = text('span', label); const input = document.createElement('select'); for (const [value, caption] of options) { const option = document.createElement('option'); option.value = value; option.textContent = caption; input.append(option); } wrapper.append(span, input); return { wrapper, input }; }
function button(value, className = '') { const item = document.createElement('button'); item.type = 'button'; item.textContent = value; if (className) item.className = className; return item; }
function el(tag, className = '') { const item = document.createElement(tag); if (className) item.className = className; return item; }
function text(tag, value, className = '') { const item = el(tag, className); item.textContent = value; return item; }
function showStatus(item, value, ok) { item.hidden = false; item.className = `entity-status ${ok ? 'success' : 'error'}`; item.textContent = value; }
function providerLabel(value) { return providerLabels[value] ?? value; }
function safeDisplay(value) { return String(value ?? '').replace(/[\\/:*?"<>|]/g, ' ').trim(); }
