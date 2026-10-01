const REQUIRED_CARD_FIELDS = [
  'viewer_takeaway',
  'visual_purpose',
  'topic_anchor',
  'visual_form',
  'visual_concept',
  'dominant_subject',
  'action_state',
  'composition',
  'camera',
  'depth_plan',
  'lighting_mood',
  'continuity_note',
  'accuracy_note'
];

const VISUAL_FORM_GUARDS = {
  comparison: 'Keep both comparison poles visible and clearly opposed through space, scale, state or placement.',
  'cause-effect': 'Make the cause and consequence visibly connected in one readable composition.',
  'process-sequence': 'Keep the process readable with one dominant state and at most two tightly connected stages; never create a dense infographic grid.',
  'system-hierarchy': 'Express structure through physical grouping, distance, height or routes rather than corporate boxes and arrows.',
  'cutaway-section': 'Use the cutaway only to reveal hidden spatial structure; keep exterior context readable and the exposed interior simple.',
  'character-scene': 'Let posture, action, gaze and relationships communicate the point. Do not add people merely to fill the frame.',
  'environment-overview': 'Keep the place and spatial situation dominant; people remain secondary unless the narration centers them.',
  'object-focus': 'Let one concrete object or object relationship carry the statement through state, scale and surrounding context.'
};

const GENERIC_RISK_WORDS = /\b(epic|ultra detailed|hyper detailed|masterpiece|award-winning|8k|bokeh)\b/i;

export function defaultStyleLock() {
  return {
    status: 'READY',
    style_id: 'photoreal-documentary-natural-v2',
    master_style_prompt: 'Create believable factual documentary stills grounded in real environments. Use realistic anatomy, physically plausible lens perspective, authentic materials and wear, restrained contrast, natural practical light sources and candid unstaged behavior. The result should feel observed rather than designed for an advertisement.',
    scene_style_anchor: 'Believable factual documentary still with realistic anatomy, authentic materials, natural practical light and physically plausible perspective.',
    global_negative_prompt: 'No glossy advertising polish, fantasy spectacle, gratuitous science-fiction holograms, plastic skin, malformed anatomy, duplicated people, impossible objects, fake interfaces, invented logos, watermarks, pseudo-writing, dense collage layouts or decorative infographic clutter.'
  };
}

export function defaultWorldLock(plan) {
  const orientation = plan?.input?.orientation ?? 'horizontal';
  return {
    status: 'READY',
    world_id: 'auto-documentary-world-v1',
    setting_name: 'video-specific factual world',
    setting_description: 'Treat recurring people, locations, clothing, props and environmental conditions as the same real-world entities whenever they reappear. Do not clone unrelated people just because the rendering style is consistent.',
    continuity_rules: [
      'Recurring people keep the same age range, facial identity, hair, body build, clothing logic and identifying props.',
      'Recurring places keep the same spatial layout, defining architecture and base material colors unless the narration explicitly changes time or place.',
      'Camera angle, framing, distance, light, weather and mood may vary when that improves the current beat.',
      `All generated images use the ${orientation} target orientation from the visual plan.`
    ]
  };
}

export function validateSceneCard(card, imageNumber = '?') {
  for (const field of REQUIRED_CARD_FIELDS) {
    if (!String(card?.[field] ?? '').trim()) throw new Error(`${field} fehlt bei Bild ${imageNumber}.`);
  }
  const score = Number(card.prompt_qc_score);
  if (!Number.isFinite(score) || score < 8 || score > 10) {
    throw new Error(`Bild ${imageNumber} braucht prompt_qc_score 8–10; erhalten: ${card.prompt_qc_score}.`);
  }
  const haystack = REQUIRED_CARD_FIELDS.map((field) => String(card[field] ?? '')).join(' ');
  if (GENERIC_RISK_WORDS.test(haystack)) throw new Error(`Bild ${imageNumber} enthält generische Prompt-Risikowörter. Beschreibe Kamera, Raum, Licht oder Handlung konkret.`);
  if (Array.isArray(card.supporting_elements) && card.supporting_elements.length > 3) {
    throw new Error(`Bild ${imageNumber} hat mehr als drei supporting_elements.`);
  }
  return true;
}

