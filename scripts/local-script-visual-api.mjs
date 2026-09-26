import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createScriptVisualPlan, projectSlug } from './script-visual-core.mjs';
import { searchPexels } from './lib/pexels.mjs';
import { searchPixabay } from './lib/pixabay.mjs';
import { searchUnsplash } from './lib/unsplash.mjs';
import { searchOpenverse } from './lib/openverse.mjs';
import { searchWikimedia } from './lib/wikimedia.mjs';

const PROVIDERS = ['pexels', 'pixabay', 'unsplash', 'openverse', 'wikimedia'];
const KEYLESS = new Set(['openverse', 'wikimedia']);
const PHOTO_ONLY = new Set(['unsplash', 'openverse', 'wikimedia']);
const PROJECT_ID = /^SVP-[A-F0-9]{12}$/;
const SCENE_ID = /^SCENE-\d{3}$/;
const PROVIDER_ID = /^[A-Za-z0-9_-]{1,128}$/;
const PIXABAY_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_SEARCH_PAGE = 100;
const CHANNEL_LABELS = { general: 'Allgemein', finance: 'Finanzen', ai: 'Künstliche Intelligenz', electro: 'Elektrotechnik', 'combat-sports': 'Kampfsport' };
const CHANNEL_TAGS = { finance: 'channel-finance', ai: 'channel-ai', electro: 'channel-electro', 'combat-sports': 'channel-combat-sports' };
const DEPTH_TARGETS = {
  quick: { candidates: 4, minProviders: 1, maxTasks: 4, retainCandidates: 12 },
  deep: { candidates: 6, minProviders: 3, maxTasks: 8, retainCandidates: 20 },
  max: { candidates: 8, minProviders: 5, maxTasks: 12, retainCandidates: 30 }
};

