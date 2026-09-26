import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

export async function visionRerankCandidates({
  scene,
  candidates,
  apiKey = process.env.OPENAI_API_KEY || readLocalEnvValue('OPENAI_API_KEY'),
  model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_PHASE1_MODEL || readLocalEnvValue('OPENAI_VISION_MODEL') || readLocalEnvValue('OPENAI_PHASE1_MODEL') || 'gpt-5.5',
  fetchImpl = globalThis.fetch,
  maxCandidates = 8
} = {}) {
  if (!apiKey || !Array.isArray(candidates) || !candidates.length || typeof fetchImpl !== 'function') {
    return {applied: false, reason: !apiKey ? 'no-api-key' : 'no-candidates', scores: new Map()};
  }
  const usable = candidates.filter((candidate) => isHttpsImage(candidate.previewUrl)).slice(0, maxCandidates);
  if (!usable.length) return {applied: false, reason: 'no-image-previews', scores: new Map()};

  const content = [{
    type: 'input_text',
    text: buildPrompt(scene, usable)
  }];
  usable.forEach((candidate, index) => {
    content.push({type: 'input_text', text: `C${index + 1} — ${candidate.provider} — ${candidate.type} — ${candidate.title}`});
    content.push({type: 'input_image', image_url: candidate.previewUrl, detail: 'low'});
  });

  const response = await fetchImpl(RESPONSES_URL, {
    method: 'POST',
    headers: {Authorization: `Bearer ${String(apiKey).trim()}`, 'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({
      model,
      store: false,
      input: [{role: 'user', content}],
      max_output_tokens: 2200,
      text: {
        format: {
          type: 'json_schema',
          name: 'documentary_visual_rerank',
          strict: true,
          schema: {
            type: 'object', additionalProperties: false, required: ['results'],
            properties: {
              results: {
                type: 'array', minItems: usable.length, maxItems: usable.length,
                items: {
                  type: 'object', additionalProperties: false,
                  required: ['id','visibleRelevance','exactness','duplicateGroup','reason'],
                  properties: {
                    id: {type: 'string'},
                    visibleRelevance: {type: 'integer', minimum: 0, maximum: 100},
                    exactness: {type: 'string', enum: ['exact','contextual','symbolic','mismatch']},
                    duplicateGroup: {type: 'string'},
                    reason: {type: 'string'}
                  }
                }
              }
            }
          }
        }
      }
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return {applied: false, reason: `api-${response.status}${detail ? `:${detail.slice(0, 180)}` : ''}`, scores: new Map()};
  }
  const payload = await response.json();
  const raw = extractOutputText(payload);
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return {applied: false, reason: 'invalid-json', scores: new Map()}; }
  const scores = new Map();
  for (const item of parsed.results ?? []) {
    const match = /^C(\d+)$/i.exec(String(item.id || '').trim());
    if (!match) continue;
    const index = Number(match[1]) - 1;
    const candidate = usable[index];
    if (!candidate) continue;
    scores.set(candidate.key, {
      visibleRelevance: clamp(Number(item.visibleRelevance) || 0, 0, 100),
      exactness: item.exactness,
      duplicateGroup: String(item.duplicateGroup || '').trim().slice(0, 80),
      reason: String(item.reason || '').trim().slice(0, 280),
      model
    });
  }
  return {applied: scores.size > 0, reason: scores.size ? 'ok' : 'empty-results', scores, checked: usable.length, model};
}

function buildPrompt(scene, candidates) {
  return `Du bist der visuelle Qualitätsprüfer einer sachlichen YouTube-Dokumentation. Bewerte NUR das, was auf jedem Vorschaubild tatsächlich sichtbar ist. Metadaten und Dateititel sind kein Beweis.\n\nGESPROCHENER SZENENTEXT:\n${String(scene?.originalText || '')}\n\nVISUELLE AUFGABE:\n${String(scene?.visualIntent || '')}\n\nBewerte ${candidates.length} Kandidaten. visibleRelevance 0-100: 90+ zeigt die konkrete Aussage/Person/Ort/Ereignis sehr passend; 75-89 stark; 55-74 nur Kontext; unter 55 unpassend. exactness = exact/contextual/symbolic/mismatch. Wenn mehrere Bilder praktisch dasselbe Motiv zeigen, gib ihnen exakt dieselbe kurze duplicateGroup. Unterschiedliche Motive bekommen unterschiedliche Gruppen. Bei Video-Kandidaten siehst du nur das Vorschaubild; bewerte daher nur dessen sichtbare Relevanz, nicht die unbekannte Bewegung.`;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  for (const item of payload?.output ?? []) for (const content of item?.content ?? []) if (content?.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
  return parts.join('\n').trim();
}
function isHttpsImage(value) { try { const url = new URL(String(value || '')); return url.protocol === 'https:'; } catch { return false; } }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function readLocalEnvValue(key, envFile = path.resolve(process.cwd(), '.env')) {
  try {
    if (!fs.existsSync(envFile) || !fs.statSync(envFile).isFile()) return '';
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1 || trimmed.slice(0, separator).trim() !== key) continue;
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      return value;
    }
  } catch {}
  return '';
}
