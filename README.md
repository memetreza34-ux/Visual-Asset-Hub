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
          Render-Handoff
```

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

Scene Cards enthalten u. a.:

- Viewer Takeaway
- Visual Purpose
- Topic Anchor
- Visual Form
- Visual Concept
- Dominant Subject
- Action / State
- Composition
- Camera
- Depth Plan
- Lighting / Mood
- Continuity
- Accuracy
- Text Policy
- Planned Hold
- Prompt QC

Nur vollständige Scene Cards mit QC >= 8/10 werden kompiliert.

## 2. Google Flow Production V3

```bash
npm run flow:compile -- \
  --plan .local-storage/visual-plans/SESSION/visual-plan.json \
  --title "Wie KI Büroarbeit verändert" \
  --cover-text "KI ERSETZT BÜROJOBS?" \
  --target-duration 120 \
  --pilot-strict true
```

Ausgabe:

```text
flow/
  google-flow-master-prompt.txt
  flow-production-plan.json
  flow-generation-queue.json
  pilot-readiness.json
```

### Cover-Strategie

`Bild 01` ist Cover + Opening. Flow erzeugt zuerst exakt drei verwandte Kandidaten A/B/C.

Alle drei teilen:

- denselben exakten Cover-Text
- dieselbe Kernidee
- denselben Style Lock
- dieselbe Farb-/Lichtwelt
- dieselbe wiederkehrende Identität, falls relevant

Sie variieren nur sinnvoll in Framing, Kameraabstand, Negativraum und räumlicher Anordnung.

Wichtig: Der Cover-Brief entsteht aus **Videotitel + Cover-Text + Story-Spine des ganzen Videos**, nicht nur aus dem ersten Sprecher-Satz.

Nach drei akzeptablen Kandidaten:

```text
STOP
→ Nutzer wählt A, B oder C
→ Gewinner = Bild 01.png
```

## 3. Cover auswählen und Stage 2 entsperren

```bash
npm run flow:select-cover -- \
  --production-plan ./flow/flow-production-plan.json \
  --candidate B \
  --reference "Bild 01.png"
```

Das gewählte Cover wird weiche Stil-/World-/Qualitätsreferenz. Beibehalten werden z. B. Rendering-Niveau, Grundfarbfamilie, Texturbehandlung und wiederkehrende Identitäten. Variieren dürfen Szene, Kamera, Komposition, Handlung und lokale Stimmung.

Folgebilder müssen zusammengehören, dürfen aber **keine Cover-Klone** sein.

Text ist außerhalb des Covers standardmäßig aus. Kurzer exakter Text ist nur erlaubt, wenn er im Sprechertext wirklich vorkommt und die Scene Card ihn als wichtig markiert.

## 4. Flow-Bilder sicher importieren

Nach der Flow-Produktion:

```bash
npm run flow:import -- \
  --production-plan ./flow/flow-production-plan.json \
  --cover ./downloads/selected-cover.png \
  --source ./downloads/stage2 \
  --order auto
```

Der Import prüft:

- exakt erwartete Bildanzahl
- sichere Reihenfolge
- Mindestdateigröße
- exakte SHA-256-Duplikate
- saubere Namen `Bild 01.png ... Bild NN.png`

Bei Unsicherheit wird abgebrochen statt falsch zuzuordnen.

## 5. Pilot-Pacing prüfen

```bash
npm run pilot:check -- \
  --visual-plan ./visual-plan.json \
  --production-plan ./flow/flow-production-plan.json \
  --target-duration 120 \
  --strict true
```

Der Check bewertet u. a. Cover-Hold, Intro-Dichte, Visuals pro 100 Sekunden und überlange geplante Beats.

## 6. Echte B-Rolls und Fotos

```bash
npm run real:integrate -- \
  --queue ./real-material-queue.json
