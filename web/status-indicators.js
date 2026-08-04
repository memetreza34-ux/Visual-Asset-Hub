const grid = document.querySelector('#asset-grid');
const warning = document.querySelector('#review-warning');

if (grid) {
  initStatusIndicators().catch((error) => {
    if (warning) {
      warning.hidden = false;
      warning.textContent = `Statusinformationen konnten nicht geladen werden: ${error.message}`;
    }
  });
}

async function initStatusIndicators() {
  const response = await fetch('../catalog/search-index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const index = await response.json();
  const records = new Map(index.records.map((record) => [record.id, record]));

  if (warning && (index.reviewCount ?? 0) > 0) {
    warning.hidden = false;
    warning.innerHTML = `<strong>${index.reviewCount} Asset${index.reviewCount === 1 ? '' : 's'} noch nicht freigegeben.</strong> Vor einer Veröffentlichung Inhalt, sichtbare Personen/Marken und Rechte prüfen.`;
  }

  decorateAll(records);
  const observer = new MutationObserver(() => decorateAll(records));
  observer.observe(grid, { childList: true });
}

function decorateAll(records) {
  for (const card of grid.querySelectorAll('.asset-card[data-asset-id]')) {
    if (card.querySelector('.status-badge')) continue;
    const record = records.get(card.dataset.assetId);
    if (!record) continue;
    const badge = document.createElement('span');
    badge.className = `status-badge status-${record.status}`;
    badge.textContent = statusLabel(record.status);
    badge.title = statusDescription(record.status);
    card.querySelector('.asset-meta')?.append(badge);
    card.dataset.status = record.status;
  }
}

function statusLabel(status) {
  return ({ review: 'Zu prüfen', inbox: 'Eingang', approved: 'Freigegeben', restricted: 'Eingeschränkt', archived: 'Archiviert' })[status] || status;
}

function statusDescription(status) {
  return ({
    review: 'Noch nicht für die Veröffentlichung freigegeben.',
    inbox: 'Noch nicht vollständig katalogisiert.',
    approved: 'Nach dokumentierter Prüfung freigegeben.',
    restricted: 'Nur eingeschränkt oder nicht verwenden.',
    archived: 'Nicht mehr für neue Projekte vorgesehen.'
  })[status] || '';
}
