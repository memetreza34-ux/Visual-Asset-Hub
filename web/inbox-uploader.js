const section = document.querySelector('#inbox-importer');
const supported = new Set(['mp4', 'mov', 'webm', 'mkv', 'jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'tif', 'tiff', 'svg']);

if (section) initUploader().catch(() => {});

async function initUploader() {
  const [healthResponse, uploadResponse] = await Promise.all([
    fetch('../api/health', { cache: 'no-store' }),
    fetch('/upload-api/health', { cache: 'no-store' })
  ]);
  if (!healthResponse.ok || !uploadResponse.ok) throw new Error('Lokaler Upload ist nicht verfügbar.');
  const health = await healthResponse.json();
  const uploadInfo = await uploadResponse.json();
  if (!health.localAdmin || !health.token) throw new Error('Lokales Verwaltungstoken fehlt.');
  installWhenReady({ token: health.token, maxUploadBytes: uploadInfo.maxUploadBytes });
}

function installWhenReady(config) {
  const install = () => {
    if (section.querySelector('#inbox-upload-zone')) return true;
    const header = section.querySelector('.inbox-header');
    if (!header) return false;
    header.insertAdjacentElement('afterend', createUploader(config));
    return true;
  };
  if (install()) return;
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(section, { childList: true, subtree: true });
}

function createUploader({ token, maxUploadBytes }) {
  const panel = element('section', 'inbox-upload-zone');
  panel.id = 'inbox-upload-zone';
  const text = element('div', 'inbox-upload-copy');
  text.append(
    element('strong', '', 'Dateien direkt hier ablegen'),
    element('span', '', 'Die Datei wird nur an den lokalen Server auf deinem Computer übertragen und zunächst in inbox gespeichert.')
  );
  const drop = element('div', 'inbox-drop-area');
  drop.tabIndex = 0;
  drop.setAttribute('role', 'button');
  drop.setAttribute('aria-label', 'Eigene Mediendateien auswählen oder hier ablegen');
  const icon = element('span', 'inbox-drop-icon', '＋');
  const dropTitle = element('strong', '', 'Dateien auswählen oder hineinziehen');
  const dropText = element('span', '', `Bis zu 10 Dateien · maximal ${formatBytes(maxUploadBytes)} je Datei`);
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.hidden = true;
  input.accept = '.mp4,.mov,.webm,.mkv,.jpg,.jpeg,.png,.webp,.avif,.gif,.tif,.tiff,.svg';
  drop.append(icon, dropTitle, dropText, input);
  const selection = element('div', 'inbox-upload-selection');
  selection.hidden = true;
  const list = element('div', 'inbox-upload-list');
  const actions = element('div', 'inbox-upload-actions');
  const clear = button('Auswahl leeren');
  const upload = button('In lokale Inbox speichern', 'inbox-upload-primary');
  actions.append(clear, upload);
  const status = element('p', 'inbox-upload-status');
  status.hidden = true;
  selection.append(list, actions, status);
  panel.append(text, drop, selection);

  let files = [];
  const choose = () => input.click();
  drop.addEventListener('click', choose);
  drop.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
  });
  input.addEventListener('change', () => setFiles([...input.files]));
  for (const eventName of ['dragenter', 'dragover']) drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.add('dragging'); });
  for (const eventName of ['dragleave', 'drop']) drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.remove('dragging'); });
  drop.addEventListener('drop', (event) => setFiles([...event.dataTransfer.files]));
  clear.addEventListener('click', () => setFiles([]));
  upload.addEventListener('click', runUploads);

  function setFiles(next) {
    const unique = [];
    const seen = new Set();
    for (const file of next.slice(0, 10)) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (!seen.has(key)) { seen.add(key); unique.push(file); }
    }
    files = unique;
    input.value = '';
    renderSelection();
  }

  function renderSelection() {
    selection.hidden = files.length === 0;
    list.replaceChildren();
    status.hidden = true;
    for (const file of files) {
      const validation = validateFile(file, maxUploadBytes);
      const row = element('div', `inbox-upload-row${validation.ok ? '' : ' invalid'}`);
      const info = element('div');
      info.append(element('strong', '', file.name), element('span', '', `${formatBytes(file.size)}${validation.ok ? '' : ` · ${validation.error}`}`));
      const progress = element('div', 'inbox-upload-progress');
      const bar = element('span');
      progress.append(bar);
      const remove = button('Entfernen');
      remove.addEventListener('click', () => { files = files.filter((item) => item !== file); renderSelection(); });
      row.append(info, progress, remove);
      row._bar = bar;
      row._file = file;
      list.append(row);
    }
    upload.disabled = !files.length || files.some((file) => !validateFile(file, maxUploadBytes).ok);
  }

  async function runUploads() {
    if (!files.length) return;
    upload.disabled = true;
    clear.disabled = true;
    showStatus(status, 'Upload in die lokale Inbox läuft …', true);
    const results = [];
    try {
      const rows = [...list.querySelectorAll('.inbox-upload-row')];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const row = rows[index];
        const result = await uploadFile(file, token, (loaded, total) => {
          row._bar.style.width = `${total ? Math.min(100, Math.round(100 * loaded / total)) : 0}%`;
        });
        row.classList.add('complete');
        row._bar.style.width = '100%';
        results.push(result);
      }
      const renamed = results.filter((item) => item.renamed).length;
      showStatus(status, `${results.length} Datei${results.length === 1 ? '' : 'en'} lokal gespeichert${renamed ? ` · ${renamed} wegen gleichem Namen umbenannt` : ''}. Inbox wird neu geladen.`, true);
      setTimeout(() => location.reload(), 900);
    } catch (error) {
      showStatus(status, error.message, false);
      upload.disabled = false;
      clear.disabled = false;
    }
  }
  return panel;
}

