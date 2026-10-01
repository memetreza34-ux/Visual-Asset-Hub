const SHOTS = [
  { id: 'wide', phrase: 'wide establishing shot, environmental context' },
  { id: 'medium', phrase: 'medium documentary shot, natural body language' },
  { id: 'close-up', phrase: 'close-up documentary detail, shallow depth of field' },
  { id: 'detail', phrase: 'tight detail shot, tactile realistic textures' },
  { id: 'pov', phrase: 'natural point-of-view composition, believable perspective' },
  { id: 'over-shoulder', phrase: 'over-the-shoulder documentary composition' }
];

const REAL_EVIDENCE_PATTERNS = [
  { regex: /\b(screenshot|screen recording|website|webseite|app interface|benutzeroberfl[aä]che|dashboard|original document|originaldokument|document|dokument|newspaper|zeitung|chart source|quellenchart)\b/i, reason: 'original-interface-or-document', type: 'real-image' },
  { regex: /\b(news footage|nachrichtenaufnahme|press conference|pressekonferenz|protest|demonstration|election|wahl|live event|aktuelles ereignis|current event|match|spielszene|tournament|turnier)\b/i, reason: 'real-event-authenticity', type: 'real-video' },
  { regex: /\b(logo|brand|marke|product shot|produktfoto|exact product|konkretes produkt|iphone|macbook|tesla|playstation|nvidia|openai|youtube|tiktok|instagram)\b/i, reason: 'exact-brand-or-product', type: 'real-image' },
  { regex: /\b(original photo|originalfoto|archival photo|archivfoto|archive footage|archivaufnahme|historical evidence|historischer beleg|beweisfoto)\b/i, reason: 'historical-evidence', type: 'real-image' },
  { regex: /\b(exact location|konkreter ort|landmark|sehensw[uü]rdigkeit|brandenburger tor|eiffelturm|white house|wei[sß]es haus)\b/i, reason: 'identifiable-real-location', type: 'real-image' }
];

const MOTION_PATTERNS = [
  /\b(driving|f[aä]hrt|running|rennt|crowd moving|menschenmenge|machine operating|maschine l[aä]uft|assembly line|flie[sß]band|sports action|sportaktion|waves crashing|wellen|fire burning|feuer|train moving|zug f[aä]hrt|traffic|verkehr|factory production|produktion)\b/i
];

const PHOTOREAL_BASE = [
  'photorealistic documentary photography',
  'believable present-day environment',
  'natural practical lighting',
  'realistic human anatomy and proportions',
  'authentic materials and textures',
  'candid unstaged moment',
  'subtle cinematic depth, not glossy advertising',
  'physically plausible scene',
  'no text, no captions, no watermark, no visible logos unless explicitly required',
  'no sci-fi holograms unless the subject truly requires them',
  'avoid plastic skin, exaggerated expressions, extra fingers, malformed hands, duplicated people and impossible objects'
].join(', ');

export function splitIntoVisualBeats(text, { maxWordsPerBeat = 24 } = {}) {
  const source = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!source) throw new Error('text ist erforderlich.');
  if (!Number.isInteger(maxWordsPerBeat) || maxWordsPerBeat < 8 || maxWordsPerBeat > 60) {
    throw new Error('maxWordsPerBeat muss zwischen 8 und 60 liegen.');
  }

  const sentences = source
    .split(/(?<=[.!?])\s+|\s*[;:]\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const beats = [];
  for (const sentence of sentences) {
    const clauses = sentence.split(/\s+(?:aber|doch|während|waehrend|wobei|und gleichzeitig|jedoch|because|while|however)\s+/i);
    for (const clause of clauses) {
      const words = clause.trim().split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      for (let i = 0; i < words.length; i += maxWordsPerBeat) {
        const chunk = words.slice(i, i + maxWordsPerBeat).join(' ').trim();
        if (chunk) beats.push({ id: `beat-${String(beats.length + 1).padStart(3, '0')}`, text: chunk });
      }
    }
  }
  return beats;
}

export function classifyVisualSource(text, { preferMotionBroll = true } = {}) {
  const value = String(text ?? '').trim();
  for (const rule of REAL_EVIDENCE_PATTERNS) {
    if (rule.regex.test(value)) {
      return {
        mode: 'real-first',
        preferredAsset: rule.type,
        reason: rule.reason,
        aiAllowed: false
      };
    }
  }
  if (preferMotionBroll && MOTION_PATTERNS.some((pattern) => pattern.test(value))) {
    return {
      mode: 'real-first',
      preferredAsset: 'real-video',
      reason: 'authentic-motion-broll',
      aiAllowed: true
    };
  }
  return {
    mode: 'ai-first',
    preferredAsset: 'ai-image',
    reason: 'generatable-realistic-scene',
    aiAllowed: true
  };
}

