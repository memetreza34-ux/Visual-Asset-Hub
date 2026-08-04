import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const strict = args.strict === 'true';
const timeoutMs = integer(args.timeout || '10000', 1000, 60000, 'timeout');
const concurrency = integer(args.concurrency || '4', 1, 12, 'concurrency');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog/assets.json'), 'utf8'));
const targets = collectTargets(catalog.assets ?? []);
const results = [];

for (let index = 0; index < targets.length; index += concurrency) {
  const batch = targets.slice(index, index + concurrency);
  results.push(...await Promise.all(batch.map((target) => checkTarget(target, timeoutMs))));
}

const failures = results.filter((result) => !result.ok);
const report = {
  generatedAt: new Date().toISOString(),
  checked: results.length,
  reachable: results.length - failures.length,
  unreachable: failures.length,
  strict,
  results
};

const outputDir = path.join(root, 'reports');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'external-link-health.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`Externe Links geprüft: ${report.reachable}/${report.checked} erreichbar, ${report.unreachable} problematisch.`);
for (const failure of failures) {
  console.warn(`WARNUNG ${failure.assetId} ${failure.kind}: ${failure.status ?? failure.error} – ${failure.url}`);
}
if (strict && failures.length) process.exitCode = 1;

function collectTargets(assets) {
  const unique = new Map();
  for (const asset of assets) {
    add(asset.id, 'original', asset.storage?.externalUrl);
    add(asset.id, 'preview', asset.storage?.previewUrl);
    add(asset.id, 'source', asset.rights?.sourceUrl);
    add(asset.id, 'license', asset.rights?.licenseUrl);
  }
  return [...unique.values()];

  function add(assetId, kind, url) {
    if (!url) return;
    const key = `${kind}:${url}`;
    const existing = unique.get(key);
    if (existing) {
      existing.assetIds.push(assetId);
      return;
    }
    unique.set(key, { assetId, assetIds: [assetId], kind, url });
  }
}

async function checkTarget(target, timeout) {
  const startedAt = Date.now();
  try {
    let response = await request(target.url, 'HEAD', timeout);
    if ([400, 403, 405].includes(response.status)) {
      response = await request(target.url, 'GET', timeout, { Range: 'bytes=0-0' });
    }
    return {
      ...target,
      ok: response.ok || response.status === 206,
      status: response.status,
      contentType: response.headers.get('content-type'),
      finalUrl: response.url,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      ...target,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt
    };
  }
}

async function request(url, method, timeout, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      method,
      headers: { 'User-Agent': 'Visual-Asset-Hub-Link-Check/0.3', ...headers },
      redirect: 'follow',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith('--')) throw new Error(`Unbekanntes Argument: ${token}`);
    const [key, inline] = token.slice(2).split('=', 2);
    const next = values[index + 1];
    result[key] = inline ?? (next && !next.startsWith('--') ? values[++index] : 'true');
  }
  return result;
}

function integer(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`);
  }
  return number;
}
