import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const [commandRaw, ...rest] = process.argv.slice(2);
const command = commandRaw || 'auto';
const args = parseArgs(rest);
if (command === 'help' || args.help) { help(); process.exit(0); }
const projectId = slug(args.project || '');
if (!projectId) fail('--project ist erforderlich.');
const projectDir = path.join(root, 'projects', projectId);
const catalog = readJson(path.join(root, 'catalog', 'assets.json'));
const materialization = readOptional(path.join(projectDir, 'materialization.json'));
const qc = readOptional(path.join(projectDir, 'visual-qc.json'));
const shotPlan = readJson(path.join(projectDir, 'shot-plan.json'));
const bindingFile = path.join(projectDir, 'beat-bindings.json');
const bindings = fs.existsSync(bindingFile) ? readJson(bindingFile) : {
  version: 1,
  projectId,
  generatedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  beats: []
};

if (command === 'auto') autoBind();
else if (command === 'set') setBinding();
else if (command === 'check') checkBindings();
else if (command === 'show') process.stdout.write(`${JSON.stringify(bindings, null, 2)}\n`);
else fail(`Unbekannter Befehl: ${command}`);

function autoBind() {
  let added = 0;
  for (const shot of shotPlan.shots || []) {
    if (bindingFor(shot.id)?.assetId) continue;
    const beat = materialization?.beats?.find((item) => item.id === shot.id);
    if (!beat?.selectedCandidateId) continue;
    const candidate = beat.candidates?.find((item) => item.candidateId === beat.selectedCandidateId);
    if (!candidate) continue;
    const qcBeat = qc?.beats?.find((item) => item.id === shot.id);
    const qcCandidate = qcBeat?.candidates?.find((item) => item.candidateId === candidate.candidateId);
    if (qcCandidate?.status === 'blocked') continue;
    const asset = findCatalogAssetForCandidate(candidate);
    if (!asset || !assetReady(asset)) continue;
    upsert({
      beatId: shot.id,
      assetId: asset.id,
      candidateId: candidate.candidateId,
      sourceUrl: candidate.sourceUrl || asset.rights?.sourceUrl || null,
      qcScore: qcCandidate?.score ?? null,
      status: 'bound-approved-asset',
      boundAt: new Date().toISOString(),
      bindingMode: 'auto-source-match'
    });
    added++;
  }
  save();
  console.log(`Auto-Bind: ${added} neue Bindings. ${bindings.beats.filter((x) => x.assetId).length}/${shotPlan.shots.length} Beats gebunden.`);
  console.log('Nicht gebundene Beats benötigen Import/Review oder phase1:bind set.');
}

function setBinding() {
  const beatId = String(args.beat || '').trim();
  const assetId = String(args.asset || '').trim();
  if (!beatId || !assetId) fail('set benötigt --beat und --asset.');
  if (!(shotPlan.shots || []).some((item) => item.id === beatId)) fail(`Beat unbekannt: ${beatId}`);
  const asset = catalog.assets.find((item) => item.id === assetId);
  if (!asset) fail(`Asset nicht gefunden: ${assetId}`);
  validateReady(asset);
  const qcBeat = qc?.beats?.find((item) => item.id === beatId);
  const beat = materialization?.beats?.find((item) => item.id === beatId);
  const sourceUrl = asset.rights?.sourceUrl || null;
  const candidate = beat?.candidates?.find((item) => canonical(item.sourceUrl) && canonical(item.sourceUrl) === canonical(sourceUrl));
  const qcCandidate = candidate ? qcBeat?.candidates?.find((item) => item.candidateId === candidate.candidateId) : null;
  if (qcCandidate?.status === 'blocked' && args.force !== 'true') fail(`QC blockiert ${candidate.candidateId}. Nur nach bewusster Prüfung mit --force true überschreiben.`);
  upsert({
    beatId,
    assetId,
    candidateId: candidate?.candidateId || null,
    sourceUrl,
    qcScore: qcCandidate?.score ?? null,
    status: 'bound-approved-asset',
    boundAt: new Date().toISOString(),
    bindingMode: 'explicit'
  });
  save();
  console.log(`${beatId} → ${assetId} gebunden.`);
}

