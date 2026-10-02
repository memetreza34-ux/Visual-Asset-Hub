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
const COVER_VARIANTS = {
  A: 'Keep the exact core concept, subject identity, style, palette and world. Use the clearest subject-forward composition with strong immediate readability.',
  B: 'Keep the exact core concept, subject identity, style, palette and world. Vary only framing and spatial arrangement so the environment contributes more context while the same dominant subject remains primary.',
  C: 'Keep the exact core concept, subject identity, style, palette and world. Use a related alternative camera position or crop with different negative-space placement, without changing the story idea or overall visual identity.'
};

export function defaultStyleLock() {
  return {
    status: 'READY',
    style_id: 'photoreal-documentary-natural-v3',
    master_style_prompt: 'Create believable factual documentary stills grounded in real environments. Use realistic anatomy, physically plausible lens perspective, authentic materials and wear, restrained contrast, natural practical light sources and candid unstaged behavior. The result should feel observed rather than designed for an advertisement.',
    scene_style_anchor: 'Believable factual documentary still with realistic anatomy, authentic materials, natural practical light and physically plausible perspective.',
    global_negative_prompt: 'No glossy advertising polish, fantasy spectacle, gratuitous science-fiction holograms, plastic skin, malformed anatomy, duplicated people, impossible objects, fake interfaces, invented logos, watermarks, pseudo-writing, dense collage layouts or decorative infographic clutter.'
  };
}

