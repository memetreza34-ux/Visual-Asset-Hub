# Visual Asset Hub

Visual Asset Hub ist die universelle Visual-Pipeline für **KI-Bilder, echte B-Rolls, Fotos, Screenshots, Archivmaterial und wiederverwendbare Medien**.

Die aktuelle Standardstrategie lautet:

> **Generate first, search second — aber nur mit verwendbaren Story-Visuals, nicht mit künstlicher Prompt-Masse.**

## Kernpipeline

```text
Skript / Sprechertext
        ↓
Content-driven Visual Beats
        ↓
Bestes visuelles Mittel pro Beat
   ┌───────────────┴───────────────┐
   ↓                               ↓
KI-Bild                        echtes Material
   ↓                               ↓
Scene Card                    Real-Media Queue
   ↓                               ↓
Prompt QC                     Suche / Ranking
   ↓                               ↓
Style + World Lock            Download / FFmpeg
   ↓                               ↓
Google Flow Compiler          Beat Binding
   └───────────────┬───────────────┘
                   ↓
            finale Video-Timeline
```

## 1. AI-first Visual Plan V2

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --max-words-per-beat 14
```

Der Planer:

- zerlegt Narration in echte Story-Beats
- erzeugt **ein Hauptvisual pro inhaltlichem Beat**
- erhöht Bildmenge durch sinnvolle Beat-Splits statt 4–6 ungenutzter Kamera-Alternativen
- plant `Bild 01` als Cover + Opening
- erstellt strukturierte Scene Cards
- wählt Visual Forms wie Comparison, Cause/Effect, Process, Character Scene, Environment, Object Focus oder Cutaway
- bevorzugt KI-Bilder, solange keine echte Authentizität oder echte Bewegung nötig ist
- markiert reale Belege und echte B-Rolls separat
- hält KI-Fallbacks getrennt von Primärvisuals

Standardmäßig sind maximal 16 Wörter pro Beat vorgesehen. Kleinere Werte erhöhen die Bilddichte.

Ausgabe:

```text
visual-plan.json
scene-cards.json
ai-generation-queue.json
real-material-queue.json
```

Details: [`docs/AI-FIRST-VISUALS.md`](docs/AI-FIRST-VISUALS.md)

## 2. Google Flow Production V2

```bash
npm run flow:compile -- \
  --plan .local-storage/visual-plans/SESSION/visual-plan.json \
  --title "Wie KI Büroarbeit verändert" \
  --cover-text "KI ERSETZT BÜROJOBS?"
```

Der Compiler erzeugt:

```text
flow/
  google-flow-master-prompt.txt
  flow-production-plan.json
  flow-generation-queue.json
```

### Cover Gate

`Bild 01` ist Cover + Opening.

```text
Kandidat A → warten → QC
Kandidat B → warten → QC
Kandidat C → warten → QC
STOP
Nutzer wählt Gewinner
Gewinner = Bild 01.png
```

Vor der expliziten Auswahl darf Bild 02 nicht produziert werden.

### Danach: streng sequenziell

```text
aktuelles Bild lesen
→ genau EIN Bild erzeugen
→ vollständig warten
→ QC
→ bei FAIL gleiche Nummer wiederholen
→ bei PASS exakt umbenennen
→ erst dann nächstes Bild
```

Die folgenden Bilder werden in **5er-QC-Blöcke** gruppiert, aber niemals parallel erzeugt.

Beispiel:

```text
Block 1: Bild 02–06
Block 2: Bild 07–11
Block 3: Bild 12–16
```

Details: [`docs/FLOW-PRODUCTION.md`](docs/FLOW-PRODUCTION.md)

## Scene Cards

Vor jedem Flow-Prompt steht eine strukturierte Regieentscheidung:

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
- Supporting Elements
- Continuity Note
- Accuracy Note
- Planned Hold
- Prompt QC Score

Nur vollständige Cards mit QC >= 8/10 werden kompiliert.

## Style Lock und World Lock

Der Hub übernimmt **keine Bildwelt aus einem anderen Kanal automatisch**.

Default ist:

```text
photoreal-documentary-natural-v2
```

Ein Kanal kann einen eigenen Style Lock einspielen. Der World Lock hält wiederkehrende Figuren, Orte, Kleidung, Props und räumliche Logik innerhalb eines Videos konsistent, ohne jede Szene gleich aussehen zu lassen.

## Was bewusst entfernt wurde

- automatische 4–6 Shot-Varianten für jeden normalen Beat
- parallele Google-Flow-Batches
- `Bild 00` im YouTube-Longform-System
- Menschen als Standard-Füllmotiv
- generische Prompt-Hypewörter wie `epic`, `ultra detailed`, `masterpiece`, `8k`, `bokeh`
- blindes Kopieren einer Stickman-, Finanz- oder anderen Kanal-Bildwelt
- automatische Cover-Auswahl ohne Nutzer
- generisches Stockmaterial als angeblicher Originalbeleg

## 3. Echte B-Rolls und Fotos

```bash
npm run real:integrate -- \
  --queue .local-storage/visual-plans/SESSION/real-material-queue.json
