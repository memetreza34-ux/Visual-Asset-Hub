# Visual Asset Hub Renderer

Dieser Ordner ist die getrennte Rendering-Schicht für Video-Projekte aus Visual Asset Hub.

Der Renderer entscheidet **nicht** selbst, welche Assets verwendet werden dürfen. Er verarbeitet ausschließlich ein bereits durch `video:project export` erzeugtes `render-manifest.json`.

## Installation

```bash
cd renderer
npm install
```

## 1. Projekt vorbereiten

Zuerst im Repository-Root ein Projekt exportieren:

```bash
npm run video:project -- export --project erstes-video
```

Dann im `renderer/`-Ordner:

```bash
npm run prepare:project -- \
  --project ../projects/erstes-video/render-manifest.json
```

Der Prepare-Schritt:

- validiert das Render-Manifest,
- löscht den vorherigen Staging-Asset-Ordner,
- kopiert nur die im Manifest referenzierten lokalen Assets nach `renderer/public/assets/`,
- belässt externe HTTP(S)-Quellen als externe Quellen,
- erzeugt `src/generated-manifest.ts`,
- erzeugt `generated/attribution.txt`.

## 2. Vorschau

```bash
npm run studio
```

Composition:

```text
AssetVideo
```

## 3. MP4 rendern

```bash
npm run render
```

Standardausgabe:

```text
renderer/out/video.mp4
```

## Verhalten

- Szenen werden exakt über `fromFrame` und `durationInFrames` positioniert.
- Video-B-Roll ist standardmäßig stumm, damit Stock-Audio nicht ungeplant mit einer späteren Voiceover-Spur kollidiert.
- `trimStartSeconds` wird in Frames umgesetzt.
- `cover` und `contain` werden unterstützt.
- Bilder erhalten eine sehr leichte Ken-Burns-artige Skalierung.
- kurze Ein-/Ausblendungen werden framebasiert gerendert.
- CSS-Transitions werden nicht verwendet.

## Attribution

`generated/attribution.txt` enthält alle Attributionen, die aus dem Asset-Katalog in das Projektmanifest übernommen wurden. Diese Datei ist für Videobeschreibung, Credits oder andere erforderliche Lizenzhinweise gedacht.

## Wichtig

`src/generated-manifest.ts`, `public/assets/` und `generated/` sind Build-/Staging-Daten. Vor einem neuen Video immer erneut `prepare:project` ausführen.
