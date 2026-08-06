const section = document.querySelector('#channel-arsenal');
const channelFiles = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];

if (section) initChannelArsenal().catch((error) => {
  section.hidden = false;
  section.replaceChildren(message(`Kanalbibliothek konnte nicht geladen werden: ${error.message}`));
});

async function initChannelArsenal() {
  const channels = await Promise.all(channelFiles.map(async (file) => {
    const response = await fetch(`../catalog/channels/${file}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
    return response.json();
  }));
  render(channels);
}

function render(channels) {
  section.hidden = false;
  const totalCollections = channels.reduce((sum, channel) => sum + channel.collections.length, 0);
  const totalQueries = channels.reduce((sum, channel) => sum + channel.collections.reduce((inner, collection) => inner + collection.queries.length, 0), 0);
  const header = document.createElement('div');
  header.className = 'arsenal-header';
  header.innerHTML = `<div><span class="eyebrow">Kanal-Arsenal</span><h2>${totalCollections} Sammlungen für deine vier Kanäle</h2><p>${totalQueries} vorbereitete Suchbegriffe für B-Rolls und Bilder. Jede Sammlung ist für vertikale Reels und horizontale Videos geplant.</p></div>`;

  const controls = document.createElement('div');
  controls.className = 'arsenal-controls';
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Sammlung suchen, z. B. RCD, Boxring, Aktien …';
  search.setAttribute('aria-label', 'Kanal-Sammlungen durchsuchen');
  const tabs = document.createElement('div');
  tabs.className = 'arsenal-tabs';
  controls.append(search, tabs);

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
  section.replaceChildren(header, controls, grid);
  renderCards();

  function renderCards() {
    const cards = [];
    for (const channel of channels) {
      if (activeChannel !== 'all' && activeChannel !== channel.id) continue;
      for (const collection of channel.collections) {
        const searchable = normalize([channel.label, collection.label, collection.id, ...collection.tags, ...collection.queries].join(' '));
        if (query && !query.split(' ').every((term) => searchable.includes(term))) continue;
        cards.push(createCard(channel, collection));
      }
    }
    grid.replaceChildren(...cards);
    if (!cards.length) grid.append(message('Keine passende Sammlung gefunden.'));
  }
}

function createCard(channel, collection) {
  const article = document.createElement('article');
  article.className = `arsenal-card channel-${channel.id}`;
  const top = document.createElement('div');
  top.className = 'arsenal-card-top';
  const channelLabel = document.createElement('span');
  channelLabel.className = 'arsenal-channel-label';
  channelLabel.textContent = channel.label;
  const count = document.createElement('span');
  count.textContent = `${collection.queries.length} Suchen · 4 Formate`;
  top.append(channelLabel, count);
  const title = document.createElement('h3');
  title.textContent = collection.label;
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
  searchInventory.textContent = 'Im Bestand suchen';
  searchInventory.addEventListener('click', () => {
    const search = document.querySelector('#search');
    if (!search) return;
    search.value = collection.tags.slice(0, 2).join(' ');
    search.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#asset-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const copyPack = document.createElement('button');
  copyPack.type = 'button';
  copyPack.textContent = 'Suchpaket kopieren';
  copyPack.addEventListener('click', async () => {
    const text = `${channel.label} / ${collection.label}\n${collection.queries.map((value) => `- ${value}`).join('\n')}\nTags: ${collection.tags.join(', ')}`;
    try { await navigator.clipboard.writeText(text); copyPack.textContent = 'Paket kopiert'; }
    catch { copyPack.textContent = 'Nicht möglich'; }
    setTimeout(() => { copyPack.textContent = 'Suchpaket kopieren'; }, 1200);
  });
  actions.append(searchInventory, copyPack);
  article.append(top, title, tags, queries, actions);
  if (collection.reviewNotes) {
    const note = document.createElement('p');
    note.className = 'arsenal-note';
    note.textContent = collection.reviewNotes;
    article.append(note);
  }
  return article;
}

function message(text) { const element = document.createElement('p'); element.className = 'arsenal-empty'; element.textContent = text; return element; }
function normalize(value) { return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function label(value) { return String(value).replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase()); }
