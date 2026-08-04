import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const assetIdPattern = /^VAH-[A-Z0-9]{8}$/;
const decisions = new Set(['approve', 'restrict', 'archive', 'send-back']);
const platforms = new Set(['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'website', 'app', 'presentation', 'client-work', 'other']);

export function createLocalAdminApi({ root = process.cwd(), token = randomBytes(24).toString('hex') } = {}) {
  let busy = false;

  return {
    token,
    async handle(request, response, url) {
      if (!url.pathname.startsWith('/api/')) return false;
      setApiHeaders(response);

      if (!isLoopback(request.socket.remoteAddress)) {
        return sendJson(response, 403, { error: 'Die Verwaltungs-API ist ausschließlich lokal erreichbar.' });
      }

      if (request.method === 'GET' && url.pathname === '/api/health') {
        return sendJson(response, 200, readHealth(root, token));
      }

      if (request.method !== 'POST') {
        return sendJson(response, 405, { error: 'Nur POST ist für diese API-Aktion erlaubt.' });
      }

      if (!sameOrigin(request)) {
        return sendJson(response, 403, { error: 'Ungültiger Ursprung.' });
      }
      if (request.headers['x-vah-token'] !== token) {
        return sendJson(response, 403, { error: 'Ungültiges lokales Verwaltungstoken.' });
      }
      if (busy) {
        return sendJson(response, 409, { error: 'Eine andere Katalogänderung läuft bereits.' });
      }

      let payload;
      try {
        payload = await readBody(request, 64 * 1024);
      } catch (error) {
        return sendJson(response, 400, { error: error instanceof Error ? error.message : 'Ungültige Anfrage.' });
      }

      busy = true;
      try {
        if (url.pathname === '/api/review') {
          const input = validateReviewPayload(payload);
          const args = ['--id', input.assetId, '--decision', input.decision, '--reviewer', input.reviewer];
          if (input.notes) args.push('--notes', input.notes);
          if (input.quality) args.push('--quality', String(input.quality));
          const result = runScript(root, 'scripts/review-asset.mjs', args);
          return sendJson(response, 200, { ok: true, action: 'review', output: result, health: readHealth(root, token) });
        }

        if (url.pathname === '/api/usage') {
          const input = validateUsagePayload(payload);
          const args = ['--asset', input.assetId, '--project', input.project, '--platform', input.platform];
          if (input.title) args.push('--title', input.title);
          if (input.url) args.push('--url', input.url);
          if (input.notes) args.push('--notes', input.notes);
          const result = runScript(root, 'scripts/record-usage.mjs', args);
          return sendJson(response, 200, { ok: true, action: 'usage', output: result, health: readHealth(root, token) });
        }

        if (url.pathname === '/api/backup') {
          const result = runScript(root, 'scripts/catalog-backup.mjs', []);
          return sendJson(response, 200, { ok: true, action: 'backup', output: result });
        }

        if (url.pathname === '/api/attribution') {
          const project = requireText(payload?.project, 'project', 1, 120);
          const result = runScript(root, 'scripts/export-attribution.mjs', ['--project', project]);
          return sendJson(response, 200, { ok: true, action: 'attribution', output: result });
        }

        return sendJson(response, 404, { error: 'API-Aktion nicht gefunden.' });
      } catch (error) {
        return sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
      } finally {
        busy = false;
      }
    }
  };
}

export function validateReviewPayload(payload) {
  const assetId = requireAssetId(payload?.assetId);
  const decision = requireText(payload?.decision, 'decision', 1, 30);
  if (!decisions.has(decision)) throw new Error('decision muss approve, restrict, archive oder send-back sein.');
  const reviewer = requireText(payload?.reviewer, 'reviewer', 2, 120);
  const notes = optionalText(payload?.notes, 'notes', 2000);
  const quality = payload?.quality === undefined || payload?.quality === '' ? undefined : integer(payload.quality, 1, 5, 'quality');

  if (decision === 'approve') {
    const checklist = payload?.checklist;
    const required = ['contentViewed', 'peopleAndBrandsChecked', 'rightsChecked', 'contextChecked'];
    if (!checklist || required.some((key) => checklist[key] !== true)) {
      throw new Error('Vor der Freigabe müssen alle vier Prüfpunkte bestätigt werden.');
    }
  }
  if (decision === 'restrict' && !notes) throw new Error('Für eine Einschränkung ist eine Begründung erforderlich.');

  return { assetId, decision, reviewer, notes, quality };
}

export function validateUsagePayload(payload) {
  const assetId = requireAssetId(payload?.assetId);
  const project = requireText(payload?.project, 'project', 2, 120);
  const platform = requireText(payload?.platform, 'platform', 2, 40);
  if (!platforms.has(platform)) throw new Error(`Ungültige Plattform: ${platform}`);
  const title = optionalText(payload?.title, 'title', 160);
  const notes = optionalText(payload?.notes, 'notes', 1000);
  const url = optionalText(payload?.url, 'url', 2000);
  if (url) validateHttpUrl(url);
  return { assetId, project, platform, title, notes, url };
}

function readHealth(root, token) {
  const packageData = readJson(path.join(root, 'package.json'));
  const index = readJson(path.join(root, 'catalog/search-index.json'));
  return {
    ok: true,
    localAdmin: true,
    version: packageData.version,
    token,
    writable: canWrite(path.join(root, 'catalog')),
    assetCount: index.assetCount ?? index.records?.length ?? 0,
    reviewCount: index.reviewCount ?? 0,
    approvedCount: index.approvedCount ?? 0,
    totalUsageCount: index.totalUsageCount ?? 0,
    catalogUpdatedAt: index.catalogUpdatedAt ?? null
  };
}

function runScript(root, script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, VAH_LOCAL_ADMIN: '1' }
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status !== 0) throw new Error(output || `${script} ist fehlgeschlagen.`);
  return output.slice(-6000);
}

async function readBody(request, limit) {
  const contentType = String(request.headers['content-type'] || '').split(';')[0].trim();
  if (contentType !== 'application/json') throw new Error('Content-Type muss application/json sein.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Anfrage ist zu groß.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new Error('JSON konnte nicht gelesen werden.');
  }
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && parsed.host === request.headers.host;
  } catch {
    return false;
  }
}

function isLoopback(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address || '');
}

function setApiHeaders(response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
}

function sendJson(response, status, value) {
  response.statusCode = status;
  response.end(`${JSON.stringify(value, null, 2)}\n`);
  return true;
}

function requireAssetId(value) {
  const assetId = requireText(value, 'assetId', 12, 12);
  if (!assetIdPattern.test(assetId)) throw new Error('assetId muss dem Format VAH-XXXXXXXX entsprechen.');
  return assetId;
}

function requireText(value, label, min, max) {
  if (typeof value !== 'string') throw new Error(`${label} muss Text sein.`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new Error(`${label} muss zwischen ${min} und ${max} Zeichen lang sein.`);
  if (/\0|[\r\n]{3,}/.test(text)) throw new Error(`${label} enthält ungültige Zeichen.`);
  return text;
}

function optionalText(value, label, max) {
  if (value === undefined || value === null || value === '') return '';
  return requireText(String(value), label, 1, max);
}

function integer(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} muss zwischen ${min} und ${max} liegen.`);
  return number;
}

function validateHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error('url muss eine gültige HTTP(S)-URL sein.');
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function canWrite(directory) {
  try {
    fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
