const section = document.querySelector('#arsenal-builder');
const files = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];
const keylessProviders = new Set(['openverse', 'wikimedia']);
const photoOnlyProviders = new Set(['unsplash', 'openverse', 'wikimedia']);
const sessionKeys = new Map();

if (section) init().catch(() => { section.hidden = true; });

async function init() {
  const [healthResponse, indexResponse, channels] = await Promise.all([
    fetch('../api/health', { cache: 'no-store' }),
    fetch('../catalog/channels/index.json', { cache: 'no-store' }),
    Promise.all(files.map(async (file) => {
      const response = await fetch(`../catalog/channels/${file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return response.json();
    }))
  ]);
  if (!healthResponse.ok || !indexResponse.ok) throw new Error('Lokale Verwaltung nicht verfügbar.');
  const health = await healthResponse.json();
  const channelIndex = await indexResponse.json();
  if (!health.localAdmin || !health.token) throw new Error('Lokales Token fehlt.');
  render({ health, channelIndex, channels });
}

function render({ health, channelIndex, channels }) {
  section.hidden = false;
  const allVariants = channelIndex.variants ?? [];
  const header = document.createElement('div');
  header.className = 'builder-header';
  const headerContent = document.createElement('div');
  headerContent.append(
    textElement('span', 'Arsenal Builder', 'eyebrow'),
    textElement('h2', '5 Medienquellen direkt durchsuchen'),
    textElement('p', 'Pexels, Pixabay und Unsplash können ihren API-Key für die aktuelle Browser-Sitzung ausschließlich im Arbeitsspeicher behalten. Openverse und Wikimedia Commons funktionieren ohne Key. Mit dem Batch-Modus werden bis zu fünf Sammlungen nacheinander durchsucht. Alle Importe starten im Status Review.')
  );
  header.append(headerContent);

  const form = document.createElement('form');
  form.className = 'builder-form';
  const provider = selectField('Quelle');
  addOption(provider.input, 'pexels', 'Pexels');
  addOption(provider.input, 'pixabay', 'Pixabay');
  addOption(provider.input, 'unsplash', 'Unsplash');
  addOption(provider.input, 'openverse', 'Openverse · ohne Key');
  addOption(provider.input, 'wikimedia', 'Wikimedia Commons · ohne Key');
  const apiKey = field('Pexels API-Key', 'password', { required: true, minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur lokal für diese Sitzung' });
  const channel = selectField('Kanal');
  channel.input.id = 'arsenal-builder-channel';
  const collection = selectField('Sammlung');
  collection.input.id = 'arsenal-builder-collection';
  const variant = selectField('Format');
  variant.input.id = 'arsenal-builder-variant';
  const queryIndex = selectField('Suchvariante');
  const perPage = field('Treffer', 'number', { min: 3, max: 20, value: '12', required: true });
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'builder-primary';
  submit.textContent = 'Pexels durchsuchen';
  const batchSubmit = document.createElement('button');
  batchSubmit.type = 'button';
  batchSubmit.textContent = '5 Sammlungen mit Pexels durchsuchen';
  const clearKeys = document.createElement('button');
  clearKeys.type = 'button';
  clearKeys.textContent = 'Sitzungs-Keys löschen';
  const status = textElement('p', '', 'builder-status');
  status.hidden = true;

  for (const item of channels) addOption(channel.input, item.id, item.label);
  for (let index = 0; index < 3; index += 1) addOption(queryIndex.input, String(index), `Suchbegriff ${index + 1}`);
  updateCollections();
  updateVariants();
  updateProviderCopy();
  channel.input.addEventListener('change', updateCollections);
  apiKey.input.addEventListener('input', () => {
    const value = apiKey.input.value.trim();
    if (!keylessProviders.has(provider.input.value) && value) sessionKeys.set(provider.input.value, value);
  });
  provider.input.addEventListener('change', () => {
    updateVariants();
    updateProviderCopy();
  });
  clearKeys.addEventListener('click', () => {
    sessionKeys.clear();
    apiKey.input.value = '';
    updateProviderCopy();
    showStatus(status, 'Alle API-Keys wurden aus dem Arbeitsspeicher dieser Seite gelöscht.', true);
  });

  form.append(provider.wrapper, apiKey.wrapper, channel.wrapper, collection.wrapper, variant.wrapper, queryIndex.wrapper, perPage.wrapper, submit, batchSubmit, clearKeys, status);
  const resultArea = document.createElement('div');
  resultArea.className = 'builder-results';
  section.replaceChildren(header, form, resultArea);

  window.addEventListener('vah:arsenal-select', (event) => {
    const detail = event.detail ?? {};
    const selectedChannel = channels.find((item) => item.id === detail.channel);
    if (!selectedChannel) return;
    channel.input.value = selectedChannel.id;
    updateCollections();
    if (selectedChannel.collections.some((item) => item.id === detail.collection)) collection.input.value = detail.collection;
    const preferred = [...variant.input.options].find((option) => option.value === 'video-vertical') ?? variant.input.options[0];
    if (preferred) variant.input.value = preferred.value;
    queryIndex.input.value = '0';
    const selectedCollection = selectedChannel.collections.find((item) => item.id === collection.input.value);
    showStatus(status, `${selectedChannel.label} / ${selectedCollection?.label ?? collection.input.value} wurde vorbereitet.`, true);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => (apiKey.wrapper.hidden ? provider.input : apiKey.input).focus({ preventScroll: true }), 500);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const transientApiKey = getApiKeyOrError();
    if (transientApiKey === null) return;
    submit.disabled = true;
    batchSubmit.disabled = true;
    const providerName = providerLabel(provider.input.value);
    showStatus(status, `${providerName} wird durchsucht …`, true);
    resultArea.replaceChildren();
    try {
      const data = await post('/arsenal-api/search', searchPayload(transientApiKey), health.token);
      apiKey.input.value = '';
      updateKeyPlaceholder();
      const cacheText = data.cached ? ' · aus 24-Stunden-Cache' : '';
      const rateText = data.rateLimit?.remaining !== null && data.rateLimit?.remaining !== undefined ? ` · API-Limit verbleibend: ${data.rateLimit.remaining}` : '';
      showStatus(status, `${data.assets.length} Treffer geladen · insgesamt ${data.totalResults} bei ${providerLabel(data.provider)}${cacheText}${rateText}.`, true);
      renderResults(resultArea, data, health.token, data.provider === 'unsplash' ? transientApiKey : '');
    } catch (error) {
      apiKey.input.value = '';
      updateKeyPlaceholder();
      showStatus(status, error.message, false);
    } finally {
      submit.disabled = false;
      batchSubmit.disabled = false;
    }
  });

  batchSubmit.addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const transientApiKey = getApiKeyOrError();
    if (transientApiKey === null) return;
    const selectedChannel = channels.find((item) => item.id === channel.input.value) ?? channels[0];
    const start = Math.max(0, selectedChannel.collections.findIndex((item) => item.id === collection.input.value));
    const collections = selectedChannel.collections.slice(start, start + Math.min(5, health.maxBatchCollections ?? 5)).map((item) => item.id);
    submit.disabled = true;
    batchSubmit.disabled = true;
    resultArea.replaceChildren();
    showStatus(status, `${providerLabel(provider.input.value)} durchsucht ${collections.length} Sammlungen nacheinander …`, true);
    try {
      const data = await post('/arsenal-api/batch-search', { ...searchPayload(transientApiKey), collections }, health.token);
      apiKey.input.value = '';
      updateKeyPlaceholder();
      showStatus(status, `${data.assets} Treffer aus ${data.collections} Sammlungen geladen. Nichts wurde automatisch freigegeben.`, true);
      renderBatchResults(resultArea, data.groups, health.token, data.provider === 'unsplash' ? transientApiKey : '');
    } catch (error) {
      apiKey.input.value = '';
      updateKeyPlaceholder();
      showStatus(status, error.message, false);
    } finally {
      submit.disabled = false;
      batchSubmit.disabled = false;
    }
  });

  function searchPayload(transientApiKey) {
    return {
      provider: provider.input.value,
      apiKey: transientApiKey || undefined,
      channel: channel.input.value,
      collection: collection.input.value,
      variant: variant.input.value,
      queryIndex: Number(queryIndex.input.value),
      perPage: Number(perPage.input.value)
    };
  }

  function getApiKeyOrError() {
    if (keylessProviders.has(provider.input.value)) return '';
    const typed = apiKey.input.value.trim();
    if (typed) sessionKeys.set(provider.input.value, typed);
    const value = typed || sessionKeys.get(provider.input.value) || '';
    if (value.length < 8) {
      showStatus(status, `${providerLabel(provider.input.value)} benötigt einen API-Key.`, false);
      apiKey.input.focus();
      return null;
    }
    return value;
  }

  function updateCollections() {
    const selected = channels.find((item) => item.id === channel.input.value) ?? channels[0];
    collection.input.replaceChildren();
    for (const item of selected.collections) addOption(collection.input, item.id, item.label);
  }

  function updateVariants() {
    const selectedProvider = provider.input.value;
    const allowed = photoOnlyProviders.has(selectedProvider) ? allVariants.filter((item) => item.type === 'photo') : allVariants;
    variant.input.replaceChildren();
    for (const item of allowed) addOption(variant.input, item.id, variantLabel(item));
    const preferredId = photoOnlyProviders.has(selectedProvider) ? 'photo-vertical' : 'video-vertical';
    const preferred = [...variant.input.options].find((option) => option.value === preferredId) ?? variant.input.options[0];
    if (preferred) variant.input.value = preferred.value;
  }

  function updateProviderCopy() {
    const selectedProvider = provider.input.value;
    const name = providerLabel(selectedProvider);
    const keyless = keylessProviders.has(selectedProvider);
    apiKey.wrapper.hidden = keyless;
    apiKey.input.required = !keyless && !sessionKeys.has(selectedProvider);
    apiKey.input.value = '';
    apiKey.wrapper.querySelector('span').textContent = `${name} API-Key`;
    submit.textContent = `${name} durchsuchen`;
    batchSubmit.textContent = `5 Sammlungen mit ${name} durchsuchen`;
    updateKeyPlaceholder();
  }

  function updateKeyPlaceholder() {
    const selectedProvider = provider.input.value;
    if (keylessProviders.has(selectedProvider)) return;
    apiKey.input.placeholder = sessionKeys.has(selectedProvider) ? 'Für diese Sitzung gespeichert' : 'Nur lokal für diese Sitzung';
    apiKey.input.required = !sessionKeys.has(selectedProvider);
  }
}

function renderBatchResults(container, groups, token, transientApiKey) {
  const title = textElement('div', `${groups.length} Sammlungen durchsucht`, 'builder-result-tools');
  const wrapper = document.createElement('div');
  wrapper.className = 'builder-batch-results';
  for (const group of groups) {
    const section = document.createElement('section');
    section.className = 'builder-batch-group';
    renderResults(section, group, token, group.provider === 'unsplash' ? transientApiKey : '');
    wrapper.append(section);
  }
  container.replaceChildren(title, wrapper);
}

function renderResults(container, data, token, transientApiKey = '') {
  const tools = document.createElement('div');
  tools.className = 'builder-result-tools';
  const summary = document.createElement('div');
  summary.append(textElement('strong', `${data.job.channelLabel} / ${data.job.collectionLabel}`), textElement('span', `${providerLabel(data.provider)} · ${data.job.query} · ${data.job.type} · ${data.job.orientation}`));
  const actions = document.createElement('div');
  const selectAll = button('Alle auswählen');
  const importButton = button('Ausgewählte als Review importieren', 'builder-primary');
  actions.append(selectAll, importButton);
  tools.append(summary, actions);

  const grid = document.createElement('div');
  grid.className = 'builder-result-grid';
  for (const asset of data.assets) grid.append(resultCard(asset, data.provider));
  const importStatus = textElement('p', '', 'builder-status');
  importStatus.hidden = true;
  container.replaceChildren(tools, grid, importStatus);

  selectAll.addEventListener('click', () => {
    const boxes = [...grid.querySelectorAll('input[type="checkbox"]')];
    const shouldSelect = boxes.some((box) => !box.checked);
    for (const box of boxes) box.checked = shouldSelect;
    selectAll.textContent = shouldSelect ? 'Auswahl aufheben' : 'Alle auswählen';
  });

  importButton.addEventListener('click', async () => {
    const ids = [...grid.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
    if (!ids.length) return showStatus(importStatus, 'Bitte mindestens einen Treffer auswählen.', false);
    if (data.provider === 'unsplash' && !transientApiKey) return showStatus(importStatus, 'Der Unsplash-Key ist nicht mehr im Arbeitsspeicher. Bitte die Suche erneut ausführen.', false);
    importButton.disabled = true;
    showStatus(importStatus, `${ids.length} Treffer werden sicher als Review importiert …`, true);
    try {
      const response = await post('/arsenal-api/import', { searchId: data.searchId, ids, apiKey: data.provider === 'unsplash' ? transientApiKey : undefined }, token);
      transientApiKey = '';
      showStatus(importStatus, `${response.imported} ${providerLabel(response.provider)}-Treffer wurden importiert. Die Seite wird neu geladen.`, true);
      setTimeout(() => location.reload(), 900);
    } catch (error) {
      showStatus(importStatus, error.message, false);
      importButton.disabled = false;
    }
  });
}

function resultCard(asset, provider) {
  const label = document.createElement('label');
  label.className = 'builder-result-card';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.value = asset.provider_id;
  const visual = document.createElement('div');
  visual.className = 'builder-result-visual';
  if (asset.preview_url) {
    const image = document.createElement('img');
    image.src = asset.preview_url;
    image.alt = asset.title || '';
    image.loading = 'lazy';
    visual.append(image);
  }
  const body = document.createElement('div');
  body.className = 'builder-result-body';
  const title = textElement('strong', asset.title || `${providerLabel(provider)} ${asset.provider_id}`);
  const meta = textElement('span', `${asset.type === 'video' ? 'Video' : 'Bild'} · ${asset.width ?? '?'} × ${asset.height ?? '?'}${asset.duration_seconds ? ` · ${asset.duration_seconds} s` : ''}${asset.license ? ` · ${licenseLabel(asset.license)}` : ''}`);
  body.append(title, meta);
  if (provider === 'unsplash' && asset.creator_url) {
    const creatorLink = document.createElement('a');
    creatorLink.href = asset.creator_url;
    creatorLink.target = '_blank';
    creatorLink.rel = 'noopener noreferrer';
    creatorLink.textContent = `Foto von ${asset.creator || 'Fotograf'} auf Unsplash`;
    creatorLink.addEventListener('click', (event) => event.stopPropagation());
    body.append(creatorLink);
  } else {
    body.append(textElement('span', asset.creator ? `von ${asset.creator}` : providerLabel(provider)));
  }
  const link = document.createElement('a');
  link.href = asset.source_url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = `Bei ${providerLabel(provider)} öffnen`;
  link.addEventListener('click', (event) => event.stopPropagation());
  body.append(link);
  label.append(check, visual, body);
  return label;
}

async function post(endpoint, payload, token) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-VAH-Token': token }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia Commons' })[value] ?? value; }
function licenseLabel(value) { return ({ by: 'CC BY', 'by-sa': 'CC BY-SA', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', cc0: 'CC0', pdm: 'Public Domain', 'public-domain': 'Public Domain' })[value] ?? String(value).toUpperCase(); }
function field(labelText, type, attributes = {}) { const wrapper = document.createElement('label'); wrapper.className = 'builder-field'; const text = textElement('span', labelText); const input = document.createElement('input'); input.type = type; for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value)); wrapper.append(text, input); return { wrapper, input }; }
function selectField(labelText) { const wrapper = document.createElement('label'); wrapper.className = 'builder-field'; const text = textElement('span', labelText); const input = document.createElement('select'); wrapper.append(text, input); return { wrapper, input }; }
function addOption(select, value, text) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
function variantLabel(item) { return `${item.type === 'video' ? 'Video' : 'Foto'} · ${item.orientation === 'vertical' ? 'Hochformat' : item.orientation === 'horizontal' ? 'Querformat' : item.orientation}`; }
function showStatus(element, text, success) { element.hidden = false; element.className = `builder-status ${success ? 'success' : 'error'}`; element.textContent = text; }
function textElement(tag, text, className = '') { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; }
function button(text, className = '') { const element = document.createElement('button'); element.type = 'button'; element.textContent = text; element.className = className; return element; }
