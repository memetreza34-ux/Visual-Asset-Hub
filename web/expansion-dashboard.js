const section = document.querySelector('#expansion-dashboard');
const files = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];
const targetPerCollection = 8;
const minimumVideosPerCollection = 2;
const minimumPhotosPerCollection = 2;

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
    text('p', `${candidates} Kandidaten vorhanden · ${review} warten auf Review · ${percent}% des empfohlenen Gesamtziels. Der Hub prüft vorhandene Kandidaten zuerst und sucht nur nach, wenn der Review-Vorrat für eine Sammlung nicht reicht.`)
  );
  const overall = document.createElement('div');
  overall.className = 'expansion-overall';
  overall.append(text('strong', `${percent}%`), progress(percent));
  header.append(copy, overall);

  const nextTasks = globalTaskQueue(rows);
  const grid = document.createElement('div');
  grid.className = 'expansion-channel-grid';
  for (const row of rows) grid.append(channelCard(row));

  const strategy = document.createElement('div');
  strategy.className = 'expansion-strategy';
  strategy.append(
    strategyItem('1. Review', 'Vorhandene Kandidaten', 'bereits importierte Assets zuerst prüfen und freigeben oder aussortieren'),
    strategyItem('2. Video-Lücke', 'Pexels → Pixabay', 'Hochformat-B-Rolls werden für Reel-Produktion zuerst ergänzt'),
    strategyItem('3. Foto-Lücke', 'Unsplash → Openverse/Wikimedia', 'hochwertige oder offen lizenzierte Bilder ergänzen')
  );
  section.replaceChildren(header, nextTasks, grid, strategy);
}

function summarizeChannel(channel, records) {
  const collections = (channel.collections ?? []).map((collection) => {
    const matching = records.filter((record) => (record.tags ?? []).includes(channel.channelTag) && (record.tags ?? []).includes(`collection-${collection.id}`));
    const approved = matching.filter((record) => record.status === 'approved').length;
    const review = matching.filter((record) => ['inbox', 'review'].includes(record.status)).length;
    const videos = matching.filter((record) => record.type === 'video').length;
    const photos = matching.filter((record) => record.type === 'image').length;
    const gap = Math.max(0, targetPerCollection - approved);
    const searchGap = Math.max(0, gap - review);
    const videoGap = Math.max(0, minimumVideosPerCollection - videos);
    const photoGap = Math.max(0, minimumPhotosPerCollection - photos);
    const recommendation = recommendSearch({ videos, photos, videoGap, photoGap });
    return { collection, candidates: matching.length, approved, review, videos, photos, gap, searchGap, videoGap, photoGap, recommendation };
  });
  const target = collections.length * targetPerCollection;
  const approved = collections.reduce((sum, row) => sum + row.approved, 0);
  const weakest = [...collections]
    .filter((row) => row.gap > 0)
    .sort((a, b) => b.gap - a.gap || b.searchGap - a.searchGap || (b.videoGap + b.photoGap) - (a.videoGap + a.photoGap) || a.approved - b.approved || a.candidates - b.candidates || a.collection.label.localeCompare(b.collection.label, 'de'))
    .slice(0, 5);
  const searchWeakest = [...collections]
    .filter((row) => row.searchGap > 0)
    .sort((a, b) => (b.videoGap + b.photoGap) - (a.videoGap + a.photoGap) || b.searchGap - a.searchGap || b.gap - a.gap || a.approved - b.approved || a.candidates - b.candidates || a.collection.label.localeCompare(b.collection.label, 'de'))
    .slice(0, 10);
  const reviewWeakest = [...collections]
    .filter((row) => row.gap > 0 && row.review > 0 && row.searchGap === 0)
    .sort((a, b) => b.gap - a.gap || b.review - a.review || a.approved - b.approved || a.collection.label.localeCompare(b.collection.label, 'de'));
  const batch = smartBatch(searchWeakest);
  return {
    channel,
    collections,
    target,
    approved,
    candidates: collections.reduce((sum, row) => sum + row.candidates, 0),
    review: collections.reduce((sum, row) => sum + row.review, 0),
    percent: target ? Math.min(100, Math.round((approved / target) * 100)) : 100,
    weakest,
    searchWeakest,
    reviewWeakest,
    batch
  };
}

function globalTaskQueue(rows) {
  const tasks = [];
  for (const row of rows) {
    for (const item of row.collections) {
      if (item.gap <= 0) continue;
      if (item.review > 0 && item.searchGap === 0) {
        tasks.push({
          kind: 'review',
          channel: row.channel,
          item,
          score: item.gap * 100 + item.review * 10 + item.videoGap * 5 + item.photoGap * 5
        });
      } else if (item.searchGap > 0) {
        tasks.push({
          kind: 'search',
          channel: row.channel,
          item,
          score: item.searchGap * 100 + item.gap * 10 + item.videoGap * 20 + item.photoGap * 20
        });
      }
    }
  }
  tasks.sort((a, b) => taskRank(a.kind) - taskRank(b.kind) || b.score - a.score || a.channel.label.localeCompare(b.channel.label, 'de') || a.item.collection.label.localeCompare(b.item.collection.label, 'de'));

  const wrapper = document.createElement('section');
  wrapper.className = 'expansion-next-tasks';
  const heading = document.createElement('div');
  heading.className = 'expansion-next-heading';
  heading.append(text('strong', 'Nächste Aufgaben'), text('span', 'Review-first über alle vier Kanäle · nichts startet automatisch'));
  const list = document.createElement('div');
  list.className = 'expansion-next-list';

  for (const task of tasks.slice(0, 6)) {
    const button = document.createElement('button');
    button.type = 'button';
    if (task.kind === 'review') {
      button.append(
        text('span', `${task.channel.label} · ${task.item.collection.label}`),
        text('b', `Review zuerst · ${task.item.review} offen`)
      );
      button.title = `${task.item.approved}/${targetPerCollection} freigegeben; vorhandene Review-Kandidaten reichen zunächst aus.`;
      button.addEventListener('click', () => openReview(task.channel.id, task.item.collection.id));
    } else {
      const media = task.item.recommendation.mediaType === 'video' ? 'Video' : 'Foto';
      button.append(
        text('span', `${task.channel.label} · ${task.item.collection.label}`),
        text('b', `${media} · ${providerLabel(task.item.recommendation.provider)} · Lücke ${task.item.searchGap}`)
      );
      button.title = task.item.recommendation.reason;
      button.addEventListener('click', () => openSearch(task.channel.id, task.item));
    }
    list.append(button);
  }

  if (!tasks.length) list.append(text('span', 'Alle Sammlungen haben das empfohlene Ausbauziel erreicht.', 'expansion-next-empty'));
  wrapper.append(heading, list);
  return wrapper;
}

