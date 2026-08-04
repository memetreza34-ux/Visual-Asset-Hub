const PAGE_SIZE = 48;
const FAVORITES_KEY = 'visual-asset-hub:favorites';
const state = {
  index: null, query: '', type: '', category: '', orientation: '', style: '', status: '', license: '', usage: '',
  sort: 'quality', favoritesOnly: false, visible: PAGE_SIZE, favorites: loadFavorites()
};

const elements = {
  search: document.querySelector('#search'), type: document.querySelector('#type-filter'), category: document.querySelector('#category-filter'),
  orientation: document.querySelector('#orientation-filter'), style: document.querySelector('#style-filter'), status: document.querySelector('#status-filter'),
  license: document.querySelector('#license-filter'), usage: document.querySelector('#usage-filter'), sort: document.querySelector('#sort-filter'),
  favoritesFilter: document.querySelector('#favorites-filter'), reset: document.querySelector('#reset'), loadMore: document.querySelector('#load-more'),
  assetCount: document.querySelector('#asset-count'), reviewCount: document.querySelector('#review-count'), approvedCount: document.querySelector('#approved-count'),
  resultCount: document.querySelector('#result-count'), catalogDate: document.querySelector('#catalog-date'), grid: document.querySelector('#asset-grid'),
  empty: document.querySelector('#empty-state'), cardTemplate: document.querySelector('#asset-card-template'), dialog: document.querySelector('#asset-dialog'),
  dialogContent: document.querySelector('#dialog-content'), dialogClose: document.querySelector('.dialog-close')
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
  elements.reviewCount.textContent = String(state.index.reviewCount ?? countStatus('review'));
  elements.approvedCount.textContent = String(state.index.approvedCount ?? countStatus('approved'));
  elements.catalogDate.textContent = `Katalogstand: ${formatDate(state.index.catalogUpdatedAt)}`;
  populateFilter(elements.type, state.index.facets.types);
  populateFilter(elements.category, state.index.facets.categories);
  populateFilter(elements.orientation, state.index.facets.orientations);
  populateFilter(elements.style, state.index.facets.styles);
  populateFilter(elements.status, state.index.facets.statuses);
  populateFilter(elements.license, state.index.facets.licenseStatuses);
  populateFilter(elements.usage, state.index.facets.usageScopes ?? {});
  restoreUrlState();
  bindEvents();
  render();
}

function bindEvents() {
  elements.search.addEventListener('input', () => update('query', elements.search.value));
  for (const [element, key] of [[elements.type,'type'],[elements.category,'category'],[elements.orientation,'orientation'],[elements.style,'style'],[elements.status,'status'],[elements.license,'license'],[elements.usage,'usage'],[elements.sort,'sort']]) {
    element.addEventListener('change', () => update(key, element.value));
  }
  elements.favoritesFilter.addEventListener('change', () => update('favoritesOnly', elements.favoritesFilter.checked));
  elements.reset.addEventListener('click', resetFilters);
  elements.loadMore.addEventListener('click', () => { state.visible += PAGE_SIZE; render(); });
  elements.dialogClose.addEventListener('click', () => elements.dialog.close());
  elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
}

function update(key, value) { state[key] = value; state.visible = PAGE_SIZE; syncUrlState(); render(); }
function resetFilters() {
  Object.assign(state, { query:'',type:'',category:'',orientation:'',style:'',status:'',license:'',usage:'',sort:'quality',favoritesOnly:false,visible:PAGE_SIZE });
  for (const element of [elements.search,elements.type,elements.category,elements.orientation,elements.style,elements.status,elements.license,elements.usage]) element.value = '';
  elements.sort.value = 'quality'; elements.favoritesFilter.checked = false; syncUrlState(); render();
}