export function validateStyleLock(styleLock) {
  if (!styleLock || styleLock.status !== 'READY') throw new Error('Style Lock muss READY sein.');
  for (const field of ['style_id', 'master_style_prompt', 'scene_style_anchor', 'global_negative_prompt']) {
    if (!String(styleLock[field] ?? '').trim()) throw new Error(`Style Lock: ${field} fehlt.`);
  }
  return true;
}

export function validateWorldLock(worldLock) {
  if (!worldLock || worldLock.status !== 'READY') throw new Error('World Lock muss READY sein.');
  if (!String(worldLock.setting_name ?? '').trim() || !String(worldLock.setting_description ?? '').trim()) {
    throw new Error('World Lock braucht setting_name und setting_description.');
  }
  return true;
}

export function compileScenePrompt(card, { styleLock, isCover = false, coverText = '' } = {}) {
  validateStyleLock(styleLock);
  validateSceneCard(card);
  const guard = VISUAL_FORM_GUARDS[card.visual_form] ?? '';
  const supporting = Array.isArray(card.supporting_elements) && card.supporting_elements.length
    ? `Supporting context: ${card.supporting_elements.join('; ')}. Keep all supporting elements secondary.`
    : '';

  return [
    styleLock.scene_style_anchor,
    `Viewer takeaway: ${card.viewer_takeaway}`,
    `Visual purpose: ${card.visual_purpose}`,
    `Topic anchor: ${card.topic_anchor}`,
    `Visual concept: ${card.visual_concept}`,
    `Dominant subject: ${card.dominant_subject}`,
    `Action/state: ${card.action_state}`,
    `Composition: ${card.composition}`,
    `Camera: ${card.camera}`,
    `Depth: ${card.depth_plan}`,
    `Lighting/mood: ${card.lighting_mood}`,
    supporting,
    guard,
    `Continuity: ${card.continuity_note}`,
    `Accuracy: ${card.accuracy_note}`,
    isCover
      ? `Integrate exactly this German cover text: "${coverText}". Spell it exactly, use it only once, make it immediately readable in the reserved high-contrast area, and never cover the dominant subject. No second headline, no logo, no image number and no pseudo-text.`
      : 'No visible text, labels, letters, numbers, logos, watermarks or pseudo-writing anywhere in the image.'
  ].filter(Boolean).join(' ');
}