export function defaultWorldLock(plan) {
  const orientation = plan?.input?.orientation ?? 'horizontal';
  return {
    status: 'READY',
    world_id: 'auto-documentary-world-v2',
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

export function defaultCoverReferencePolicy() {
  return {
    status: 'pending-user-selection',
    role: 'soft-style-and-world-reference',
    preserve: [
      'overall rendering language and realism level',
      'base color family and contrast behavior',
      'material and texture treatment',
      'general lighting logic and image quality',
      'recurring character, prop and location identity when those entities reappear'
    ],
    vary: [
      'scene content',
      'camera angle and distance',
      'composition and subject placement',
      'action and pose',
      'time, weather and local mood when the narration requires it',
      'visual form when another form explains the beat better'
    ],
    never_copy: [
      'cover layout into every scene',
      'cover text into later scenes unless explicitly allowed',
      'unrelated people or objects merely because they appear on the cover'
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
  validateTextPolicy(card.text_policy, imageNumber);
  return true;
}

export function validateTextPolicy(policy, imageNumber = '?') {
  const resolved = policy ?? { mode: 'none', exact_text: [] };
  if (!['none', 'essential-only', 'cover-controlled'].includes(resolved.mode)) {
    throw new Error(`Bild ${imageNumber}: text_policy.mode ist ungültig.`);
  }
  const exact = Array.isArray(resolved.exact_text) ? resolved.exact_text.map((value) => String(value).trim()).filter(Boolean) : [];
  if (resolved.mode === 'essential-only' && !exact.length) {
    throw new Error(`Bild ${imageNumber}: essential-only braucht exact_text.`);
  }
  if (exact.length > 2) throw new Error(`Bild ${imageNumber}: maximal zwei kurze Textelemente sind erlaubt.`);
  if (exact.some((value) => value.length > 40)) throw new Error(`Bild ${imageNumber}: sichtbarer Text darf maximal 40 Zeichen pro Element haben.`);
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

export function compileTextInstruction(card, { isCover = false, coverText = '' } = {}) {
  if (isCover) {
    return `Integrate exactly this German cover text: "${coverText}". Spell it exactly, use it only once, make it immediately readable in the reserved high-contrast area, and never cover the dominant subject. No second headline, no logo, no image number and no pseudo-text.`;
  }
  const policy = card?.text_policy ?? { mode: 'none', exact_text: [] };
  const exact = Array.isArray(policy.exact_text) ? policy.exact_text.map((value) => String(value).trim()).filter(Boolean) : [];
  if (policy.mode === 'essential-only' && exact.length) {
    return `Visible text is allowed only because it is essential to this beat. Use only these exact literal items: ${exact.map((value) => `"${value}"`).join(', ')}. Each may appear at most once, correctly spelled and clearly readable. Do not invent any additional labels, captions, numbers, logos or pseudo-writing.`;
  }
  return 'No visible text, labels, letters, numbers, logos, watermarks or pseudo-writing anywhere in the image.';
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
    compileTextInstruction(card, { isCover, coverText })
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
      text_policy: asset.scene_card.text_policy ?? { mode: 'none', exact_text: [] },
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
  const referencePolicy = defaultCoverReferencePolicy();

  const queue = {
    version: 2,
    strategy: 'two-stage-cover-gate-selected-cover-reference',
    stage_1_cover: {
      status: 'ready',
      stop_after_stage: true,
      shared_identity_rule: 'All three candidates must clearly belong to the same visual world and use the same exact cover text, dominant story idea, style, palette family and subject identity. They are alternatives of one cover concept, not three unrelated art directions.',
      jobs: Object.entries(COVER_VARIANTS).map(([variant, direction]) => ({
        image_number: 1,
        variant,
        temporary_name: `Bild 01 Kandidat ${variant}.png`,
        final_name_after_selection: 'Bild 01.png',
        variant_direction: direction,
        prompt: `${images[0].compiled_prompt} Cover candidate variation: ${direction}`,
        rule: 'Generate exactly one candidate, wait for the result, QC it, then generate the next candidate.'
      })),
      completion_gate: 'After three acceptable cover candidates exist, STOP. The user explicitly selects A, B or C. Do not generate Bild 02 before selection.'
    },
    stage_2_story: {
      status: 'locked-until-cover-selection',
      unlock_command: 'npm run flow:select-cover -- --production-plan <flow-production-plan.json> --candidate <A|B|C> --reference "Bild 01.png"',
      cover_reference_policy: referencePolicy,
      block_size: blockSize,
      blocks: productionBlocks,
      jobs: images.slice(1).map((image) => ({
        image_number: image.image_number,
        filename: image.filename,
        beat_id: image.beat_id,
        text_policy: image.text_policy,
        prompt: image.compiled_prompt,
        reference_requirement: 'Attach/use the user-selected Bild 01.png as a visual reference before generating this job.',
        rule: 'Generate exactly one image, wait for completion, QC it, rename it exactly, then continue.'
      }))
    }
  };

  return {
    production_plan: {
      version: 2,
      title: String(title).trim(),
      cover_text: String(coverText).trim(),
      style_lock: styleLock,
      world_lock: worldLock,
      cover_reference_policy: referencePolicy,
      image_count: images.length,
      cover_image_number: 1,
      cover_candidates: 3,
      cover_selection_required: true,
      block_size: blockSize,
      images,
      production_blocks: productionBlocks,
      removed_bad_patterns: [
        'no automatic multi-shot alternates for every beat',
        'no parallel generation batch',
        'no Bild 00 for YouTube-style longform flow',
        'no generic people added merely to fill frames',
        'no uncontrolled style inheritance from unrelated channel repositories',
        'no automatic cover winner selection',
        'no invented text in story images'
      ]
    },
    generation_queue: queue,
    master_prompt: compileMasterPrompt({
      title: String(title).trim(),
      coverText: String(coverText).trim(),
      images,
      styleLock,
      worldLock,
      productionBlocks,
      referencePolicy
    })
  };
}

export function buildStage2AfterCoverSelection(productionPlan, { candidate, reference = 'Bild 01.png' } = {}) {
  if (!productionPlan || !Array.isArray(productionPlan.images)) throw new Error('flow-production-plan.json ist ungültig.');
  const normalizedCandidate = String(candidate ?? '').trim().toUpperCase();
  if (!COVER_VARIANTS[normalizedCandidate]) throw new Error('candidate muss A, B oder C sein.');
  const selectedReference = String(reference ?? '').trim();
  if (!selectedReference) throw new Error('reference ist erforderlich.');

  const policy = {
    ...(productionPlan.cover_reference_policy ?? defaultCoverReferencePolicy()),
    status: 'selected-and-active',
    selected_candidate: normalizedCandidate,
    selected_reference: selectedReference
  };
  const storyImages = productionPlan.images.filter((image) => Number(image.image_number) > 1);
  const referenceInstruction = compileSelectedCoverReferenceInstruction(policy);
  const jobs = storyImages.map((image) => ({
    image_number: image.image_number,
    filename: image.filename,
    beat_id: image.beat_id,
    selected_cover_reference: selectedReference,
    text_policy: image.text_policy ?? image.scene_card?.text_policy ?? { mode: 'none', exact_text: [] },
    prompt: `${referenceInstruction} ${image.compiled_prompt}`,
    rule: 'Use the selected cover as a visual reference, generate exactly one image, wait, QC, rename exactly, then continue.'
  }));

  return {
    cover_selection: {
      version: 1,
      selected_candidate: normalizedCandidate,
      selected_reference: selectedReference,
      final_cover_filename: 'Bild 01.png',
      policy
    },
    stage_2_queue: {
      version: 1,
      status: 'unlocked-after-user-cover-selection',
      block_size: productionPlan.block_size ?? 5,
      selected_cover_reference: selectedReference,
      jobs
    },
    stage_2_prompt: compileStage2Prompt({ productionPlan, policy, jobs, referenceInstruction })
  };
}

export function compileSelectedCoverReferenceInstruction(policy) {
  const preserve = (policy.preserve ?? []).map((item) => `- ${item}`).join('\n');
  const vary = (policy.vary ?? []).map((item) => `- ${item}`).join('\n');
  const neverCopy = (policy.never_copy ?? []).map((item) => `- ${item}`).join('\n');
  return `SELECTED COVER REFERENCE — REQUIRED\nUse the selected cover image "${policy.selected_reference ?? 'Bild 01.png'}" as a soft style/world/quality reference for this image. Preserve:\n${preserve}\nAllow intentional variation in:\n${vary}\nNever copy:\n${neverCopy}\nThe result must clearly belong to the same video, but must still be individually composed for the current narration beat.`;
}

function compileMasterPrompt({ title, coverText, images, styleLock, worldLock, productionBlocks, referencePolicy }) {
  const imageBlocks = images.map((image) => {
    const n = String(image.image_number).padStart(2, '0');
    const textPolicy = image.image_number === 1
      ? `exact cover text: "${coverText}"`
      : image.text_policy?.mode === 'essential-only'
        ? `essential exact text only: ${(image.text_policy.exact_text ?? []).join(' | ')}`
        : 'no visible text';
    return [
      `BILD ${n}`,
      `Audio Anchor: ${image.audio_anchor}`,
      `Viewer Takeaway: ${image.scene_card.viewer_takeaway}`,
      `Visual Purpose: ${image.scene_card.visual_purpose}`,
      `Topic Anchor: ${image.scene_card.topic_anchor}`,
      `Visual Form: ${image.scene_card.visual_form}`,
      `Text Policy: ${textPolicy}`,
      `Planned Hold: ${image.planned_hold_seconds ?? '?'} seconds`,
      `Prompt QC: ${image.prompt_qc_score}/10`,
      `Prompt: ${image.compiled_prompt}`
    ].join('\n');
  }).join('\n\n');

  const blockText = productionBlocks.length
    ? productionBlocks.map((block) => `Block ${block.block}: Bild ${String(block.from_image).padStart(2, '0')}–${String(block.to_image).padStart(2, '0')}`).join('\n')
    : 'No Stage-2 images.';
  const preserve = referencePolicy.preserve.map((item) => `- ${item}`).join('\n');
  const vary = referencePolicy.vary.map((item) => `- ${item}`).join('\n');

  return `GOOGLE FLOW MASTER PROMPT — ${title}\n\nPROMPT_SYSTEM: universal-flow-production-v3\n\nGOAL\nCreate the AI-generated images for one coherent video. Every image must support the exact spoken beat assigned to it. Do not add a person, object, diagram or decorative element just to make the frame look busy.\n\nCHANNEL / PROJECT STYLE LOCK — IMMUTABLE\n${styleLock.master_style_prompt}\n\nVIDEO WORLD LOCK — IMMUTABLE WITHIN THIS VIDEO\n${worldLock.setting_description}\n${(worldLock.continuity_rules || []).map((rule) => `- ${rule}`).join('\n')}\n\nNARRATION-FIRST RULE\nFor every BILD, preserve the planned viewer takeaway, visual purpose, topic anchor and visual form. The image exists to explain the narration, not to show off a style.\n\nCOVER RULE\nBILD 01 is the cover AND opening image. Create exactly three related candidates A/B/C. All three use exactly this German cover text: "${coverText}". They must share the same core story idea, subject identity, style, palette family and world. Vary composition/framing only enough to create three useful alternatives; do not create three unrelated art directions.\n\n${imageBlocks}\n\nGLOBAL NEGATIVE STYLE RULE\n${styleLock.global_negative_prompt}\n\nTEXT RULE\n- BILD 01: exactly the cover text "${coverText}" once.\n- BILD 02 onward: normally no text. Short visible text is allowed only when the Scene Card explicitly marks it essential and supplies exact literal text copied from the narration. Never invent labels or pseudo-writing.\n\nGENERATION WORKFLOW — MANDATORY\nSTAGE 1 — COVER ONLY\n1. Generate BILD 01 candidate A only. Wait for completion and QC.\n2. Generate BILD 01 candidate B only. Wait for completion and QC.\n3. Generate BILD 01 candidate C only. Wait for completion and QC.\n4. After three acceptable candidates exist, STOP.\n5. Do not choose the winner automatically. Wait for explicit user selection.\n6. The selected winner is renamed exactly to Bild 01.png.\n7. Do not generate BILD 02 before the user selects the cover.\n\nSELECTED COVER REFERENCE — STAGE 2\nAfter selection, attach/use the selected Bild 01.png as the visual reference for every subsequent AI-generated image. Treat it as a soft visual identity anchor, not a layout template. Preserve:\n${preserve}\nDeliberately allow variation in:\n${vary}\nThis balance is mandatory: later images must look like one coherent video, but each image must still be individually designed for its own narration beat.\n\nSTAGE 2 — ONLY AFTER COVER SELECTION\n- Generate BILD 02 onward strictly ONE IMAGE AT A TIME.\n- For each image: use selected cover reference → read current BILD block → generate exactly one image → wait → QC → if FAIL regenerate same image number → if PASS rename to Bild NN.png → continue.\n- Never run a parallel image batch.\n- Use five-image QC blocks only as checkpoints.\n\nFIVE-IMAGE QC BLOCKS\n${blockText}\nAt each block end verify: correct filenames, no missing images, no unjustified duplicate compositions, no style drift, selected-cover visual identity still recognizable, recurring subjects consistent, text policy respected, and every image matches its audio anchor.\n`;
}

function compileStage2Prompt({ productionPlan, policy, jobs, referenceInstruction }) {
  const jobsText = jobs.map((job) => [
    `BILD ${String(job.image_number).padStart(2, '0')}`,
    `Final filename: ${job.filename}`,
    `Prompt: ${job.prompt}`
  ].join('\n')).join('\n\n');
  return `GOOGLE FLOW STAGE 2 — COVER SELECTED\n\nVideo: ${productionPlan.title}\nSelected cover candidate: ${policy.selected_candidate}\nSelected visual reference: ${policy.selected_reference}\n\n${referenceInstruction}\n\nWORKFLOW\nGenerate exactly one image at a time. Always use the selected cover reference. Wait for completion, QC, rename exactly, then continue. Never batch in parallel.\n\nTEXT POLICY\nStory images are text-free by default. Only exact text explicitly permitted by a Scene Card may appear, and no additional text may be invented.\n\n${jobsText}\n`;
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export const flowProductionConstants = { REQUIRED_CARD_FIELDS, VISUAL_FORM_GUARDS, COVER_VARIANTS };
