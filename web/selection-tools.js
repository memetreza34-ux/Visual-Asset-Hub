const FAVORITES_KEY = 'visual-asset-hub:favorites';

const elements = {
  count: document.querySelector('#favorite-selection-count'),
  exportButton: document.querySelector('#export-favorites'),
  clearButton: document.querySelector('#clear-favorites')
};

if (elements.count && elements.exportButton && elements.clearButton) {
  syncSelectionState();
  elements.exportButton.addEventListener('click', exportSelection);
  elements.clearButton.addEventListener('click', clearSelection);
  document.addEventListener('click', (event) => {
    if (event.target.closest('.favorite-button')) setTimeout(syncSelectionState, 0);
  });
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
  elements.clearButton.disabled = count === 0;
}

async function exportSelection() {
  const favorites = readFavorites();
  if (!favorites.size) return;

  const response = await fetch('../catalog/search-index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Katalog konnte nicht geladen werden: HTTP ${response.status}`);
  const index = await response.json();
  const records = index.records
    .filter((record) => favorites.has(record.id))
    .sort((a, b) => a.title.localeCompare(b.title, 'de'));

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
}

function clearSelection() {
  if (!readFavorites().size) return;
  if (!window.confirm('Wirklich alle Favoriten aus der aktuellen Auswahl entfernen?')) return;
  localStorage.removeItem(FAVORITES_KEY);
  location.reload();
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
