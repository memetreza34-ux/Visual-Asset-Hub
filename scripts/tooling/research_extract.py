#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description='Extract clean article text and metadata with Trafilatura.')
    parser.add_argument('--url', required=True)
    parser.add_argument('--output')
    args = parser.parse_args()

    try:
        import trafilatura
    except ImportError as exc:
        raise SystemExit('Trafilatura fehlt: python3 -m pip install trafilatura') from exc

    downloaded = trafilatura.fetch_url(args.url)
    if not downloaded:
        raise SystemExit('Quelle konnte nicht geladen werden.')

    extracted = trafilatura.extract(
        downloaded,
        url=args.url,
        output_format='json',
        with_metadata=True,
        include_links=True,
        include_images=True,
        favor_precision=True,
    )
    if not extracted:
        raise SystemExit('Trafilatura konnte keinen Hauptinhalt extrahieren.')

    try:
        data = json.loads(extracted)
    except json.JSONDecodeError:
        data = {'url': args.url, 'text': extracted}

    data['source_url'] = args.url
    data['extraction_tool'] = 'trafilatura'
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'

    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8')
    print(text, end='')


if __name__ == '__main__':
    main()