export function buildAiImagePrompt({ beatText, shot, orientation = 'horizontal', context = '' }) {
  const shotInfo = SHOTS.find((entry) => entry.id === shot) ?? SHOTS[0];
  const framing = orientation === 'vertical'
    ? 'vertical 9:16 composition, strong foreground-background separation, mobile-safe framing'
    : orientation === 'square'
      ? 'square 1:1 composition, balanced central framing'
      : 'horizontal 16:9 composition, cinematic documentary framing';

  return [
    `Create a realistic visual for this narration idea: "${String(beatText).trim()}".`,
    context ? `Broader context: "${String(context).trim()}".` : '',
    shotInfo.phrase,
    framing,
    PHOTOREAL_BASE,
    'The image must look like a frame from a high-quality factual documentary rather than AI artwork.'
  ].filter(Boolean).join(' ');
}

export function buildStockQuery(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .replace(/\b(der|die|das|den|dem|des|ein|eine|einer|einem|einen|und|oder|aber|dass|ist|sind|wird|werden|the|a|an|and|or|that|is|are)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 10)
    .join(' ');
}

export function planAiFirstVisuals({
  text,
  orientation = 'horizontal',
  imagesPerBeat = 4,
  maxWordsPerBeat = 24,
  preferMotionBroll = true
}) {
  if (!['horizontal', 'vertical', 'square'].includes(orientation)) {
    throw new Error('orientation muss horizontal, vertical oder square sein.');
  }
  if (!Number.isInteger(imagesPerBeat) || imagesPerBeat < 1 || imagesPerBeat > SHOTS.length) {
    throw new Error(`imagesPerBeat muss zwischen 1 und ${SHOTS.length} liegen.`);
  }

  const beats = splitIntoVisualBeats(text, { maxWordsPerBeat });
  const assets = [];

  for (const beat of beats) {
    const decision = classifyVisualSource(beat.text, { preferMotionBroll });
    if (decision.mode === 'ai-first') {
      for (let i = 0; i < imagesPerBeat; i += 1) {
        const shot = SHOTS[i % SHOTS.length];
        assets.push({
          id: `${beat.id}-ai-${String(i + 1).padStart(2, '0')}`,
          beat_id: beat.id,
          source_mode: 'ai-generated',
          asset_type: 'image',
          shot: shot.id,
          orientation,
          priority: i === 0 ? 'primary' : 'alternate',
          prompt: buildAiImagePrompt({ beatText: beat.text, shot: shot.id, orientation, context: text }),
          negative_guidance: 'No text overlays, watermarks, malformed anatomy, extra limbs, duplicated subjects, fake UI gibberish, impossible lighting or gratuitous futuristic holograms.'
        });
      }
    } else {
      assets.push({
        id: `${beat.id}-real-01`,
        beat_id: beat.id,
        source_mode: 'stock-or-real',
        asset_type: decision.preferredAsset === 'real-video' ? 'video' : 'image',
        orientation,
        priority: 'primary',
        reason: decision.reason,
        stock_query: buildStockQuery(beat.text),
        ai_fallback_allowed: decision.aiAllowed
      });
      if (decision.aiAllowed) {
        const shot = SHOTS[0];
        assets.push({
          id: `${beat.id}-ai-fallback-01`,
          beat_id: beat.id,
          source_mode: 'ai-generated',
          asset_type: 'image',
          shot: shot.id,
          orientation,
          priority: 'fallback',
          prompt: buildAiImagePrompt({ beatText: beat.text, shot: shot.id, orientation, context: text }),
          negative_guidance: 'No text overlays, watermarks, malformed anatomy, extra limbs, duplicated subjects or impossible motion.'
        });
      }
    }
  }

  const aiCount = assets.filter((asset) => asset.source_mode === 'ai-generated').length;
  const realCount = assets.filter((asset) => asset.source_mode === 'stock-or-real').length;
  return {
    version: 1,
    strategy: 'ai-first',
    rules: {
      default: 'Generate realistic AI images whenever the scene can be represented credibly as a still image.',
      real_material_only_when: ['authentic real-world evidence is required', 'exact interfaces/documents/brands/locations are required', 'real motion B-roll is clearly superior'],
      visual_density: 'Create multiple shot variants per AI-generatable beat instead of holding one image too long.'
    },
    input: { text, orientation, imagesPerBeat, maxWordsPerBeat, preferMotionBroll },
    summary: {
      beats: beats.length,
      planned_assets: assets.length,
      ai_images: aiCount,
      real_or_stock_assets: realCount,
      ai_share_percent: assets.length ? Math.round((aiCount / assets.length) * 100) : 0
    },
    beats,
    assets
  };
}

export const visualPlannerConstants = { SHOTS, REAL_EVIDENCE_PATTERNS, MOTION_PATTERNS };
