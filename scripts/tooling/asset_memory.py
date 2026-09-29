#!/usr/bin/env python3
import argparse
import json
import sqlite3
import struct
from pathlib import Path


def serialize_f32(values):
    return struct.pack(f'{len(values)}f', *values)


def load_stack():
    try:
        import sqlite_vec
        import open_clip
        import torch
        from PIL import Image
    except ImportError as exc:
        raise SystemExit('Asset Memory benötigt: sqlite-vec, open_clip_torch, torch, pillow') from exc
    return sqlite_vec, open_clip, torch, Image


def model_stack(open_clip, torch):
    model_name = 'ViT-B-32'
    pretrained = 'laion2b_s34b_b79k'
    model, _, preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
    tokenizer = open_clip.get_tokenizer(model_name)
    model.eval()
    return model, preprocess, tokenizer


def image_embedding(model, preprocess, torch, Image, file):
    image = preprocess(Image.open(file).convert('RGB')).unsqueeze(0)
    with torch.no_grad():
        emb = model.encode_image(image)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    return emb[0].cpu().float().tolist()


def text_embedding(model, tokenizer, torch, text):
    tokens = tokenizer([text])
    with torch.no_grad():
        emb = model.encode_text(tokens)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    return emb[0].cpu().float().tolist()


def open_db(db_path, sqlite_vec, dim):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(db_path))
    db.enable_load_extension(True)
    sqlite_vec.load(db)
    db.enable_load_extension(False)
    db.execute('CREATE TABLE IF NOT EXISTS assets (id INTEGER PRIMARY KEY, asset_key TEXT UNIQUE, file TEXT NOT NULL, title TEXT, model TEXT NOT NULL)')
    existing = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='vec_assets'").fetchone()
    if not existing:
        db.execute(f'CREATE VIRTUAL TABLE vec_assets USING vec0(embedding float[{dim}])')
    return db


def index(args):
    sqlite_vec, open_clip, torch, Image = load_stack()
    model, preprocess, _ = model_stack(open_clip, torch)
    file = Path(args.file).resolve()
    if not file.is_file():
        raise SystemExit(f'Datei nicht gefunden: {file}')
    vector = image_embedding(model, preprocess, torch, Image, file)
    db = open_db(Path(args.db).resolve(), sqlite_vec, len(vector))
    key = args.id or file.name
    with db:
        existing = db.execute('SELECT id FROM assets WHERE asset_key=?', [key]).fetchone()
        if existing:
            rowid = int(existing[0])
            db.execute('DELETE FROM vec_assets WHERE rowid=?', [rowid])
            db.execute('UPDATE assets SET file=?, title=?, model=? WHERE id=?', [str(file), args.title or file.stem, 'openclip-vit-b-32', rowid])
        else:
            cur = db.execute('INSERT INTO assets(asset_key,file,title,model) VALUES (?,?,?,?)', [key, str(file), args.title or file.stem, 'openclip-vit-b-32'])
            rowid = int(cur.lastrowid)
        db.execute('INSERT INTO vec_assets(rowid, embedding) VALUES (?, ?)', [rowid, serialize_f32(vector)])
    print(json.dumps({'indexed': key, 'rowid': rowid, 'db': str(Path(args.db).resolve()), 'dimensions': len(vector)}, ensure_ascii=False, indent=2))


def search(args):
    sqlite_vec, open_clip, torch, _ = load_stack()
    model, _, tokenizer = model_stack(open_clip, torch)
    vector = text_embedding(model, tokenizer, torch, args.query)
    db = open_db(Path(args.db).resolve(), sqlite_vec, len(vector))
    rows = db.execute(
        'SELECT rowid, distance FROM vec_assets WHERE embedding MATCH ? ORDER BY distance LIMIT ?',
        [serialize_f32(vector), int(args.limit)]
    ).fetchall()
    results = []
    for rowid, distance in rows:
        meta = db.execute('SELECT asset_key,file,title,model FROM assets WHERE id=?', [rowid]).fetchone()
        if not meta:
            continue
        results.append({'id': meta[0], 'file': meta[1], 'title': meta[2], 'model': meta[3], 'distance': float(distance), 'similarity_hint': float(max(0.0, 1.0 - distance))})
    print(json.dumps({'query': args.query, 'results': results, 'note': 'Similarity is a retrieval signal, not proof of event identity or rights.'}, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description='Local OpenCLIP asset memory backed by sqlite-vec.')
    sub = parser.add_subparsers(dest='command', required=True)
    p_index = sub.add_parser('index')
    p_index.add_argument('--db', required=True)
    p_index.add_argument('--file', required=True)
    p_index.add_argument('--id')
    p_index.add_argument('--title')
    p_search = sub.add_parser('search')
    p_search.add_argument('--db', required=True)
    p_search.add_argument('--query', required=True)
    p_search.add_argument('--limit', default='8')
    args = parser.parse_args()
    index(args) if args.command == 'index' else search(args)


if __name__ == '__main__':
    main()
