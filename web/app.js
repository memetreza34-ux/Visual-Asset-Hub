const state = {
  index: null,
  taxonomy: null,
  manifest: { ready: [], failed: [], count: 0 },
  health: null,
  query: '', type: '', category: '', orientation: '', status: '', license: '', sort: 'quality'
};

const elements = {
  search: document.querySelector('#search'), type: document.querySelector('#type-filter'), category: document.querySelector('#category-filter'),
  orientation: document.querySelector('#orientation-filter'), status: document.querySelector('#status-filter'), license: document.querySelector('#license-filter'),
  sort: document.querySelector('#sort-filter'), reset: document.querySelector('#reset'), assetCount: document.querySelector('#asset-count'),
  inboxCount: document.querySelector('#inbox-count'), resultCount: document.querySelector('#result-count'), catalogDate: document.querySelector('#catalog-date'),
  grid: document.querySelector('#asset-grid'), empty: document.querySelector('#empty-state'), cardTemplate: document.querySelector('#asset-card-template'),
  dialog: document.querySelector('#asset-dialog'), dialogContent: document.querySelector('#dialog-content'), dialogClose: document.querySelector('#asset-dialog .dialog-close'),
  scanInbox: document.querySelector('#scan-inbox'), reviewStatus: document.querySelector('#review-status'), reviewGrid: document.querySelector('#review-grid'),
  reviewEmpty: document.querySelector('#review-empty'), reviewDialog: document.querySelector('#review-dialog'), reviewDialogClose: document.querySelector('.review-dialog-close'),
  reviewForm: document.querySelector('#review-form'), reviewMedia: document.querySelector('#review-media'), reviewFileTitle: document.querySelector('#review-file-title'),
  reviewTech: document.querySelector('#review-tech'), reviewFile: document.querySelector('#review-file'), cancelReview: document.querySelector('#cancel-review'),
  approveImport: document.querySelector('#approve-import'), importError: document.querySelector('#import-error'), reviewType: document.querySelector('#review-type'),
  reviewCategory: document.querySelector('#review-category'), reviewShot: document.querySelector('#review-shot'), reviewMovement: document.querySelector('#review-movement'),
  reviewStyle: document.querySelector('#review-style'), reviewLicense: document.querySelector('#review-license'), reviewScopes: document.querySelector('#review-scopes')
};

init().catch((error) => {
  elements.grid.replaceChildren(createMessage('Visual Asset Hub konnte nicht geladen werden.', error.message));
  elements.empty.hidden = true;
});

async function init() {
  const [taxonomy, health] = await Promise.all([fetchJson('../catalog/taxonomy.json'), fetchJson('/api/health').catch(() => ({ writeApiEnabled: false }))]);
  state.taxonomy = taxonomy;
  state.health = health;
  populateReviewFields();
  await Promise.all([loadCatalog(), loadInbox()]);
  restoreUrlState();
  bindEvents();
  renderLibrary();
  renderInbox();
}

async function loadCatalog() {
  state.index = await fetchJson('../catalog/search-index.json');
  elements.assetCount.textContent = String(state.index.assetCount);
  elements.catalogDate.textContent = `Katalogstand: ${formatDate(state.index.catalogUpdatedAt)}`;
  populateFilter(elements.type, state.index.facets.types, 'Alle Typen');
  populateFilter(elements.category, state.index.facets.categories, 'Alle Kategorien');
  populateFilter(elements.orientation, state.index.facets.orientations, 'Alle Ausrichtungen');
  populateFilter(elements.status, state.index.facets.statuses, 'Alle Status');
  populateFilter(elements.license, state.index.facets.licenseStatuses, 'Alle Lizenzen');
}

async function loadInbox() {
  state.manifest = await fetchJson('/api/inbox');
  elements.inboxCount.textContent = String(state.manifest.ready?.length || 0);
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
  elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
  elements.scanInbox.addEventListener('click', scanInbox);
  elements.reviewDialogClose.addEventListener('click', () => elements.reviewDialog.close());
  elements.cancelReview.addEventListener('click', () => elements.reviewDialog.close());
  elements.reviewDialog.addEventListener('click', (event) => { if (event.target === elements.reviewDialog) elements.reviewDialog.close(); });
  elements.reviewForm.addEventListener('submit', importReviewedAsset);
}

