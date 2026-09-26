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
  let plannedBatchCollections = [];

  const header = document.createElement('div');
  header.className = 'builder-header';
  const headerContent = document.createElement('div');
  headerContent.append(
    textElement('span', 'Arsenal Builder', 'eyebrow'),
    textElement('h2', '5 Medienquellen direkt durchsuchen'),
    textElement('p', 'Ausbau 720 kann Quelle, Format und Sammlung automatisch vorbereiten. Pexels, Pixabay und Unsplash behalten ihren Key nur im Arbeitsspeicher der aktuell geöffneten Seite. Openverse und Wikimedia Commons funktionieren ohne Key. Alle Importe starten auf Review.')
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

  const apiKey = field('Pexels API-Key', 'password', {
    required: true,
    minlength: 8,
    maxlength: 300,
    autocomplete: 'off',
    placeholder: 'Nur lokal für diese Sitzung'
  });
  const channel = selectField('Kanal');
  channel.input.id = 'arsenal-builder-channel';
  const collection = selectField('Sammlung');
  collection.input.id = 'arsenal-builder-collection';
  const variant = selectField('Format');
  variant.input.id = 'arsenal-builder-variant';
  const queryIndex = selectField('Suchvariante');
  const perPage = field('Treffer', 'number', { min: 3, max: 20, value: '12', required: true });

  const submit = button('Pexels durchsuchen', 'builder-primary');
  submit.type = 'submit';
  const batchSubmit = button('5 Sammlungen mit Pexels durchsuchen');
  const clearKeys = button('Sitzungs-Keys löschen');
  const status = textElement('p', '', 'builder-status');
  status.hidden = true;

  for (const item of channels) addOption(channel.input, item.id, item.label);
  for (let index = 0; index < 3; index += 1) addOption(queryIndex.input, String(index), `Suchbegriff ${index + 1}`);

  updateCollections();
  updateVariants();
  updateProviderCopy();

  channel.input.addEventListener('change', () => {
    plannedBatchCollections = [];
    updateCollections();
    updateBatchButtonCopy();
  });
  collection.input.addEventListener('change', () => {
    plannedBatchCollections = [];
    updateBatchButtonCopy();
  });
  provider.input.addEventListener('change', () => {
    updateVariants();
    updateProviderCopy();
  });
  clearKeys.addEventListener('click', () => {
    sessionKeys.clear();
    apiKey.input.value = '';
    updateProviderCopy();
    showStatus(status, 'Alle API-Keys wurden aus dem Arbeitsspeicher dieser Seite gelöscht. Bereits geladene Unsplash-Treffer müssen vor dem Import erneut gesucht werden.', true);
  });

  form.append(provider.wrapper, apiKey.wrapper, channel.wrapper, collection.wrapper, variant.wrapper, queryIndex.wrapper, perPage.wrapper, submit, batchSubmit, clearKeys, status);
  const resultArea = document.createElement('div');
  resultArea.className = 'builder-results';
  section.replaceChildren(header, form, resultArea);

  window.addEventListener('vah:arsenal-select', (event) => {
    const detail = event.detail ?? {};
    const selectedChannel = channels.find((item) => item.id === detail.channel);
    if (!selectedChannel) return;
    plannedBatchCollections = [];
    channel.input.value = selectedChannel.id;
    updateCollections();
    if (selectedChannel.collections.some((item) => item.id === detail.collection)) collection.input.value = detail.collection;
    applyRecommendation(detail);
    queryIndex.input.value = '0';
    updateBatchButtonCopy();
    const selectedCollection = selectedChannel.collections.find((item) => item.id === collection.input.value);
    showStatus(status, `${selectedChannel.label} / ${selectedCollection?.label ?? collection.input.value} wurde vorbereitet · ${providerLabel(provider.input.value)} · ${variantLabelById(variant.input.value)}.`, true);
    focusBuilder();
  });

  window.addEventListener('vah:arsenal-batch-select', (event) => {
    const detail = event.detail ?? {};
    const selectedChannel = channels.find((item) => item.id === detail.channel);
    if (!selectedChannel || !Array.isArray(detail.collections)) return;
    const valid = [...new Set(detail.collections.map(String))]
      .filter((id) => selectedChannel.collections.some((item) => item.id === id))
      .slice(0, Math.min(5, health.maxBatchCollections ?? 5));
    if (!valid.length) return;
    plannedBatchCollections = valid;
    channel.input.value = selectedChannel.id;
    updateCollections();
    collection.input.value = valid[0];
    applyRecommendation(detail);
    queryIndex.input.value = '0';
    updateBatchButtonCopy();
    showStatus(status, `${valid.length} priorisierte Lücken vorbereitet · ${providerLabel(provider.input.value)} · ${variantLabelById(variant.input.value)}.`, true);
    focusBuilder();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const transientApiKey = getApiKeyOrError();
    if (transientApiKey === null) return;
    setBusy(true);
    const providerName = providerLabel(provider.input.value);
    showStatus(status, `${providerName} wird durchsucht …`, true);
    resultArea.replaceChildren();
    try {
      const data = await post('/arsenal-api/search', searchPayload(transientApiKey), health.token);
      rememberProviderKey(provider.input.value, transientApiKey, data.provider !== 'pixabay' || !data.cached);
      apiKey.input.value = '';
      updateKeyPlaceholder();
      const cacheText = data.cached ? ' · aus 24-Stunden-Cache' : '';
      const rateText = data.rateLimit?.remaining !== null && data.rateLimit?.remaining !== undefined ? ` · API-Limit verbleibend: ${data.rateLimit.remaining}` : '';
      showStatus(status, `${data.assets.length} Treffer geladen · insgesamt ${data.totalResults} bei ${providerLabel(data.provider)}${cacheText}${rateText}. Technisch passendere Treffer stehen oben; das ist keine Inhalts- oder Rechtefreigabe.`, true);
      renderResults(resultArea, data, health.token, resolveProviderKey, {
        reloadAfterImport: true,
        onFallback: prepareFallback,
        getNextQuery,
        onNextQuery: prepareNextQuery
      });
    } catch (error) {
      apiKey.input.value = '';
      updateKeyPlaceholder();
      showStatus(status, error.message, false);
    } finally {
      setBusy(false);
    }
  });

  batchSubmit.addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const transientApiKey = getApiKeyOrError();
    if (transientApiKey === null) return;
    const selectedChannel = channels.find((item) => item.id === channel.input.value) ?? channels[0];
    const start = Math.max(0, selectedChannel.collections.findIndex((item) => item.id === collection.input.value));
    const fallbackCollections = selectedChannel.collections.slice(start, start + Math.min(5, health.maxBatchCollections ?? 5)).map((item) => item.id);
    const collections = plannedBatchCollections.length ? [...plannedBatchCollections] : fallbackCollections;
    setBusy(true);
    resultArea.replaceChildren();
    showStatus(status, `${providerLabel(provider.input.value)} durchsucht ${collections.length} Sammlungen nacheinander …`, true);
    try {
      const data = await post('/arsenal-api/batch-search', { ...searchPayload(transientApiKey), collections }, health.token);
      const keyWasValidated = data.provider !== 'pixabay' || (data.groups ?? []).some((group) => !group.cached);
      rememberProviderKey(provider.input.value, transientApiKey, keyWasValidated);
      apiKey.input.value = '';
      updateKeyPlaceholder();
      plannedBatchCollections = [];
      updateBatchButtonCopy();
      showStatus(status, `${data.assets} Treffer aus ${data.collections} Sammlungen geladen. Jede Gruppe ist technisch vorsortiert; du markierst weiterhin selbst und importierst anschließend gesammelt.`, true);
      renderBatchResults(resultArea, data.groups, health.token, resolveProviderKey, prepareFallback, getNextQuery, prepareNextQuery);
    } catch (error) {
      apiKey.input.value = '';
      updateKeyPlaceholder();
      showStatus(status, error.message, false);
    } finally {
      setBusy(false);
    }
  });

  function getNextQuery(data) {
    const selectedChannel = channels.find((item) => item.id === data.job.channel);
    const selectedCollection = selectedChannel?.collections.find((item) => item.id === data.job.collection);
    const queries = selectedCollection?.queries ?? [];
    const currentIndex = queries.findIndex((query) => query === data.job.query);
    if (currentIndex < 0 || currentIndex >= queries.length - 1) return null;
    return { index: currentIndex + 1, query: queries[currentIndex + 1] };
  }

  function prepareNextQuery(data, nextQuery) {
    const selectedChannel = channels.find((item) => item.id === data.job.channel);
    if (!selectedChannel || !nextQuery) return;
    plannedBatchCollections = [];
    channel.input.value = selectedChannel.id;
    updateCollections();
    if (selectedChannel.collections.some((item) => item.id === data.job.collection)) collection.input.value = data.job.collection;
    provider.input.value = data.provider;
    updateVariants();
    updateProviderCopy();
    const desiredVariant = `${data.job.type}-${data.job.orientation}`;
    if ([...variant.input.options].some((option) => option.value === desiredVariant)) variant.input.value = desiredVariant;
    queryIndex.input.value = String(nextQuery.index);
    updateBatchButtonCopy();
    showStatus(status, `Suchbegriff ${nextQuery.index + 1} vorbereitet: „${nextQuery.query}“ · ${providerLabel(data.provider)} · ${data.job.collectionLabel}. Die Suche startet erst nach deinem Klick.`, true);
    focusBuilder();
  }

  function prepareFallback(data, nextProvider) {
    const selectedChannel = channels.find((item) => item.id === data.job.channel);
    if (!selectedChannel) return;
    plannedBatchCollections = [];
    channel.input.value = selectedChannel.id;
    updateCollections();
    if (selectedChannel.collections.some((item) => item.id === data.job.collection)) collection.input.value = data.job.collection;
    provider.input.value = nextProvider;
    updateVariants();
    updateProviderCopy();
    const desiredVariant = `${data.job.type}-${data.job.orientation}`;
    if ([...variant.input.options].some((option) => option.value === desiredVariant)) variant.input.value = desiredVariant;
    const selectedCollection = selectedChannel.collections.find((item) => item.id === data.job.collection);
    const sameQueryIndex = Math.max(0, (selectedCollection?.queries ?? []).findIndex((query) => query === data.job.query));
    queryIndex.input.value = String(sameQueryIndex);
    updateBatchButtonCopy();
    showStatus(status, `Fallback vorbereitet: ${providerLabel(nextProvider)} · ${data.job.collectionLabel} · ${variantLabelById(variant.input.value)} · gleicher Suchbegriff. Die Suche startet erst nach deinem Klick.`, true);
    focusBuilder();
  }

  function applyRecommendation(detail) {
    const requestedProvider = String(detail.provider ?? '');
    if (requestedProvider && [...provider.input.options].some((option) => option.value === requestedProvider)) {
      provider.input.value = requestedProvider;
      updateVariants();
      updateProviderCopy();
    }
    const requestedVariant = String(detail.variant ?? '');
    const fallback = preferredVariantForProvider(provider.input.value);
    const desired = requestedVariant && [...variant.input.options].some((option) => option.value === requestedVariant) ? requestedVariant : fallback;
    if (desired && [...variant.input.options].some((option) => option.value === desired)) variant.input.value = desired;
  }

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
    const value = typed || sessionKeys.get(provider.input.value) || '';
    if (value.length < 8) {
      showStatus(status, `${providerLabel(provider.input.value)} benötigt einen API-Key.`, false);
      apiKey.input.focus();
      return null;
    }
    return value;
  }

  function rememberProviderKey(providerName, value, validated = true) {
    if (!validated || keylessProviders.has(providerName) || !value) return;
    sessionKeys.set(providerName, value);
  }

  function resolveProviderKey(providerName) {
    if (keylessProviders.has(providerName)) return '';
    return sessionKeys.get(providerName) || '';
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
    const preferred = preferredVariantForProvider(selectedProvider);
    if (preferred && [...variant.input.options].some((option) => option.value === preferred)) variant.input.value = preferred;
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
    updateBatchButtonCopy();
    updateKeyPlaceholder();
  }

  function updateBatchButtonCopy() {
    const name = providerLabel(provider.input.value);
    batchSubmit.textContent = plannedBatchCollections.length
      ? `${plannedBatchCollections.length} priorisierte Sammlungen mit ${name} durchsuchen`
      : `5 Sammlungen mit ${name} durchsuchen`;
  }

  function updateKeyPlaceholder() {
    const selectedProvider = provider.input.value;
    if (keylessProviders.has(selectedProvider)) return;
    apiKey.input.placeholder = sessionKeys.has(selectedProvider) ? 'Für diese Sitzung gespeichert' : 'Nur lokal für diese Sitzung';
    apiKey.input.required = !sessionKeys.has(selectedProvider);
  }

  function variantLabelById(value) {
    const item = allVariants.find((entry) => entry.id === value);
    return item ? variantLabel(item) : value;
  }

  function focusBuilder() {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => (apiKey.wrapper.hidden || sessionKeys.has(provider.input.value) ? provider.input : apiKey.input).focus({ preventScroll: true }), 500);
  }

  function setBusy(value) {
    submit.disabled = value;
    batchSubmit.disabled = value;
    clearKeys.disabled = value;
  }
}