function filteredRecords() {
  const query = normalize(state.query);
  return state.index.records
    .filter((record) => !query || query.split(' ').every((term) => record.searchableText.includes(term)))
    .filter((record) => !state.type || record.type === state.type)
    .filter((record) => !state.category || record.category === state.category || record.secondaryCategories.includes(state.category))
    .filter((record) => !state.orientation || record.orientation === state.orientation)
    .filter((record) => !state.style || record.style === state.style)
    .filter((record) => !state.status || record.status === state.status)
    .filter((record) => !state.license || record.licenseStatus === state.license)
    .filter((record) => !state.usage || record.usageScopes.includes(state.usage))
    .filter((record) => !state.favoritesOnly || state.favorites.has(record.id))
    .sort(sortRecords);
}

function render() {
  const records = filteredRecords();
  const visible = records.slice(0, state.visible);
  elements.resultCount.textContent = `${records.length} ${records.length === 1 ? 'Asset' : 'Assets'}${visible.length < records.length ? ` · ${visible.length} sichtbar` : ''}`;
  elements.grid.replaceChildren(...visible.map(createCard));
  elements.grid.hidden = records.length === 0; elements.empty.hidden = records.length !== 0;
  elements.loadMore.hidden = visible.length >= records.length;
}

function createCard(record) {
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const article = fragment.querySelector('.asset-card');
  const button = fragment.querySelector('.asset-open');
  const favoriteButton = fragment.querySelector('.favorite-button');
  const preview = fragment.querySelector('.preview');
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
  updateFavoriteButton(favoriteButton, record.id);
  favoriteButton.addEventListener('click', () => toggleFavorite(record.id));
  button.addEventListener('click', () => openDetails(record));
  article.dataset.assetId = record.id;
  return fragment;
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites])); render();
}
function updateFavoriteButton(button, id) { const active = state.favorites.has(id); button.textContent = active ? '★' : '☆'; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); }

function openDetails(record) {
  const container = document.createElement('div'); container.className = 'detail-layout';
  const visual = document.createElement('div'); visual.className = 'detail-preview';
  if (record.source && ['video','animation','screen-recording'].includes(record.type)) {
    const video = document.createElement('video'); video.controls = true; video.preload = 'metadata'; video.src = resolveAssetUrl(record.source); if (record.preview) video.poster = resolveAssetUrl(record.preview); visual.append(video);
  } else if (record.preview || (record.source && ['image','graphic','icon','mockup'].includes(record.type))) {
    const image = document.createElement('img'); image.src = resolveAssetUrl(record.preview || record.source); image.alt = record.title; visual.append(image);
  } else visual.textContent = typeLabel(record.type);

  const content = document.createElement('div'); content.className = 'detail-content';
  const actions = document.createElement('div'); actions.className = 'detail-actions';
  actions.append(actionButton('ID kopieren', async () => navigator.clipboard.writeText(record.id)));
  if (record.source) actions.append(actionLink('Datei öffnen', resolveAssetUrl(record.source), 'primary'));
  if (record.sourcePage) actions.append(actionLink(`${record.sourceName || 'Quelle'} öffnen`, record.sourcePage));
  if (record.licenseUrl) actions.append(actionLink('Lizenz öffnen', record.licenseUrl));
  content.append(
    textElement('span', record.id, 'eyebrow'), textElement('h2', record.title), textElement('p', record.description, 'detail-description'),
    definitionList([
      ['Dateiname',record.filename],['Typ',typeLabel(record.type)],['Kategorie',label(record.category)],['Motiv',label(record.subject)],['Handlung',label(record.action)],
      ['Ausrichtung',label(record.orientation)],['Kamera',`${label(record.shotType)} · ${label(record.cameraMovement)}`],['Stil',label(record.style)],['Status',label(record.status)],
      ['Lizenz',label(record.licenseStatus)],['Quelle',record.sourceName || '–'],['Erlaubte Nutzung',record.usageScopes.map(label).join(', ')],
      ['Attribution',record.attributionRequired ? (record.attributionText || 'Erforderlich') : 'Nicht erforderlich'],['Importiert',formatDate(record.importedAt)]
    ])
  );
  if (record.technical) {
    const values = [record.technical.width&&record.technical.height?`${record.technical.width} × ${record.technical.height}`:'',record.technical.durationSeconds!==undefined?`${record.technical.durationSeconds} s`:'',record.technical.fps!==undefined?`${record.technical.fps} fps`:'',record.technical.codec||''].filter(Boolean);
    if (values.length) content.append(textElement('p', `Technik: ${values.join(' · ')}`, 'technical-line'));
  }
  const tagList = document.createElement('div'); tagList.className = 'tags detail-tags'; for (const tag of record.tags) tagList.append(textElement('span', label(tag))); content.append(tagList, actions);
  container.append(visual, content); elements.dialogContent.replaceChildren(container); elements.dialog.showModal();
}