function checkBindings() {
  const errors = [];
  const warnings = [];
  for (const shot of shotPlan.shots || []) {
    const binding = bindingFor(shot.id);
    if (!binding?.assetId) { errors.push(`${shot.id}: kein Asset gebunden.`); continue; }
    const asset = catalog.assets.find((item) => item.id === binding.assetId);
    if (!asset) { errors.push(`${shot.id}: Asset ${binding.assetId} fehlt im Katalog.`); continue; }
    if (asset.status !== 'approved') errors.push(`${shot.id}: Asset ${asset.id} ist ${asset.status}, nicht approved.`);
    if (!asset.rights?.usageScopes?.includes('youtube')) errors.push(`${shot.id}: Asset ${asset.id} ist nicht für youtube freigegeben.`);
    if (['unknown', 'restricted'].includes(asset.rights?.licenseStatus)) errors.push(`${shot.id}: Asset ${asset.id} hat ${asset.rights.licenseStatus}-Rechte.`);
    const qcBeat = qc?.beats?.find((item) => item.id === shot.id);
    const matchingQc = qcBeat?.candidates?.find((item) => item.file && asset.storage?.path && normalizedPath(asset.storage.path) === normalizedPath(item.file));
    if (matchingQc?.status === 'blocked') errors.push(`${shot.id}: Visual QC blockiert das gebundene Medium.`);
    if (!matchingQc && qcBeat?.candidates?.length) warnings.push(`${shot.id}: gebundenes Asset konnte keinem QC-Download eindeutig zugeordnet werden.`);
  }
  if (warnings.length) warnings.forEach((item) => console.warn(`WARN ${item}`));
  if (errors.length) { errors.forEach((item) => console.error(`- ${item}`)); fail(`Phase-1-Binding NICHT fertig (${errors.length} Fehler).`); }
  console.log(`Phase-1-Binding OK: ${shotPlan.shots.length} Beats besitzen approved YouTube-Assets.`);
}

function findCatalogAssetForCandidate(candidate) {
  const targetUrl = canonical(candidate.sourceUrl);
  if (!targetUrl) return null;
  const exact = catalog.assets.filter((asset) => canonical(asset.rights?.sourceUrl) === targetUrl);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact.find(assetReady) || exact[0];
  return null;
}
function assetReady(asset) { return asset.status === 'approved' && asset.rights?.usageScopes?.includes('youtube') && !['unknown', 'restricted'].includes(asset.rights?.licenseStatus); }
function validateReady(asset) {
  if (asset.status !== 'approved') fail(`Asset ${asset.id} ist nicht approved.`);
  if (!asset.rights?.usageScopes?.includes('youtube')) fail(`Asset ${asset.id} ist nicht für youtube freigegeben.`);
  if (['unknown', 'restricted'].includes(asset.rights?.licenseStatus)) fail(`Asset ${asset.id} hat ${asset.rights.licenseStatus}-Rechte.`);
}
function upsert(value) {
  const index = bindings.beats.findIndex((item) => item.beatId === value.beatId);
  if (index >= 0) bindings.beats[index] = { ...bindings.beats[index], ...value };
  else bindings.beats.push(value);
  bindings.beats.sort((a, b) => String(a.beatId).localeCompare(String(b.beatId)));
}
function bindingFor(beatId) { return bindings.beats.find((item) => item.beatId === beatId); }
function save() { bindings.updatedAt = new Date().toISOString(); fs.writeFileSync(bindingFile, `${JSON.stringify(bindings, null, 2)}\n`); }
function canonical(value) { try { const url = new URL(value); url.hash = ''; for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key); return url.toString().replace(/\/$/, ''); } catch { return null; } }
function normalizedPath(value) { return String(value || '').replace(/\\/g, '/').replace(/^\.\//, ''); }
function readOptional(file) { return fs.existsSync(file) ? readJson(file) : null; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { fail(`JSON ungültig: ${path.relative(root, file)} – ${error.message}`); } }
function safeName(value) { return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
function slug(value) { return safeName(value); }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i++) { const token = values[i]; if (!token.startsWith('--')) fail(`Unbekanntes Argument: ${token}`); const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (key === 'help') { result.help = true; continue; } const next = values[i + 1]; if (!next || next.startsWith('--')) fail(`Wert für ${token} fehlt.`); result[key] = next; i++; } return result; }
function fail(message) { console.error(message); process.exit(1); }
function help() { console.log(`Phase-1 Asset Binding\n\nAutomatisch bereits importierte/approved Assets per Source-URL binden:\n  npm run phase1:bind -- auto --project <id>\n\nExplizit binden:\n  npm run phase1:bind -- set --project <id> --beat b03 --asset VAH-XXXXXXXX\n\nGate prüfen:\n  npm run phase1:bind -- check --project <id>\n\nNur approved Assets mit YouTube-Scope und geklärten Rechten können gebunden werden.`); }