function renderBatchResults(container, groups, token, keyResolver, onFallback, getNextQuery, onNextQuery) {
  const header = document.createElement('div');
  header.className = 'builder-result-tools';
  const summary = document.createElement('div');
  summary.append(textElement('strong', `${groups.length} Sammlungen durchsucht`), textElement('span', 'Treffer aus allen Gruppen markieren und gemeinsam als Review importieren. Technischer Fit ist nur eine Vorsortierung.'));
  const actions = document.createElement('div');
  const batchImport = button('Alle markierten Batch-Treffer importieren', 'builder-primary');
  actions.append(batchImport);
  header.append(summary, actions);

  const batchStatus = textElement('p', '', 'builder-status');
  batchStatus.hidden = true;
  const wrapper = document.createElement('div');
  wrapper.className = 'builder-batch-results';

  for (const group of groups) {
    const groupSection = document.createElement('section');
    groupSection.className = 'builder-batch-group';
    groupSection.dataset.searchId = group.searchId;
    groupSection.dataset.provider = group.provider;
    renderResults(groupSection, group, token, keyResolver, { reloadAfterImport: false, onFallback, getNextQuery, onNextQuery });
    wrapper.append(groupSection);
  }

  batchImport.addEventListener('click', async () => {
    const selections = groups.map((group, index) => {
      const groupSection = wrapper.children[index];
      const ids = [...groupSection.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')].map((input) => input.value);
      return { group, groupSection, ids };
    }).filter((item) => item.ids.length > 0);

    if (!selections.length) return showStatus(batchStatus, 'Bitte in mindestens einer Gruppe Treffer markieren.', false);
    if (selections.some((item) => item.group.provider === 'unsplash') && !keyResolver('unsplash')) return showStatus(batchStatus, 'Der Unsplash-Key wurde aus dem Arbeitsspeicher gelöscht. Bitte die Unsplash-Suche erneut ausführen.', false);

    batchImport.disabled = true;
    let imported = 0;
    let skipped = 0;
    let processedGroups = 0;
    showStatus(batchStatus, `${selections.length} Gruppen werden nacheinander importiert …`, true);

    try {
      for (const item of selections) {
        const providerKey = item.group.provider === 'unsplash' ? keyResolver('unsplash') : '';
        const response = await post('/arsenal-api/import', {
          searchId: item.group.searchId,
          ids: item.ids,
          apiKey: item.group.provider === 'unsplash' ? providerKey : undefined
        }, token);
        imported += response.imported ?? 0;
        skipped += response.skipped ?? 0;
        processedGroups += 1;
        markImported(item.groupSection, item.ids);
        showStatus(batchStatus, `${processedGroups}/${selections.length} Gruppen verarbeitet · ${imported} importiert · ${skipped} übersprungen.`, true);
      }
      showStatus(batchStatus, `Batch abgeschlossen: ${imported} importiert · ${skipped} bereits vorhanden/übersprungen. Die Seite wird einmal neu geladen.`, true);
      setTimeout(() => location.reload(), 1100);
    } catch (error) {
      showStatus(batchStatus, `Batch nach ${processedGroups}/${selections.length} Gruppen gestoppt: ${error.message}`, false);
      batchImport.disabled = false;
    }
  });

  container.replaceChildren(header, batchStatus, wrapper);
}

function renderResults(container, data, token, keyResolver, options = {}) {
  const ranked = rankTechnicalCandidates(data.assets ?? [], data.job ?? {});
  const tools = document.createElement('div');
  tools.className = 'builder-result-tools';
  const summary = document.createElement('div');
  summary.append(
    textElement('strong', `${data.job.channelLabel} / ${data.job.collectionLabel}`),
    textElement('span', `${providerLabel(data.provider)} · ${data.job.query} · ${data.job.type} · ${data.job.orientation} · technisch vorsortiert`)
  );
  const actions = document.createElement('div');
  const selectAll = button('Alle auswählen');
  const importButton = button('Ausgewählte als Review importieren', 'builder-primary');
  actions.append(selectAll, importButton);

  const nextQuery = typeof options.getNextQuery === 'function' ? options.getNextQuery(data) : null;
  if (nextQuery && typeof options.onNextQuery === 'function') {
    const nextQueryButton = button(`Nächster Suchbegriff ${nextQuery.index + 1}`);
    nextQueryButton.title = nextQuery.query;
    nextQueryButton.addEventListener('click', () => options.onNextQuery(data, nextQuery));
    actions.append(nextQueryButton);
  } else {
    const nextProvider = fallbackProvider(data.provider, data.job.type);
    if (nextProvider && typeof options.onFallback === 'function') {
      const fallbackButton = button(`Nächste Quelle: ${providerLabel(nextProvider)}`);
      fallbackButton.addEventListener('click', () => options.onFallback(data, nextProvider));
      actions.append(fallbackButton);
    }
  }
  tools.append(summary, actions);

  const fitNotice = textElement('p', 'Technischer Fit bewertet nur Format, Auflösung, Dauer und vorhandene technische Metadaten. Er ersetzt keine Sichtprüfung, Rechteprüfung oder Inhaltsbewertung.', 'builder-fit-notice');
  const grid = document.createElement('div');
  grid.className = 'builder-result-grid';
  for (const item of ranked) grid.append(resultCard(item.asset, data.provider, item.fit));
  const importStatus = textElement('p', '', 'builder-status');
  importStatus.hidden = true;
  container.replaceChildren(tools, fitNotice, grid, importStatus);

  selectAll.addEventListener('click', () => {
    const boxes = [...grid.querySelectorAll('input[type="checkbox"]:not(:disabled)')];
    const shouldSelect = boxes.some((box) => !box.checked);
    for (const box of boxes) box.checked = shouldSelect;
    selectAll.textContent = shouldSelect ? 'Auswahl aufheben' : 'Alle auswählen';
  });

  importButton.addEventListener('click', async () => {
    const ids = [...grid.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')].map((input) => input.value);
    if (!ids.length) return showStatus(importStatus, 'Bitte mindestens einen Treffer auswählen.', false);
    const providerKey = data.provider === 'unsplash' ? keyResolver('unsplash') : '';
    if (data.provider === 'unsplash' && !providerKey) return showStatus(importStatus, 'Der Unsplash-Key wurde aus dem Arbeitsspeicher gelöscht. Bitte die Suche erneut ausführen.', false);
    importButton.disabled = true;
    showStatus(importStatus, `${ids.length} Treffer werden sicher als Review importiert …`, true);
    try {
      const response = await post('/arsenal-api/import', { searchId: data.searchId, ids, apiKey: data.provider === 'unsplash' ? providerKey : undefined }, token);
      const skipped = response.skipped ? ` · ${response.skipped} bereits vorhanden/übersprungen` : '';
      const reloadText = options.reloadAfterImport === false ? '' : ' Die Seite wird neu geladen.';
      showStatus(importStatus, `${response.imported} ${providerLabel(response.provider)}-Treffer importiert${skipped}.${reloadText}`, true);
      if (options.reloadAfterImport === false) {
        markImported(container, ids);
        importButton.disabled = false;
      } else {
        setTimeout(() => location.reload(), 900);
      }
    } catch (error) {
      showStatus(importStatus, error.message, false);
      importButton.disabled = false;
    }
  });
}

function rankTechnicalCandidates(assets, job) {
  return assets.map((asset, index) => ({ asset, index, fit: technicalFit(asset, job) }))
    .sort((a, b) => b.fit.score - a.fit.score || a.index - b.index);
}

function technicalFit(asset, job) {
  let score = 0;
  const reasons = [];
  const width = positiveNumber(asset?.width);
  const height = positiveNumber(asset?.height);
  const orientation = asset?.orientation || inferOrientation(width, height);

  if (orientation === job.orientation) {
    score += 20;
    reasons.push('Format passt');
  } else if (!orientation || orientation === 'unknown' || orientation === 'square') {
    score += 8;
    reasons.push('Format teilweise prüfbar');
  } else {
    reasons.push('Format weicht ab');
  }

  const shortEdge = width && height ? Math.min(width, height) : 0;
  if (shortEdge >= 1080) {
    score += 30;
    reasons.push('hohe Auflösung');
  } else if (shortEdge >= 720) {
    score += 22;
    reasons.push('brauchbare Auflösung');
  } else if (shortEdge >= 480) {
    score += 12;
    reasons.push('mittlere Auflösung');
  } else if (shortEdge > 0) {
    score += 4;
    reasons.push('niedrige Auflösung');
  } else {
    reasons.push('Auflösung unbekannt');
  }

  if (asset?.preview_url) {
    score += 10;
    reasons.push('Vorschau vorhanden');
  }
  if (asset?.source_url) {
    score += 10;
    reasons.push('Quellseite vorhanden');
  }
  if (asset?.creator) {
    score += 5;
    reasons.push('Urheber dokumentiert');
  }
  if (hasMediaReference(asset?.files)) {
    score += 5;
    reasons.push('Mediendatei vorhanden');
  }

  if (job.type === 'video') {
    const duration = positiveNumber(asset?.duration_seconds);
    if (duration >= 3 && duration <= 20) {
      score += 20;
      reasons.push('reeltaugliche Videolänge');
    } else if (duration >= 2 && duration <= 30) {
      score += 15;
      reasons.push('brauchbare Videolänge');
    } else if (duration > 0) {
      score += 7;
      reasons.push('Videolänge prüfen');
    } else {
      score += 3;
      reasons.push('Videolänge unbekannt');
    }
  } else {
    const pixels = width && height ? width * height : 0;
    if (pixels >= 2_000_000) {
      score += 20;
      reasons.push('mindestens 2 MP');
    } else if (pixels >= 1_000_000) {
      score += 15;
      reasons.push('mindestens 1 MP');
    } else if (pixels > 0) {
      score += 7;
      reasons.push('Bildgröße prüfen');
    } else {
      score += 3;
      reasons.push('Bildgröße unbekannt');
    }
  }

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: normalized,
    band: normalized >= 85 ? 'very-good' : normalized >= 70 ? 'good' : normalized >= 50 ? 'check' : 'weak',
    reasons
  };
}

function fallbackProvider(provider, type) {
  const chain = type === 'video'
    ? ['pexels', 'pixabay']
    : ['unsplash', 'openverse', 'wikimedia', 'pexels', 'pixabay'];
  const index = chain.indexOf(provider);
  return index >= 0 && index < chain.length - 1 ? chain[index + 1] : null;
}

function markImported(container, ids) {
  const idSet = new Set(ids.map(String));
  for (const input of container.querySelectorAll('input[type="checkbox"]')) {
    if (!idSet.has(input.value)) continue;
    input.checked = false;
    input.disabled = true;
    input.closest('.builder-result-card')?.classList.add('imported');
  }
}

function resultCard(asset, provider, fit = technicalFit(asset, {})) {
  const label = document.createElement('label');
  label.className = 'builder-result-card';
  label.dataset.technicalFit = String(fit.score);
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
  const fitBadge = textElement('span', `Technischer Fit ${fit.score}/100`, `builder-fit builder-fit-${fit.band}`);
  fitBadge.title = `Nur technische Vorsortierung: ${fit.reasons.join(' · ')}. Keine Inhalts- oder Rechtefreigabe.`;
  const fitReason = textElement('small', fit.reasons.slice(0, 4).join(' · '), 'builder-fit-reasons');
  const meta = textElement('span', `${asset.type === 'video' ? 'Video' : 'Bild'} · ${asset.width ?? '?'} × ${asset.height ?? '?'}${asset.duration_seconds ? ` · ${asset.duration_seconds} s` : ''}${asset.license ? ` · ${licenseLabel(asset.license)}` : ''}`);
  body.append(title, fitBadge, fitReason, meta);
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

function hasMediaReference(files) {
  if (Array.isArray(files)) return files.some((item) => item?.url);
  if (!files || typeof files !== 'object') return false;
  return Object.values(files).some((value) => typeof value === 'string' ? Boolean(value) : Boolean(value?.url));
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function inferOrientation(width, height) {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'horizontal' : 'vertical';
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

function preferredVariantForProvider(provider) { return photoOnlyProviders.has(provider) ? 'photo-vertical' : 'video-vertical'; }
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia Commons' })[value] ?? value; }
function licenseLabel(value) { return ({ by: 'CC BY', 'by-sa': 'CC BY-SA', 'cc-by': 'CC BY', 'cc-by-sa': 'CC BY-SA', cc0: 'CC0', pdm: 'Public Domain', 'public-domain': 'Public Domain' })[value] ?? String(value).toUpperCase(); }
function field(labelText, type, attributes = {}) { const wrapper = document.createElement('label'); wrapper.className = 'builder-field'; const text = textElement('span', labelText); const input = document.createElement('input'); input.type = type; for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value)); wrapper.append(text, input); return { wrapper, input }; }
function selectField(labelText) { const wrapper = document.createElement('label'); wrapper.className = 'builder-field'; const text = textElement('span', labelText); const input = document.createElement('select'); wrapper.append(text, input); return { wrapper, input }; }
function addOption(select, value, text) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
function variantLabel(item) { return `${item.type === 'video' ? 'Video' : 'Foto'} · ${item.orientation === 'vertical' ? 'Hochformat' : item.orientation === 'horizontal' ? 'Querformat' : item.orientation}`; }
function showStatus(element, text, success) { element.hidden = false; element.className = `builder-status ${success ? 'success' : 'error'}`; element.textContent = text; }
function textElement(tag, text, className = '') { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; }
function button(text, className = '') { const element = document.createElement('button'); element.type = 'button'; element.textContent = text; element.className = className; return element; }
