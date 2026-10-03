# Visual Asset Hub

Visual Asset Hub ist die universelle Visual-Pipeline für **KI-Bilder, echte B-Rolls, Fotos, Screenshots, Archivmaterial und wiederverwendbare Medien**.

Standardstrategie:

> **Generate first, search second — aber nur mit verwendbaren Story-Visuals, nicht mit Prompt-Masse.**

## Kernpipeline

```text
Skript / Sprechertext
        ↓
Content-driven Visual Beats
        ↓
AI oder echtes Material?
   ┌───────────────┴───────────────┐
   ↓                               ↓
KI-Bild                        Real Media
   ↓                               ↓
Scene Card                    Suche / Ranking
   ↓                               ↓
Prompt QC                     Download / FFmpeg
   ↓                               ↓
Flow Production V3            Beat Binding
   ↓                               ↓
3 Cover → Nutzer wählt            │
   ↓                               │
Cover als Referenz                 │
   ↓                               │
Bild 02–NN                         │
   ↓                               │
Safe Flow Import                   │
   └───────────────┬───────────────┘
                   ↓
        Unified Video Manifest
                   ↓
          Voiceover-Timings
                   ↓
             Render Guard
                   ↓
          Render-Handoff
```

## Harte Final-Video-Regel

Ein finaler Frame darf als Primärvisual nur enthalten:

- echtes Bild
- echte B-Roll / echtes Video
- akzeptiertes KI-Bild

Nie sichtbar rendern:

- `REAL SOURCE ASSET`-Karten
- Slot-/Bildnummer-Karten
- Produktionsnotizen
- Debug-Frames
- Missing-Asset-Platzhalter
- technische Vollbildkarten

Fehlt ein Asset, wird der Render **blockiert**, bis ein echtes visuelles Asset vorhanden ist.

Exakte Zahlen dürfen als kurze verifizierte Overlays auf einem gültigen Bild/B-Roll/KI-Visual erscheinen. Keine sterile Vollbild-Metrikkarte.

Vor jedem finalen Render:

```bash
npm run render:check -- --manifest ./final-video-manifest.json
```

Nur bei `RENDER FREIGEGEBEN` darf die Render-Stufe starten.

## 2-Minuten-Pilot

Für den ersten Realtest ist ein eigener Pilot-Standard eingebaut. Details: [`docs/2-MINUTE-PILOT.md`](docs/2-MINUTE-PILOT.md).

Empfohlen:

- ca. 90–150 Sekunden
- bei ~2 Minuten ca. 260–300 Wörter
- `--max-words-per-beat 10`
- mindestens 24 primäre Visuals pro 100 Sekunden
- Ziel 28–42 Visuals pro 100 Sekunden
- mindestens 4 Visual-Starts in den ersten ~10 Sekunden
- Cover maximal 2,2 Sekunden

## 1. Visual Plan

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --max-words-per-beat 10
```

Ausgabe:

```text
visual-plan.json
scene-cards.json
ai-generation-queue.json
real-material-queue.json
```

Der Planer erzeugt ein Hauptvisual pro sinnvoller Story-Einheit. Mehr Bilddichte entsteht durch echte Beat-Splits, nicht durch vier bis sechs ungenutzte Kamera-Alternativen derselben Szene.

## 2. Google Flow Production V3

```bash
npm run flow:compile -- \
  --plan .local-storage/visual-plans/SESSION/visual-plan.json \
  --title "Wie KI Büroarbeit verändert" \
  --cover-text "KI ERSETZT BÜROJOBS?" \
  --target-duration 120 \
  --pilot-strict true
```

## 3. Cover auswählen

```bash
npm run flow:select-cover -- \
  --production-plan ./flow/flow-production-plan.json \
  --candidate B \
  --reference "Bild 01.png"
```

## 4. Flow-Bilder sicher importieren

```bash
npm run flow:import -- \
  --production-plan ./flow/flow-production-plan.json \
  --cover ./downloads/selected-cover.png \
  --source ./downloads/stage2 \
  --order auto
```

## 5. Pilot-Pacing prüfen

```bash
npm run pilot:check -- \
  --visual-plan ./visual-plan.json \
  --production-plan ./flow/flow-production-plan.json \
  --target-duration 120 \
  --strict true
```

## 6. Echte B-Rolls und Fotos

```bash
npm run real:integrate -- \
  --queue ./real-material-queue.json
```

Echte Screenshots, Originaldokumente, konkrete News-Ereignisse, historische Originalaufnahmen und exakte Marken-/Produktdarstellungen werden **nicht** durch generischen Stock ersetzt. Sie bleiben `manual-required`, bis eine echte Quelle vorhanden ist.

## 7. AI + Real zusammenführen

```bash
npm run video:manifest -- \
  --visual-plan ./visual-plan.json \
  --production-plan ./flow/flow-production-plan.json \
  --flow-import-report ./flow/final-images/flow-import-report.json \
  --real-manifest ./real-media/remotion-real-media.json \
  --timings ./beat-timings.json
```

Nur bei vollständigen Assets und Timings kann der Status `render-handoff-ready` werden.

## 8. Finalen Render freigeben

```bash
npm run render:check -- \
  --manifest ./final-video-manifest.json
```

Der Render Guard blockiert insbesondere:

- `manual-required`
- `unresolved`
- `missing-ai-image`
- Beats ohne `local_file`
- technische oder Placeholder-Primärvisuals

## Smart Asset Discovery

```bash
npm run discover -- "industrial electrician maintenance" --orientation horizontal
```

## Asset Library

```text
assets/
  video/
  image/
  animation/
  overlay/
  screen-recording/
  graphic/
previews/
inbox/
catalog/
docs/
scripts/
web/
```

## Wichtige Befehle

```bash
npm run visual:plan -- --help
npm run flow:compile -- --help
npm run flow:select-cover -- --help
npm run flow:import -- --help
npm run pilot:check -- --help
npm run real:integrate -- --help
npm run video:manifest -- --help
npm run render:check -- --help
npm run discover -- --help
npm run pexels:search -- --help
npm run asset:add -- --help
npm run media:analyze -- --help
npm run check
npm run serve
```

## Rechte und Quellen

Nur Assets mit nachvollziehbarer Nutzungserlaubnis speichern. Unbekannte oder problematische Rechte bleiben im Review.

Der ältere offene `production-v1`-Branch enthält eine deutlich größere Quellenabdeckung (u. a. NASA, NOAA, USGS, NARA, Smithsonian, Library of Congress, Europeana, Wikimedia). Diese Architektur wird **nicht blind zurückgemergt**.

## Aktueller Stand

Für einen kontrollierten 2-Minuten-Visual-Pilot vorhanden:

- AI-first Content-Density Planner
- Scene Cards + Prompt QC
- Flow Production V3
- 3-Cover-Gate + Nutzerauswahl
- ausgewähltes Cover als weiche Referenz
- sicherer Flow-Bildimport
- Real-Media-Resolver
- Pexels Download + FFmpeg-Analyse
- Unified AI/Real Video Manifest
- harter Render Guard gegen fehlende Assets und technische Platzhalter

Noch kein vollautomatischer End-to-End-Render in diesem Repo: echte Voiceover-Ausrichtung, finale Timeline und Render-QC bleiben die nächste Stufe.
