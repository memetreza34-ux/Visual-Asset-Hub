#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description='Find visually near-duplicate images with DINOv2.')
    parser.add_argument('--images', nargs='+', required=True)
    parser.add_argument('--threshold', type=float, default=0.94)
    parser.add_argument('--output')
    args = parser.parse_args()

    try:
        import torch
        import torch.nn.functional as F
        from PIL import Image
        from transformers import AutoImageProcessor, AutoModel
    except ImportError as exc:
        raise SystemExit('DINOv2-Dedupe benötigt torch, pillow und transformers.') from exc

    files = [Path(p).resolve() for p in args.images]
    for file in files:
        if not file.is_file():
            raise SystemExit(f'Datei nicht gefunden: {file}')

    model_id = 'facebook/dinov2-base'
    processor = AutoImageProcessor.from_pretrained(model_id)
    model = AutoModel.from_pretrained(model_id).eval()
    images = [Image.open(file).convert('RGB') for file in files]
    inputs = processor(images=images, return_tensors='pt')
    with torch.no_grad():
        outputs = model(**inputs)
        emb = outputs.last_hidden_state[:, 0, :]
        emb = F.normalize(emb, dim=-1)
    sims = emb @ emb.T

    pairs = []
    for i in range(len(files)):
        for j in range(i + 1, len(files)):
            score = float(sims[i, j].item())
            pairs.append({
                'a': str(files[i]),
                'b': str(files[j]),
                'similarity': round(score, 5),
                'near_duplicate': score >= args.threshold
            })

    payload = {
        'version': 1,
        'model': model_id,
        'threshold': args.threshold,
        'pairs': sorted(pairs, key=lambda x: x['similarity'], reverse=True),
        'policy': {
            'visualSimilarityOnly': True,
            'doesNotProveSameEvent': True,
            'doesNotGrantRights': True
        }
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8')
    print(text, end='')


if __name__ == '__main__':
    main()
