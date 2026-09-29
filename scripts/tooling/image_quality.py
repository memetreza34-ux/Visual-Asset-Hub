#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description='No-reference image quality scoring via pyiqa.')
    parser.add_argument('--file', required=True)
    parser.add_argument('--deep', action='store_true')
    parser.add_argument('--output')
    args = parser.parse_args()

    try:
        import pyiqa
    except ImportError as exc:
        raise SystemExit('pyiqa fehlt: python3 -m pip install pyiqa') from exc

    source = Path(args.file)
    if not source.is_file():
        raise SystemExit(f'Datei nicht gefunden: {source}')

    metrics = ['niqe', 'brisque']
    if args.deep:
        metrics.append('musiq')

    scores = {}
    errors = {}
    for name in metrics:
        try:
            metric = pyiqa.create_metric(name, device='cpu')
            score = metric(str(source))
            scores[name] = float(score.detach().cpu().item())
        except Exception as exc:  # optional model downloads can fail without network
            errors[name] = str(exc)

    payload = {
        'version': 1,
        'file': str(source),
        'tool': 'pyiqa',
        'scores': scores,
        'errors': errors,
        'interpretation': {
            'niqe': 'lower-is-better',
            'brisque': 'lower-is-better',
            'musiq': 'higher-is-better'
        },
        'policy': {
            'qualityScoreIsNotSemanticRelevance': True,
            'qualityScoreDoesNotGrantRights': True
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
