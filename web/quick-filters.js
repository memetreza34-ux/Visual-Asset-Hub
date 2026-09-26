const container = document.querySelector('#quick-filters');

if (container) {
  initQuickFilters().catch((error) => {
    container.textContent = `Schnellfilter konnten nicht geladen werden: ${error.message}`;
  });
}

async function initQuickFilters() {
  const response = await fetch('../catalog/search-index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const index = await response.json();

  const filters = [
    { label: 'Alle', apply: () => document.querySelector('#reset')?.click() },
    { label: 'B-Rolls', target: '#type-filter', value: 'video' },
    { label: 'Hochformat', target: '#orientation-filter', value: 'vertical' },
    { label: 'Zu prüfen', target: '#status-filter', value: 'review' },
    { label: 'Freigegeben', target: '#status-filter', value: 'approved' },
    { label: 'Favoriten', apply: toggleFavorites }
  ];

  const categories = Object.entries(index.facets?.categories ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([value, count]) => ({ label: `${humanize(value)} (${count})`, target: '#category-filter', value }));

  container.replaceChildren(...[...filters, ...categories].map(createButton));
}

function createButton(filter) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = filter.label;
  button.addEventListener('click', () => {
    if (filter.apply) return filter.apply();
    const target = document.querySelector(filter.target);
    if (!target) return;
    target.value = filter.value;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  });
  return button;
}

function toggleFavorites() {
  const checkbox = document.querySelector('#favorites-filter');
  if (!checkbox) return;
  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}

function humanize(value) {
  return String(value).replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