function actionLink(text, href, className='') { const link=document.createElement('a');link.className=`source-link ${className}`.trim();link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=text;return link; }
function actionButton(text, handler){const button=document.createElement('button');button.className='source-link secondary-action';button.type='button';button.textContent=text;button.addEventListener('click',async()=>{try{await handler();button.textContent='Kopiert';setTimeout(()=>button.textContent=text,1200);}catch{button.textContent='Nicht möglich';}});return button;}
function definitionList(entries){const list=document.createElement('dl');for(const[term,value]of entries)list.append(textElement('dt',term),textElement('dd',String(value??'–')));return list;}
function populateFilter(select,counts){for(const[value,count]of Object.entries(counts)){if(count===0)continue;const option=document.createElement('option');option.value=value;option.textContent=`${label(value)} (${count})`;select.append(option);}}
function restoreUrlState(){const params=new URLSearchParams(location.search);for(const key of ['query','type','category','orientation','style','status','license','usage','sort'])if(params.has(key))state[key]=params.get(key)||'';state.favoritesOnly=params.get('favorites')==='1';elements.search.value=state.query;elements.type.value=state.type;elements.category.value=state.category;elements.orientation.value=state.orientation;elements.style.value=state.style;elements.status.value=state.status;elements.license.value=state.license;elements.usage.value=state.usage;elements.sort.value=state.sort;elements.favoritesFilter.checked=state.favoritesOnly;}
function syncUrlState(){const params=new URLSearchParams();for(const key of ['query','type','category','orientation','style','status','license','usage','sort']){const value=state[key];if(value&&!(key==='sort'&&value==='quality'))params.set(key,value);}if(state.favoritesOnly)params.set('favorites','1');history.replaceState({},'',`${location.pathname}${params.size?`?${params}`:''}`);}
function sortRecords(a,b){if(state.sort==='title')return a.title.localeCompare(b.title,'de');if(state.sort==='category')return a.category.localeCompare(b.category)||a.title.localeCompare(b.title,'de');if(state.sort==='newest')return Date.parse(b.importedAt)-Date.parse(a.importedAt)||a.title.localeCompare(b.title,'de');return b.qualityRating-a.qualityRating||a.title.localeCompare(b.title,'de');}
function normalize(value){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function resolveAssetUrl(value){if(/^https?:\/\//i.test(value))return value;return`../${value.replace(/^\.\//,'')}`;}
function label(value){return String(value??'').replaceAll('-',' ').replace(/\b\w/g,(character)=>character.toUpperCase());}
function typeLabel(value){return({video:'B-Roll',image:'Bild',animation:'Animation',overlay:'Overlay','screen-recording':'Screen-Recording',graphic:'Grafik',icon:'Icon',mockup:'Mockup'})[value]||label(value);}
function formatDate(value){if(!value)return'–';return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
function textElement(tag,text,className){const element=document.createElement(tag);element.textContent=text;if(className)element.className=className;return element;}
function createMessage(title,description){const box=document.createElement('section');box.className='empty-state';box.append(textElement('h2',title),textElement('p',description));return box;}
function countStatus(status){return state.index.records.filter((record)=>record.status===status).length;}
function loadFavorites(){try{return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]'));}catch{return new Set();}}
