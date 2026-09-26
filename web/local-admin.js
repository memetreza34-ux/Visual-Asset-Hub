const dialog = document.querySelector('#asset-dialog');
const dialogContent = document.querySelector('#dialog-content');
const statusBox = document.querySelector('#local-admin-status');
const statusText = document.querySelector('#local-admin-status-text');
const backupButton = document.querySelector('#local-backup');
const reviewerKey = 'visual-asset-hub:reviewer';

let health;
let records = new Map();

initLocalAdmin().catch(() => {
  if (statusBox) statusBox.hidden = true;
});

async function initLocalAdmin() {
  const [healthResponse, indexResponse] = await Promise.all([
    fetch('../api/health', { cache: 'no-store' }),
    fetch('../catalog/search-index.json', { cache: 'no-store' })
  ]);
  if (!healthResponse.ok || !indexResponse.ok) throw new Error('Lokale Verwaltung nicht verfügbar.');
  health = await healthResponse.json();
  const index = await indexResponse.json();
  records = new Map(index.records.map((record) => [record.id, record]));
  if (!health.localAdmin || !health.writable) throw new Error('Katalog ist nicht beschreibbar.');

  statusBox.hidden = false;
  updateStatusText();
  backupButton.addEventListener('click', createBackup);

  const observer = new MutationObserver(decorateDialog);
  observer.observe(dialogContent, { childList: true, subtree: true });
  dialog.addEventListener('close', () => document.querySelector('.admin-toast')?.remove());
}

function decorateDialog() {
  if (!dialog.open || dialogContent.querySelector('.local-admin-panel')) return;
  const assetId = dialogContent.querySelector('.eyebrow')?.textContent?.trim();
  const record = records.get(assetId);
  const content = dialogContent.querySelector('.detail-content');
  if (!record || !content) return;
  content.append(buildAdminPanel(record));
}

function buildAdminPanel(record) {
  const panel = document.createElement('section');
  panel.className = 'local-admin-panel';
  panel.append(heading('Lokale Prüfung und Verwaltung'));

  if (record.status === 'archived') {
    panel.append(message('Dieses Asset ist archiviert. Eine erneute Aktivierung erfolgt bewusst über den Konsolen- oder GitHub-Ablauf.', 'warning'));
    return panel;
  }

  if (record.status === 'approved') {
    panel.append(message('Dieses Asset ist freigegeben. Bei einem später entdeckten Problem kann es hier eingeschränkt oder archiviert werden.', 'success'));
  }
  panel.append(buildStatusForm(record));
  if (record.status === 'approved') panel.append(buildUsageForm(record));
  return panel;
}

function buildStatusForm(record) {
  const form = document.createElement('form');
  form.className = 'admin-form';
  const reviewer = field('Prüfer', 'text', localStorage.getItem(reviewerKey) || '', { required: true, maxLength: 120, placeholder: 'z. B. Arman' });
  const quality = selectField('Qualität', [1, 2, 3, 4, 5], String(record.qualityRating || 3));
  const notes = textareaField('Notiz oder Begründung', 'Was wurde geprüft? Sind Personen, Marken oder Einschränkungen sichtbar?', 2000);
  const checks = [
    ['contentViewed', 'Asset vollständig angesehen'],
    ['peopleAndBrandsChecked', 'Personen, Logos und Marken geprüft'],
    ['rightsChecked', 'Quelle, Lizenz und erlaubte Nutzung geprüft'],
    ['contextChecked', 'Einsatzkontext des geplanten Contents geprüft']
  ];

  const parts = [reviewer.wrapper, quality.wrapper, notes.wrapper];
  if (record.status === 'review') {
    const checklist = document.createElement('fieldset');
    checklist.className = 'review-checklist';
    checklist.innerHTML = '<legend>Pflichtprüfung vor einer Freigabe</legend>';
    for (const [name, label] of checks) checklist.append(checkbox(name, label));
    parts.push(checklist);
  }

  const actions = document.createElement('div');
  actions.className = 'admin-actions';
  if (record.status === 'review') {
    actions.append(submitButton('Freigeben', 'approve', 'approve'), submitButton('Einschränken', 'restrict', 'restrict'), submitButton('Archivieren', 'archive'));
  } else if (record.status === 'approved') {
    actions.append(submitButton('Nachträglich einschränken', 'restrict', 'restrict'), submitButton('Archivieren', 'archive'));
  } else {
    actions.append(submitButton('Zur Prüfung zurück', 'send-back'), submitButton('Archivieren', 'archive'));
  }

  const result = message('', 'neutral');
  result.hidden = true;
  form.append(...parts, actions, result);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const decision = event.submitter?.dataset.decision;
    if (!decision) return;
    if (decision === 'archive' && !window.confirm(`${record.id} wirklich archivieren?`)) return;
    const reviewerValue = reviewer.input.value.trim();
    localStorage.setItem(reviewerKey, reviewerValue);
    const checklistValues = Object.fromEntries(checks.map(([name]) => [name, Boolean(form.elements[name]?.checked)]));
    await performAction(form, result, '/api/review', {
      assetId: record.id,
      decision,
      reviewer: reviewerValue,
      notes: notes.input.value.trim(),
      quality: Number(quality.input.value),
      checklist: checklistValues
    }, `${record.id} wurde gespeichert.`);
  });
  return form;
}

