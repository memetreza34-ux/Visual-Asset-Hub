const SHOTS = [
  { id: 'wide', phrase: 'wide establishing view with readable environmental context' },
  { id: 'medium', phrase: 'medium eye-level documentary framing with natural body language' },
  { id: 'close-up', phrase: 'close framing on the decisive human or object detail' },
  { id: 'detail', phrase: 'tight factual detail view with tactile materials and clear context' },
  { id: 'over-shoulder', phrase: 'over-the-shoulder view that clearly connects subject and task' },
  { id: 'pov', phrase: 'believable point-of-view framing with physically plausible perspective' }
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
  'factual documentary still',
  'believable present-day environment',
  'natural practical light sources',
  'realistic anatomy and proportions',
  'authentic materials, wear and textures',
  'physically plausible perspective and object placement',
  'restrained contrast, not glossy advertising',
  'no text unless the cover compiler explicitly supplies exact text',
  'no watermark or invented logos',
  'no gratuitous sci-fi holograms',
  'no plastic skin, extra fingers, malformed hands, duplicated people or impossible objects'
].join(', ');

const STOPWORDS = new Set('der die das den dem des ein eine einer einem einen und oder aber dass ist sind wird werden von mit auf im in am an zu zum zur für fuer als auch sich nicht nur bei aus durch über ueber unter vor nach the a an and or that is are of with for to'.split(/\s+/));

export function splitIntoVisualBeats(text, { maxWordsPerBeat = 16 } = {}) {
  const source = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!source) throw new Error('text ist erforderlich.');
  if (!Number.isInteger(maxWordsPerBeat) || maxWordsPerBeat < 8 || maxWordsPerBeat > 40) {
    throw new Error('maxWordsPerBeat muss zwischen 8 und 40 liegen.');
  }

  const sentences = source
    .split(/(?<=[.!?])\s+|\s*[;:]\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const beats = [];

  for (const sentence of sentences) {
    const clauses = sentence.split(/\s+(?:aber|doch|während|waehrend|wobei|jedoch|deshalb|dadurch|gleichzeitig|because|while|however|therefore|meanwhile)\s+/i);
    for (const clause of clauses) {
      const words = clause.trim().split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      for (let i = 0; i < words.length; i += maxWordsPerBeat) {
        const chunk = words.slice(i, i + maxWordsPerBeat).join(' ').trim();
        if (!chunk) continue;
        beats.push({
          id: `beat-${String(beats.length + 1).padStart(3, '0')}`,
          text: chunk,
          estimated_hold_seconds: estimateHoldSeconds(chunk)
        });
      }
    }
  }
  return beats;
}

export function estimateHoldSeconds(text, wordsPerSecond = 2.35) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.round(Math.min(9, Math.max(3.5, words / wordsPerSecond)) * 10) / 10;
}

export function classifyVisualSource(text, { preferMotionBroll = true } = {}) {
  const value = String(text ?? '').trim();
  for (const rule of REAL_EVIDENCE_PATTERNS) {
    if (rule.regex.test(value)) {
      return { mode: 'real-first', preferredAsset: rule.type, reason: rule.reason, aiAllowed: false };
    }
  }
  if (preferMotionBroll && MOTION_PATTERNS.some((pattern) => pattern.test(value))) {
    return { mode: 'real-first', preferredAsset: 'real-video', reason: 'authentic-motion-broll', aiAllowed: true };
  }
  return { mode: 'ai-first', preferredAsset: 'ai-image', reason: 'generatable-realistic-scene', aiAllowed: true };
}

export function inferVisualForm(text) {
  const value = String(text ?? '').toLowerCase();
  if (/\b(vergleich|gegenüber|gegenueber|versus| vs |unterschied|während|waehrend|compared|versus)\b/i.test(value)) return 'comparison';
  if (/\b(deshalb|dadurch|führt zu|fuehrt zu|verursacht|folge|wegen|because|therefore|causes|leads to)\b/i.test(value)) return 'cause-effect';
  if (/\b(zuerst|danach|anschließend|anschliessend|schritt|prozess|ablauf|first|then|next|process)\b/i.test(value)) return 'process-sequence';
  if (/\b(system|netzwerk|hierarchie|struktur|network|hierarchy)\b/i.test(value)) return 'system-hierarchy';
  if (/\b(innen|unter der oberfläche|unter der oberflaeche|querschnitt|inside|beneath|cutaway)\b/i.test(value)) return 'cutaway-section';
  if (/\b(mensch|person|arbeiter|mitarbeiter|angestellte|arzt|techniker|fahrer|student|people|person|worker|employee|doctor|technician|driver|student)\b/i.test(value)) return 'character-scene';
  if (/\b(stadt|landschaft|büro|buero|fabrik|bahnhof|straße|strasse|city|landscape|office|factory|station|street)\b/i.test(value)) return 'environment-overview';
  return 'object-focus';
}

