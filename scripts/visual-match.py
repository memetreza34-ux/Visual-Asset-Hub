#!/usr/bin/env python3
import argparse
import contextlib
import json
import os
import sys


def fail(message: str):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser(description="Rank local images against text with OpenCLIP.")
    parser.add_argument("--query", required=True)
    parser.add_argument("--images", nargs="+", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="ViT-B-32")
    parser.add_argument("--pretrained", default="laion2b_s34b_b79k")
    args = parser.parse_args()

    files = [os.path.abspath(item) for item in args.images if os.path.isfile(item)]
    if not files:
        fail("Keine gültigen Bilddateien gefunden.")

    try:
        import torch
        import open_clip
        from PIL import Image
    except Exception as exc:
        fail(
            "OpenCLIP fehlt. Installiere kostenlos: python3 -m pip install open_clip_torch pillow\n"
            f"Import error: {exc}"
        )

    if torch.cuda.is_available():
        device = "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = "mps"
    else:
        device = "cpu"

    model, _, preprocess = open_clip.create_model_and_transforms(args.model, pretrained=args.pretrained)
    model = model.to(device)
    model.eval()
    tokenizer = open_clip.get_tokenizer(args.model)
    text = tokenizer([args.query]).to(device)

    amp_context = torch.autocast(device_type="cuda") if device == "cuda" else contextlib.nullcontext()
    with torch.no_grad(), amp_context:
        text_features = model.encode_text(text)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    results = []
    for file in files:
        try:
            image = preprocess(Image.open(file).convert("RGB")).unsqueeze(0).to(device)
            with torch.no_grad(), amp_context:
                image_features = model.encode_image(image)
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
                similarity = float((image_features @ text_features.T).squeeze().detach().cpu().item())
            results.append({"file": file, "clipSimilarity": round(similarity, 6)})
        except Exception as exc:
            results.append({"file": file, "error": str(exc), "clipSimilarity": None})

    valid = [item for item in results if item["clipSimilarity"] is not None]
    valid.sort(key=lambda item: item["clipSimilarity"], reverse=True)
    minimum = min((item["clipSimilarity"] for item in valid), default=0.0)
    maximum = max((item["clipSimilarity"] for item in valid), default=0.0)
    spread = maximum - minimum
    for rank, item in enumerate(valid, start=1):
        item["rank"] = rank
        item["relativeScore"] = round((item["clipSimilarity"] - minimum) / spread, 6) if spread > 1e-9 else 1.0

    report = {
        "version": 1,
        "engine": "OpenCLIP",
        "model": args.model,
        "pretrained": args.pretrained,
        "device": device,
        "query": args.query,
        "note": "CLIP similarity is a ranking signal, not proof that a frame depicts the claimed real-world event. Human event/source review remains mandatory.",
        "results": valid + [item for item in results if item["clipSimilarity"] is None],
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    print(json.dumps({"output": os.path.abspath(args.output), "count": len(valid), "device": device}))


if __name__ == "__main__":
    main()
