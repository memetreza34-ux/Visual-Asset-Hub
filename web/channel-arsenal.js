const section = document.querySelector('#channel-arsenal');
const channelFiles = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];
const recommendedPerCollection = 8;

if (section) initChannelArsenal().catch((error) => {
  section.hidden = false;
  section.replaceChildren(message(`Kanalbibliothek konnte nicht geladen werden: ${error.message}`));
});

async function initChannelArsenal() {
  const [channels, index] = await Promise.all([
    Promise.all(channelFiles.map(async (file) => {
      const response = await fetch(`../catalog/channels/${file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return response.json();
    })),
    fetch('../catalog/search-index.json', { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`search-index.json: HTTP ${response.status}`);
      return response.json();
    })
  ]);
  render(channels, index.records ?? []);
}

function render(channels, records) {
  section.hidden = false;
  const totalCollections = channels.reduce((sum, channel) => sum + channel.collections.length, 0);
  const totalQueries = channels.reduce((sum, channel) => sum + channel.collections.reduce((inner, collection) => inner + collection.queries.length, 0), 0);
  const arsenalAssets = records.filter((record) => record.tags.some((tag) => tag.startsWith('channel-')));
  const approvedAssets = arsenalAssets.filter((record) => record.status === 'approved');
  const recommendedTarget = totalCollections * recommendedPerCollection;
  const collectionRows = buildCollectionRows(channels, records);

  const header = document.createElement('div');
  header.className = 'arsenal-header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Kanal-Arsenal';
  const title = document.createElement('h2');
  title.textContent = `${totalCollections} Sammlungen für deine vier Kanäle`;
  const description = document.createElement('p');
  description.textContent = `${totalQueries} vorbereitete Suchbegriffe · ${arsenalAssets.length} Kandidaten · ${approvedAssets.length} freigegeben · Ziel ${recommendedTarget}.`;
  heading.append(eyebrow, title, description);
  header.append(heading);

  const recommendations = createRecommendations(collectionRows);

  const controls = document.createElement('div');
  controls.className = 'arsenal-controls';
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Sammlung suchen, z. B. RCD, Boxring, Aktien …';
  search.setAttribute('aria-label', 'Kanal-Sammlungen durchsuchen');
  const tabs = document.createElement('div');
  tabs.className = 'arsenal-tabs';
  const options = document.createElement('div');
  options.className = 'arsenal-options';
  const sort = document.createElement('select');
  sort.setAttribute('aria-label', 'Sammlungen sortieren');
  for (const [value, text] of [['gaps', 'Größte Lücken zuerst'], ['approved', 'Meiste Freigaben'], ['review', 'Meiste Reviews'], ['alphabetical', 'Alphabetisch']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    sort.append(option);
  }
  const gapsOnly = document.createElement('label');
  gapsOnly.className = 'arsenal-gap-filter';
  const gapCheckbox = document.createElement('input');
  gapCheckbox.type = 'checkbox';
  gapCheckbox.checked = true;
  const gapText = document.createElement('span');
  gapText.textContent = 'Nur unvollständige Sammlungen';
  gapsOnly.append(gapCheckbox, gapText);
  options.append(sort, gapsOnly);
  controls.append(search, tabs, options);

  const grid = document.createElement('div');
  grid.className = 'arsenal-grid';
  let activeChannel = 'all';
  let query = '';

  const tabData = [{ id: 'all', label: `Alle (${totalCollections})` }, ...channels.map((channel) => ({ id: channel.id, label: `${channel.label} (${channel.collections.length})` }))];
  for (const tab of tabData) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.channel = tab.id;
    button.textContent = tab.label;
    button.classList.toggle('active', tab.id === 'all');
    button.addEventListener('click', () => {
      activeChannel = tab.id;
      for (const item of tabs.querySelectorAll('button')) item.classList.toggle('active', item === button);
      renderCards();
    });
    tabs.append(button);
  }

  search.addEventListener('input', () => { query = normalize(search.value); renderCards(); });
  sort.addEventListener('change', renderCards);
  gapCheckbox.addEventListener('change', renderCards);
  section.replaceChildren(header, recommendations, controls, grid);
  renderCards();

  function renderCards() {
    const visible = collectionRows.filter((row) => {
      if (activeChannel !== 'all' && activeChannel !== row.channel.id) return false;
      if (gapCheckbox.checked && row.approved >= recommendedPerCollection) return false;
      const searchable = normalize([row.channel.label, row.collection.label, row.collection.id, ...row.collection.tags, ...row.collection.queries].join(' '));
      return !query || query.split(' ').every((term) => searchable.includes(term));
    });
    visible.sort(rowSorter(sort.value));
    grid.replaceChildren(...visible.map((row) => createCard(row.channel, row.collection, row.matching)));
    if (!visible.length) grid.append(message('Keine passende oder offene Sammlung gefunden.'));
  }
}

function buildCollectionRows(channels, records) {
  const rows = [];
  for (const channel of channels) {
    for (const collection of channel.collections) {
      const collectionTag = `collection-${collection.id}`;
      const matching = records.filter((record) => record.tags.includes(channel.channelTag) && record.tags.includes(collectionTag));
      rows.push({
        channel,
        collection,
        matching,
        approved: matching.filter((record) => record.status === 'approved').length,
        pending: matching.filter((record) => ['inbox', 'review'].includes(record.status)).length
      });
    }
  }
  return rows;
}

function createRecommendations(rows) {
  const wrapper = document.createElement('section');
  wrapper.className = 'arsenal-recommendations';
  const top = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = 'Als Nächstes ausbauen';
  const description = document.createElement('p');
  description.textContent = 'Die Sammlungen mit der geringsten Zahl freigegebener Assets. Ein Klick stellt den Arsenal Builder automatisch ein.';
  top.append(title, description);
  const list = document.createElement('div');
  list.className = 'arsenal-recommendation-list';
  const weakest = [...rows].filter((row) => row.approved < recommendedPerCollection).sort(rowSorter('gaps')).slice(0, 8);
  for (const row of weakest) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `arsenal-recommendation channel-${row.channel.id}`;
    const names = document.createElement('span');
    const channelName = document.createElement('small');
    channelName.textContent = row.channel.label;
    const collectionName = document.createElement('strong');
    collectionName.textContent = row.collection.label;
    names.append(channelName, collectionName);
    const count = document.createElement('b');
    count.textContent = `${row.approved}/${recommendedPerCollection}`;
    item.append(names, count);
    item.addEventListener('click', () => selectInBuilder(row.channel.id, row.collection.id));
    list.append(item);
  }
  wrapper.append(top, list);
  return wrapper;
}

function createCard(channel, collection, matching) {
  const article = document.createElement('article');
  article.className = `arsenal-card channel-${channel.id}`;
  const approved = matching.filter((record) => record.status === 'approved').length;
  const pending = matching.filter((record) => ['inbox', 'review'].includes(record.status)).length;
  const restricted = matching.filter((record) => record.status === 'restricted').length;
  const approvedCoverage = Math.min(100, Math.round((approved / recommendedPerCollection) * 100));
  const candidateCoverage = Math.min(100, Math.round((matching.length / recommendedPerCollection) * 100));
  const top = document.createElement('div');
  top.className = 'arsenal-card-top';
  const channelLabel = document.createElement('span');
  channelLabel.className = 'arsenal-channel-label';
  channelLabel.textContent = channel.label;
  const count = document.createElement('span');
  count.textContent = `${matching.length} Kandidaten · ${approved} frei · ${pending} Review${restricted ? ` · ${restricted} gesperrt` : ''}`;
  top.append(channelLabel, count);
  const title = document.createElement('h3');
  title.textContent = collection.label;

  const progressGroup = document.createElement('div');
  progressGroup.className = 'arsenal-progress-group';
  progressGroup.append(progressLine('Freigegeben', approvedCoverage, 'approved'), progressLine('Kandidaten', candidateCoverage, 'candidates'));

  const tags = document.createElement('div');
  tags.className = 'arsenal-tags';
  for (const tag of collection.tags.slice(0, 6)) {
    const chip = document.createElement('span');
    chip.textContent = label(tag);
    tags.append(chip);
  }
  const queries = document.createElement('ol');
  queries.className = 'arsenal-queries';
  for (const query of collection.queries) {
    const item = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = query;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Kopieren';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(query); copy.textContent = 'Kopiert'; }
      catch { copy.textContent = 'Nicht möglich'; }
      setTimeout(() => { copy.textContent = 'Kopieren'; }, 1200);
    });
    item.append(text, copy);
    queries.append(item);
  }
  const actions = document.createElement('div');
  actions.className = 'arsenal-actions';
  const searchInventory = document.createElement('button');
  searchInventory.type = 'button';
  searchInventory.textContent = matching.length ? `Bestand öffnen (${matching.length})` : 'Im Bestand suchen';
  searchInventory.addEventListener('click', () => {
    const search = document.querySelector('#search');
    if (!search) return;
    search.value = `${channel.channelTag} collection-${collection.id}`;
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#asset-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const builder = document.createElement('button');
  builder.type = 'button';
  builder.textContent = approved >= recommendedPerCollection ? 'Weitere Varianten suchen' : 'Lücke mit Pexels füllen';
  builder.addEventListener('click', () => selectInBuilder(channel.id, collection.id));
  const copyPack = document.createElement('button');
  copyPack.type = 'button';
  copyPack.textContent = 'Suchpaket kopieren';
  copyPack.addEventListener('click', async () => {
    const text = `${channel.label} / ${collection.label}\n${collection.queries.map((value) => `- ${value}`).join('\n')}\nTags: ${channel.channelTag}, collection-${collection.id}, ${collection.tags.join(', ')}`;
    try { await navigator.clipboard.writeText(text); copyPack.textContent = 'Paket kopiert'; }
    catch { copyPack.textContent = 'Nicht möglich'; }
    setTimeout(() => { copyPack.textContent = 'Suchpaket kopieren'; }, 1200);
  });
  actions.append(searchInventory, builder, copyPack);
  article.append(top, title, progressGroup, tags, queries, actions);
  if (collection.reviewNotes) {
    const note = document.createElement('p');
    note.className = 'arsenal-note';
    note.textContent = collection.reviewNotes;
    article.append(note);
  }
  return article;
}

function progressLine(name, percentage, kind) {
  const wrapper = document.createElement('div');
  wrapper.className = `arsenal-progress-line ${kind}`;
  const labelElement = document.createElement('span');
  labelElement.textContent = name;
  const progress = document.createElement('div');
  progress.className = 'arsenal-coverage';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', String(percentage));
  const bar = document.createElement('span');
  bar.style.width = `${percentage}%`;
  progress.append(bar);
  const number = document.createElement('b');
  number.textContent = `${percentage}%`;
  wrapper.append(labelElement, progress, number);
  return wrapper;
}

function selectInBuilder(channel, collection) {
  window.dispatchEvent(new CustomEvent('vah:arsenal-select', { detail: { channel, collection } }));
  document.querySelector('#arsenal-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function rowSorter(mode) {
  return (a, b) => {
    if (mode === 'approved') return b.approved - a.approved || b.matching.length - a.matching.length || a.collection.label.localeCompare(b.collection.label, 'de');
    if (mode === 'review') return b.pending - a.pending || a.approved - b.approved || a.collection.label.localeCompare(b.collection.label, 'de');
    if (mode === 'alphabetical') return a.collection.label.localeCompare(b.collection.label, 'de');
    return a.approved - b.approved || a.matching.length - b.matching.length || a.channel.label.localeCompare(b.channel.label, 'de') || a.collection.label.localeCompare(b.collection.label, 'de');
  };
}

function message(text) { const element = document.createElement('p'); element.className = 'arsenal-empty'; element.textContent = text; return element; }
function normalize(value) { return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function label(value) { return String(value).replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase()); }
