const section = document.querySelector('#review-queue');
const reviewerKey = 'visual-asset-hub:reviewer';
const targetPerCollection = 8;
const minimumPerCoreType = 2;

if (section) initReviewQueue().catch(() => {
  section.hidden = true;
});

async function initReviewQueue() {
  const [healthResponse, indexResponse] = await Promise.all([
    fetch('../api/health', { cache: 'no-store' }),
    fetch('../catalog/search-index.json', { cache: 'no-store' })
  ]);
  if (!healthResponse.ok || !indexResponse.ok) throw new Error('Review-Warteschlange ist nicht verfügbar.');
  const health = await healthResponse.json();
  const index = await indexResponse.json();
  if (!health.localAdmin || !health.token) throw new Error('Lokale Verwaltung ist nicht aktiv.');
  renderQueue({ health, records: index.records ?? [] });
}

function renderQueue(state) {
  section.hidden = false;
  let records = state.records;
  let queue = [];
  let position = 0;

  const header = document.createElement('div');
  header.className = 'review-queue-header';
  const heading = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Schnellprüfung';
  const title = document.createElement('h2');
  title.textContent = 'Review-Warteschlange';
  const description = document.createElement('p');
  description.textContent = 'Ungeprüfte Assets gezielt nach Ausbau-Effekt prüfen. Freigaben bleiben vollständig manuell und benötigen weiterhin alle Pflichtkontrollen.';
  heading.append(eyebrow, title, description);
  const summary = document.createElement('strong');
  summary.className = 'review-queue-summary';
  header.append(heading, summary);

  const controls = document.createElement('div');
  controls.className = 'review-queue-controls';
  const channel = selectControl('Kanal', [
    ['all', 'Alle Kanäle'],
    ['channel-finance', 'Finanzen'],
    ['channel-ai', 'Künstliche Intelligenz'],
    ['channel-electro', 'Elektrotechnik'],
    ['channel-combat-sports', 'Kampfsport'],
    ['untagged', 'Noch keinem Kanal zugeordnet']
  ]);
  const collection = selectControl('Sammlung', [['all', 'Alle Sammlungen']]);
  const type = selectControl('Medientyp', [
    ['all', 'Alle Typen'],
    ['video', 'Videos'],
    ['image', 'Bilder'],
    ['graphic', 'Grafiken'],
    ['animation', 'Animationen'],
    ['screen-recording', 'Screen-Recordings']
  ]);
  const order = selectControl('Reihenfolge', [
    ['impact', 'Größter Ausbau-Effekt'],
    ['quality', 'Beste Qualität zuerst'],
    ['oldest', 'Älteste zuerst'],
    ['newest', 'Neueste zuerst'],
    ['channel', 'Kanalweise']
  ], 'impact');
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.textContent = 'Warteschlange neu laden';
  controls.append(channel.wrapper, collection.wrapper, type.wrapper, order.wrapper, refresh);

  const content = document.createElement('div');
  content.className = 'review-queue-content';
  section.replaceChildren(header, controls, content);

  channel.input.addEventListener('change', () => {
    updateCollectionOptions();
    rebuild();
  });
  for (const input of [collection.input, type.input, order.input]) input.addEventListener('change', rebuild);

  refresh.addEventListener('click', async () => {
    refresh.disabled = true;
    refresh.textContent = 'Wird geladen …';
    try {
      const response = await fetch('../catalog/search-index.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const index = await response.json();
      records = index.records ?? [];
      updateCollectionOptions();
      rebuild();
    } finally {
      refresh.disabled = false;
      refresh.textContent = 'Warteschlange neu laden';
    }
  });

  window.addEventListener('vah:review-focus', (event) => {
    const detail = event.detail ?? {};
    const channelTag = detail.channel ? `channel-${detail.channel}` : 'all';
    if ([...channel.input.options].some((option) => option.value === channelTag)) channel.input.value = channelTag;
    updateCollectionOptions();
    if (detail.collection) {
      const collectionTag = `collection-${detail.collection}`;
      if ([...collection.input.options].some((option) => option.value === collectionTag)) collection.input.value = collectionTag;
    }
    if (detail.type && [...type.input.options].some((option) => option.value === detail.type)) type.input.value = detail.type;
    order.input.value = 'impact';
    rebuild();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  updateCollectionOptions();
  rebuild();

  function updateCollectionOptions() {
    const previous = collection.input.value;
    const channelValue = channel.input.value;
    const tags = new Map();
    for (const record of records) {
      if (!['review', 'inbox'].includes(record.status)) continue;
      const recordTags = record.tags ?? [];
      if (!['all', 'untagged'].includes(channelValue) && !recordTags.includes(channelValue)) continue;
      for (const tag of recordTags.filter((value) => value.startsWith('collection-'))) tags.set(tag, label(tag.replace(/^collection-/, '')));
    }
    collection.input.replaceChildren();
    addOption(collection.input, 'all', 'Alle Sammlungen');
    for (const [value, name] of [...tags].sort((a, b) => a[1].localeCompare(b[1], 'de'))) addOption(collection.input, value, name);
    if ([...collection.input.options].some((option) => option.value === previous)) collection.input.value = previous;
  }

  function rebuild() {
    const channelValue = channel.input.value;
    const collectionValue = collection.input.value;
    const typeValue = type.input.value;
    const priorityMap = buildPriorityMap(records);
    queue = records.filter((record) => {
      if (!['review', 'inbox'].includes(record.status)) return false;
      if (typeValue !== 'all' && record.type !== typeValue) return false;
      const tags = record.tags ?? [];
      const channelTags = tags.filter((tag) => tag.startsWith('channel-'));
      if (channelValue === 'untagged' && channelTags.length) return false;
      if (!['all', 'untagged'].includes(channelValue) && !tags.includes(channelValue)) return false;
      if (collectionValue !== 'all' && !tags.includes(collectionValue)) return false;
      return true;
    });
    queue.sort(sorter(order.input.value, priorityMap));
    position = 0;
    renderCurrent(priorityMap);
  }

  function renderCurrent(priorityMap = buildPriorityMap(records)) {
    const totalPending = records.filter((record) => ['review', 'inbox'].includes(record.status)).length;
    summary.textContent = `${queue.length} in dieser Auswahl · ${totalPending} insgesamt offen`;
    content.replaceChildren();
    if (!queue.length) {
      const done = document.createElement('div');
      done.className = 'review-queue-empty';
      const doneTitle = document.createElement('h3');
      doneTitle.textContent = 'Diese Warteschlange ist leer';
      const doneText = document.createElement('p');
      doneText.textContent = totalPending ? 'Wähle einen anderen Kanal, eine andere Sammlung oder einen anderen Medientyp.' : 'Alle vorhandenen Assets besitzen bereits eine Entscheidung.';
      done.append(doneTitle, doneText);
      content.append(done);
      return;
    }

    if (position >= queue.length) position = 0;
    const record = queue[position];
    const card = document.createElement('article');
    card.className = 'review-queue-card';
    const visual = createVisual(record);
    const panel = createReviewPanel(record, priorityMap.get(record.id));
    card.append(visual, panel);
    content.append(card);
  }

  function createReviewPanel(record, priority) {
    const panel = document.createElement('div');
    panel.className = 'review-queue-panel';

    const progress = document.createElement('div');
    progress.className = 'review-queue-progress';
    progress.textContent = `${position + 1} von ${queue.length} · ${record.id}`;
    const title = document.createElement('h3');
    title.textContent = record.title;
    const description = document.createElement('p');
    description.className = 'review-queue-description';
    description.textContent = record.description;

    const metadata = document.createElement('dl');
    metadata.className = 'review-queue-meta';
    addMeta(metadata, 'Kanal', channelLabel(record));
    addMeta(metadata, 'Sammlung', collectionLabel(record));
    addMeta(metadata, 'Kategorie', label(record.category));
    addMeta(metadata, 'Typ', label(record.type));
    addMeta(metadata, 'Format', label(record.orientation));
    addMeta(metadata, 'Quelle', record.sourceName || 'Unbekannt');
    addMeta(metadata, 'Lizenz', label(record.licenseStatus));
    addMeta(metadata, 'Qualität', `${record.qualityRating}/5`);
    if (priority) addMeta(metadata, 'Ausbau-Priorität', `${priority.level} · ${priority.reason}`);

    const links = document.createElement('div');
    links.className = 'review-queue-links';
    if (record.sourcePage) links.append(externalLink('Quellseite öffnen', record.sourcePage));
    if (record.licenseUrl) links.append(externalLink('Lizenz öffnen', record.licenseUrl));
    if (record.source) links.append(externalLink('Original öffnen', record.source));

    const form = document.createElement('form');
    form.className = 'review-queue-form';
    const reviewer = inputField('Prüfer', 'text', localStorage.getItem(reviewerKey) || '', { required: true, maxlength: 120, placeholder: 'z. B. Prüfername' });
    const quality = selectControl('Qualität', [[1, '1 – schwach'], [2, '2 – eher schwach'], [3, '3 – brauchbar'], [4, '4 – gut'], [5, '5 – sehr gut']], String(record.qualityRating || 3));
    const notes = textareaField('Notiz oder Begründung', 'Inhalt, sichtbare Personen/Marken, Rechte oder geplanter Einsatz …');
    const checklist = document.createElement('fieldset');
    checklist.className = 'review-queue-checklist';
    const legend = document.createElement('legend');
    legend.textContent = 'Pflichtprüfung vor Freigabe';
    checklist.append(legend);
    const checks = [
      ['contentViewed', 'Asset vollständig angesehen'],
      ['peopleAndBrandsChecked', 'Personen, Logos und Marken geprüft'],
      ['rightsChecked', 'Quelle, Lizenz und Nutzung geprüft'],
      ['contextChecked', 'Einsatz im geplanten Content geprüft']
    ];
    for (const [name, text] of checks) checklist.append(checkField(name, text));

    const actions = document.createElement('div');
    actions.className = 'review-queue-actions';
    actions.append(
      actionButton('Freigeben & weiter', 'approve', 'approve'),
      actionButton('Einschränken & weiter', 'restrict', 'restrict'),
      actionButton('Archivieren & weiter', 'archive', 'archive'),
      actionButton('Überspringen', 'skip', 'skip')
    );
    const result = document.createElement('p');
    result.className = 'review-queue-result';
    result.hidden = true;

    form.append(reviewer.wrapper, quality.wrapper, notes.wrapper, checklist, actions, result);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const decision = event.submitter?.dataset.decision;
      if (!decision) return;
      if (decision === 'skip') {
        position = (position + 1) % queue.length;
        renderCurrent();
        return;
      }
      if (decision === 'archive' && !window.confirm(`${record.id} wirklich archivieren?`)) return;
      const reviewerValue = reviewer.input.value.trim();
      localStorage.setItem(reviewerKey, reviewerValue);
      const payload = {
        assetId: record.id,
        decision,
        reviewer: reviewerValue,
        notes: notes.input.value.trim(),
        quality: Number(quality.input.value),
        checklist: Object.fromEntries(checks.map(([name]) => [name, Boolean(form.elements[name]?.checked)]))
      };
      const buttons = [...form.querySelectorAll('button')];
      buttons.forEach((button) => { button.disabled = true; });
      showResult(result, 'Entscheidung wird gespeichert …', true);
      try {
        const response = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-VAH-Token': state.health.token },
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        const nextStatus = ({ approve: 'approved', restrict: 'restricted', archive: 'archived' })[decision];
        records = records.map((item) => item.id === record.id ? { ...item, status: nextStatus, qualityRating: payload.quality } : item);
        showResult(result, `${record.id} gespeichert.`, true);
        setTimeout(() => {
          updateCollectionOptions();
          rebuild();
        }, 350);
      } catch (error) {
        showResult(result, error.message, false);
        buttons.forEach((button) => { button.disabled = false; });
      }
    });

    panel.append(progress, title, description, metadata, links, form);
    return panel;
  }
}

function buildPriorityMap(records) {
  const groups = new Map();
  for (const record of records) {
    const channelTag = (record.tags ?? []).find((tag) => tag.startsWith('channel-'));
    const collectionTag = (record.tags ?? []).find((tag) => tag.startsWith('collection-'));
    if (!channelTag || !collectionTag) continue;
    const key = `${channelTag}|${collectionTag}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }

  const result = new Map();
  for (const record of records) {
    const tags = record.tags ?? [];
    const channelTag = tags.find((tag) => tag.startsWith('channel-'));
    const collectionTag = tags.find((tag) => tag.startsWith('collection-'));
    const matching = channelTag && collectionTag ? (groups.get(`${channelTag}|${collectionTag}`) ?? []) : [];
    const approved = matching.filter((item) => item.status === 'approved');
    const approvedSameType = approved.filter((item) => item.type === record.type).length;
    const collectionGap = matching.length ? Math.max(0, targetPerCollection - approved.length) : 0;
    const typeGap = ['video', 'image'].includes(record.type) ? Math.max(0, minimumPerCoreType - approvedSameType) : 0;
    const quality = Number(record.qualityRating || 0);
    const documentedRightsBoost = ['owned', 'cc0', 'public-domain'].includes(record.licenseStatus) ? 3 : ['cc-by', 'cc-by-sa', 'licensed'].includes(record.licenseStatus) ? 1 : 0;
    const score = collectionGap * 20 + typeGap * 10 + quality * 3 + documentedRightsBoost;
    const reasonParts = [];
    if (collectionGap) reasonParts.push(`${collectionGap} Freigaben bis Ziel`);
    if (typeGap) reasonParts.push(`${typeGap} ${record.type === 'video' ? 'Video' : 'Bild'}-Freigaben bis Mindestmix`);
    if (!reasonParts.length) reasonParts.push('Sammlung bereits gut abgedeckt');
    const level = score >= 140 ? 'Hoch' : score >= 80 ? 'Mittel' : 'Niedrig';
    result.set(record.id, { score, level, reason: reasonParts.join(' · ') });
  }
  return result;
}

function createVisual(record) {
  const visual = document.createElement('div');
  visual.className = 'review-queue-visual';
  if (record.type === 'video' && record.source) {
    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (record.preview) video.poster = record.preview;
    video.src = record.source;
    visual.append(video);
  } else if (record.preview || record.source) {
    const image = document.createElement('img');
    image.src = record.preview || record.source;
    image.alt = record.title;
    image.loading = 'eager';
    visual.append(image);
  } else {
    const empty = document.createElement('p');
    empty.textContent = 'Keine Vorschau verfügbar.';
    visual.append(empty);
  }
  const tags = document.createElement('div');
  tags.className = 'review-queue-tags';
  for (const tag of (record.tags ?? []).slice(0, 10)) {
    const chip = document.createElement('span');
    chip.textContent = label(tag);
    tags.append(chip);
  }
  visual.append(tags);
  return visual;
}

function sorter(mode, priorities = new Map()) {
  return (a, b) => {
    if (mode === 'impact') return (priorities.get(b.id)?.score ?? 0) - (priorities.get(a.id)?.score ?? 0) || b.qualityRating - a.qualityRating || dateValue(a.importedAt) - dateValue(b.importedAt);
    if (mode === 'quality') return b.qualityRating - a.qualityRating || a.title.localeCompare(b.title, 'de');
    if (mode === 'newest') return dateValue(b.importedAt) - dateValue(a.importedAt);
    if (mode === 'channel') return channelLabel(a).localeCompare(channelLabel(b), 'de') || collectionLabel(a).localeCompare(collectionLabel(b), 'de') || a.title.localeCompare(b.title, 'de');
    return dateValue(a.importedAt) - dateValue(b.importedAt);
  };
}

function dateValue(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function channelLabel(record) {
  const tag = (record.tags ?? []).find((value) => value.startsWith('channel-'));
  return ({
    'channel-finance': 'Finanzen',
    'channel-ai': 'Künstliche Intelligenz',
    'channel-electro': 'Elektrotechnik',
    'channel-combat-sports': 'Kampfsport'
  })[tag] || 'Nicht zugeordnet';
}

function collectionLabel(record) {
  const tag = (record.tags ?? []).find((value) => value.startsWith('collection-'));
  return tag ? label(tag.replace(/^collection-/, '')) : 'Nicht zugeordnet';
}

function selectControl(labelText, options, selected = '') {
  const wrapper = document.createElement('label');
  wrapper.className = 'review-queue-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('select');
  for (const [value, name] of options) addOption(input, value, name, selected);
  wrapper.append(text, input);
  return { wrapper, input };
}

function addOption(select, value, name, selected = '') {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = name;
  option.selected = String(value) === String(selected);
  select.append(option);
}

function inputField(labelText, type, value, attributes = {}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'review-queue-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  Object.assign(input, attributes);
  wrapper.append(text, input);
  return { wrapper, input };
}

function textareaField(labelText, placeholder) {
  const wrapper = document.createElement('label');
  wrapper.className = 'review-queue-field full';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('textarea');
  input.rows = 3;
  input.maxLength = 2000;
  input.placeholder = placeholder;
  wrapper.append(text, input);
  return { wrapper, input };
}

function checkField(name, text) {
  const labelElement = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  const span = document.createElement('span');
  span.textContent = text;
  labelElement.append(input, span);
  return labelElement;
}

function actionButton(text, decision, className) {
  const button = document.createElement('button');
  button.type = 'submit';
  button.dataset.decision = decision;
  button.className = `review-action ${className}`;
  button.textContent = text;
  return button;
}

function addMeta(list, term, value) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  list.append(dt, dd);
}

function externalLink(text, href) {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;
  return link;
}

function showResult(element, text, success) {
  element.hidden = false;
  element.className = `review-queue-result ${success ? 'success' : 'error'}`;
  element.textContent = text;
}

function label(value) {
  return String(value ?? '').replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
