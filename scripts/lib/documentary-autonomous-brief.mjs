import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {isDuplicateTopic, recentTopicsForPrompt} from './documentary-topic-registry.mjs';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
export const DEFAULT_PHASE1_MODEL = 'gpt-5.5';
export const DEFAULT_TARGET_DURATION_SECONDS = 150;
export const DEFAULT_MIN_WORDS = 320;
export const DEFAULT_MAX_WORDS = 400;

export async function generateAutonomousDocumentaryBrief({
  registry,
  targetDurationSeconds = DEFAULT_TARGET_DURATION_SECONDS,
  apiKey = process.env.OPENAI_API_KEY || readLocalEnvValue('OPENAI_API_KEY'),
  model = process.env.OPENAI_PHASE1_MODEL || readLocalEnvValue('OPENAI_PHASE1_MODEL') || DEFAULT_PHASE1_MODEL,
  fetchImpl = globalThis.fetch,
  maxAttempts = 4
} = {}) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('OPENAI_API_KEY fehlt. Autonome Phase 1 benötigt Recherche + Skripterstellung.');
  if (typeof fetchImpl !== 'function') throw new Error('fetch ist nicht verfügbar.');
  const duration = Number(targetDurationSeconds);
  if (!Number.isFinite(duration) || duration < 60 || duration > 900) throw new Error('targetDurationSeconds muss zwischen 60 und 900 liegen.');
  const targetWords = Math.round(duration * 2.35);
  const minWords = Math.max(120, Math.round(targetWords * 0.9));
  const maxWords = Math.round(targetWords * 1.12);
  const usedTopics = recentTopicsForPrompt(registry, 300);
  const rejected = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const prompt = buildPrompt({duration, targetWords, minWords, maxWords, usedTopics, rejected, attempt});
    const response = await fetchImpl(RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${String(apiKey).trim()}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        model,
        tools: [{type: 'web_search'}],
        tool_choice: 'required',
        input: prompt,
        max_output_tokens: 7000,
        text: {
          format: {
            type: 'json_schema',
            name: 'documentary_phase1_brief',
            strict: true,
            schema: documentaryBriefSchema()
          }
        }
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Autonome Phase-1-Recherche fehlgeschlagen (${response.status}).${detail ? ` ${detail.slice(0, 700)}` : ''}`);
    }

    const payload = await response.json();
    const raw = extractOutputText(payload);
    let brief;
    try {
      brief = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Phase-1-Modell lieferte kein lesbares JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    brief = normalizeBrief(brief, duration, model);
    const duplicate = isDuplicateTopic(registry, brief);
    const words = countWords(brief.script);
    const wordCountOk = words >= minWords && words <= maxWords;
    const hashtagCountOk = brief.publish.hashtags.length === 5;
    const sourceCountOk = brief.sources.length >= 3;

    if (!duplicate.duplicate && wordCountOk && hashtagCountOk && sourceCountOk) {
      return {
        ...brief,
        generation: {
          model,
          attempt,
          targetDurationSeconds: duration,
          targetWords,
          minWords,
          maxWords,
          actualWords: words,
          usedTopicCount: usedTopics.length,
          webResearchRequired: true
        }
      };
    }

    rejected.push({
      title: brief.title,
      reason: duplicate.duplicate
        ? `duplicate:${duplicate.existing?.title ?? 'unknown'}:${duplicate.similarity.toFixed(3)}`
        : !wordCountOk
          ? `word-count:${words}:expected-${minWords}-${maxWords}`
          : !hashtagCountOk
            ? `hashtags:${brief.publish.hashtags.length}`
            : `sources:${brief.sources.length}`
    });
  }

  throw new Error(`Nach ${maxAttempts} Versuchen konnte kein neues, gültiges Doku-Thema erzeugt werden.`);
}

function buildPrompt({duration, targetWords, minWords, maxWords, usedTopics, rejected, attempt}) {
  return `Du bist die autonome Phase 1 eines deutschsprachigen Faceless-Dokumentationskanals.\n\nAUFGABE\nWaehle SELBST ein einziges starkes neues Dokumentationsthema, recherchiere es mit der Websuche und schreibe daraus den finalen deutschen Sprechertext. Der Nutzer nennt KEIN Thema.\n\nZIELFORMAT\n- YouTube-Dokumentation, horizontal 16:9\n- Ziel-Laenge: ca. ${duration} Sekunden\n- Sprechertext: ${minWords}-${maxWords} Woerter, Ziel ca. ${targetWords}\n- sachlich, spannend, leicht verstaendlich, keine Fuellsaetze\n- starke ersten 1-2 Saetze als Hook, danach logisch erklaeren, klares Ende\n- keine Regieanweisungen, keine Quellenmarker, keine Ueberschriften im gesprochenen Skript\n\nTHEMENAUSWAHL\n- evergreen oder langfristig interessant\n- visuell gut mit Archivbildern, Karten, Fotos oder B-Roll darstellbar\n- bevorzuge Geschichte, Technik, Wissenschaft, Infrastruktur, Natur, ungewoehnliche Ereignisse, Systeme oder Alltagsphaenomene\n- kein reines Tagesgeschehen und kein Thema, das fast nur aus abstrakten Behauptungen besteht\n- Fakten muessen vor dem Schreiben im Web geprueft werden\n- keine bereits benutzten oder sehr aehnlichen Themen\n\nBEREITS BENUTZTE/RESERVIERTE THEMEN (${usedTopics.length})\n${usedTopics.length ? JSON.stringify(usedTopics) : 'Noch keine.'}\n\nIN DIESEM LAUF BEREITS ABGELEHNT\n${rejected.length ? JSON.stringify(rejected) : 'Keine.'}\n\nQUALITAET\n- Waehle einen klaren Blickwinkel statt eines viel zu breiten Oberthemas.\n- Trenne belegte Fakten von Spekulation; Spekulation gehoert nicht ins Skript.\n- Bevorzuge primaere oder institutionelle Quellen und serioese Sekundaerquellen.\n- Gib mindestens 3 konkrete Recherchequellen mit URL zurueck.\n- Der finale Skripttext muss alleine kopierbar sein.\n- Genau 5 Hashtags.\n- YouTube-Titel maximal ca. 95 Zeichen.\n- Thumbnail-Text 2-5 Woerter.\n\nDies ist Versuch ${attempt}. Antworte ausschliesslich im vorgegebenen JSON-Schema.`;
}

function documentaryBriefSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['title','topicKey','angle','category','script','researchSummary','sources','publish'],
    properties: {
      title: {type: 'string'},
      topicKey: {type: 'string'},
      angle: {type: 'string'},
      category: {type: 'string'},
      script: {type: 'string'},
      researchSummary: {type: 'string'},
      sources: {
        type: 'array',
        minItems: 3,
        maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title','url','publisher'],
          properties: {
            title: {type: 'string'},
            url: {type: 'string'},
            publisher: {type: 'string'}
          }
        }
      },
      publish: {
        type: 'object',
        additionalProperties: false,
        required: ['title','description','hashtags','tags','thumbnailText'],
        properties: {
          title: {type: 'string'},
          description: {type: 'string'},
          hashtags: {type: 'array', minItems: 5, maxItems: 5, items: {type: 'string'}},
          tags: {type: 'array', minItems: 5, maxItems: 25, items: {type: 'string'}},
          thumbnailText: {type: 'string'}
        }
      }
    }
  };
}

function normalizeBrief(value, duration, model) {
  const sources = uniqueByUrl(value.sources ?? []).map((source) => ({
    title: cleanLine(source.title),
    url: normalizeHttpUrl(source.url),
    publisher: cleanLine(source.publisher)
  })).filter((source) => source.url);
  const hashtags = unique((value.publish?.hashtags ?? []).map(hashtagify)).slice(0, 5);
  const tags = unique((value.publish?.tags ?? []).map(cleanLine).filter(Boolean)).slice(0, 25);
  return {
    title: cleanLine(value.title).slice(0, 160),
    topicKey: cleanLine(value.topicKey).slice(0, 160),
    angle: cleanLine(value.angle).slice(0, 280),
    category: cleanLine(value.category).slice(0, 80) || 'documentary',
    script: String(value.script ?? '').trim(),
    researchSummary: String(value.researchSummary ?? '').trim().slice(0, 3000),
    sources,
    publish: {
      title: cleanLine(value.publish?.title || value.title).slice(0, 95),
      description: stripHashtags(String(value.publish?.description ?? '').trim()),
      hashtags,
      tags,
      thumbnailText: cleanLine(value.publish?.thumbnailText).split(/\s+/).slice(0, 5).join(' ')
    },
    targetDurationSeconds: duration,
    generatedWith: model
  };
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  const joined = parts.join('\n').trim();
  if (!joined) throw new Error('Responses API lieferte keinen output_text-Inhalt.');
  return joined;
}

function countWords(value) {
  return (String(value).match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length;
}

function stripHashtags(value) {
  return String(value)
    .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hashtagify(value) {
  return String(value ?? '').replace(/^#+/, '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 40);
}

function cleanLine(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeHttpUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function uniqueByUrl(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const url = normalizeHttpUrl(value?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(value);
  }
  return result;
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const clean = String(value ?? '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

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
