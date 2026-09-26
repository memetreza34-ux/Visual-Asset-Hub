import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const builder = fs.readFileSync(path.join(process.cwd(), 'web', 'arsenal-builder.js'), 'utf8');

test('Video-Fallback bleibt auf Pexels und Pixabay begrenzt', () => {
  assert.match(builder, /type === 'video'/);
  assert.match(builder, /\['pexels', 'pixabay'\]/);
});

test('Foto-Fallback verwendet die fünf Quellen in kontrollierter Reihenfolge', () => {
  assert.match(builder, /\['unsplash', 'openverse', 'wikimedia', 'pexels', 'pixabay'\]/);
  assert.match(builder, /Nächste Quelle:/);
});

test('Fallback übernimmt Sammlung, Format und Suchbegriff ohne automatische Suche', () => {
  assert.match(builder, /function prepareFallback/);
  assert.match(builder, /data\.job\.collection/);
  assert.match(builder, /data\.job\.query/);
  assert.match(builder, /desiredVariant/);
  assert.match(builder, /Die Suche startet erst nach deinem Klick/);
});