export function createLocalScriptVisualApi({ root = process.cwd(), token, searchers = defaultSearchers() } = {}) {
  if (!token) throw new Error('Lokales Verwaltungstoken fehlt.');
  const projectDirectory = path.join(root, '.local-storage', 'script-visual-projects');
  const searchDirectory = path.join(root, '.local-storage', 'arsenal-web');

  return {
    async handle(request, response, url) {
      if (!url.pathname.startsWith('/script-visual-api/')) return false;
      setHeaders(response);
      if (!isLoopback(request.socket.remoteAddress)) return sendJson(response, 403, { error: 'Script Visual Finder ist ausschließlich lokal erreichbar.' });

      if (request.method === 'GET' && url.pathname === '/script-visual-api/health') {
        return sendJson(response, 200, { ok: true, local: true, providers: PROVIDERS, maxScenes: 120 });
      }
      if (request.method === 'GET' && url.pathname === '/script-visual-api/projects') {
        return sendJson(response, 200, { ok: true, projects: listProjects(projectDirectory) });
      }
      if (request.method === 'GET' && url.pathname === '/script-visual-api/project') {
        try {
          const id = validateProjectId(url.searchParams.get('id'));
          return sendJson(response, 200, { ok: true, project: readProject(projectDirectory, id) });
        } catch (error) {
          return sendJson(response, 400, { error: message(error) });
        }
      }

      if (request.method !== 'POST') return sendJson(response, 405, { error: 'Nur GET oder POST ist für diese Aktion erlaubt.' });
      if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Ungültiger Ursprung.' });
      if (request.headers['x-vah-token'] !== token) return sendJson(response, 403, { error: 'Ungültiges lokales Verwaltungstoken.' });

      let payload;
      try { payload = await readBody(request, 256 * 1024); }
      catch (error) { return sendJson(response, 400, { error: message(error) }); }

      try {
        fs.mkdirSync(projectDirectory, { recursive: true });
        fs.mkdirSync(searchDirectory, { recursive: true });

        if (url.pathname === '/script-visual-api/create') {
          const plan = createScriptVisualPlan(payload);
          const project = {
            ...plan,
            projectId: createProjectId(),
            format: 'visual-asset-hub-script-visual-project',
            version: 1,
            updatedAt: new Date().toISOString(),
            progress: { searchedScenes: 0, totalScenes: plan.scenes.length, selectedScenes: 0, importedAssets: 0 }
          };
          writeProject(projectDirectory, project);
          writeProjectMirror(root, project);
          return sendJson(response, 200, { ok: true, project });
        }

        if (url.pathname === '/script-visual-api/search-scene') {
          const projectId = validateProjectId(payload?.projectId);
          const sceneId = validateSceneId(payload?.sceneId);
          const project = readProject(projectDirectory, projectId);
          const scene = project.scenes.find((item) => item.id === sceneId);
          if (!scene) throw new Error('Szene wurde im Projekt nicht gefunden.');
          const keys = validateKeys(payload?.keys);
          const enabledProviders = PROVIDERS.filter((provider) => KEYLESS.has(provider) || Boolean(keys[provider]));
          if (!enabledProviders.length) throw new Error('Keine nutzbare Medienquelle vorhanden.');
          const perPage = integer(payload?.perPage ?? 6, 3, 12, 'perPage');
          const force = Boolean(payload?.force);
          if (scene.searchedAt && scene.candidates.length && !force) {
            return sendJson(response, 200, { ok: true, projectId, scene, cachedProjectScene: true, searchedProviders: [], validatedKeyProviders: [] });
          }
          const previousRound = Number.isInteger(scene.searchRound) && scene.searchRound >= 1 ? scene.searchRound : (scene.searchedAt ? 1 : 0);
          const searchPage = force ? Math.min(MAX_SEARCH_PAGE, Math.max(2, previousRound + 1)) : 1;

          const outcome = await searchScene({ root, project, scene, keys, enabledProviders, perPage, page: searchPage, searchDirectory, searchers });
          Object.assign(scene, outcome.scene);
          project.updatedAt = new Date().toISOString();
          refreshProgress(project);
          writeProject(projectDirectory, project);
          writeProjectMirror(root, project, scene.id);
          return sendJson(response, 200, {
            ok: true,
            projectId,
            scene,
            page: scene.searchRound ?? searchPage,
            searchedProviders: outcome.successfulProviders,
            validatedKeyProviders: outcome.validatedKeyProviders,
            tasks: outcome.tasks,
            errors: scene.searchErrors
          });
        }

        if (url.pathname === '/script-visual-api/select') {
          const projectId = validateProjectId(payload?.projectId);
          const sceneId = validateSceneId(payload?.sceneId);
          const role = member(payload?.role, ['primary', 'alternative', 'remove'], 'role');
          const key = requireText(payload?.candidateKey, 'candidateKey', 3, 260);
          const project = readProject(projectDirectory, projectId);
          const scene = project.scenes.find((item) => item.id === sceneId);
          if (!scene) throw new Error('Szene wurde im Projekt nicht gefunden.');
          if (!scene.candidates.some((item) => item.key === key)) throw new Error('Kandidat wurde in dieser Szene nicht gefunden.');
          if (role === 'primary') {
            scene.selectedPrimary = key;
            scene.selectedAlternatives = scene.selectedAlternatives.filter((value) => value !== key);
          } else if (role === 'alternative') {
            if (scene.selectedPrimary === key) scene.selectedPrimary = null;
            scene.selectedAlternatives = [...new Set([...scene.selectedAlternatives, key])].slice(0, 6);
          } else {
            if (scene.selectedPrimary === key) scene.selectedPrimary = null;
            scene.selectedAlternatives = scene.selectedAlternatives.filter((value) => value !== key);
          }
          project.updatedAt = new Date().toISOString();
          refreshProgress(project);
          writeProject(projectDirectory, project);
          writeProjectMirror(root, project, scene.id);
          return sendJson(response, 200, { ok: true, scene, progress: project.progress });
        }

        if (url.pathname === '/script-visual-api/import') {
          const projectId = validateProjectId(payload?.projectId);
          const sceneId = validateSceneId(payload?.sceneId);
          const candidateKeyValue = requireText(payload?.candidateKey, 'candidateKey', 3, 260);
          const project = readProject(projectDirectory, projectId);
          const scene = project.scenes.find((item) => item.id === sceneId);
          if (!scene) throw new Error('Szene wurde im Projekt nicht gefunden.');
          const candidate = scene.candidates.find((item) => item.key === candidateKeyValue);
          if (!candidate) throw new Error('Kandidat wurde in dieser Szene nicht gefunden.');
          const env = candidate.provider === 'unsplash' ? { UNSPLASH_ACCESS_KEY: requireText(payload?.apiKey, 'apiKey', 8, 300) } : {};
          const catalogPath = path.join(root, 'catalog', 'assets.json');
          const before = new Set((readJson(catalogPath).assets ?? []).map((asset) => asset.id));
          const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vah-script-visual-import-'));
          try {
            const wrapperFile = path.join(tempDirectory, `${candidate.searchId}.json`);
            fs.writeFileSync(wrapperFile, `${JSON.stringify({
              version: 10,
              searchId: candidate.searchId,
              provider: candidate.provider,
              searchedAt: candidate.searchedAt,
              arsenalJob: candidate.job,
              result: { provider: candidate.provider, total_results: 1, assets: [candidate.asset] }
            }, null, 2)}\n`);
            runScript(root, 'scripts/arsenal-import-selected.mjs', ['--input', wrapperFile, '--ids', candidate.providerId, '--created-by', 'script-visual-finder'], env);
          } finally {
            fs.rmSync(tempDirectory, { recursive: true, force: true });
          }
          const afterAssets = readJson(catalogPath).assets ?? [];
          const importedIds = afterAssets.map((asset) => asset.id).filter((id) => !before.has(id));
          const existingIds = importedIds.length ? [] : findExistingCatalogAssetIds(afterAssets, candidate);
          const linkedIds = [...new Set([...importedIds, ...existingIds])];
          candidate.importedAssetIds = [...new Set([...(candidate.importedAssetIds ?? []), ...linkedIds])];
          project.updatedAt = new Date().toISOString();
          refreshProgress(project);
          writeProject(projectDirectory, project);
          writeProjectMirror(root, project, scene.id);
          return sendJson(response, 200, {
            ok: true,
            imported: importedIds.length,
            linkedExisting: existingIds.length,
            assetIds: linkedIds,
            scene,
            progress: project.progress
          });
        }

        return sendJson(response, 404, { error: 'Script-Visual-Aktion nicht gefunden.' });
      } catch (error) {
        return sendJson(response, 400, { error: message(error) });
      }
    }
  };
}

