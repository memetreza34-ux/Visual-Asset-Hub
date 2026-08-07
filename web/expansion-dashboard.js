const section = document.querySelector('#expansion-dashboard');
const files = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];

if (section) init().catch((error) => {
  section.hidden = false;
  section.textContent = `Ausbau-Fortschritt konnte nicht geladen werden: ${error.message}`;
});

async function init() {
  const [channels, index] = await Promise.all([
    Promise.all(files.map(async (file) => {
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
  const rows = channels.map((channel) => summarizeChannel(channel, records));
  const target = rows.reduce((sum, row) => sum + row.target, 0);
  const approved = rows.reduce((sum, row) => sum + row.approved, 0);
  const candidates = rows.reduce((sum, row) => sum + row.candidates, 0);
  const review = rows.reduce((sum, row) => sum + row.review, 0);
  const percent = target ? Math.round((approved / target) * 100) : 0;

  const header = document.createElement('div');
  header.className = 'expansion-header';
  const copy = document.createElement('div');
  copy.append(
    text('span', 'Ausbauplan', 'eyebrow'),
    text('h2', `${approved}/${target} freigegebene Assets`),
    text('p', `${candidates} Kandidaten vorhanden · ${review} warten auf Review · ${percent}% des empfohlenen Gesamtziels. Neue Suchen werden nur für Sammlungen vorbereitet, deren vorhandener Review-Vorrat noch nicht reicht.`)
  );
  const overall = document.createElement('div');
  overall.className = 'expansion-overall';
  overall.append(text('strong', `${percent}%`), progress(percent));
  header.append(copy, overall);

  const grid = document.createElement('div');
  grid.className = 'expansion-channel-grid';
  for (const row of rows) grid.append(channelCard(row));

  const strategy = document.createElement('div');
  strategy.className = 'expansion-strategy';
  strategy.append(
    strategyItem('Videos', 'Pexels + Pixabay', 'B-Rolls und bewegte Motive'),
    strategyItem('Premium-Fotos', 'Unsplash', 'moderne hochwertige Stockfotos'),
    strategyItem('Offene Bilder', 'Openverse + Wikimedia', 'CC/Public-Domain und Nischenmotive')
  );
  section.replaceChildren(header, grid, strategy);
}

function summarizeChannel(channel, records) {
  const collections = (channel.collections ?? []).map((collection) => {
    const matching = records.filter((record) => (record.tags ?? []).includes(channel.channelTag) && (record.tags ?? []).includes(`collection-${collection.id}`));
    const approved = matching.filter((record) => record.status === 'approved').length;
    const review = matching.filter((record) => ['inbox', 'review'].includes(record.status)).length;
    const videos = matching.filter((record) => record.type === 'video').length;
    const photos = matching.filter((record) => record.type === 'image').length;
    const gap = Math.max(0, 8 - approved);
    const searchGap = Math.max(0, gap - review);
    return { collection, candidates: matching.length, approved, review, videos, photos, gap, searchGap };
  });
  const target = collections.length * 8;
  const approved = collections.reduce((sum, row) => sum + row.approved, 0);
  const weakest = [...collections]
    .filter((row) => row.gap > 0)
    .sort((a, b) => b.gap - a.gap || b.searchGap - a.searchGap || a.approved - b.approved || a.candidates - b.candidates || a.collection.label.localeCompare(b.collection.label, 'de'))
    .slice(0, 5);
  const searchWeakest = [...collections]
    .filter((row) => row.searchGap > 0)
    .sort((a, b) => b.searchGap - a.searchGap || b.gap - a.gap || a.approved - b.approved || a.candidates - b.candidates || a.collection.label.localeCompare(b.collection.label, 'de'))
    .slice(0, 5);
  return {
    channel,
    collections,
    target,
    approved,
    candidates: collections.reduce((sum, row) => sum + row.candidates, 0),
    review: collections.reduce((sum, row) => sum + row.review, 0),
    percent: target ? Math.min(100, Math.round((approved / target) * 100)) : 100,
    weakest,
    searchWeakest
  };
}

function channelCard(row) {
  const card = document.createElement('article');
  card.className = `expansion-channel-card channel-${row.channel.id}`;
  const top = document.createElement('div');
  top.className = 'expansion-channel-top';
  top.append(text('strong', row.channel.label), text('b', `${row.approved}/${row.target}`));
  card.append(top, progress(row.percent), text('p', `${row.candidates} Kandidaten · ${row.review} offen · ${row.percent}% freigegeben`));

  const title = text('span', 'Größte Freigabe-Lücken', 'expansion-gap-title');
  const list = document.createElement('div');
  list.className = 'expansion-gaps';
  for (const item of row.weakest) {
    const button = document.createElement('button');
    button.type = 'button';
    button.append(text('span', item.collection.label), text('b', `${item.approved}/8 · ${item.review} R`));
    button.title = `${row.channel.label} / ${item.collection.label} im Medien-Builder öffnen`;
    button.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('vah:arsenal-select', { detail: { channel: row.channel.id, collection: item.collection.id } }));
      document.querySelector('#arsenal-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    list.append(button);
  }
  if (!row.weakest.length) list.append(text('span', 'Empfohlenes Ziel erreicht.'));

  const batch = document.createElement('button');
  batch.type = 'button';
  batch.className = 'expansion-batch-button';
  if (row.searchWeakest.length) {
    batch.textContent = `Top ${row.searchWeakest.length} Suchlücken vorbereiten`;
  } else if (row.review > 0 && row.approved < row.target) {
    batch.textContent = 'Erst vorhandene Reviews prüfen';
  } else {
    batch.textContent = 'Kanal vollständig';
  }
  batch.disabled = row.searchWeakest.length === 0;
  batch.addEventListener('click', () => {
    if (!row.searchWeakest.length) return;
    window.dispatchEvent(new CustomEvent('vah:arsenal-batch-select', {
      detail: { channel: row.channel.id, collections: row.searchWeakest.map((item) => item.collection.id) }
    }));
    document.querySelector('#arsenal-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  card.append(title, list, batch);
  return card;
}

function strategyItem(title, providers, description) {
  const item = document.createElement('div');
  item.append(text('strong', title), text('span', providers), text('small', description));
  return item;
}
function progress(value) { const outer = document.createElement('div'); outer.className = 'expansion-progress'; outer.setAttribute('role', 'progressbar'); outer.setAttribute('aria-valuemin', '0'); outer.setAttribute('aria-valuemax', '100'); outer.setAttribute('aria-valuenow', String(value)); const inner = document.createElement('span'); inner.style.width = `${value}%`; outer.append(inner); return outer; }
function text(tag, value, className = '') { const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el; }
