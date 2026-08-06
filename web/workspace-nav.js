const anchor = document.querySelector('#local-admin-status');

if (anchor) initWorkspaceNavigation().catch(() => {});

async function initWorkspaceNavigation() {
  const [indexResponse, inboxResponse] = await Promise.all([
    fetch('../catalog/search-index.json', { cache: 'no-store' }),
    fetch('/inbox-api/list', { cache: 'no-store' }).catch(() => null)
  ]);
  if (!indexResponse.ok) throw new Error('Katalog nicht verfügbar.');
  const index = await indexResponse.json();
  const inbox = inboxResponse?.ok ? await inboxResponse.json() : { files: [] };
  const items = [
    { id: 'library', label: 'Bibliothek', count: index.assetCount ?? index.records?.length ?? 0, target: '#asset-grid' },
    { id: 'inbox', label: 'Eigene Dateien', count: inbox.files?.length ?? 0, target: '#inbox-importer' },
    { id: 'review', label: 'Prüfen', count: index.reviewCount ?? 0, target: '#review-queue' },
    { id: 'pexels', label: 'Pexels suchen', count: null, target: '#arsenal-builder' },
    { id: 'categories', label: '90 Kategorien', count: null, target: '#channel-arsenal' }
  ];

  const nav = document.createElement('nav');
  nav.className = 'workspace-nav';
  nav.setAttribute('aria-label', 'Arbeitsbereiche');
  const home = document.createElement('button');
  home.type = 'button';
  home.className = 'workspace-home';
  home.textContent = 'Visual Asset Hub';
  home.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const list = document.createElement('div');
  list.className = 'workspace-nav-list';
  nav.append(home, list);

  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.target = item.target;
    const text = document.createElement('span');
    text.textContent = item.label;
    button.append(text);
    if (item.count !== null) {
      const count = document.createElement('b');
      count.textContent = String(item.count);
      button.append(count);
    }
    button.addEventListener('click', () => {
      const target = document.querySelector(item.target);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    list.append(button);
  }

  anchor.insertAdjacentElement('afterend', nav);
  const observed = items.map((item) => document.querySelector(item.target)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      for (const button of list.querySelectorAll('button')) button.classList.toggle('active', button.dataset.target === `#${visible.target.id}`);
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, .1, .5] });
    for (const target of observed) observer.observe(target);
  }
}