```

Der Resolver:

- erzeugt mehrere Suchrichtungen
- durchsucht Pexels über mehrere Seiten
- dedupliziert und rankt Kandidaten
- bevorzugt passendes Format, Auflösung und Videolänge
- lädt die beste Originaldatei
- analysiert Videos mit FFmpeg
- speichert Quelle und Lizenz
- bindet das Asset an `beat_id`
- erzeugt `remotion-real-media.json`

Mit echten Beat-Timings:

```bash
npm run real:integrate -- \
  --queue ./real-material-queue.json \
  --timings ./beat-timings.json
```

### Kein falscher Beleg

Echte Screenshots, Originaldokumente, konkrete News-Ereignisse, historische Originalaufnahmen und exakte Marken-/Produktdarstellungen werden nicht durch irgendeinen Stockclip ersetzt. Sie bleiben `manual-required`, bis eine passende Originalquelle vorliegt.

Details: [`docs/REAL-MEDIA-INTEGRATION.md`](docs/REAL-MEDIA-INTEGRATION.md)

## 4. Smart Discovery

```bash
npm run discover -- "industrial electrician maintenance" --orientation horizontal
```

Die Discovery unterstützt:

- Multi-Query
- Video + Foto
- Pagination
- Deduplizierung
- Relevanz-Ranking
- Diversity-Auswahl

Standardmäßig können bei 8 Queries × 2 Medientypen × 2 Seiten × 30 Treffern theoretisch bis zu 960 Rohkandidaten geprüft werden.

Details: [`docs/DISCOVERY.md`](docs/DISCOVERY.md)

## Pexels

`.env.example` als `.env` kopieren:

```env
PEXELS_API_KEY=DEIN_PEXELS_SCHLUESSEL
```

Einzelsuche:

```bash
npm run pexels:search -- "modern factory" --type video --orientation horizontal --per-page 20
```

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

Neue Dateien werden über `asset:add` aufgenommen:

```bash
npm run asset:add -- --help
```

Medienanalyse:

```bash
npm run media:analyze -- --help
```

Der Katalog in `catalog/assets.json` speichert u. a. ID, Typ, Kategorie, Tags, Motiv, Aktion, Kameraeinstellung, technische Daten, Speicherpfad, Quelle, Lizenzstatus und Hash.

## Wichtige Befehle

```bash
npm run visual:plan -- --help
npm run flow:compile -- --help
npm run real:integrate -- --help
npm run discover -- --help
npm run pexels:search -- --help
npm run asset:add -- --help
npm run media:analyze -- --help
npm run validate
npm run index
npm run test
npm run check
npm run serve
```

## GitHub Actions

`AI-first Asset Pipeline` führt in einem Lauf aus:

```text
Narration
→ Visual Plan V2
→ Google Flow Master Prompt
→ Real-Media Resolution
→ gemeinsames Pipeline-Artefakt
```

Dafür werden Videotitel, Cover-Text, Zielformat und Bilddichte als Inputs übergeben.

## Rechte und Sicherheit

Nur Assets speichern, für die eine nachvollziehbare Nutzungserlaubnis besteht. Unbekannte oder problematische Rechte bleiben im Review. Der Hub blockiert u. a. Dubletten, unsichere Pfade, unvollständige Rechteangaben und erkennbare Token-/API-Key-URLs.

## Aktueller Stand

Enthalten sind jetzt:

- AI-first Content-Density Planner V2
- Scene Cards + Prompt QC
- Bild-01-Cover-Gate mit 3 Kandidaten
- universeller Google Flow Compiler
- Style Lock + World Lock
- strikte Einzelgenerierungs-Queue
- 5er-QC-Blöcke
- getrennte AI- und Real-Media-Queues
- automatischer Real-Media-Resolver
- Pexels Download + FFmpeg-Analyse
- Remotion-ready Real-Media-Bindings
- Smart Asset Discovery
- Katalog, Rechte- und Dublettenprüfung
- Websuche und Git-LFS-Struktur

Nächster große Integrationsschritt: **Flow-Ergebnisse automatisch zurück in den Hub importieren und AI- + Real-Media-Bindings zu einem finalen Remotion-Video-Manifest zusammenführen.**