function uploadFile(file, token, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/upload-api/file');
    request.responseType = 'json';
    request.setRequestHeader('Content-Type', 'application/octet-stream');
    request.setRequestHeader('X-VAH-Token', token);
    request.setRequestHeader('X-VAH-Filename', encodeURIComponent(file.name));
    request.setRequestHeader('X-VAH-Size', String(file.size));
    request.upload.addEventListener('progress', (event) => onProgress(event.loaded, event.lengthComputable ? event.total : file.size));
    request.addEventListener('load', () => {
      const data = request.response ?? safeJson(request.responseText);
      if (request.status < 200 || request.status >= 300) return reject(new Error(data?.error || `Upload fehlgeschlagen: HTTP ${request.status}`));
      resolve(data);
    });
    request.addEventListener('error', () => reject(new Error('Lokaler Upload ist wegen eines Netzwerkfehlers fehlgeschlagen.')));
    request.addEventListener('abort', () => reject(new Error('Lokaler Upload wurde abgebrochen.')));
    request.send(file);
  });
}

function validateFile(file, maxBytes) {
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  if (!supported.has(extension)) return { ok: false, error: 'Dateityp nicht unterstützt' };
  if (file.size < 4) return { ok: false, error: 'Datei ist leer' };
  if (file.size > maxBytes) return { ok: false, error: `größer als ${formatBytes(maxBytes)}` };
  if (/[<>:"|?*\\/]/.test(file.name) || file.name.startsWith('.')) return { ok: false, error: 'ungültiger Dateiname' };
  return { ok: true };
}

function safeJson(value) { try { return JSON.parse(value || '{}'); } catch { return {}; } }
function showStatus(node, text, success) { node.hidden = false; node.className = `inbox-upload-status ${success ? 'success' : 'error'}`; node.textContent = text; }
function element(tag, className = '', text = '') { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function button(text, className = '') { const node = document.createElement('button'); node.type = 'button'; node.textContent = text; if (className) node.className = className; return node; }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`; }