async function searchScene({ root, project, scene, keys, enabledProviders, perPage, page = 1, searchDirectory, searchers }) {
  const settings = DEPTH_TARGETS[project.settings.depth] ?? DEPTH_TARGETS.deep;
  const providerOrder = orderProviders(scene.preferredMediaType).filter((provider) => enabledProviders.includes(provider));
  const requiredProviders = Math.min(settings.minProviders, providerOrder.length);
  const mixedRequested = project.settings.mediaPreference === 'mixed';
  const mixedMediaPossible = mixedRequested && enabledProviders.some((provider) => !PHOTO_ONLY.has(provider));
  const localSeen = new Set((scene.candidates ?? []).flatMap(candidateIdentities));
  const projectSeen = new Set(project.scenes.flatMap((item) => item.id === scene.id ? [] : (item.candidates ?? []).flatMap(candidateIdentities)));
  const candidates = [...(scene.candidates ?? [])];
  const errors = [];
  const providersUsed = new Set();
  const validatedKeyProviders = new Set();
  let tasks = 0;

  outer:
  for (const query of scene.queries) {
    for (const provider of providerOrder) {
      if (tasks >= settings.maxTasks) break outer;
      tasks += 1;
      try {
        const type = searchTypeForProvider(provider, scene.preferredMediaType, mixedRequested);
        const execution = await executeSearch({ provider, query, type, orientation: project.settings.orientation, perPage, page, apiKey: keys[provider], searchers, searchDirectory });
        providersUsed.add(provider);
        if (!KEYLESS.has(provider) && !execution.cached) validatedKeyProviders.add(provider);
        const searchId = createSearchId();
        const job = buildJob(project, scene, query, provider, type, perPage, page);
        const result = execution.result;
        const wrapper = {
          version: 10,
          searchId,
          provider,
          searchedAt: new Date().toISOString(),
          expiresAt: execution.expiresAt,
          cached: execution.cached,
          scriptVisual: { projectId: project.projectId, projectTitle: project.title, sceneId: scene.id, sequence: scene.sequence, page },
          arsenalJob: job,
          result
        };
        fs.writeFileSync(path.join(searchDirectory, `${searchId}.json`), `${JSON.stringify(wrapper, null, 2)}\n`, { mode: 0o600 });
        for (const asset of result.assets ?? []) {
          const providerId = String(asset.provider_id ?? asset.id ?? '').trim();
          if (!providerId || !PROVIDER_ID.test(providerId)) continue;
          const identities = assetIdentities(provider, asset);
          if (!identities.length || identities.some((identity) => localSeen.has(identity))) continue;
          for (const identity of identities) localSeen.add(identity);
          const key = candidateKey(provider, asset);
          if (!key) continue;
          const reusedElsewhere = identities.some((identity) => projectSeen.has(identity));
          const reusePenalty = reusedElsewhere ? 22 : 0;
          candidates.push({
            key,
            provider,
            providerId,
            searchId,
            searchedAt: wrapper.searchedAt,
            query,
            job,
            title: asset.title || `${providerLabel(provider)} ${providerId}`,
            type: asset.type ?? type,
            width: Number(asset.width) || null,
            height: Number(asset.height) || null,
            durationSeconds: Number(asset.duration_seconds) || null,
            creator: asset.creator || '',
            sourceUrl: asset.source_url || '',
            previewUrl: asset.preview_url || '',
            license: asset.license || null,
            technicalFit: Math.max(0, techScore(asset, type, project.settings.orientation) - reusePenalty),
            reusedElsewhere,
            importedAssetIds: [],
            asset
          });
        }
        const fresh = candidates.filter((item) => !item.reusedElsewhere).length;
        const mixedMediaReady = !mixedMediaPossible || hasMixedMediaCandidates(candidates);
        if (candidates.length >= settings.candidates && fresh >= Math.min(3, settings.candidates) && providersUsed.size >= requiredProviders && mixedMediaReady) break outer;
      } catch (error) {
        errors.push({ provider, query, page, error: message(error) });
      }
    }
  }

  candidates.sort((a, b) => Number(Boolean(a.reusedElsewhere)) - Number(Boolean(b.reusedElsewhere)) || b.technicalFit - a.technicalFit || a.title.localeCompare(b.title, 'de'));
  const successful = providersUsed.size > 0;
  return {
    tasks,
    successfulProviders: [...providersUsed],
    validatedKeyProviders: [...validatedKeyProviders],
    scene: {
      candidates: retainSceneCandidates(candidates, scene, mixedRequested, settings.retainCandidates),
      searchedAt: successful ? new Date().toISOString() : (scene.searchedAt ?? null),
      searchRound: successful ? page : (Number.isInteger(scene.searchRound) ? scene.searchRound : 0),
      searchErrors: errors
    }
  };
}

