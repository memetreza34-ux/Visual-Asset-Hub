const section = document.querySelector('#release-status');

loadReadiness().catch(() => {
  if (section) section.hidden = true;
});

async function loadReadiness() {
  const response = await fetch('../reports/beta-readiness.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const report = await response.json();
  render(report);
}

function render(report) {
  const percentage = clamp(Number(report.completionPercentage) || 0, 0, 100);
  const technical = clamp(Number(report.technicalPercentage) || 0, 0, 100);
  const realTest = clamp(Number(report.realTestPercentage) || 0, 0, 100);
  section.hidden = false;
  section.replaceChildren();

  const header = document.createElement('div');
  header.className = 'release-status-header';
  const text = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = report.realTestComplete ? 'Beta-Abnahme bestanden' : 'Beta-Abnahme läuft';
  const title = document.createElement('h2');
  title.textContent = `${percentage} % fertig`;
  const description = document.createElement('p');
  const reviewed = report.counts?.reviewedAssets ?? 0;
  const required = report.counts?.requiredReviewedAssets ?? 11;
  description.textContent = `Technik ${technical} % · Realtest ${realTest} % · geprüft ${reviewed}/${required} · ${report.counts?.assets ?? 0} Testassets`;
  text.append(eyebrow, title, description);

  const links = document.createElement('div');
  links.className = 'release-status-links';
  links.append(reportLink('Testbericht öffnen', '../reports/beta-readiness.md'), reportLink('JSON herunterladen', '../reports/beta-readiness.json', true));
  header.append(text, links);

  const progress = document.createElement('div');
  progress.className = 'release-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', String(percentage));
  const bar = document.createElement('span');
  bar.style.width = `${percentage}%`;
  progress.append(bar);

  const checks = document.createElement('div');
  checks.className = 'release-checks';
  for (const [key, passed] of Object.entries(report.realTestChecks ?? {})) {
    const item = document.createElement('span');
    item.className = passed ? 'passed' : 'open';
    item.textContent = `${passed ? '✓' : '○'} ${checkLabel(key)}`;
    checks.append(item);
  }

  const next = document.createElement('div');
  next.className = 'release-next';
  const nextTitle = document.createElement('strong');
  nextTitle.textContent = report.realTestComplete ? 'Abnahme vollständig' : 'Noch offen';
  const list = document.createElement('ul');
  const actions = report.nextActions?.length ? report.nextActions : ['Beta-Abnahme vollständig.'];
  for (const action of actions) {
    const item = document.createElement('li');
    item.textContent = action;
    list.append(item);
  }
  next.append(nextTitle, list);
  section.append(header, progress, checks, next);
}

function reportLink(text, href, download = false) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = text;
  link.target = '_blank';
  link.rel = 'noopener';
  if (download) link.download = '';
  return link;
}

function checkLabel(key) {
  return ({
    threeVideos: '3 Videos vorhanden',
    threeStaticVisuals: '3 Bilder/Grafiken vorhanden',
    starterAssetsReviewed: 'alle Starterassets entschieden',
    approvedAsset: 'Asset freigegeben',
    realUsageRecorded: 'echte Nutzung dokumentiert'
  })[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
