const section = document.querySelector('#arsenal-builder');
const files = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];

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
    textElement('h2', 'Pexels, Pixabay und Unsplash durchsuchen'),
    textElement('p', 'Der jeweilige API-Key wird nur für die aktuelle lokale Anfrage verwendet und nicht gespeichert. Unsplash hält den Key nur bis zum ausgewählten Import im Arbeitsspeicher, um das vorgeschriebene Download-Ereignis zu melden. Alle Importe starten im Status Review.')
  );
  header.append(headerContent);

  const form = document.createElement('form');
  form.className = 'builder-form';
  const provider = selectField('Quelle');
  addOption(provider.input, 'pexels', 'Pexels');
  addOption(provider.input, 'pixabay', 'Pixabay');
  addOption(provider.input, 'unsplash', 'Unsplash');
  const apiKey = field('Pexels API-Key', 'password', { required: true, minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur lokal für diese Suche' });
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
  const status = textElement('p', '', 'builder-status');
  status.hidden = true;

  for (const item of channels) addOption(channel.input, item.id, item.label);
  for (let index = 0; index < 3; index += 1) addOption(queryIndex.input, String(index), `Suchbegriff ${index + 1}`);
  updateCollections();
  updateVariants();
  updateProviderCopy();
  channel.input.addEventListener('change', updateCollections);
  provider.input.addEventListener('change', () => {
    updateVariants();
    updateProviderCopy();
  });

  form.append(provider.wrapper, apiKey.wrapper, channel.wrapper, collection.wrapper, variant.wrapper, queryIndex.wrapper, perPage.wrapper, submit, status);
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
    setTimeout(() => apiKey.input.focus({ preventScroll: true }), 500);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    const providerName = providerLabel(provider.input.value);
    const transientApiKey = apiKey.input.value;
    showStatus(status, `${providerName} wird durchsucht …`, true);
    resultArea.replaceChildren();
    try {
      const data = await post('/arsenal-api/search', {
        provider: provider.input.value,
        apiKey: transientApiKey,
        channel: channel.input.value,
        collection: collection.input.value,
        variant: variant.input.value,
        queryIndex: Number(queryIndex.input.value),
        perPage: Number(perPage.input.value)
      }, health.token);
      apiKey.input.value = '';
      const cacheText = data.cached ? ' · aus 24-Stunden-Cache' : '';
      const rateText = data.rateLimit?.remaining !== null && data.rateLimit?.remaining !== undefined
        ? ` · API-Limit verbleibend: ${data.rateLimit.remaining}`
        : '';
      showStatus(status, `${data.assets.length} Treffer geladen · insgesamt ${data.totalResults} bei ${providerLabel(data.provider)}${cacheText}${rateText}.`, true);
      renderResults(resultArea, data, health.token, data.provider === 'unsplash' ? transientApiKey : '');
    } catch (error) {
      apiKey.input.value = '';
      showStatus(status, error.message, false);
    } finally {
      submit.disabled = false;
    }
  });

  function updateCollections() {
    const selected = channels.find((item) => item.id === channel.input.value) ?? channels[0];
    collection.input.replaceChildren();
    for (const item of selected.collections) addOption(collection.input, item.id, item.label);
  }

  function updateVariants() {
    const selectedProvider = provider.input.value;
    const allowed = selectedProvider === 'unsplash'
      ? allVariants.filter((item) => item.type === 'photo')
      : allVariants;
    variant.input.replaceChildren();
    for (const item of allowed) addOption(variant.input, item.id, variantLabel(item));
    const preferredId = selectedProvider === 'unsplash' ? 'photo-vertical' : 'video-vertical';
    const preferred = [...variant.input.options].find((option) => option.value === preferredId) ?? variant.input.options[0];
    if (preferred) variant.input.value = preferred.value;
  }

  function updateProviderCopy() {
    const name = providerLabel(provider.input.value);
    apiKey.wrapper.querySelector('span').textContent = `${name} API-Key`;
    submit.textContent = `${name} durchsuchen`;
  }
}

function renderResults(container, data, token, transientApiKey = '') {
  const tools = document.createElement('div');
  tools.className = 'builder-result-tools';
  const summary = document.createElement('div');
  summary.append(
    textElement('strong', `${data.job.channelLabel} / ${data.job.collectionLabel}`),
    textElement('span', `${providerLabel(data.provider)} · ${data.job.query} · ${data.job.type} · ${data.job.orientation}`)
  );
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
    if (data.provider === 'unsplash' && !transientApiKey) {
      return showStatus(importStatus, 'Der Unsplash-Key ist nicht mehr im Arbeitsspeicher. Bitte die Suche erneut ausführen.', false);
    }
    importButton.disabled = true;
    showStatus(importStatus, `${ids.length} Treffer werden sicher als Review importiert …`, true);
    try {
      const response = await post('/arsenal-api/import', {
        searchId: data.searchId,
        ids,
        apiKey: data.provider === 'unsplash' ? transientApiKey : undefined
      }, token);
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
  const meta = textElement('span', `${asset.type === 'video' ? 'Video' : 'Bild'} · ${asset.width ?? '?'} × ${asset.height ?? '?'}${asset.duration_seconds ? ` · ${asset.duration_seconds} s` : ''}`);
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
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VAH-Token': token },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
function providerLabel(value) { return value === 'pixabay' ? 'Pixabay' : value === 'unsplash' ? 'Unsplash' : 'Pexels'; }
function field(labelText, type, attributes = {}) { const wrapper = document.createElement('label'); wrapper.className = 'builder-field'; const text = textElement('span', labelText); const input = document.createElement('input'); input.type = type; for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value)); wrapper.append(text, input); return { wrapper, input }; }
function selectField(labelText) { const wrapper = document.createElement('label'); wrapper.className = 'builder-field'; const text = textElement('span', labelText); const input = document.createElement('select'); wrapper.append(text, input); return { wrapper, input }; }
function addOption(select, value, text) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
function variantLabel(item) { return `${item.type === 'video' ? 'Video' : 'Foto'} · ${item.orientation === 'vertical' ? 'Hochformat' : item.orientation === 'horizontal' ? 'Querformat' : item.orientation}`; }
function showStatus(element, text, success) { element.hidden = false; element.className = `builder-status ${success ? 'success' : 'error'}`; element.textContent = text; }
function textElement(tag, text, className = '') { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; }
function button(text, className = '') { const element = document.createElement('button'); element.type = 'button'; element.textContent = text; element.className = className; return element; }