async function executeSearch({ provider, query, type, orientation, perPage, page = 1, apiKey, searchers, searchDirectory }) {
  if (provider === 'pixabay') {
    const cacheDirectory = path.join(searchDirectory, 'pixabay-cache');
    fs.mkdirSync(cacheDirectory, { recursive: true });
    const request = { query, type, orientation, perPage, locale: 'de', page };
    const cacheKey = createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 32);
    const cacheFile = path.join(cacheDirectory, `${cacheKey}.json`);
    const cached = readFreshPixabayCache(cacheFile);
    if (cached) return { result: structuredClone(cached.result), cached: true, expiresAt: cached.expiresAt };
    const result = await searchers.pixabay({ apiKey, query, type, orientation, locale: 'de', page, perPage });
    const expiresAt = new Date(Date.now() + PIXABAY_CACHE_MS).toISOString();
    fs.writeFileSync(cacheFile, `${JSON.stringify({ version: 1, provider: 'pixabay', fetchedAt: new Date().toISOString(), expiresAt, request, result }, null, 2)}\n`, { mode: 0o600 });
    return { result, cached: false, expiresAt };
  }
  if (provider === 'pexels') return { result: await searchers.pexels({ apiKey, query, type, orientation, locale: 'de-DE', page, perPage }), cached: false, expiresAt: null };
  if (provider === 'unsplash') return { result: await searchers.unsplash({ apiKey, query, orientation, page, perPage, contentFilter: 'high' }), cached: false, expiresAt: null };
  if (provider === 'openverse') return { result: await searchers.openverse({ query, orientation, page, perPage }), cached: false, expiresAt: null };
  return { result: await searchers.wikimedia({ query, orientation, page, perPage }), cached: false, expiresAt: null };
}

