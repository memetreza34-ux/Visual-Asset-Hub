const FAVORITES_KEY = 'visual-asset-hub:favorites';

const elements = {
  count: document.querySelector('#favorite-selection-count'),
  exportButton: document.querySelector('#export-favorites'),
  clearButton: document.querySelector('#clear-favorites'),
  actions: document.querySelector('.selection-bar > div')
};

if (elements.count && elements.exportButton && elements.clearButton && elements.actions) {
  elements.mediaPackButton = document.createElement('button');
  elements.mediaPackButton.id = 'create-media-pack';
  elements.mediaPackButton.type = 'button';
  elements.mediaPackButton.textContent = 'Medienpaket erstellen';
  elements.status = document.createElement('span');
  elements.status.id = 'selection-status';
  elements.status.className = 'selection-status';
  elements.status.hidden = true;
  elements.actions.insertBefore(elements.mediaPackButton, elements.exportButton);
  document.querySelector('.selection-bar')?.append(elements.status);

  syncSelectionState();
  elements.exportButton.addEventListener('click', exportSelection);
  elements.mediaPackButton.addEventListener('click', createMediaPack);
  elements.clearButton.addEventListener('click', clearSelection);
  document.addEventListener('click', (event) => {
    if (event.target.closest('.favorite-button')) setTimeout(syncSelectionState, 0);
  });
  document.addEventListener('vah:favorites-changed', syncSelectionState);
  window.addEventListener('storage', syncSelectionState);
}

function readFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function syncSelectionState() {
  const count = readFavorites().size;
  elements.count.textContent = String(count);
  elements.exportButton.disabled = count === 0;
  elements.mediaPackButton.disabled = count === 0;
  elements.clearButton.disabled = count === 0;
}

async function exportSelection() {
  const favorites = readFavorites();
  if (!favorites.size) return;
  try {
    const { index, records } = await selectedRecords(favorites);
    const manifest = {
      format: 'visual-asset-hub-selection',
      version: 1,
      exportedAt: new Date().toISOString(),
      catalogUpdatedAt: index.catalogUpdatedAt,
      assetCount: records.length,
      warning: records.some((record) => record.status !== 'approved')
        ? 'Diese Auswahl enthält nicht freigegebene Assets. Vor Veröffentlichung Status, Inhalt und Rechte prüfen.'
        : null,
      assets: records.map((record) => ({
        id: record.id,
        title: record.title,
        filename: record.filename,
        type: record.type,
        category: record.category,
        status: record.status,
        qualityRating: record.qualityRating,
        tags: record.tags,
        orientation: record.orientation,
        sourceFile: record.source,
        sourcePage: record.sourcePage,
        sourceName: record.sourceName,
        licenseStatus: record.licenseStatus,
        licenseUrl: record.licenseUrl,
        usageScopes: record.usageScopes,
        attributionRequired: record.attributionRequired,
        attributionText: record.attributionText
      }))
    };
    downloadJson(manifest, `visual-asset-auswahl-${dateStamp()}.json`);
    showStatus('Auswahl-JSON wurde heruntergeladen.', true);
  } catch (error) {
    showStatus(error.message, false);
  }
}

async function createMediaPack() {
  const favorites = readFavorites();
  if (!favorites.size) return;
  const originalText = elements.mediaPackButton.textContent;
  elements.mediaPackButton.disabled = true;
  elements.mediaPackButton.textContent = 'Prüfe Auswahl …';
  try {
    const [{ records }, healthResponse] = await Promise.all([
      selectedRecords(favorites),
      fetch('../api/health', { cache: 'no-store' })
    ]);
    if (!healthResponse.ok) throw new Error('Lokale Verwaltung ist nicht aktiv.');
    const health = await healthResponse.json();
    const missing = [...favorites].filter((id) => !records.some((record) => record.id === id));
    if (missing.length) throw new Error(`${missing.length} ausgewählte Asset-IDs wurden nicht im Katalog gefunden.`);
    const blocked = records.filter((record) => record.status !== 'approved');
    if (blocked.length) throw new Error(`${blocked.length} ausgewählte Assets sind noch nicht freigegeben. Nutze zuerst die Review-Warteschlange.`);
    const name = window.prompt('Name für das Medienpaket:', `content-pack-${dateStamp()}`);
    if (name === null) return;
    elements.mediaPackButton.textContent = 'Medien werden geladen …';
    showStatus('Das Paket wird erstellt. Große Videos können einige Minuten benötigen.', true);
    const response = await fetch('/api/media-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-VAH-Token': health.token },
      body: JSON.stringify({ ids: records.map((record) => record.id), name })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    let result;
    try { result = JSON.parse(data.output); }
    catch { result = { directory: data.output }; }
    showStatus(`Medienpaket erstellt: ${result.directory ?? 'unter exports/media-packs'}`, true);
  } catch (error) {
    showStatus(error.message, false);
  } finally {
    elements.mediaPackButton.textContent = originalText;
    elements.mediaPackButton.disabled = readFavorites().size === 0;
  }
}

async function selectedRecords(favorites) {
  const response = await fetch('../catalog/search-index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Katalog konnte nicht geladen werden: HTTP ${response.status}`);
  const index = await response.json();
  const records = index.records
    .filter((record) => favorites.has(record.id))
    .sort((a, b) => a.title.localeCompare(b.title, 'de'));
  return { index, records };
}

function clearSelection() {
  if (!readFavorites().size) return;
  if (!window.confirm('Wirklich alle Favoriten aus der aktuellen Auswahl entfernen?')) return;
  localStorage.removeItem(FAVORITES_KEY);
  location.reload();
}

function showStatus(text, success) {
  elements.status.hidden = false;
  elements.status.className = `selection-status ${success ? 'success' : 'error'}`;
  elements.status.textContent = text;
}

function downloadJson(value, filename) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