async function scanInbox() {
  setBusy(elements.scanInbox, true, 'Analysiere …');
  elements.reviewStatus.textContent = 'Inbox wird mit FFmpeg analysiert …';
  try {
    const response = await fetch('/api/inbox/scan', { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    state.manifest = payload.manifest;
    elements.reviewStatus.textContent = `${state.manifest.ready.length} Asset(s) bereit für Review.`;
    renderInbox();
  } catch (error) {
    elements.reviewStatus.textContent = `Scan fehlgeschlagen: ${error.message}`;
  } finally {
    setBusy(elements.scanInbox, false, 'Inbox neu scannen');
  }
}

function renderInbox() {
  const ready = state.manifest.ready || [];
  const failed = state.manifest.failed || [];
  elements.inboxCount.textContent = String(ready.length);
  elements.reviewGrid.replaceChildren(...ready.map(createReviewCard), ...failed.map(createFailedCard));
  elements.reviewEmpty.hidden = ready.length + failed.length !== 0;
  if (!elements.reviewStatus.textContent) {
    elements.reviewStatus.textContent = state.manifest.generatedAt ? `Letzter Scan: ${formatDate(state.manifest.generatedAt)}` : 'Noch kein Inbox-Scan durchgeführt.';
  }
  if (!state.health?.writeApiEnabled) elements.reviewStatus.textContent += ' Schreibzugriff ist deaktiviert; starte den Server lokal auf 127.0.0.1.';
}

function createReviewCard(asset) {
  const article = document.createElement('article');
  article.className = 'review-card';
  const visual = document.createElement('div');
  visual.className = 'review-thumb';
  appendReviewVisual(visual, asset, false);
  const body = document.createElement('div');
  body.className = 'review-card-body';
  const title = textElement('strong', pathName(asset.file));
  const technical = asset.technical || {};
  const info = textElement('span', [technical.width && technical.height ? `${technical.width}×${technical.height}` : '', technical.durationSeconds !== undefined ? `${technical.durationSeconds}s` : '', technical.fps ? `${technical.fps} fps` : '', asset.orientation || ''].filter(Boolean).join(' · '), 'review-card-tech');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button';
  button.textContent = 'Prüfen & aufnehmen';
  button.addEventListener('click', () => openReview(asset));
  body.append(title, info, button);
  article.append(visual, body);
  return article;
}

function createFailedCard(item) {
  const article = document.createElement('article');
  article.className = 'review-card review-card-failed';
  const body = document.createElement('div');
  body.className = 'review-card-body';
  body.append(textElement('strong', pathName(item.file)), textElement('span', item.error || 'Analyse fehlgeschlagen.', 'form-error'));
  article.append(body);
  return article;
}

function openReview(asset) {
  elements.reviewForm.reset();
  elements.importError.hidden = true;
  elements.importError.textContent = '';
  elements.reviewFile.value = asset.file;
  elements.reviewFileTitle.textContent = pathName(asset.file);
  const t = asset.technical || {};
  elements.reviewTech.textContent = [t.width && t.height ? `${t.width} × ${t.height}` : '', t.durationSeconds !== undefined ? `${t.durationSeconds} s` : '', t.fps ? `${t.fps} fps` : '', t.codec || '', asset.orientation || ''].filter(Boolean).join(' · ');
  elements.reviewMedia.replaceChildren();
  appendReviewVisual(elements.reviewMedia, asset, true);

  const stem = pathName(asset.file).replace(/\.[^.]+$/, '');
  const words = stem.replace(/[_-]+/g, ' ').trim();
  const tokens = normalize(words).split(' ').filter((word) => word.length > 2);
  const isImage = /\.(jpe?g|png|webp|avif)$/i.test(asset.file);
  elements.reviewForm.elements.title.value = titleCase(words) || 'Neues Asset';
  elements.reviewForm.elements.description.value = `${isImage ? 'Bild' : 'Video'} aus der Visual-Asset-Hub-Inbox: ${words || stem}.`;
  elements.reviewForm.elements.type.value = isImage ? 'image' : 'video';
  elements.reviewForm.elements.category.value = '';
  elements.reviewForm.elements.subject.value = tokens[0] || 'asset';
  elements.reviewForm.elements.action.value = tokens[1] || (isImage ? 'static' : 'scene');
  elements.reviewForm.elements.shot.value = isImage ? 'not-applicable' : 'mixed';
  elements.reviewForm.elements.movement.value = isImage ? 'not-applicable' : 'static';
  elements.reviewForm.elements.style.value = 'realistic';
  elements.reviewForm.elements.license.value = 'owned';
  elements.reviewForm.elements.source.value = 'Eigene Produktion';
  elements.reviewForm.elements.tags.value = unique([...(tokens.slice(0, 5)), isImage ? 'image' : 'video', asset.orientation].filter(Boolean)).slice(0, 6).join(', ');
  for (const option of elements.reviewScopes.options) option.selected = ['organic-social', 'youtube'].includes(option.value);
  elements.reviewDialog.showModal();
}

async function importReviewedAsset(event) {
  event.preventDefault();
  if (!elements.reviewForm.reportValidity()) return;
  const form = new FormData(elements.reviewForm);
  const payload = Object.fromEntries(form.entries());
  payload.scopes = form.getAll('scopes');
  if (!payload.scopes.length) {
    showImportError('Mindestens einen Nutzungsbereich auswählen.');
    return;
  }
  setBusy(elements.approveImport, true, 'Importiere …');
  elements.importError.hidden = true;
  try {
    const response = await fetch('/api/inbox/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    elements.reviewDialog.close();
    if (result.manifest) state.manifest = result.manifest; else await loadInbox();
    await loadCatalog();
    renderInbox();
    renderLibrary();
    elements.reviewStatus.textContent = 'Asset erfolgreich in die Bibliothek aufgenommen.';
  } catch (error) {
    showImportError(error.message);
  } finally {
    setBusy(elements.approveImport, false, 'Approve & in Bibliothek aufnehmen');
  }
}

function appendReviewVisual(container, asset, full) {
  const isImage = /\.(jpe?g|png|webp|avif)$/i.test(asset.file || '');
  if (!isImage && full) {
    const video = document.createElement('video');
    video.src = resolveAssetUrl(asset.file);
    video.controls = true;
    video.preload = 'metadata';
    if (asset.previewPath) video.poster = resolveAssetUrl(asset.previewPath);
    container.append(video);
    return;
  }
  const source = asset.previewPath || (isImage ? asset.file : '');
  if (source) {
    const image = document.createElement('img');
    image.src = resolveAssetUrl(source);
    image.alt = '';
    image.loading = 'lazy';
    container.append(image);
  } else container.append(textElement('span', 'Keine Vorschau'));
}

function populateReviewFields() {
  fillSelect(elements.reviewType, state.taxonomy.assetTypes);
  fillSelect(elements.reviewCategory, state.taxonomy.categories, 'Kategorie wählen …');
  fillSelect(elements.reviewShot, state.taxonomy.shotTypes);
  fillSelect(elements.reviewMovement, state.taxonomy.cameraMovements);
  fillSelect(elements.reviewStyle, state.taxonomy.styles);
  fillSelect(elements.reviewLicense, state.taxonomy.licenseStatuses);
  fillSelect(elements.reviewScopes, state.taxonomy.usageScopes);
}

function fillSelect(select, values, placeholder) {
  select.replaceChildren();
  if (placeholder) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = placeholder;
    select.append(option);
  }
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label(value);
    select.append(option);
  }
}

function update(key, value) { state[key] = value; syncUrlState(); renderLibrary(); }
function resetFilters() {
  Object.assign(state, { query: '', type: '', category: '', orientation: '', status: '', license: '', sort: 'quality' });
  for (const element of [elements.search, elements.type, elements.category, elements.orientation, elements.status, elements.license]) element.value = '';
  elements.sort.value = 'quality';
  syncUrlState(); renderLibrary();
}

function renderLibrary() {
  if (!state.index) return;
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
  const article = fragment.querySelector('.asset-card'), button = fragment.querySelector('.asset-open'), preview = fragment.querySelector('.preview');
  if (record.preview) {
    const image = document.createElement('img'); image.src = resolveAssetUrl(record.preview); image.alt = ''; image.loading = 'lazy'; preview.replaceChildren(image);
  } else fragment.querySelector('.preview-type').textContent = typeLabel(record.type);
  fragment.querySelector('.type-badge').textContent = typeLabel(record.type);
  fragment.querySelector('.quality').textContent = `★ ${record.qualityRating}/5`;
  fragment.querySelector('h2').textContent = record.title;
  fragment.querySelector('.description').textContent = record.description;
  fragment.querySelector('.category').textContent = label(record.category);
  fragment.querySelector('.orientation').textContent = label(record.orientation);
  fragment.querySelector('.license').textContent = label(record.licenseStatus);
  const tags = fragment.querySelector('.tags');
  for (const tag of record.tags.slice(0, 5)) tags.append(textElement('span', label(tag)));
  button.addEventListener('click', () => openDetails(record)); article.dataset.assetId = record.id; return fragment;
}

function openDetails(record) {
  const container = document.createElement('div'); container.className = 'detail-layout';
  const visual = document.createElement('div'); visual.className = 'detail-preview';
  if (record.source && /\.(mp4|mov|webm|mkv)$/i.test(record.source)) {
    const video = document.createElement('video'); video.src = resolveAssetUrl(record.source); video.controls = true; if (record.preview) video.poster = resolveAssetUrl(record.preview); visual.append(video);
  } else if (record.preview) { const image = document.createElement('img'); image.src = resolveAssetUrl(record.preview); image.alt = record.title; visual.append(image); }
  else visual.textContent = typeLabel(record.type);
  const content = document.createElement('div'); content.className = 'detail-content';
  content.append(textElement('span', record.id, 'eyebrow'), textElement('h2', record.title), textElement('p', record.description, 'detail-description'), definitionList([
    ['Dateiname', record.filename], ['Typ', typeLabel(record.type)], ['Kategorie', label(record.category)], ['Motiv', label(record.subject)], ['Handlung', label(record.action)],
    ['Ausrichtung', label(record.orientation)], ['Kamera', `${label(record.shotType)} · ${label(record.cameraMovement)}`], ['Stil', label(record.style)], ['Status', label(record.status)],
    ['Lizenz', label(record.licenseStatus)], ['Erlaubte Nutzung', record.usageScopes.map(label).join(', ')], ['Attribution', record.attributionRequired ? 'Erforderlich' : 'Nicht erforderlich']
  ]));
  if (record.technical) {
    const values = [record.technical.width && record.technical.height ? `${record.technical.width} × ${record.technical.height}` : '', record.technical.durationSeconds !== undefined ? `${record.technical.durationSeconds} s` : '', record.technical.fps !== undefined ? `${record.technical.fps} fps` : '', record.technical.codec || ''].filter(Boolean);
    if (values.length) content.append(textElement('p', `Technik: ${values.join(' · ')}`, 'technical-line'));
  }
  const tagList = document.createElement('div'); tagList.className = 'tags detail-tags'; for (const tag of record.tags) tagList.append(textElement('span', label(tag))); content.append(tagList);
  if (record.source) { const link = document.createElement('a'); link.className = 'source-link'; link.href = resolveAssetUrl(record.source); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = record.source.startsWith('http') ? 'Asset-Quelle öffnen' : 'Asset-Datei öffnen'; content.append(link); }
  container.append(visual, content); elements.dialogContent.replaceChildren(container); elements.dialog.showModal();
}

function definitionList(entries) { const list = document.createElement('dl'); for (const [term, value] of entries) list.append(textElement('dt', term), textElement('dd', String(value))); return list; }
function populateFilter(select, counts, firstLabel) { const previous = select.value; select.replaceChildren(); const first = document.createElement('option'); first.value = ''; first.textContent = firstLabel; select.append(first); for (const [value,count] of Object.entries(counts)) { const option=document.createElement('option'); option.value=value; option.textContent=`${label(value)} (${count})`; select.append(option); } select.value = previous; }
function restoreUrlState() { const params=new URLSearchParams(location.search); for(const key of ['query','type','category','orientation','status','license','sort']) if(params.has(key)) state[key]=params.get(key)||''; elements.search.value=state.query;elements.type.value=state.type;elements.category.value=state.category;elements.orientation.value=state.orientation;elements.status.value=state.status;elements.license.value=state.license;elements.sort.value=state.sort; }
function syncUrlState() { const params=new URLSearchParams(); for(const key of ['query','type','category','orientation','status','license','sort']) { const value=state[key]; if(value && !(key==='sort'&&value==='quality')) params.set(key,value); } history.replaceState({},'',`${location.pathname}${params.size?`?${params}`:''}`); }
function sortRecords(a,b){if(state.sort==='title')return a.title.localeCompare(b.title,'de');if(state.sort==='category')return a.category.localeCompare(b.category)||a.title.localeCompare(b.title,'de');return b.qualityRating-a.qualityRating||a.title.localeCompare(b.title,'de');}
function normalize(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function resolveAssetUrl(value){if(/^https?:\/\//i.test(value))return value;return `../${value.replace(/^\.\//,'')}`;}
function label(value){return String(value||'').replaceAll('-',' ').replace(/\b\w/g,(c)=>c.toUpperCase());}
function typeLabel(value){return ({video:'B-Roll',image:'Bild',animation:'Animation',overlay:'Overlay','screen-recording':'Screen-Recording',graphic:'Grafik',icon:'Icon',mockup:'Mockup'})[value]||label(value);}
function formatDate(value){if(!value)return '–';return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
function textElement(tag,text,className){const element=document.createElement(tag);element.textContent=text;if(className)element.className=className;return element;}
function createMessage(title,description){const box=document.createElement('section');box.className='empty-state';box.append(textElement('h2',title),textElement('p',description));return box;}
function pathName(value){return String(value||'').split('/').pop()||'';}
function titleCase(value){return String(value||'').replace(/\b\w/g,(c)=>c.toUpperCase());}
function unique(values){return [...new Set(values)];}
function showImportError(message){elements.importError.textContent=message;elements.importError.hidden=false;}
function setBusy(button,busy,label){button.disabled=busy;button.textContent=label;}
async function fetchJson(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`${url}: HTTP ${response.status}`);return response.json();}