function buildJob(project, scene, query, provider, type, perPage, page = 1) {
  const channelTag = CHANNEL_TAGS[project.channel];
  const collection = `script-${projectSlug(project.title)}-${scene.id.toLowerCase()}`.slice(0, 100).replace(/-+$/g, '');
  return {
    id: `${project.projectId}-${scene.id}-${provider}`.slice(0, 180),
    channel: project.channel,
    channelLabel: CHANNEL_LABELS[project.channel] ?? 'Allgemein',
    collection,
    collectionLabel: `${project.title} · ${scene.id}`,
    category: scene.category,
    query,
    type,
    orientation: project.settings.orientation,
    perPage,
    page,
    tags: [...new Set([
      ...(channelTag ? [channelTag] : []),
      'script-visual-project',
      `script-project-${projectSlug(project.projectId)}`,
      `script-scene-${scene.id.toLowerCase()}`,
      `visual-intent-${scene.visualIntentType}`
    ])],
    reviewNotes: `Script Visual Finder · ${project.title} · ${scene.id}. Originaltext: ${scene.originalText.slice(0, 500)}. Vor Freigabe Inhalt, Urheber-, Personen-, Marken-, Event- und Kontextrechte prüfen.`,
    scriptVisualProjectId: project.projectId,
    scriptVisualSceneId: scene.id
  };
}

function writeProjectMirror(root, project, changedSceneId = null) {
  const directory = path.join(root, 'ALLES-GEFUNDEN', '06-SKRIPT-PROJEKTE', `${safeName(project.title, 70)}-${project.projectId.slice(-6)}`);
  if (!changedSceneId) fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, '00-SKRIPT.txt'), `${project.script.trim()}\n`);
  fs.writeFileSync(path.join(directory, '00-PROJEKT.json'), `${JSON.stringify(project, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, '00-SHOTLIST.json'), `${JSON.stringify(shotlist(project), null, 2)}\n`);
  fs.writeFileSync(path.join(directory, '00-SHOTLIST.csv'), shotlistCsv(project));
  fs.writeFileSync(path.join(directory, '00-SZENENPLAN.md'), sceneMarkdown(project));

  const scenes = changedSceneId ? project.scenes.filter((scene) => scene.id === changedSceneId) : project.scenes;
  for (const scene of scenes) {
    const sceneDir = path.join(directory, `${String(scene.sequence).padStart(3, '0')}-${scene.id}`);
    fs.rmSync(sceneDir, { recursive: true, force: true });
    fs.mkdirSync(sceneDir, { recursive: true });
    fs.writeFileSync(path.join(sceneDir, '00-SZENE.md'), sceneDetailMarkdown(project, scene));
    for (let index = 0; index < scene.candidates.length; index += 1) {
      const candidate = scene.candidates[index];
      const base = `${String(index + 1).padStart(2, '0')}-${safeName(candidate.title, 70)}-${safeName(candidate.providerId, 30)}`;
      fs.writeFileSync(path.join(sceneDir, `${base}-INFO.md`), candidateMarkdown(scene, candidate));
      if (candidate.sourceUrl) writeShortcut(path.join(sceneDir, `${base}-QUELLE.url`), candidate.sourceUrl);
      const media = bestMediaUrl(candidate.asset?.files);
      if (media) writeShortcut(path.join(sceneDir, `${base}-MEDIUM.url`), media);
      if (candidate.previewUrl) writeShortcut(path.join(sceneDir, `${base}-VORSCHAU.url`), candidate.previewUrl);
    }
  }
}

function shotlist(project) {
  return {
    format: 'visual-asset-hub-script-visual-shotlist',
    version: 1,
    projectId: project.projectId,
    title: project.title,
    scriptSha256: project.scriptSha256,
    scenes: project.scenes.map((scene) => ({
      sceneId: scene.id,
      sequence: scene.sequence,
      startSeconds: scene.startSeconds,
      endSeconds: scene.endSeconds,
      originalText: scene.originalText,
      visualIntent: scene.visualIntent,
      queries: scene.queries,
      selectedPrimary: selectedCandidate(scene, scene.selectedPrimary),
      selectedAlternatives: scene.selectedAlternatives.map((key) => selectedCandidate(scene, key)).filter(Boolean)
    }))
  };
}

function sceneMarkdown(project) {
  const lines = [`# Script Visual Finder – ${project.title}`, '', '> Skript rein → Visuals raus. Der Originaltext wird nicht umgeschrieben.', '', `- Projekt: **${project.projectId}**`, `- Zuordnung: **${CHANNEL_LABELS[project.channel] ?? project.channel}**`, `- Szenen: **${project.scenes.length}**`, `- Recherchiert: **${project.progress.searchedScenes}**`, `- Szenen mit Auswahl: **${project.progress.selectedScenes}**`, `- Importierte Assets: **${project.progress.importedAssets}**`, ''];
  for (const scene of project.scenes) {
    lines.push(`## ${scene.id} · ${scene.startSeconds}–${scene.endSeconds}s`, '', `**Original:** ${scene.originalText}`, '', `**Visuell:** ${scene.visualIntent}`, '', `**Queries:** ${scene.queries.map((query) => `\`${query}\``).join(' · ')}`, '', `**Kandidaten:** ${scene.candidates.length} · Suchseite: ${scene.searchRound || 0} · Hauptvisual: ${scene.selectedPrimary || 'noch keines'}`, '');
  }
  return `${lines.join('\n')}\n`;
}

function sceneDetailMarkdown(project, scene) {
  const lines = [`# ${scene.id}`, '', `**Originaltext:** ${scene.originalText}`, '', `- Zeit: ${scene.startSeconds}–${scene.endSeconds}s`, `- Visuelle Absicht: ${scene.visualIntent}`, `- Bevorzugtes Medium: ${scene.preferredMediaType}`, `- Suchseite: ${scene.searchRound || 0}`, `- Symbolisches Visual: ${scene.symbolic ? 'ja' : 'nein'}`, `- Queries: ${scene.queries.join(' | ')}`, `- Kandidaten: ${scene.candidates.length}`, `- Hauptvisual: ${scene.selectedPrimary || 'noch keines'}`, `- Alternativen: ${scene.selectedAlternatives.join(', ') || 'noch keine'}`, '', '> Kandidaten und Suchtreffer sind keine automatische Nutzungsfreigabe. Jeder Import startet als Review.', ''];
  return `${lines.join('\n')}\n`;
}