export function createSceneCard({ beat, index = 0, orientation = 'horizontal', context = '', cover = false }) {
  const visualForm = inferVisualForm(beat.text);
  const shot = cover ? SHOTS[0] : SHOTS[index % SHOTS.length];
  const topicAnchor = extractTopicAnchor(beat.text);
  const composition = compositionFor(visualForm, orientation, cover);
  const card = {
    viewer_takeaway: `Immediately understand this spoken idea: ${beat.text}`,
    visual_purpose: cover
      ? 'Create a strong opening image that communicates the core tension or promise without adding unrelated spectacle.'
      : 'Turn this exact narration beat into one immediately readable visual idea; do not add people or objects merely to fill space.',
    topic_anchor: topicAnchor,
    visual_form: visualForm,
    visual_concept: cover
      ? `A high-impact factual documentary cover built around the concrete subject of this beat: ${beat.text}`
      : `A factual documentary visualization of this exact beat: ${beat.text}`,
    dominant_subject: `The single person, object, place or relationship that most directly represents: ${topicAnchor}`,
    action_state: `Show the exact action, condition or relationship implied by the narration instead of a generic pose.` ,
    composition,
    camera: shot.phrase,
    depth_plan: 'Keep one dominant foreground or midground subject, a readable environment, and only necessary background context; avoid collage-like clutter.',
    lighting_mood: 'Use believable practical light from the actual environment; mood may support the narration but must remain physically plausible and restrained.',
    supporting_elements: [],
    continuity_note: 'Preserve recurring people, locations, props, clothing and base colors whenever they reappear; vary camera and composition when the story benefit is clear.',
    accuracy_note: 'Do not invent factual evidence, exact interfaces, logos, documents or event footage. Keep uncertain or generic details visually generic.',
    orientation,
    planned_hold_seconds: beat.estimated_hold_seconds ?? estimateHoldSeconds(beat.text),
    prompt_qc_score: 0
  };
  card.prompt_qc_score = scoreSceneCard(card);
  card.prompt = compileSceneCardPrompt(card, { context, cover });
  return card;
}

