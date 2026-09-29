#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path


def expand_box(box, image_w, image_h, target_ratio):
    x1, y1, x2, y2 = [float(v) for v in box]
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    w, h = max(1.0, x2 - x1), max(1.0, y2 - y1)
    current = w / h
    if current < target_ratio:
        w = h * target_ratio
    else:
        h = w / target_ratio
    w *= 1.65
    h *= 1.65
    x1 = max(0, cx - w / 2)
    y1 = max(0, cy - h / 2)
    x2 = min(image_w, cx + w / 2)
    y2 = min(image_h, cy + h / 2)
    return [int(x1), int(y1), int(x2), int(y2)]


def refine_with_sam(image, box):
    checkpoint = os.environ.get('SAM_CHECKPOINT')
    if not checkpoint:
        raise RuntimeError('SAM_CHECKPOINT fehlt.')
    try:
        import numpy as np
        from segment_anything import sam_model_registry, SamPredictor
    except ImportError as exc:
        raise RuntimeError('segment-anything fehlt.') from exc
    model_type = os.environ.get('SAM_MODEL_TYPE', 'vit_b')
    sam = sam_model_registry[model_type](checkpoint=checkpoint)
    predictor = SamPredictor(sam)
    predictor.set_image(np.array(image))
    masks, scores, _ = predictor.predict(box=np.array(box), multimask_output=True)
    mask = masks[int(scores.argmax())]
    ys, xs = np.where(mask)
    if len(xs) == 0 or len(ys) == 0:
        return box
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def main():
    parser = argparse.ArgumentParser(description='Text-guided documentary crop using GroundingDINO, optionally refined by SAM.')
    parser.add_argument('--file', required=True)
    parser.add_argument('--prompt', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--width', type=int, default=1920)
    parser.add_argument('--height', type=int, default=1080)
    parser.add_argument('--sam', action='store_true')
    args = parser.parse_args()

    try:
        import torch
        from PIL import Image
        from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
    except ImportError as exc:
        raise SystemExit('Smart Crop benötigt torch, pillow und transformers.') from exc

    source = Path(args.file).resolve()
    target = Path(args.output).resolve()
    if not source.is_file():
        raise SystemExit(f'Datei nicht gefunden: {source}')

    image = Image.open(source).convert('RGB')
    model_id = 'IDEA-Research/grounding-dino-tiny'
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForZeroShotObjectDetection.from_pretrained(model_id).eval()
    text = args.prompt.strip()
    if not text.endswith('.'):
        text += '.'
    inputs = processor(images=image, text=text, return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)

    result = processor.post_process_grounded_object_detection(
        outputs,
        inputs.input_ids,
        box_threshold=0.30,
        text_threshold=0.25,
        target_sizes=[image.size[::-1]],
    )[0]
    if len(result.get('boxes', [])) == 0:
        raise SystemExit('GroundingDINO hat kein Motiv sicher erkannt. Nutze normalen image-prepare Crop.')

    scores = result['scores']
    best = int(scores.argmax().item())
    box = result['boxes'][best].tolist()
    sam_used = False
    if args.sam:
        try:
            box = refine_with_sam(image, box)
            sam_used = True
        except Exception as exc:
            print(f'SAM übersprungen: {exc}')

    crop_box = expand_box(box, image.width, image.height, args.width / args.height)
    cropped = image.crop(crop_box)
    cropped.thumbnail((args.width * 2, args.height * 2))
    ratio = args.width / args.height
    cw, ch = cropped.size
    if cw / ch > ratio:
        new_w = int(ch * ratio)
        left = max(0, (cw - new_w) // 2)
        cropped = cropped.crop((left, 0, left + new_w, ch))
    else:
        new_h = int(cw / ratio)
        top = max(0, (ch - new_h) // 2)
        cropped = cropped.crop((0, top, cw, top + new_h))
    cropped = cropped.resize((args.width, args.height), Image.Resampling.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(target, quality=92)

    sidecar = {
        'version': 1,
        'source': str(source),
        'output': str(target),
        'prompt': args.prompt,
        'detector': model_id,
        'detectorScore': float(scores[best].item()),
        'samRefinementUsed': sam_used,
        'cropBox': crop_box,
        'syntheticContentAdded': False,
        'policy': 'Crop only. No generated visual content.'
    }
    target.with_suffix(target.suffix + '.derived.json').write_text(json.dumps(sidecar, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(sidecar, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