```

Der Resolver:

- erzeugt mehrere Suchrichtungen
- durchsucht Pexels über mehrere Seiten
- dedupliziert und rankt Kandidaten
- bevorzugt passendes Format, Auflösung und Videolänge
- lädt das beste Original herunter
- analysiert Videos mit FFmpeg
- speichert Quelle und Lizenz
- bindet das Asset an `beat_id`
- erzeugt `remotion-real-media.json`

Echte Screenshots, Originaldokumente, konkrete News-Ereignisse, historische Originalaufnahmen und exakte Marken-/Produktdarstellungen werden **nicht** durch generischen Stock ersetzt. Sie bleiben `manual-required`.

## 7. AI + Real zusammenführen

```bash
npm run video:manifest -- \
  --visual-plan ./visual-plan.json \
  --production-plan ./flow/flow-production-plan.json \
  --flow-import-report ./flow/final-images/flow-import-report.json \
  --real-manifest ./real-media/remotion-real-media.json
```

Ohne Voiceover-Timings:

```text
assets-ready-awaiting-voice-timings
```

Mit vollständigen Beat-Timings:

```bash
npm run video:manifest -- \
  ... \
  --timings ./beat-timings.json
```

Dann kann der Status werden:

```text
render-handoff-ready
```

Wenn ein Real-Media-Beat ungelöst ist, markiert das Manifest ihn transparent als `manual-required`, `fallback-generation-required` oder `unresolved` statt einen falschen Ersatz zu verwenden.

## Smart Asset Discovery

Für zusätzliche echte Medien:

```bash
npm run discover -- "industrial electrician maintenance" --orientation horizontal
```

Die Discovery unterstützt Multi-Query, Video + Foto, Pagination, Deduplizierung, Relevanz-Ranking und Diversity-Auswahl.

## Asset Library

Der Hub bleibt gleichzeitig eine wiederverwendbare Medienbibliothek.

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

Neue Assets:

```bash
npm run asset:add -- --help
npm run media:analyze -- --help
```

Katalog und Rechteprüfung bleiben unter `catalog/` erhalten.

## Wichtige Befehle

```bash
npm run visual:plan -- --help
npm run flow:compile -- --help
npm run flow:select-cover -- --help
npm run flow:import -- --help
npm run pilot:check -- --help
npm run real:integrate -- --help
npm run video:manifest -- --help
npm run discover -- --help
npm run pexels:search -- --help
npm run asset:add -- --help
npm run media:analyze -- --help
npm run check
npm run serve
```

## GitHub Actions

`AI-first Asset Pipeline` verwendet für den 2-Minuten-Pilot standardmäßig:

- `target_duration = 120`
- `max_words_per_beat = 10`
- optionales striktes Pilot-Gate
- Flow Production V3
- automatischen Real-Media-Resolver

Die Cover-Auswahl und die danach entsperrte Stage 2 bleiben bewusst nutzergesteuert.

## Rechte und Quellen

Nur Assets mit nachvollziehbarer Nutzungserlaubnis speichern. Unbekannte oder problematische Rechte bleiben im Review. Der Hub blockiert u. a. Dubletten, unsichere Pfade, unvollständige Rechteangaben und erkennbare Token-/API-Key-URLs.

Der ältere offene `production-v1`-Branch enthält eine deutlich größere Quellenabdeckung (u. a. NASA, NOAA, USGS, NARA, Smithsonian, Library of Congress, Europeana, Wikimedia). Diese Architektur wird **nicht blind zurückgemergt**. Nach dem Pilot werden bewährte Provider gezielt in den aktuellen AI-first-Stand übernommen.

## Aktueller Stand

Für einen kontrollierten 2-Minuten-Visual-Pilot vorhanden:

- AI-first Content-Density Planner
- Scene Cards + Prompt QC
- Flow Production V3
- Cover-Brief aus Gesamtthema
- 3-Cover-Gate + Nutzerauswahl
- ausgewähltes Cover als weiche Referenz
- Text-Policy
- Pilot-Pacing-Gate
- sicherer Flow-Bildimport
- Real-Media-Resolver
- Pexels Download + FFmpeg-Analyse
- Unified AI/Real Video Manifest
- Übergabestatus für spätere Voiceover-Timings und Remotion

Noch kein vollautomatischer End-to-End-Render in diesem Repo: echte Voiceover-Ausrichtung, finale Timeline und Render-QC bleiben die nächste Stufe nach dem Realtest.