export function scoreSceneCard(card) {
  const required = ['viewer_takeaway','visual_purpose','topic_anchor','visual_form','visual_concept','dominant_subject','action_state','composition','camera','depth_plan','lighting_mood','continuity_note','accuracy_note'];
  const filled = required.filter((key) => String(card?.[key] ?? '').trim()).length;
  let score = 7 + (filled / required.length) * 3;
  const haystack = required.map((key) => String(card?.[key] ?? '')).join(' ').toLowerCase();
  if (/\b(epic|ultra detailed|hyper detailed|masterpiece|award-winning|8k|bokeh)\b/i.test(haystack)) score -= 1;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export function compileSceneCardPrompt(card, { context = '', cover = false } = {}) {
  const framing = card.orientation === 'vertical'
    ? 'Vertical 9:16 frame with mobile-safe subject placement.'
    : card.orientation === 'square'
      ? 'Square 1:1 frame with balanced readable spacing.'
      : 'Horizontal 16:9 frame with clear documentary staging.';
  return [
    PHOTOREAL_BASE + '.',
    context ? `Broader video context: "${String(context).trim()}".` : '',
    `Viewer takeaway: ${card.viewer_takeaway}.`,
    `Visual concept: ${card.visual_concept}.`,
    `Dominant subject: ${card.dominant_subject}.`,
    `Action/state: ${card.action_state}`,
    `Composition: ${card.composition}`,
    `Camera: ${card.camera}.`,
    `Depth: ${card.depth_plan}`,
    `Lighting and mood: ${card.lighting_mood}`,
    `Continuity: ${card.continuity_note}`,
    `Accuracy: ${card.accuracy_note}`,
    framing,
    cover
      ? 'Reserve one calm high-contrast area for the exact cover text that will be inserted by the Flow compiler; do not invent any text now.'
      : 'No visible text, labels, letters, numbers, logos, watermarks or pseudo-writing anywhere in the image.'
  ].filter(Boolean).join(' ');
}

export function buildAiImagePrompt({ beatText, shot = 'wide', orientation = 'horizontal', context = '' }) {
  const beat = { text: String(beatText ?? '').trim(), estimated_hold_seconds: estimateHoldSeconds(beatText) };
  const shotIndex = Math.max(0, SHOTS.findIndex((item) => item.id === shot));
  return createSceneCard({ beat, index: shotIndex, orientation, context }).prompt;
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

export function planAiFirstVisuals({ text, orientation = 'horizontal', maxWordsPerBeat = 16, preferMotionBroll = true }) {
  if (!['horizontal', 'vertical', 'square'].includes(orientation)) throw new Error('orientation muss horizontal, vertical oder square sein.');
  const beats = splitIntoVisualBeats(text, { maxWordsPerBeat });
  const assets = [];

  const coverBeat = beats[0];
  const coverCard = createSceneCard({ beat: coverBeat, index: 0, orientation, context: text, cover: true });
  assets.push({
    id: 'cover-ai-01',
    beat_id: coverBeat.id,
    source_mode: 'ai-generated',
    asset_type: 'image',
    orientation,
    priority: 'cover',
    production_role: 'cover-and-opening-scene',
    scene_card: coverCard,
    prompt: coverCard.prompt,
    negative_guidance: 'No invented cover text, no watermark, no malformed anatomy, no duplicated subjects, no fake UI or logos.'
  });

  for (const [index, beat] of beats.entries()) {
    const decision = classifyVisualSource(beat.text, { preferMotionBroll });
    beat.source_decision = decision;

    if (decision.mode === 'ai-first') {
      if (index === 0) continue; // Bild 01 / Cover already carries the first AI story beat.
      const card = createSceneCard({ beat, index, orientation, context: text });
      assets.push({
        id: `${beat.id}-ai-01`,
        beat_id: beat.id,
        source_mode: 'ai-generated',
        asset_type: 'image',
        orientation,
        priority: 'primary',
        production_role: 'story-image',
        scene_card: card,
        prompt: card.prompt,
        negative_guidance: 'No text overlays, watermarks, malformed anatomy, duplicated subjects, fake UI gibberish, impossible lighting or gratuitous futuristic elements.'
      });
      continue;
    }

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
      const card = createSceneCard({ beat, index, orientation, context: text });
      assets.push({
        id: `${beat.id}-ai-fallback-01`,
        beat_id: beat.id,
        source_mode: 'ai-generated',
        asset_type: 'image',
        orientation,
        priority: 'fallback',
        production_role: 'real-media-fallback',
        scene_card: card,
        prompt: card.prompt,
        negative_guidance: 'Fallback only. No text, watermarks, malformed anatomy, duplicated subjects or impossible motion.'
      });
    }
  }

  const aiPrimary = assets.filter((asset) => asset.source_mode === 'ai-generated' && asset.priority !== 'fallback').length;
  const aiFallback = assets.filter((asset) => asset.source_mode === 'ai-generated' && asset.priority === 'fallback').length;
  const realCount = assets.filter((asset) => asset.source_mode === 'stock-or-real').length;
  const primaryTotal = aiPrimary + realCount;

  return {
    version: 2,
    strategy: 'ai-first-content-density',
    rules: {
      default: 'Generate one purposeful AI image per AI-generatable story beat; create more beats when the narration changes idea instead of producing unused shot variants.',
      cover: 'Bild 01 is the cover and opening image. Flow must create exactly three cover candidates and stop for user selection before continuing.',
      real_material_only_when: ['authentic real-world evidence is required', 'exact interfaces/documents/brands/locations are required', 'real motion B-roll is clearly superior'],
      generation: 'Generate one image at a time, wait for completion, QC it, rename it, then continue. Group later images into five-image QC blocks without parallel generation.'
    },
    input: { text, orientation, maxWordsPerBeat, preferMotionBroll },
    summary: {
      beats: beats.length,
      planned_assets: assets.length,
      ai_images: aiPrimary,
      ai_fallbacks: aiFallback,
      real_or_stock_assets: realCount,
      ai_share_percent: primaryTotal ? Math.round((aiPrimary / primaryTotal) * 100) : 0
    },
    beats,
    assets
  };
}

function extractTopicAnchor(text) {
  const words = String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
  return words.slice(0, 6).join(' ') || String(text ?? '').trim().slice(0, 80);
}

function compositionFor(form, orientation, cover) {
  if (cover) return 'Use one dominant subject or relationship, strong silhouette separation and a calm negative-space zone for cover text; no collage and no tiny secondary scenes.';
  const byForm = {
    comparison: 'Keep both comparison poles readable in the same frame and oppose them through space, scale, state or placement.',
    'cause-effect': 'Show cause and consequence in one readable spatial relationship instead of illustrating only one side.',
    'process-sequence': 'Show one dominant process state with at most two tightly connected stages and an obvious reading direction; never use a dense infographic grid.',
    'system-hierarchy': 'Express structure through physical grouping, distance, height or routes rather than corporate boxes and arrows.',
    'cutaway-section': 'Use a clean cutaway only where it reveals hidden spatial structure; keep exterior context readable and the interior simple.',
    'character-scene': 'Let posture, gaze, action and relationship communicate the point; background context stays secondary.',
    'environment-overview': 'Let the place and spatial situation carry the statement; keep people small or secondary unless the narration specifically centers them.',
    'object-focus': 'Let one concrete object or object relationship carry the idea through state, scale and surrounding context.'
  };
  const base = byForm[form] ?? byForm['object-focus'];
  return `${base} ${orientation === 'vertical' ? 'Keep the main read inside the central mobile-safe area.' : 'Use the width to create clear foreground-to-background reading.'}`;
}

export const visualPlannerConstants = { SHOTS, REAL_EVIDENCE_PATTERNS, MOTION_PATTERNS };