function taskRank(kind) {
  return kind === 'review' ? 0 : 1;
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
    const hasReviewStock = item.review > 0 && item.searchGap === 0;
    if (hasReviewStock) {
      button.append(text('span', `${item.collection.label} · Review zuerst`), text('b', `${item.approved}/${targetPerCollection} · ${item.review} R`));
      button.title = `${row.channel.label} / ${item.collection.label}: vorhandene Review-Kandidaten reichen zunächst aus.`;
      button.addEventListener('click', () => openReview(row.channel.id, item.collection.id));
    } else {
      const media = item.recommendation.mediaType === 'video' ? 'Video' : 'Foto';
      button.append(text('span', `${item.collection.label} · ${media}/${providerLabel(item.recommendation.provider)}`), text('b', `${item.approved}/${targetPerCollection} · ${item.review} R`));
      button.title = `${row.channel.label} / ${item.collection.label}: ${item.recommendation.reason}`;
      button.addEventListener('click', () => openSearch(row.channel.id, item));
    }
    list.append(button);
  }
  if (!row.weakest.length) list.append(text('span', 'Empfohlenes Ziel erreicht.'));

  const batch = document.createElement('button');
  batch.type = 'button';
  batch.className = 'expansion-batch-button';
  if (row.reviewWeakest.length) {
    batch.textContent = `${row.reviewWeakest.length} priorisierte Review-Sammlungen prüfen`;
    batch.addEventListener('click', () => openReview(row.channel.id));
  } else if (row.batch.items.length) {
    const media = row.batch.mediaType === 'video' ? 'Video' : 'Foto';
    batch.textContent = `${row.batch.items.length} ${media}-Suchlücken mit ${providerLabel(row.batch.provider)} vorbereiten`;
    batch.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('vah:arsenal-batch-select', {
        detail: {
          channel: row.channel.id,
          collections: row.batch.items.map((item) => item.collection.id),
          provider: row.batch.provider,
          variant: row.batch.variant
        }
      }));
      document.querySelector('#arsenal-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } else {
    batch.textContent = 'Kanal vollständig';
    batch.disabled = true;
  }

  card.append(title, list, batch);
  return card;
}

function openReview(channel, collection) {
  window.dispatchEvent(new CustomEvent('vah:review-focus', { detail: { channel, collection } }));
  document.querySelector('#review-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openSearch(channel, item) {
  window.dispatchEvent(new CustomEvent('vah:arsenal-select', {
    detail: {
      channel,
      collection: item.collection.id,
      provider: item.recommendation.provider,
      variant: item.recommendation.variant
    }
  }));
  document.querySelector('#arsenal-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function recommendSearch({ videos, photos, videoGap, photoGap }) {
  if (videoGap > 0) return { mediaType: 'video', provider: 'pexels', variant: 'video-vertical', reason: `${videos}/${minimumVideosPerCollection} Video-Kandidaten vorhanden; zuerst vertikale B-Rolls ergänzen.` };
  if (photoGap > 0) return { mediaType: 'photo', provider: 'unsplash', variant: 'photo-vertical', reason: `${photos}/${minimumPhotosPerCollection} Foto-Kandidaten vorhanden; hochwertige Fotos ergänzen.` };
  if (videos <= photos) return { mediaType: 'video', provider: 'pexels', variant: 'video-vertical', reason: 'Grundmix ist vorhanden; für Reel-Nutzung wird die kleinere Video-Seite des Bestands ergänzt.' };
  return { mediaType: 'photo', provider: 'unsplash', variant: 'photo-vertical', reason: 'Grundmix ist vorhanden; die kleinere Foto-Seite des Bestands wird ergänzt.' };
}

function smartBatch(rows) {
  if (!rows.length) return { items: [], mediaType: null, provider: null, variant: null };
  const first = rows[0].recommendation;
  const items = rows.filter((row) => row.recommendation.mediaType === first.mediaType).slice(0, 5);
  return { items, mediaType: first.mediaType, provider: first.provider, variant: first.variant };
}

function strategyItem(title, providers, description) {
  const item = document.createElement('div');
  item.append(text('strong', title), text('span', providers), text('small', description));
  return item;
}
function providerLabel(value) { return ({ pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia' })[value] ?? value; }
function progress(value) { const outer = document.createElement('div'); outer.className = 'expansion-progress'; outer.setAttribute('role', 'progressbar'); outer.setAttribute('aria-valuemin', '0'); outer.setAttribute('aria-valuemax', '100'); outer.setAttribute('aria-valuenow', String(value)); const inner = document.createElement('span'); inner.style.width = `${value}%`; outer.append(inner); return outer; }
function text(tag, value, className = '') { const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el; }