export function buildFlowProduction(plan, {
  title,
  coverText,
  styleLock = defaultStyleLock(),
  worldLock = defaultWorldLock(plan),
  blockSize = 5
} = {}) {
  if (!plan || !Array.isArray(plan.assets)) throw new Error('visual-plan.json ist ungültig.');
  if (!String(title ?? '').trim()) throw new Error('title ist erforderlich.');
  if (!String(coverText ?? '').trim()) throw new Error('coverText ist erforderlich.');
  if (!Number.isInteger(blockSize) || blockSize < 1 || blockSize > 10) throw new Error('blockSize muss zwischen 1 und 10 liegen.');
  validateStyleLock(styleLock);
  validateWorldLock(worldLock);

  const aiAssets = plan.assets.filter((asset) => asset.source_mode === 'ai-generated' && asset.priority !== 'fallback');
  if (!aiAssets.length) throw new Error('Der Visual Plan enthält keine primären KI-Bilder.');
  if (aiAssets[0].production_role !== 'cover-and-opening-scene') throw new Error('Das erste KI-Asset muss Cover + Opening sein.');

  const images = aiAssets.map((asset, index) => {
    const imageNumber = index + 1;
    validateSceneCard(asset.scene_card, imageNumber);
    return {
      image_number: imageNumber,
      filename: `Bild ${String(imageNumber).padStart(2, '0')}.png`,
      asset_id: asset.id,
      beat_id: asset.beat_id,
      production_role: asset.production_role,
      audio_anchor: plan.beats?.find((beat) => beat.id === asset.beat_id)?.text ?? '',
      planned_hold_seconds: asset.scene_card.planned_hold_seconds ?? null,
      prompt_qc_score: asset.scene_card.prompt_qc_score,
      scene_card: asset.scene_card,
      compiled_prompt: compileScenePrompt(asset.scene_card, {
        styleLock,
        isCover: imageNumber === 1,
        coverText
      })
    };
  });

  const productionBlocks = chunk(images.slice(1), blockSize).map((items, index) => ({
    block: index + 1,
    from_image: items[0]?.image_number ?? null,
    to_image: items.at(-1)?.image_number ?? null,
    images: items.map((item) => item.image_number),
    rule: 'Sequential only: generate one image, wait, QC, rename, then continue. Stop for block QC after the final image in this block.'
  }));

  const queue = {
    version: 1,
    strategy: 'two-stage-cover-gate-sequential-generation',
    stage_1_cover: {
      status: 'ready',
      stop_after_stage: true,
      jobs: ['A', 'B', 'C'].map((variant) => ({
        image_number: 1,
        variant,
        temporary_name: `Bild 01 Kandidat ${variant}.png`,
        final_name_after_selection: 'Bild 01.png',
        prompt: images[0].compiled_prompt,
        rule: 'Generate exactly one candidate, wait for the result, QC it, then generate the next candidate.'
      })),
      completion_gate: 'After three acceptable cover candidates exist, STOP. The user explicitly selects the winner. Do not generate Bild 02 before selection.'
    },
    stage_2_story: {
      status: 'locked-until-cover-selection',
      block_size: blockSize,
      blocks: productionBlocks,
      jobs: images.slice(1).map((image) => ({
        image_number: image.image_number,
        filename: image.filename,
        beat_id: image.beat_id,
        prompt: image.compiled_prompt,
        rule: 'Generate exactly one image, wait for completion, QC it, rename it exactly, then continue.'
      }))
    }
  };

  return {
    production_plan: {
      version: 1,
      title: String(title).trim(),
      cover_text: String(coverText).trim(),
      style_lock: styleLock,
      world_lock: worldLock,
      image_count: images.length,
      cover_image_number: 1,
      cover_candidates: 3,
      block_size: blockSize,
      images,
      production_blocks: productionBlocks,
      removed_bad_patterns: [
        'no automatic multi-shot alternates for every beat',
        'no parallel generation batch',
        'no Bild 00 for YouTube-style longform flow',
        'no generic people added merely to fill frames',
        'no uncontrolled style inheritance from unrelated channel repositories'
      ]
    },
    generation_queue: queue,
    master_prompt: compileMasterPrompt({
      title: String(title).trim(),
      coverText: String(coverText).trim(),
      images,
      styleLock,
      worldLock,
      productionBlocks
    })
  };
}