function candidateMarkdown(scene, candidate) {
  const selected = scene.selectedPrimary === candidate.key ? 'Hauptvisual' : scene.selectedAlternatives.includes(candidate.key) ? 'Alternative' : 'nicht ausgewählt';
  return `# ${candidate.title}\n\n- Szene: **${scene.id}**\n- Auswahl: **${selected}**\n- Provider: **${providerLabel(candidate.provider)}**\n- Typ: **${candidate.type}**\n- Suchseite: **${candidate.job?.page ?? 1}**\n- Technischer Fit: **${candidate.technicalFit}/100**\n- Query: \`${candidate.query}\`\n- Creator: ${candidate.creator || 'nicht angegeben'}\n- Quelle: ${candidate.sourceUrl || 'nicht angegeben'}\n- Importierte Asset-IDs: ${(candidate.importedAssetIds ?? []).join(', ') || 'noch nicht importiert'}\n- Bereits in anderer Szene gefunden: ${candidate.reusedElsewhere ? 'ja' : 'nein'}\n\n> Vor Veröffentlichung Quelle, Lizenz, Urheber, sichtbare Personen/Marken und Nutzungskontext prüfen.\n`;
}

function shotlistCsv(project) {
  const rows = [['Szene','Start','Ende','Originaltext','Visuelle Absicht','Queries','Hauptvisual','Alternativen']];
  for (const scene of project.scenes) rows.push([scene.id, scene.startSeconds, scene.endSeconds, scene.originalText, scene.visualIntent, scene.queries.join(' | '), scene.selectedPrimary || '', scene.selectedAlternatives.join(' | ')]);
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function selectedCandidate(scene, key) {
  if (!key) return null;
  const item = scene.candidates.find((candidate) => candidate.key === key);
  if (!item) return null;
  return { key: item.key, provider: item.provider, providerId: item.providerId, title: item.title, sourceUrl: item.sourceUrl, importedAssetIds: item.importedAssetIds ?? [] };
}

function refreshProgress(project) {
  project.progress = {
    searchedScenes: project.scenes.filter((scene) => scene.searchedAt).length,
    totalScenes: project.scenes.length,
    selectedScenes: project.scenes.filter((scene) => scene.selectedPrimary || scene.selectedAlternatives.length).length,
    importedAssets: new Set(project.scenes.flatMap((scene) => scene.candidates.flatMap((candidate) => candidate.importedAssetIds ?? []))).size
  };
}

function listProjects(directory) {
  if (!fs.existsSync(directory)) return [];
  const projects = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/^SVP-[A-F0-9]{12}\.json$/.test(entry.name)) continue;
    try {
      const project = readJson(path.join(directory, entry.name));
      projects.push({ projectId: project.projectId, title: project.title, createdAt: project.createdAt, updatedAt: project.updatedAt, channel: project.channel, sceneCount: project.scenes?.length ?? 0, progress: project.progress });
    } catch {}
  }
  return projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function readProject(directory, id) {
  const file = path.join(directory, `${id}.json`);
  if (!fs.existsSync(file)) throw new Error('Script-Visual-Projekt wurde nicht gefunden.');
  const project = readJson(file);
  if (project.projectId !== id || project.format !== 'visual-asset-hub-script-visual-project') throw new Error('Ungültige Projektdatei.');
  return project;
}
function writeProject(directory, project) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, `${project.projectId}.json`), `${JSON.stringify(project, null, 2)}\n`, { mode: 0o600 }); }
function createProjectId() { return `SVP-${randomBytes(6).toString('hex').toUpperCase()}`; }
function createSearchId() { return `ARS-${randomBytes(8).toString('hex').toUpperCase()}`; }
function validateProjectId(value) { const id = requireText(value, 'projectId', 16, 16); if (!PROJECT_ID.test(id)) throw new Error('Ungültige projectId.'); return id; }
function validateSceneId(value) { const id = requireText(value, 'sceneId', 9, 9); if (!SCENE_ID.test(id)) throw new Error('Ungültige sceneId.'); return id; }
function validateKeys(value) { const input = value && typeof value === 'object' ? value : {}; const result = {}; for (const provider of ['pexels','pixabay','unsplash']) { const raw = typeof input[provider] === 'string' ? input[provider].trim() : ''; if (raw && (raw.length < 8 || raw.length > 300 || /[\u0000-\u001F\u007F]/.test(raw))) throw new Error(`${provider} API-Key ist ungültig.`); result[provider] = raw; } return result; }
function orderProviders(type) { return type === 'photo' ? ['unsplash','openverse','wikimedia','pexels','pixabay'] : ['pexels','pixabay','unsplash','openverse','wikimedia']; }
function searchTypeForProvider(provider, preferredType, mixedRequested) { if (PHOTO_ONLY.has(provider)) return 'photo'; if (mixedRequested) return 'video'; return preferredType; }
function hasMixedMediaCandidates(candidates) { return candidates.some((item) => item.type === 'video') && candidates.some((item) => item.type !== 'video'); }
function retainSceneCandidates(candidates, scene, mixedRequested, limit = 20) {
  const protectedKeys = new Set([scene.selectedPrimary, ...(scene.selectedAlternatives ?? [])].filter(Boolean));
  const selectedKeys = new Set(protectedKeys);
  if (mixedRequested && hasMixedMediaCandidates(candidates)) {
    for (const item of candidates.filter((candidate) => candidate.type === 'video').slice(0, 4)) selectedKeys.add(item.key);
    for (const item of candidates.filter((candidate) => candidate.type !== 'video').slice(0, 4)) selectedKeys.add(item.key);
  }
  for (const item of candidates) {
    if (selectedKeys.size >= limit) break;
    selectedKeys.add(item.key);
  }
  return candidates.filter((item) => selectedKeys.has(item.key)).slice(0, Math.max(limit, protectedKeys.size));
}
function assetIdentities(provider, asset) { return [...new Set([`${provider}|${asset?.provider_id ?? asset?.id ?? ''}`, canonicalUrl(asset?.source_url), canonicalUrl(asset?.original_url), canonicalUrl(bestMediaUrl(asset?.files))].filter(Boolean))]; }
function candidateIdentities(candidate) { return assetIdentities(candidate?.provider ?? '', candidate?.asset ?? {}); }
function findExistingCatalogAssetIds(assets, candidate) {
  const candidateUrls = new Set([
    canonicalUrl(candidate?.sourceUrl),
    canonicalUrl(candidate?.asset?.source_url),
    canonicalUrl(candidate?.asset?.original_url),
    canonicalUrl(bestMediaUrl(candidate?.asset?.files))
  ].filter(Boolean));
  if (!candidateUrls.size) return [];
  return (assets ?? []).filter((asset) => [
    canonicalUrl(asset?.rights?.sourceUrl),
    canonicalUrl(asset?.storage?.externalUrl)
  ].some((url) => url && candidateUrls.has(url))).map((asset) => asset.id);
}
function candidateKey(provider, asset) { const id = String(asset.provider_id ?? asset.id ?? '').trim(); if (id) return `${provider}:${id}`; const source = canonicalUrl(asset.source_url) || canonicalUrl(bestMediaUrl(asset.files)); return source ? `${provider}:${createHash('sha256').update(source).digest('hex').slice(0, 20)}` : ''; }
function canonicalUrl(value) { if (!value || typeof value !== 'string') return ''; try { const url = new URL(value); url.hash = ''; for (const key of [...url.searchParams.keys()]) if (/^(utm_|auto$|cs$|fit$|h$|w$|ixid$)/i.test(key)) url.searchParams.delete(key); return url.toString(); } catch { return ''; } }
function bestMediaUrl(files) { if (Array.isArray(files)) return files.find((item) => item?.url)?.url ?? ''; if (!files || typeof files !== 'object') return ''; for (const key of ['original','large','medium','small']) { const value = files[key]; if (typeof value === 'string') return value; if (value?.url) return value.url; } return ''; }
function techScore(asset, type, orientation) { let score = 0; const width = Number(asset.width) || 0; const height = Number(asset.height) || 0; const actual = asset.orientation || (height > width ? 'vertical' : width > height ? 'horizontal' : 'square'); if (actual === orientation) score += 25; else if (actual === 'square') score += 10; const short = width && height ? Math.min(width, height) : 0; if (short >= 1080) score += 30; else if (short >= 720) score += 22; else if (short >= 480) score += 12; if (asset.preview_url) score += 10; if (asset.source_url) score += 10; if (asset.creator) score += 5; if (type === 'video') { const duration = Number(asset.duration_seconds) || 0; if (duration >= 3 && duration <= 20) score += 20; else if (duration >= 2 && duration <= 30) score += 15; else if (duration) score += 7; } else { const pixels = width * height; if (pixels >= 2_000_000) score += 20; else if (pixels >= 1_000_000) score += 15; else if (pixels) score += 7; } return Math.min(100, score); }
function readFreshPixabayCache(file) { if (!fs.existsSync(file)) return null; try { const stat = fs.statSync(file); const entry = readJson(file); if (entry?.provider !== 'pixabay' || !Array.isArray(entry?.result?.assets)) return null; if (Date.now() - stat.mtimeMs >= PIXABAY_CACHE_MS) return null; if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return null; return entry; } catch { return null; } }
function defaultSearchers() { return { pexels: searchPexels, pixabay: searchPixabay, unsplash: searchUnsplash, openverse: searchOpenverse, wikimedia: searchWikimedia }; }
function providerLabel(value) { return ({ pexels:'Pexels', pixabay:'Pixabay', unsplash:'Unsplash', openverse:'Openverse', wikimedia:'Wikimedia Commons' })[value] ?? value; }
function safeName(value, max = 90) { return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) || 'Skriptprojekt'; }
function writeShortcut(file, url) { fs.writeFileSync(file, `[InternetShortcut]\nURL=${String(url).replace(/[\r\n]/g, '')}\n`); }
function csvCell(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function runScript(root, script, args, envOverrides = {}) { const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', shell: false, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, ...envOverrides } }); const output = `${result.stdout || ''}${result.stderr || ''}`.trim(); if (result.status !== 0) throw new Error(output || `${script} ist fehlgeschlagen.`); return output; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function requireText(value, label, min, max) { if (typeof value !== 'string') throw new Error(`${label} muss Text sein.`); const text = value.trim(); if (text.length < min || text.length > max) throw new Error(`${label} muss zwischen ${min} und ${max} Zeichen lang sein.`); if (/[\u0000-\u001F\u007F]/.test(text)) throw new Error(`${label} enthält ungültige Zeichen.`); return text; }
function member(value, allowed, label) { const normalized = String(value ?? '').trim(); if (!allowed.includes(normalized)) throw new Error(`${label} ist ungültig.`); return normalized; }
function integer(value, min, max, label) { const number = Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`); return number; }
async function readBody(request, limit) { const contentType = String(request.headers['content-type'] || '').split(';')[0].trim(); if (contentType !== 'application/json') throw new Error('Content-Type muss application/json sein.'); const chunks = []; let size = 0; for await (const chunk of request) { size += chunk.length; if (size > limit) throw new Error('Anfrage ist zu groß.'); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new Error('JSON konnte nicht gelesen werden.'); } }
function sameOrigin(request) { const origin = request.headers.origin; if (!origin) return true; try { const parsed = new URL(origin); return parsed.protocol === 'http:' && parsed.host === request.headers.host; } catch { return false; } }
function isLoopback(address) { return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address || ''); }
function setHeaders(response) { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer'); }
function sendJson(response, status, value) { response.statusCode = status; response.end(`${JSON.stringify(value, null, 2)}\n`); return true; }
function message(error) { return error instanceof Error ? error.message : String(error); }
