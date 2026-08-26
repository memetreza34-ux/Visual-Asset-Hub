const section = document.querySelector('#script-visual-finder');
const PROJECT_ID = /^SVP-[A-F0-9]{12}$/;
const MAX_PACK_ASSETS = 20;
let adminToken = '';

if (section) {
  const observer = new MutationObserver(() => installProjectPackAction());
  observer.observe(section, { childList: true, subtree: true });
  installProjectPackAction();
}

function installProjectPackAction() {
  const head = section?.querySelector('.svf-project-head');
  const controls = head?.querySelector('.svf-project-controls');
  if (!controls || controls.querySelector('[data-svf-media-pack]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.svfMediaPack = 'true';
  button.textContent = 'Schnittpaket aus Auswahl';

  const status = document.createElement('small');
  status.className = 'svf-pack-status';
  status.hidden = true;

  button.addEventListener('click', async () => {
    button.disabled = true;
    showStatus(status, 'Prüfe ausgewählte und freigegebene Szenenassets …', true);
    try {
      const projectId = currentProjectId();
      const [project, catalog] = await Promise.all([loadProject(projectId), loadCatalog()]);
      const selection = collectSelectedAssets(project);
      if (!selection.selectedCandidates) throw new Error('Im Szenenboard ist noch kein Hauptvisual oder keine Alternative ausgewählt.');

      const approved = approvedAssetIds(selection.assetIds, catalog);
      const blockedCount = selection.missingImportCandidates + selection.assetIds.filter((id) => !approved.includes(id)).length;
      if (!approved.length) {
        throw new Error('Keines der ausgewählten Szenenassets ist bereits freigegeben. Zuerst gewünschte Treffer importieren, prüfen und freigeben.');
      }

      const chunks = chunk(approved, MAX_PACK_ASSETS);
      const outputs = [];
      for (let index = 0; index < chunks.length; index += 1) {
        const suffix = chunks.length > 1 ? `-teil-${index + 1}` : '';
        const name = `${project.title || project.projectId}-script-visual${suffix}`;
        const result = await postMediaPack(chunks[index], name);
        outputs.push(result.output || `Teil ${index + 1} erstellt`);
      }

      const blockedNote = blockedCount ? ` · ${blockedCount} ausgewählte Verknüpfung(en) noch nicht importiert oder nicht freigegeben` : '';
      showStatus(status, `${approved.length} freigegebene Asset(s) in ${chunks.length} verifiziertem Schnittpaket(en) erstellt${blockedNote}.`, true);
      document.dispatchEvent(new CustomEvent('vah:script-media-pack-created', { detail: { projectId, assetIds: approved, packCount: chunks.length } }));
    } catch (error) {
      showStatus(status, error instanceof Error ? error.message : String(error), false);
    } finally {
      button.disabled = false;
    }
  });

  controls.append(button, status);
}

function currentProjectId() {
  const value = section?.querySelector('.svf-project-id')?.textContent?.trim() || '';
  if (!PROJECT_ID.test(value)) throw new Error('Aktuelles Script-Visual-Projekt konnte nicht eindeutig bestimmt werden.');
  return value;
}

async function loadProject(projectId) {
  const response = await fetch(`/script-visual-api/project?id=${encodeURIComponent(projectId)}`, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.project) throw new Error(data.error || 'Script-Visual-Projekt konnte nicht geladen werden.');
  return data.project;
}

async function loadCatalog() {
  const response = await fetch('../catalog/assets.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Katalog konnte für das Schnittpaket nicht geladen werden.');
  return response.json();
}

function collectSelectedAssets(project) {
  const assetIds = [];
  let selectedCandidates = 0;
  let missingImportCandidates = 0;
  for (const scene of project.scenes ?? []) {
    const keys = [scene.selectedPrimary, ...(scene.selectedAlternatives ?? [])].filter(Boolean);
    for (const key of [...new Set(keys)]) {
      const candidate = (scene.candidates ?? []).find((item) => item.key === key);
      if (!candidate) continue;
      selectedCandidates += 1;
      const ids = (candidate.importedAssetIds ?? []).filter((id) => /^VAH-[A-Z0-9]{8}$/.test(id));
      if (!ids.length) missingImportCandidates += 1;
      assetIds.push(...ids);
    }
  }
  return { selectedCandidates, missingImportCandidates, assetIds: [...new Set(assetIds)] };
}

function approvedAssetIds(ids, catalog) {
  const byId = new Map((catalog.assets ?? []).map((asset) => [asset.id, asset]));
  return ids.filter((id) => byId.get(id)?.status === 'approved');
}

async function ensureToken() {
  if (adminToken) return adminToken;
  const response = await fetch('../api/health', { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.localAdmin || !data.token) throw new Error('Lokale Verwaltung ist für das Schnittpaket nicht verfügbar.');
  adminToken = data.token;
  return adminToken;
}

async function postMediaPack(ids, name) {
  const token = await ensureToken();
  const response = await fetch('../api/media-pack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-VAH-Token': token },
    body: JSON.stringify({ ids, name })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Schnittpaket fehlgeschlagen (HTTP ${response.status}).`);
  return data;
}

function chunk(values, size) {
  const groups = [];
  for (let index = 0; index < values.length; index += size) groups.push(values.slice(index, index + size));
  return groups;
}

function showStatus(node, message, ok) {
  node.hidden = false;
  node.textContent = message;
  node.dataset.state = ok ? 'success' : 'error';
}