function compileMasterPrompt({ title, coverText, images, styleLock, worldLock, productionBlocks }) {
  const imageBlocks = images.map((image) => {
    const n = String(image.image_number).padStart(2, '0');
    return [
      `BILD ${n}`,
      `Audio Anchor: ${image.audio_anchor}`,
      `Viewer Takeaway: ${image.scene_card.viewer_takeaway}`,
      `Visual Purpose: ${image.scene_card.visual_purpose}`,
      `Topic Anchor: ${image.scene_card.topic_anchor}`,
      `Visual Form: ${image.scene_card.visual_form}`,
      `Planned Hold: ${image.planned_hold_seconds ?? '?'} seconds`,
      `Prompt QC: ${image.prompt_qc_score}/10`,
      `Prompt: ${image.compiled_prompt}`
    ].join('\n');
  }).join('\n\n');

  const blockText = productionBlocks.length
    ? productionBlocks.map((block) => `Block ${block.block}: Bild ${String(block.from_image).padStart(2, '0')}–${String(block.to_image).padStart(2, '0')}`).join('\n')
    : 'No Stage-2 images.';

  return `GOOGLE FLOW MASTER PROMPT — ${title}\n\nPROMPT_SYSTEM: universal-flow-production-v2\n\nGOAL\nCreate the AI-generated images for one coherent video. Every image must support the exact spoken beat assigned to it. Do not add a person, object, diagram or decorative element just to make the frame look busy.\n\nCHANNEL / PROJECT STYLE LOCK — IMMUTABLE\n${styleLock.master_style_prompt}\n\nVIDEO WORLD LOCK — IMMUTABLE WITHIN THIS VIDEO\n${worldLock.setting_description}\n${(worldLock.continuity_rules || []).map((rule) => `- ${rule}`).join('\n')}\n\nNARRATION-FIRST RULE\nFor every BILD, preserve the planned viewer takeaway, visual purpose, topic anchor and visual form. The image exists to explain the narration, not to show off a style. Simple is allowed when simple is clearest. Complexity is allowed only when it improves understanding.\n\nIMAGE DENSITY RULE\nThe plan uses one purposeful image per actual story beat. More usable images come from meaningful beat splits, not from generating four or six unused camera variants of the same beat.\n\nCOVER RULE\nBILD 01 is the cover AND opening image. Use exactly this German cover text on all three cover candidates: "${coverText}".\n\n${imageBlocks}\n\nGLOBAL NEGATIVE STYLE RULE\n${styleLock.global_negative_prompt}\n\nTEXT RULE\n- BILD 01: exactly the cover text "${coverText}" once.\n- BILD 02 through BILD ${String(images.length).padStart(2, '0')}: no visible text, labels, letters, numbers, logos, watermarks or pseudo-writing unless a later explicit project-specific override is supplied before compilation.\n\nGENERATION WORKFLOW — MANDATORY\nSTAGE 1 — COVER ONLY\n1. Generate BILD 01 candidate A only. Wait for completion. QC it.\n2. Generate BILD 01 candidate B only. Wait for completion. QC it.\n3. Generate BILD 01 candidate C only. Wait for completion. QC it.\n4. All three use exactly the same cover text "${coverText}".\n5. Reject and regenerate a candidate if the text is missing, misspelled, unreadable, the visual purpose is unclear or the style/world lock drifts.\n6. After three acceptable candidates exist, STOP.\n7. Do not choose the winner automatically. Wait for explicit user selection.\n8. The selected winner is renamed exactly to Bild 01.png.\n\nSTAGE 2 — ONLY AFTER COVER SELECTION\n- Keep style lock and world lock unchanged.\n- The selected cover is an additional continuity reference, not permission to clone its composition into every scene.\n- Generate BILD 02 onward strictly ONE IMAGE AT A TIME.\n- For each image: read only the current BILD block → generate exactly one image → wait for result → QC → if FAIL regenerate the same image number → if PASS rename exactly to Bild NN.png → only then continue.\n- Never run a parallel image batch.\n- Use five-image QC blocks only as checkpoints, not as parallel generation groups.\n\nFIVE-IMAGE QC BLOCKS\n${blockText}\nAt the end of each block, verify: correct filenames, no missing images, no duplicate compositions without reason, no style drift, recurring subjects stay consistent, no pseudo-text, and every image still matches its own audio anchor. Then continue to the next block.\n\nFINAL FOLDER RULE\nOnly final accepted files Bild 01.png through Bild ${String(images.length).padStart(2, '0')}.png remain in the final image folder. Temporary cover candidates and rejected generations are not final assets.\n`;
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export const flowProductionConstants = { REQUIRED_CARD_FIELDS, VISUAL_FORM_GUARDS };
