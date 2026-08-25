const section = document.querySelector('#script-visual-finder');
const providerLabels = { pexels: 'Pexels', pixabay: 'Pixabay', unsplash: 'Unsplash', openverse: 'Openverse', wikimedia: 'Wikimedia Commons' };
const MAX_SEARCH_PAGE = 100;
const sessionKeys = new Map();
let currentProject = null;
let token = '';
let stopRequested = false;

if (section) init().catch((error) => renderFatal(error.message));

async function init() {
  const [healthResponse, projectsResponse] = await Promise.all([
    fetch('../api/health', { cache: 'no-store' }),
    fetch('/script-visual-api/projects', { cache: 'no-store' }).catch(() => null)
  ]);
  if (!healthResponse.ok) throw new Error('Lokale Verwaltung nicht verfügbar.');
  const health = await healthResponse.json();
  if (!health.localAdmin || !health.token) throw new Error('Lokales Verwaltungstoken fehlt.');
  token = health.token;
  const projects = projectsResponse?.ok ? (await projectsResponse.json()).projects ?? [] : [];
  renderWorkspace(projects);
}

function renderWorkspace(projects) {
  section.hidden = false;
  const header = el('div', 'svf-header');
  const copy = el('div');
  copy.append(text('span', 'Skript rein → Visuals raus', 'eyebrow'), text('h2', 'Script Visual Finder'), text('p', 'Fertiges Skript einfügen. Der Hub schreibt nichts um, sondern zerlegt den Originaltext nur in visuelle Einheiten und sucht pro Szene passende Bilder und B-Rolls.'));
  const badge = text('span', 'Nur Visualsuche · lokal gespeichert · Review bleibt Pflicht', 'svf-badge');
  header.append(copy, badge);

  const projectBar = el('div', 'svf-project-bar');
  const recent = selectField('Vorhandenes Projekt', [['', 'Neues Projekt'], ...projects.map((item) => [item.projectId, `${item.title} · ${item.progress?.searchedScenes ?? 0}/${item.sceneCount}`])]);
  const loadButton = button('Projekt öffnen');
  projectBar.append(recent.wrapper, loadButton);

  const form = document.createElement('form');
  form.className = 'svf-form';
  const title = field('Projekttitel · optional', 'text', { maxlength: 100, placeholder: 'Wird sonst aus dem Skript abgeleitet' });
  const channel = selectField('Zuordnung · optional', [
    ['auto', 'Automatisch'], ['general', 'Allgemein'], ['finance', 'Finanzen'], ['ai', 'Künstliche Intelligenz'], ['electro', 'Elektrotechnik'], ['combat-sports', 'Kampfsport']
  ]);
  const segmentation = selectField('Szenen', [['auto', 'Automatisch'], ['sentence', 'Satzweise'], ['paragraph', 'Absatzweise']]);
  const orientation = selectField('Format', [['vertical', 'Vertikal · Reel/Short'], ['horizontal', 'Horizontal · YouTube']]);
  const mediaPreference = selectField('Medien', [['mixed', 'Gemischt'], ['video', 'Video bevorzugen'], ['photo', 'Bilder bevorzugen']]);
  const depth = selectField('Recherche', [['deep', 'Tief'], ['quick', 'Schnell'], ['max', 'Maximal']]);
  const perPage = field('Treffer je API-Suche', 'number', { min: 3, max: 12, value: 6 });
  const script = textareaField('Fertiges Skript', { required: true, maxlength: 40000, placeholder: 'Hier nur dein fertiges Skript einfügen. Die App verändert den Text nicht.' });
  script.wrapper.classList.add('svf-script-field');

  const keys = {
    pexels: field('Pexels Key · optional', 'password', { minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur für diese Sitzung' }),
    pixabay: field('Pixabay Key · optional', 'password', { minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur für diese Sitzung' }),
    unsplash: field('Unsplash Key · optional', 'password', { minlength: 8, maxlength: 300, autocomplete: 'off', placeholder: 'Nur für diese Sitzung' })
  };

  const actions = el('div', 'svf-actions');
  const create = button('Visual-Projekt erstellen', 'svf-primary');
  create.type = 'submit';
  const clearKeys = button('Sitzungs-Keys löschen');
  actions.append(create, clearKeys);
  const status = text('p', '', 'svf-status');
  status.hidden = true;
  form.append(title.wrapper, channel.wrapper, segmentation.wrapper, orientation.wrapper, mediaPreference.wrapper, depth.wrapper, perPage.wrapper, keys.pexels.wrapper, keys.pixabay.wrapper, keys.unsplash.wrapper, script.wrapper, actions, status);

  const projectArea = el('div', 'svf-project-area');
  section.replaceChildren(header, projectBar, form, projectArea);

  loadButton.addEventListener('click', async () => {
    if (!recent.input.value) return showStatus(status, 'Bitte ein vorhandenes Projekt auswählen.', false);
    try {
      const data = await get(`/script-visual-api/project?id=${encodeURIComponent(recent.input.value)}`);
      currentProject = data.project;
      renderProject(projectArea, currentProject, keys, perPage, status);
      showStatus(status, `Projekt „${currentProject.title}“ geladen.`, true);
    } catch (error) { showStatus(status, error.message, false); }
  });

  clearKeys.addEventListener('click', () => {
    sessionKeys.clear();
    for (const item of Object.values(keys)) { item.input.value = ''; item.input.placeholder = 'Nur für diese Sitzung'; }
    showStatus(status, 'Alle Provider-Keys wurden aus dem Arbeitsspeicher dieser Seite gelöscht.', true);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!script.input.reportValidity()) return;
    create.disabled = true;
    try {
      const data = await post('/script-visual-api/create', {
        script: script.input.value,
        title: title.input.value.trim(),
        channel: channel.input.value,
        segmentation: segmentation.input.value,
        orientation: orientation.input.value,
        mediaPreference: mediaPreference.input.value,
        depth: depth.input.value
      });
      currentProject = data.project;
      renderProject(projectArea, currentProject, keys, perPage, status);
      showStatus(status, `${currentProject.scenes.length} visuelle Einheiten erstellt. Originalskript unverändert gespeichert. Jetzt Visuals suchen.`, true);
    } catch (error) { showStatus(status, error.message, false); }
    finally { create.disabled = false; }
  });
}

function renderProject(container, project, keyFields, perPage, status) {
  const head = el('div', 'svf-project-head');
  const info = el('div');
  info.append(text('span', project.projectId, 'svf-project-id'), text('h3', project.title), text('p', `${project.scenes.length} visuelle Einheiten · ${channelLabel(project.channel)} · ${mediaPreferenceLabel(project.settings?.mediaPreference)} · Originaltext bleibt unverändert`));
  const controls = el('div', 'svf-project-controls');
  const searchAll = button('Alle Szenen recherchieren', 'svf-primary');
  const stop = button('Stoppen');
  stop.disabled = true;
  controls.append(searchAll, stop);
  head.append(info, controls);

  const progress = el('div', 'svf-progress');
  const progressBar = el('div', 'svf-progress-bar');
  const progressFill = el('span');
  progressBar.append(progressFill);
  const progressText = text('span', '');
  progress.append(progressBar, progressText);

  const scenes = el('div', 'svf-scenes');
  for (const scene of project.scenes) scenes.append(sceneCard(project, scene, keyFields, perPage, status));
  container.replaceChildren(head, progress, scenes);
  updateProgress(project, progressFill, progressText);

  stop.addEventListener('click', () => { stopRequested = true; stop.disabled = true; searchAll.disabled = false; searchAll.textContent = 'Recherche fortsetzen'; });
  searchAll.addEventListener('click', async () => {
    stopRequested = false;
    searchAll.disabled = true;
    stop.disabled = false;
    const pending = currentProject.scenes.filter((scene) => !scene.searchedAt);
    if (!pending.length) {
      searchAll.disabled = false;
      stop.disabled = true;
      showStatus(status, 'Alle Szenen wurden bereits recherchiert. Einzelne Szenen können mit „Mehr Treffer“ auf der nächsten Suchseite erweitert werden.', true);
      return;
    }
    let completed = 0;
    for (const scene of pending) {
      if (stopRequested) break;
      showStatus(status, `Visualsuche läuft: ${completed + 1}/${pending.length} · ${scene.id}`, true);
      try {
        const updated = await searchOneScene(scene, keyFields, perPage, false);
        replaceSceneCard(scenes, currentProject, updated, keyFields, perPage, status);
      } catch (error) {
        showStatus(status, `${scene.id}: ${error.message}. Die übrigen bereits fertigen Szenen bleiben erhalten.`, false);
      }
      completed += 1;
      updateProgress(currentProject, progressFill, progressText);
    }
    searchAll.disabled = false;
    stop.disabled = true;
    searchAll.textContent = currentProject.scenes.every((scene) => scene.searchedAt) ? 'Alle Szenen recherchiert' : 'Recherche fortsetzen';
    if (!stopRequested) showStatus(status, `${currentProject.progress.searchedScenes}/${currentProject.progress.totalScenes} Szenen recherchiert.`, true);
  });
}

function sceneCard(project, scene, keyFields, perPage, status) {
  const article = el('article', 'svf-scene');
  article.dataset.sceneId = scene.id;
  const top = el('div', 'svf-scene-top');
  const number = el('div');
  number.append(text('strong', `${scene.id} · ${formatTime(scene.startSeconds)}–${formatTime(scene.endSeconds)}`), text('span', scene.visualIntent));
  const flags = el('div', 'svf-scene-flags');
  const mixed = project.settings?.mediaPreference === 'mixed';
  const preference = scene.preferredMediaType === 'video' ? 'Video' : 'Bild';
  flags.append(text('span', mixed ? `Gemischt · ${preference} zuerst` : `${preference} bevorzugt`), ...(scene.symbolic ? [text('span', 'Symbolisches Visual')] : []));
  top.append(number, flags);

  const original = document.createElement('blockquote');
  original.textContent = scene.originalText;
  const queries = el('div', 'svf-queries');
  for (const query of scene.queries) queries.append(text('code', query));

  const actions = el('div', 'svf-scene-actions');
  const currentPage = Number(scene.searchRound || 0);
  const maxPageReached = currentPage >= MAX_SEARCH_PAGE;
  const searchLabel = !scene.searchedAt
    ? 'Visuals suchen · Seite 1'
    : maxPageReached
      ? 'Maximale Suchseite erreicht'
      : `Mehr Treffer · Seite ${currentPage + 1}`;
  const search = button(searchLabel);
  search.disabled = maxPageReached;
  actions.append(search);
  const resultStatus = text('span', scene.searchedAt ? `${candidateSummary(scene, project)} · zuletzt Seite ${currentPage || 1}` : 'Noch nicht recherchiert');
  actions.append(resultStatus);

  const grid = el('div', 'svf-candidate-grid');
  renderCandidates(grid, project, scene, keyFields, perPage, status);

  search.addEventListener('click', async () => {
    if (Number(scene.searchRound || 0) >= MAX_SEARCH_PAGE) return;
    search.disabled = true;
    const expectedPage = scene.searchedAt ? Number(scene.searchRound || 1) + 1 : 1;
    showStatus(status, `${scene.id}: Suchseite ${expectedPage} wird geladen …`, true);
    try {
      const updated = await searchOneScene(scene, keyFields, perPage, Boolean(scene.searchedAt));
      const parent = article.parentElement;
      if (parent) replaceSceneCard(parent, currentProject, updated, keyFields, perPage, status);
      showStatus(status, `${scene.id}: Seite ${updated.searchRound || expectedPage} · ${candidateSummary(updated, currentProject)} gespeichert.`, true);
    } catch (error) { showStatus(status, error.message, false); search.disabled = false; }
  });

  article.append(top, original, queries, actions, grid);
  if (scene.searchErrors?.length) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${scene.searchErrors.length} fehlgeschlagene Einzelsuchen`;
    const list = document.createElement('ul');
    for (const item of scene.searchErrors) {
      const li = document.createElement('li');
      li.textContent = `${providerLabel(item.provider)} · Seite ${item.page ?? scene.searchRound ?? 1} · ${item.query}: ${item.error}`;
      list.append(li);
    }
    details.append(summary, list);
    article.append(details);
  }
  return article;
}

function renderCandidates(grid, project, scene, keyFields, perPage, status) {
  grid.replaceChildren();
  if (!scene.candidates.length) {
    grid.append(text('div', 'Für diese Szene sind noch keine Medien geladen.', 'svf-empty'));
    return;
  }
  for (const candidate of scene.candidates) grid.append(candidateCard(project, scene, candidate, keyFields, perPage, status));
}

function candidateCard(project, scene, candidate, keyFields, perPage, status) {
  const card = el('article', `svf-candidate${scene.selectedPrimary === candidate.key ? ' primary' : ''}${scene.selectedAlternatives.includes(candidate.key) ? ' alternative' : ''}`);
  const preview = el('div', 'svf-preview');
  const videoUrl = candidate.type === 'video' ? playableVideoUrl(candidate.asset?.files) : '';
  if (videoUrl) {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.poster = candidate.previewUrl || '';
    video.controls = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    preview.append(video);
  } else if (candidate.previewUrl) {
    const img = document.createElement('img');
    img.src = candidate.previewUrl;
    img.alt = candidate.title;
    img.loading = 'lazy';
    preview.append(img);
  } else preview.append(text('span', 'Keine direkte Vorschau'));

  const body = el('div', 'svf-candidate-body');
  const title = text('strong', candidate.title);
  const meta = text('span', `${providerLabel(candidate.provider)} · ${candidate.type === 'video' ? 'Video' : 'Bild'} · Seite ${candidate.job?.page ?? 1} · Fit ${candidate.technicalFit}/100${candidate.reusedElsewhere ? ' · schon in anderer Szene gefunden' : ''}`);
  const query = text('small', `Query: ${candidate.query}`);
  const selected = text('small', selectionLabel(scene, candidate), 'svf-selection-label');
  const buttons = el('div', 'svf-candidate-actions');
  const primary = button('Als Hauptvisual');
  const alternative = button('Als Alternative');
  const remove = button('Auswahl lösen');
  const importButton = button((candidate.importedAssetIds ?? []).length ? 'Importiert' : 'Als Review importieren');
  importButton.disabled = (candidate.importedAssetIds ?? []).length > 0;
  buttons.append(primary, alternative, remove, importButton);
  if (candidate.sourceUrl) {
    const link = document.createElement('a');
    link.href = candidate.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Quelle';
    buttons.append(link);
  }

  primary.addEventListener('click', () => selectCandidate(project, scene, candidate, 'primary', card.parentElement, keyFields, perPage, status));
  alternative.addEventListener('click', () => selectCandidate(project, scene, candidate, 'alternative', card.parentElement, keyFields, perPage, status));
  remove.addEventListener('click', () => selectCandidate(project, scene, candidate, 'remove', card.parentElement, keyFields, perPage, status));
  importButton.addEventListener('click', async () => {
    const unsplashKey = candidate.provider === 'unsplash' ? currentKey('unsplash', keyFields) : undefined;
    if (candidate.provider === 'unsplash' && !unsplashKey) return showStatus(status, 'Für den Unsplash-Import wird der Sitzung-Key erneut benötigt.', false);
    importButton.disabled = true;
    try {
      const data = await post('/script-visual-api/import', { projectId: project.projectId, sceneId: scene.id, candidateKey: candidate.key, apiKey: unsplashKey });
      if (candidate.provider === 'unsplash' && unsplashKey) sessionKeys.set('unsplash', unsplashKey);
      Object.assign(scene, data.scene);
      Object.assign(currentProject.progress, data.progress);
      renderCandidates(card.parentElement, project, scene, keyFields, perPage, status);
      const importMessage = data.imported
        ? `${data.imported} Asset(s) aus ${scene.id} als Review importiert.`
        : data.linkedExisting
          ? `Treffer aus ${scene.id} war bereits im Katalog und wurde mit ${data.linkedExisting} bestehendem Asset verknüpft.`
          : `Für ${scene.id} wurde kein neues Katalog-Asset angelegt.`;
      showStatus(status, importMessage, true);
      document.dispatchEvent(new CustomEvent('vah:catalog-updated'));
    } catch (error) { importButton.disabled = false; showStatus(status, error.message, false); }
  });

  body.append(title, meta, query, selected, buttons, text('small', 'Treffer ist keine automatische Nutzungsfreigabe. Vor Veröffentlichung Rechte und Kontext prüfen.', 'svf-rights'));
  card.append(preview, body);
  return card;
}

async function selectCandidate(project, scene, candidate, role, grid, keyFields, perPage, status) {
  try {
    const data = await post('/script-visual-api/select', { projectId: project.projectId, sceneId: scene.id, candidateKey: candidate.key, role });
    Object.assign(scene, data.scene);
    Object.assign(currentProject.progress, data.progress);
    renderCandidates(grid, project, scene, keyFields, perPage, status);
  } catch (error) { showStatus(status, error.message, false); }
}

async function searchOneScene(scene, keyFields, perPage, force) {
  const typed = typedKeys(keyFields);
  const keys = { ...Object.fromEntries(sessionKeys), ...typed };
  const data = await post('/script-visual-api/search-scene', { projectId: currentProject.projectId, sceneId: scene.id, keys, perPage: Number(perPage.input.value), force });
  const validated = new Set(data.validatedKeyProviders ?? []);
  for (const [provider, value] of Object.entries(typed)) if (value && validated.has(provider)) sessionKeys.set(provider, value);
  clearVisibleKeys(keyFields);
  const index = currentProject.scenes.findIndex((item) => item.id === scene.id);
  if (index >= 0) currentProject.scenes[index] = data.scene;
  currentProject.updatedAt = new Date().toISOString();
  currentProject.progress.searchedScenes = currentProject.scenes.filter((item) => item.searchedAt).length;
  return data.scene;
}

function replaceSceneCard(container, project, scene, keyFields, perPage, status) {
  const old = container.querySelector(`[data-scene-id="${scene.id}"]`);
  const fresh = sceneCard(project, scene, keyFields, perPage, status);
  if (old) old.replaceWith(fresh); else container.append(fresh);
}

function updateProgress(project, fill, copy) {
  const searched = project.scenes.filter((scene) => scene.searchedAt).length;
  const total = project.scenes.length || 1;
  const percent = Math.round(100 * searched / total);
  fill.style.width = `${percent}%`;
  copy.textContent = `${searched}/${total} Szenen recherchiert · ${project.scenes.filter((scene) => scene.selectedPrimary || scene.selectedAlternatives.length).length} mit Auswahl`;
}

function candidateSummary(scene, project) {
  const candidates = scene.candidates ?? [];
  const videos = candidates.filter((item) => item.type === 'video').length;
  const photos = candidates.length - videos;
  const mixed = project?.settings?.mediaPreference === 'mixed';
  const mixState = mixed ? (videos && photos ? ' · Mix erfüllt' : ' · Mix noch unvollständig') : '';
  return `${candidates.length} Kandidaten · ${videos} Videos · ${photos} Bilder${mixState}`;
}
function mediaPreferenceLabel(value) { return value === 'mixed' ? 'Videos + Bilder' : value === 'photo' ? 'Bilder bevorzugt' : 'Videos bevorzugt'; }
function typedKeys(fields) { return Object.fromEntries(Object.entries(fields).map(([provider, item]) => [provider, item.input.value.trim()]).filter(([, value]) => value)); }
function currentKey(provider, fields) { return fields[provider]?.input.value.trim() || sessionKeys.get(provider) || ''; }
function clearVisibleKeys(fields) { for (const [provider, item] of Object.entries(fields)) { item.input.value = ''; item.input.placeholder = sessionKeys.has(provider) ? 'Für diese Sitzung gespeichert' : 'Nur für diese Sitzung'; } }
function selectionLabel(scene, candidate) { if (scene.selectedPrimary === candidate.key) return 'Auswahl: Hauptvisual'; if (scene.selectedAlternatives.includes(candidate.key)) return 'Auswahl: Alternative'; return 'Noch nicht ausgewählt'; }
function playableVideoUrl(files) { if (!Array.isArray(files)) return ''; const choices = files.filter((item) => item?.url && /^https?:\/\//i.test(item.url)).sort((a, b) => area(a) - area(b)); if (!choices.length) return ''; return choices.find((item) => Math.min(Number(item.width) || 0, Number(item.height) || 0) >= 720)?.url ?? choices.at(-1)?.url ?? ''; }
function area(item) { return (Number(item?.width) || 0) * (Number(item?.height) || 0); }
function channelLabel(value) { return ({ general: 'Allgemein', finance: 'Finanzen', ai: 'Künstliche Intelligenz', electro: 'Elektrotechnik', 'combat-sports': 'Kampfsport' })[value] ?? value; }
function providerLabel(value) { return providerLabels[value] ?? value; }
function formatTime(seconds) { const value = Number(seconds) || 0; const minutes = Math.floor(value / 60); const rest = Math.round((value % 60) * 10) / 10; return minutes ? `${minutes}:${String(rest).padStart(4, '0')}` : `${rest}s`; }
async function get(endpoint) { const response = await fetch(endpoint, { cache: 'no-store' }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`); return data; }
async function post(endpoint, payload) { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-VAH-Token': token }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`); return data; }
function field(label, type, attributes = {}) { const wrapper = document.createElement('label'); wrapper.className = 'svf-field'; const span = text('span', label); const input = document.createElement('input'); input.type = type; for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value)); wrapper.append(span, input); return { wrapper, input }; }
function textareaField(label, attributes = {}) { const wrapper = document.createElement('label'); wrapper.className = 'svf-field'; const span = text('span', label); const input = document.createElement('textarea'); input.rows = 12; for (const [key, value] of Object.entries(attributes)) input.setAttribute(key, String(value)); wrapper.append(span, input); return { wrapper, input }; }
function selectField(label, options) { const wrapper = document.createElement('label'); wrapper.className = 'svf-field'; const span = text('span', label); const input = document.createElement('select'); for (const [value, caption] of options) { const option = document.createElement('option'); option.value = value; option.textContent = caption; input.append(option); } wrapper.append(span, input); return { wrapper, input }; }
function button(value, className = '') { const item = document.createElement('button'); item.type = 'button'; item.textContent = value; if (className) item.className = className; return item; }
function el(tag, className = '') { const item = document.createElement(tag); if (className) item.className = className; return item; }
function text(tag, value, className = '') { const item = el(tag, className); item.textContent = value; return item; }
function showStatus(item, value, ok) { item.hidden = false; item.className = `svf-status ${ok ? 'success' : 'error'}`; item.textContent = value; }
function renderFatal(message) { if (!section) return; section.hidden = false; section.replaceChildren(text('p', `Script Visual Finder konnte nicht geladen werden: ${message}`, 'svf-status error')); }