function buildUsageForm(record) {
  const section = document.createElement('section');
  section.className = 'usage-section';
  section.append(heading('Echte Verwendung dokumentieren', 3));
  const form = document.createElement('form');
  form.className = 'admin-form compact';
  const project = field('Projekt-ID', 'text', '', { required: true, maxLength: 120, placeholder: 'z. B. elektro-klar-reel-01' });
  const title = field('Projektname', 'text', '', { maxLength: 160, placeholder: 'z. B. Reel über Schutzschalter' });
  const platform = selectField('Plattform', ['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'website', 'app', 'presentation', 'client-work', 'other'], 'tiktok');
  const url = field('Veröffentlichungslink', 'url', '', { maxLength: 2000, placeholder: 'optional' });
  const notes = textareaField('Nutzungsnotiz', 'Welche Szene oder welcher Abschnitt nutzt dieses Asset?', 1000);
  const actions = document.createElement('div');
  actions.className = 'admin-actions';
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'admin-button approve';
  save.textContent = 'Nutzung speichern';
  const attribution = document.createElement('button');
  attribution.type = 'button';
  attribution.className = 'admin-button';
  attribution.textContent = 'Attribution exportieren';
  actions.append(save, attribution);
  const result = message('', 'neutral');
  result.hidden = true;

  form.append(project.wrapper, title.wrapper, platform.wrapper, url.wrapper, notes.wrapper, actions, result);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await performAction(form, result, '/api/usage', {
      assetId: record.id,
      project: project.input.value.trim(),
      title: title.input.value.trim(),
      platform: platform.input.value,
      url: url.input.value.trim(),
      notes: notes.input.value.trim()
    }, 'Nutzung wurde gespeichert.');
  });
  attribution.addEventListener('click', async () => {
    const projectValue = project.input.value.trim();
    if (!projectValue) return setMessage(result, 'Bitte zuerst eine Projekt-ID eintragen.', 'error');
    await performAction(form, result, '/api/attribution', { project: projectValue }, 'Attributionsdateien wurden im Ordner exports erzeugt.', false);
  });
  section.append(form);
  return section;
}

async function createBackup() {
  const original = backupButton.textContent;
  backupButton.disabled = true;
  backupButton.textContent = 'Backup läuft …';
  try {
    const data = await apiPost('/api/backup', {});
    backupButton.textContent = 'Backup erstellt';
    showToast(data.output || 'Backup wurde erstellt.');
  } catch (error) {
    backupButton.textContent = 'Backup fehlgeschlagen';
    showToast(error.message, false);
  } finally {
    setTimeout(() => { backupButton.disabled = false; backupButton.textContent = original; }, 1800);
  }
}

async function performAction(form, result, endpoint, payload, successText, reload = true) {
  const buttons = [...form.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  setMessage(result, 'Wird gespeichert …', 'neutral');
  try {
    const data = await apiPost(endpoint, payload);
    setMessage(result, successText, 'success');
    if (data.health) health = data.health;
    updateStatusText();
    if (reload) setTimeout(() => location.reload(), 650);
    else buttons.forEach((button) => { button.disabled = false; });
  } catch (error) {
    setMessage(result, error.message, 'error');
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function apiPost(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VAH-Token': health.token },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function updateStatusText() {
  statusText.textContent = `Version ${health.version} · ${health.assetCount} Assets · ${health.reviewCount} zu prüfen · ${health.approvedCount} freigegeben · ${health.totalUsageCount} Nutzungen`;
}

function field(labelText, type, value, attributes = {}) {
  const wrapper = document.createElement('label');
  wrapper.className = 'admin-field';
  const label = document.createElement('span');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  Object.assign(input, attributes);
  wrapper.append(label, input);
  return { wrapper, input };
}

function textareaField(labelText, placeholder, maxLength) {
  const wrapper = document.createElement('label');
  wrapper.className = 'admin-field full';
  const label = document.createElement('span');
  label.textContent = labelText;
  const input = document.createElement('textarea');
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  input.rows = 3;
  wrapper.append(label, input);
  return { wrapper, input };
}

function selectField(labelText, options, selected) {
  const wrapper = document.createElement('label');
  wrapper.className = 'admin-field';
  const label = document.createElement('span');
  label.textContent = labelText;
  const input = document.createElement('select');
  for (const value of options) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(value).replaceAll('-', ' ');
    option.selected = String(value) === selected;
    input.append(option);
  }
  wrapper.append(label, input);
  return { wrapper, input };
}

function checkbox(name, labelText) {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  const span = document.createElement('span');
  span.textContent = labelText;
  label.append(input, span);
  return label;
}

function submitButton(text, decision, className = '') {
  const button = document.createElement('button');
  button.type = 'submit';
  button.dataset.decision = decision;
  button.className = `admin-button ${className}`.trim();
  button.textContent = text;
  return button;
}

function heading(text, level = 2) {
  const element = document.createElement(`h${level}`);
  element.textContent = text;
  return element;
}

function message(text, type) {
  const element = document.createElement('p');
  element.className = `admin-message ${type}`;
  element.textContent = text;
  return element;
}

function setMessage(element, text, type) {
  element.hidden = false;
  element.className = `admin-message ${type}`;
  element.textContent = text;
}

function showToast(text, success = true) {
  document.querySelector('.admin-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `admin-toast ${success ? 'success' : 'error'}`;
  toast.textContent = text;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 5000);
}
