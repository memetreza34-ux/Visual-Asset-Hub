const state = {
  index: null,
  query: '',
  type: '',
  category: '',
  orientation: '',
  status: '',
  license: '',
  sort: 'quality'
};

const elements = {
  search: document.querySelector('#search'),
  type: document.querySelector('#type-filter'),
  category: document.querySelector('#category-filter'),
  orientation: document.querySelector('#orientation-filter'),
  status: document.querySelector('#status-filter'),
  license: document.querySelector('#license-filter'),
  sort: document.querySelector('#sort-filter'),
  reset: document.querySelector('#reset'),
  assetCount: document.querySelector('#asset-count'),
  resultCount: document.querySelector('#result-count'),
  catalogDate: document.querySelector('#catalog-date'),
  grid: document.querySelector('#asset-grid'),
  empty: document.querySelector('#empty-state'),
  cardTemplate: document.querySelector('#asset-card-template'),
  dialog: document.querySelector('#asset-dialog'),
  dialogContent: document.querySelector('#dialog-content'),
  dialogClose: document.querySelector('.dialog-close')
};

init().catch((error) => {
  elements.grid.replaceChildren(createMessage('Katalog konnte nicht geladen werden.', error.message));
  elements.empty.hidden = true;
});

async function init() {
  const response = await fetch('../catalog/search-index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  state.index = await response.json();

  elements.assetCount.textContent = String(state.index.assetCount);
  elements.catalogDate.textContent = `Katalogstand: ${formatDate(state.index.catalogUpdatedAt)}`;
  populateFilter(elements.type, state.index.facets.types);
  populateFilter(elements.category, state.index.facets.categories);
  populateFilter(elements.orientation, state.index.facets.orientations);
  populateFilter(elements.status, state.index.facets.statuses);
  populateFilter(elements.license, state.index.facets.licenseStatuses);
  restoreUrlState();
  bindEvents();
  render();
}

function bindEvents() {
  elements.search.addEventListener('input', () => update('query', elements.search.value));
  elements.type.addEventListener('change', () => update('type', elements.type.value));
  elements.category.addEventListener('change', () => update('category', elements.category.value));
  elements.orientation.addEventListener('change', () => update('orientation', elements.orientation.value));
  elements.status.addEventListener('change', () => update('status', elements.status.value));
  elements.license.addEventListener('change', () => update('license', elements.license.value));
  elements.sort.addEventListener('change', () => update('sort', elements.sort.value));
  elements.reset.addEventListener('click', resetFilters);
  elements.dialogClose.addEventListener('click', () => elements.dialog.close());
  elements.dialog.addEventListener('click', (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
}

function update(key, value) {
  state[key] = value;
  syncUrlState();
  render();
}

function resetFilters() {
  Object.assign(state, { query: '', type: '', category: '', orientation: '', status: '', license: '', sort: 'quality' });
  elements.search.value = '';
  elements.type.value = '';
  elements.category.value = '';
  elements.orientation.value = '';
  elements.status.value = '';
  elements.license.value = '';
  elements.sort.value = 'quality';
  syncUrlState();
  render();
}

function render() {
  const query = normalize(state.query);
  const records = state.index.records
    .filter((record) => !query || query.split(' ').every((term) => record.searchableText.includes(term)))
    .filter((record) => !state.type || record.type === state.type)
    .filter((record) => !state.category || record.category === state.category || record.secondaryCategories.includes(state.category))
    .filter((record) => !state.orientation || record.orientation === state.orientation)
    .filter((record) => !state.status || record.status === state.status)
    .filter((record) => !state.license || record.licenseStatus === state.license)
    .sort(sortRecords);

  elements.resultCount.textContent = `${records.length} ${records.length === 1 ? 'Asset' : 'Assets'}`;
  elements.grid.replaceChildren(...records.map(createCard));
  elements.grid.hidden = records.length === 0;
  elements.empty.hidden = records.length !== 0;
}

function createCard(record) {
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const article = fragment.querySelector('.asset-card');
  const button = fragment.querySelector('.asset-open');
  const preview = fragment.querySelector('.preview');

  if (record.preview) {
    const image = document.createElement('img');
    image.src = resolveAssetUrl(record.preview);
    image.alt = '';
    image.loading = 'lazy';
    preview.replaceChildren(image);
  } else {
    fragment.querySelector('.preview-type').textContent = typeLabel(record.type);
  }

  fragment.querySelector('.type-badge').textContent = typeLabel(record.type);
  fragment.querySelector('.quality').textContent = `★ ${record.qualityRating}/5`;
  fragment.querySelector('h2').textContent = record.title;
  fragment.querySelector('.description').textContent = record.description;
  fragment.querySelector('.category').textContent = label(record.category);
  fragment.querySelector('.orientation').textContent = label(record.orientation);
  fragment.querySelector('.license').textContent = label(record.licenseStatus);

  const tags = fragment.querySelector('.tags');
  for (const tag of record.tags.slice(0, 5)) {
    const chip = document.createElement('span');
    chip.textContent = label(tag);
    tags.append(chip);
  }

  button.addEventListener('click', () => openDetails(record));
  article.dataset.assetId = record.id;
  return fragment;
}

function openDetails(record) {
  const container = document.createElement('div');
  container.className = 'detail-layout';

  const visual = document.createElement('div');
  visual.className = 'detail-preview';
  if (record.preview) {
    const image = document.createElement('img');
    image.src = resolveAssetUrl(record.preview);
    image.alt = record.title;
    visual.append(image);
  } else {
    visual.textContent = typeLabel(record.type);
  }

  const content = document.createElement('div');
  content.className = 'detail-content';
  content.append(
    textElement('span', record.id, 'eyebrow'),
    textElement('h2', record.title),
    textElement('p', record.description, 'detail-description'),
    definitionList([
      ['Dateiname', record.filename],
      ['Typ', typeLabel(record.type)],
      ['Kategorie', label(record.category)],
      ['Motiv', label(record.subject)],
      ['Handlung', label(record.action)],
      ['Ausrichtung', label(record.orientation)],
      ['Kamera', `${label(record.shotType)} · ${label(record.cameraMovement)}`],
      ['Stil', label(record.style)],
      ['Status', label(record.status)],
      ['Lizenz', label(record.licenseStatus)],
      ['Erlaubte Nutzung', record.usageScopes.map(label).join(', ')],
      ['Attribution', record.attributionRequired ? 'Erforderlich' : 'Nicht erforderlich']
    ])
  );

  if (record.technical) {
    const values = [
      record.technical.width && record.technical.height ? `${record.technical.width} × ${record.technical.height}` : '',
      record.technical.durationSeconds !== undefined ? `${record.technical.durationSeconds} s` : '',
      record.technical.fps !== undefined ? `${record.technical.fps} fps` : '',
      record.technical.codec || ''
    ].filter(Boolean);
    if (values.length) content.append(textElement('p', `Technik: ${values.join(' · ')}`, 'technical-line'));
  }

  const tagList = document.createElement('div');
  tagList.className = 'tags detail-tags';
  for (const tag of record.tags) tagList.append(textElement('span', label(tag)));
  content.append(tagList);

  if (record.source) {
    const link = document.createElement('a');
    link.className = 'source-link';
    link.href = resolveAssetUrl(record.source);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = record.source.startsWith('http') ? 'Asset-Quelle öffnen' : 'Asset-Datei öffnen';
    content.append(link);
  }

  container.append(visual, content);
  elements.dialogContent.replaceChildren(container);
  elements.dialog.showModal();
}

function definitionList(entries) {
  const list = document.createElement('dl');
  for (const [term, value] of entries) {
    list.append(textElement('dt', term), textElement('dd', String(value)));
  }
  return list;
}

function populateFilter(select, counts) {
  for (const [value, count] of Object.entries(counts)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${label(value)} (${count})`;
    select.append(option);
  }
}

function restoreUrlState() {
  const params = new URLSearchParams(location.search);
  for (const key of ['query', 'type', 'category', 'orientation', 'status', 'license', 'sort']) {
    if (params.has(key)) state[key] = params.get(key) || '';
  }
  elements.search.value = state.query;
  elements.type.value = state.type;
  elements.category.value = state.category;
  elements.orientation.value = state.orientation;
  elements.status.value = state.status;
  elements.license.value = state.license;
  elements.sort.value = state.sort;
}

function syncUrlState() {
  const params = new URLSearchParams();
  for (const key of ['query', 'type', 'category', 'orientation', 'status', 'license', 'sort']) {
    const value = state[key];
    if (value && !(key === 'sort' && value === 'quality')) params.set(key, value);
  }
  history.replaceState({}, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
}

function sortRecords(a, b) {
  if (state.sort === 'title') return a.title.localeCompare(b.title, 'de');
  if (state.sort === 'category') return a.category.localeCompare(b.category) || a.title.localeCompare(b.title, 'de');
  return b.qualityRating - a.qualityRating || a.title.localeCompare(b.title, 'de');
}

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveAssetUrl(value) {
  if (/^https?:\/\//i.test(value)) return value;
  return `../${value.replace(/^\.\//, '')}`;
}

function label(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function typeLabel(value) {
  return ({
    video: 'B-Roll',
    image: 'Bild',
    animation: 'Animation',
    overlay: 'Overlay',
    'screen-recording': 'Screen-Recording',
    graphic: 'Grafik',
    icon: 'Icon',
    mockup: 'Mockup'
  })[value] || label(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function createMessage(title, description) {
  const box = document.createElement('section');
  box.className = 'empty-state';
  box.append(textElement('h2', title), textElement('p', description));
  return box;
}
