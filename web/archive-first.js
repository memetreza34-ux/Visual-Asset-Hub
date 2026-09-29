const labels = {
  nasa: 'NASA Image & Video Library',
  noaa: 'NOAA',
  usgs: 'U.S. Geological Survey',
  'library-of-congress': 'Library of Congress',
  wikimedia: 'Wikimedia Commons',
  'internet-archive': 'Internet Archive',
  openverse: 'Openverse',
  pexels: 'Pexels · Stock-Fallback',
  pixabay: 'Pixabay · Stock-Fallback'
};

const preferred = ['nasa', 'noaa', 'usgs', 'library-of-congress', 'wikimedia', 'internet-archive', 'openverse', 'pexels', 'pixabay'];
const select = document.querySelector('#source-provider');
if (select) {
  let initialized = false;
  const apply = () => {
    const options = [...select.options];
    if (!options.length) return;
    for (const option of options) {
      const suffix = option.textContent?.includes('API-Key fehlt') ? ' – API-Key fehlt' : '';
      option.textContent = `${labels[option.value] || option.textContent || option.value}${suffix}`;
      option.dataset.sourceTier = ['pexels', 'pixabay'].includes(option.value) ? 'stock-fallback' : 'archive-first';
    }
    if (!initialized) {
      const next = preferred.find((name) => options.some((option) => option.value === name && !option.disabled));
      if (next) {
        select.value = next;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      initialized = true;
    }
  };
  new MutationObserver(apply).observe(select, { childList: true, subtree: true });
  queueMicrotask(apply);
}
