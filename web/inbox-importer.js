const section = document.querySelector('#inbox-importer');
const channelFiles = ['finance.json', 'ai.json', 'electro.json', 'combat-sports.json'];

if (section) initInboxImporter().catch(() => {
  section.hidden = true;
});

async function initInboxImporter() {
  const [healthResponse, filesResponse, channels] = await Promise.all([
    fetch('../api/health', { cache: 'no-store' }),
    fetch('/inbox-api/list', { cache: 'no-store' }),
    Promise.all(channelFiles.map(async (file) => {
      const response = await fetch(`../catalog/channels/${file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      return response.json();
    }))
  ]);
  if (!healthResponse.ok || !filesResponse.ok) throw new Error('Lokale Inbox ist nicht verfügbar.');
  const health = await healthResponse.json();
  const data = await filesResponse.json();
  if (!health.localAdmin || !health.token) throw new Error('Lokales Verwaltungstoken fehlt.');
  renderInbox({ health, channels, files: data.files ?? [] });
}

function renderInbox({ health, channels, files }) {
  section.hidden = false;
  const header = document.createElement('div');
  header.className = 'inbox-header';
  const text = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Eigene Medien';
  const title = document.createElement('h2');
  title.textContent = 'Lokaler Inbox-Import';
  const description = document.createElement('p');
  description.textContent = 'Lege eigene Videos oder Bilder in den entpackten Ordner inbox. Danach kannst du sie hier ansehen, einem Kanal zuordnen und als Review-Asset aufnehmen.';
  text.append(eyebrow, title, description);
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.textContent = 'Inbox neu laden';
  refresh.addEventListener('click', () => location.reload());
  header.append(text, refresh);

  const notice = document.createElement('div');
  notice.className = 'inbox-notice';
  notice.textContent = 'Nur Dateien importieren, die dir gehören oder für die du nachweisbare Nutzungsrechte besitzt. Der Inhalt des inbox-Ordners wird nicht zu GitHub hochgeladen.';
  const grid = document.createElement('div');
  grid.className = 'inbox-grid';
  section.replaceChildren(header, notice, grid);

  if (!files.length) {
    const empty = document.createElement('div');
    empty.className = 'inbox-empty';
    const emptyTitle = document.createElement('h3');
    emptyTitle.textContent = 'Keine eigenen Dateien im Inbox-Ordner';
    const emptyText = document.createElement('p');
    emptyText.textContent = 'Kopiere zuerst eine MP4-, MOV-, WEBM-, MKV-, JPG-, PNG-, WEBP-, AVIF-, SVG- oder GIF-Datei nach inbox und drücke anschließend „Inbox neu laden“.';
    empty.append(emptyTitle, emptyText);
    grid.append(empty);
    return;
  }

  for (const file of files) grid.append(createFileCard(file, channels, health.token));
}

function createFileCard(file, channels, token) {
  const article = document.createElement('article');
  article.className = 'inbox-card';
  article.dataset.filename = file.filename;
  const visual = document.createElement('div');
  visual.className = 'inbox-visual';
  const metadata = { width: undefined, height: undefined, duration: undefined };
  if (['video', 'animation'].includes(file.type) && file.extension !== 'gif') {
    const video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.src = file.previewUrl;
    video.addEventListener('loadedmetadata', () => {
      metadata.width = video.videoWidth || undefined;
      metadata.height = video.videoHeight || undefined;
      metadata.duration = Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : undefined;
      updateOrientation();
      updateTechnical();
    });
    visual.append(video);
  } else {
    const image = document.createElement('img');
    image.src = file.previewUrl;
    image.alt = file.filename;
    image.addEventListener('load', () => {
      metadata.width = image.naturalWidth || undefined;
      metadata.height = image.naturalHeight || undefined;
      updateOrientation();
      updateTechnical();
    });
    visual.append(image);
  }

  const content = document.createElement('div');
  content.className = 'inbox-content';
  const top = document.createElement('div');
  top.className = 'inbox-file-top';
  const filename = document.createElement('strong');
  filename.textContent = file.filename;
  const fileMeta = document.createElement('span');
  fileMeta.textContent = `${typeLabel(file.type)} · ${formatBytes(file.bytes)}`;
  top.append(filename, fileMeta);

  const form = document.createElement('form');
  form.className = 'inbox-form';
  const channel = selectField('Kanal');
  const collection = selectField('Sammlung');
  const title = field('Titel', 'text', humanizeFilename(file.filename), { required: true, maxlength: 160 });
  const description = textareaField('Beschreibung', `Eigene ${typeLabel(file.type).toLowerCase()} für ein Content-Projekt. Inhalt vor der Freigabe vollständig prüfen.`, 1500);
  description.input.required = true;
  const orientation = selectField('Ausrichtung');
  for (const [value, label] of [['vertical', 'Hochformat'], ['horizontal', 'Querformat'], ['square', 'Quadratisch'], ['mixed', 'Gemischt/unklar'], ['transparent', 'Transparent']]) addOption(orientation.input, value, label);
  const tags = field('Zusätzliche Tags', 'text', '', { maxlength: 300, placeholder: 'optional, mit Komma trennen' });
  const aliases = field('Suchbegriffe', 'text', '', { maxlength: 500, placeholder: 'optional, mit Komma trennen' });
  const sourceName = field('Quelle', 'text', 'Eigene Produktion', { required: true, maxlength: 120 });
  const notes = textareaField('Notiz', 'Woher stammt die Datei und wofür soll sie verwendet werden?', 1000);
  const technical = document.createElement('p');
  technical.className = 'inbox-technical';
  technical.textContent = 'Auflösung wird nach dem Laden erkannt.';
  const rights = checkField('rightsOwned', 'Ich bestätige, dass ich die notwendigen Nutzungsrechte besitze.', false);
  const remove = checkField('removeAfterImport', 'Nach erfolgreichem Import aus inbox entfernen.', true);
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'inbox-primary';
  submit.textContent = 'Als Review-Asset importieren';
  const result = document.createElement('p');
  result.className = 'inbox-result';
  result.hidden = true;

  for (const item of channels) addOption(channel.input, item.id, item.label);
  updateCollections();
  channel.input.addEventListener('change', updateCollections);
  form.append(channel.wrapper, collection.wrapper, title.wrapper, orientation.wrapper, description.wrapper, tags.wrapper, aliases.wrapper, sourceName.wrapper, notes.wrapper, technical, rights, remove, submit, result);
  content.append(top, form);
  article.append(visual, content);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    showResult(result, 'Eigene Datei wird geprüft und katalogisiert …', true);
    try {
      const response = await fetch('/inbox-api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-VAH-Token': token },
        body: JSON.stringify({
          filename: file.filename,
          channel: channel.input.value,
          collection: collection.input.value,
          title: title.input.value,
          description: description.input.value,
          orientation: orientation.input.value,
          tags: tags.input.value,
          aliases: aliases.input.value,
          sourceName: sourceName.input.value,
          notes: notes.input.value,
          width: metadata.width,
          height: metadata.height,
          duration: metadata.duration,
          rightsOwned: rights.querySelector('input').checked,
          removeAfterImport: remove.querySelector('input').checked
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      showResult(result, `${file.filename} wurde als Review-Asset importiert.`, true);
      setTimeout(() => location.reload(), 700);
    } catch (error) {
      showResult(result, error.message, false);
      submit.disabled = false;
    }
  });

  function updateCollections() {
    const selected = channels.find((item) => item.id === channel.input.value) ?? channels[0];
    collection.input.replaceChildren();
    for (const item of selected.collections) addOption(collection.input, item.id, item.label);
  }
  function updateOrientation() {
    if (!metadata.width || !metadata.height) return;
    orientation.input.value = metadata.width === metadata.height ? 'square' : metadata.width > metadata.height ? 'horizontal' : 'vertical';
  }
  function updateTechnical() {
    const dimensions = metadata.width && metadata.height ? `${metadata.width} × ${metadata.height}` : 'Auflösung unbekannt';
    const duration = metadata.duration !== undefined ? ` · ${metadata.duration} s` : '';
    technical.textContent = `${dimensions}${duration}`;
  }
  return article;
}

function field(labelText, type, value, attributes = {}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'inbox-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  Object.assign(input, attributes);
  wrapper.append(text, input);
  return { wrapper, input };
}
function textareaField(labelText, value, maxlength) {
  const wrapper = document.createElement('label');
  wrapper.className = 'inbox-field full';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('textarea');
  input.value = value;
  input.rows = 3;
  input.maxLength = maxlength;
  wrapper.append(text, input);
  return { wrapper, input };
}
function selectField(labelText) {
  const wrapper = document.createElement('label');
  wrapper.className = 'inbox-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('select');
  wrapper.append(text, input);
  return { wrapper, input };
}
function checkField(name, text, checked) {
  const wrapper = document.createElement('label');
  wrapper.className = 'inbox-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.checked = checked;
  const span = document.createElement('span');
  span.textContent = text;
  wrapper.append(input, span);
  return wrapper;
}
function addOption(select, value, text) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
function showResult(element, text, success) { element.hidden = false; element.className = `inbox-result ${success ? 'success' : 'error'}`; element.textContent = text; }
function typeLabel(type) { return ({ video: 'Video', image: 'Bild', graphic: 'Grafik', animation: 'Animation' })[type] || type; }
function humanizeFilename(filename) { return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (character) => character.toUpperCase()).slice(0, 160) || 'Eigenes Asset'; }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`; }
