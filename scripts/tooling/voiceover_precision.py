#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description='Word-level voiceover timing with WhisperX.')
    parser.add_argument('--file', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--language', default='de')
    parser.add_argument('--model', default='small')
    args = parser.parse_args()

    try:
        import torch
        import whisperx
    except ImportError as exc:
        raise SystemExit('WhisperX fehlt: python3 -m pip install whisperx') from exc

    source = Path(args.file).resolve()
    target = Path(args.output).resolve()
    if not source.is_file():
        raise SystemExit(f'Datei nicht gefunden: {source}')

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    compute_type = 'float16' if device == 'cuda' else 'int8'
    audio = whisperx.load_audio(str(source))
    model = whisperx.load_model(args.model, device, compute_type=compute_type, language=args.language)
    raw = model.transcribe(audio, batch_size=8 if device == 'cuda' else 2)

    language = raw.get('language') or args.language
    align_model, metadata = whisperx.load_align_model(language_code=language, device=device)
    aligned = whisperx.align(raw['segments'], align_model, metadata, audio, device, return_char_alignments=False)
    words = aligned.get('word_segments') or []
    payload = {
        'version': 1,
        'source': str(source),
        'tool': 'WhisperX',
        'model': args.model,
        'language': language,
        'device': device,
        'segments': aligned.get('segments', []),
        'words': words,
        'policy': {
            'userVoiceoverRemainsMasterAudio': True,
            'noSyntheticVoiceGenerated': True,
            'timingsRequireEditorialSanityCheck': True
        }
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'output': str(target), 'words': len(words), 'segments': len(payload['segments'])}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
