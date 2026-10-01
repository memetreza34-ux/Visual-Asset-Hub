# Google Flow Production System V2

## Ziel

Der Visual Asset Hub kompiliert nicht mehr nur einzelne Bildprompts. Er erzeugt einen vollständigen Produktionsplan für Google Flow.

```text
Script
  ↓
Visual Beats
  ↓
AI / Real Entscheidung
  ↓
Scene Cards
  ↓
Prompt QC
  ↓
Style Lock + World Lock
  ↓
Flow Compiler
  ↓
Stage 1: Cover Gate
  ↓
Stage 2: sequenzielle Bilder
```

## Grundregeln

### Narration first

Jedes Bild unterstützt exakt den zugeordneten gesprochenen Beat. Die Visual Form wird nach Aussage gewählt, nicht aus Gewohnheit.

Menschen werden nicht automatisch ins Bild gesetzt. Je nach Aussage können Umgebung, Objekt, Vergleich, Ursache/Folge, Prozess oder Cutaway besser sein.

### Bild 01

`Bild 01` ist **Cover und Opening Image**.

Stage 1:

1. Bild 01 Kandidat A erzeugen
2. vollständig warten
3. QC
4. Bild 01 Kandidat B erzeugen
5. vollständig warten
6. QC
7. Bild 01 Kandidat C erzeugen
8. vollständig warten
9. QC
10. STOP
11. Nutzer wählt explizit den Gewinner
12. Gewinner wird `Bild 01.png`

Vor der Auswahl darf `Bild 02` nicht erzeugt werden.

### Stage 2

Nach der Cover-Auswahl:

```text
aktuellen Bildblock lesen
  ↓
genau EIN Bild erzeugen
  ↓
auf Ergebnis warten
  ↓
QC
  ├─ FAIL → gleiche Bildnummer erneut
  └─ PASS → exakt in Bild NN.png umbenennen
                  ↓
             nächstes Bild
```

Keine parallele Bildgeneration.

## Fünferblöcke

Die Bilder nach dem Cover werden in Kontrollblöcke zu fünf Bildern gruppiert.

Beispiel:

```text
Block 1: Bild 02–06
Block 2: Bild 07–11
Block 3: Bild 12–16
```

Das bedeutet **nicht**, dass fünf Bilder parallel erzeugt werden. Innerhalb jedes Blocks bleibt die Generation strikt sequenziell.

Am Blockende wird geprüft:

- alle Dateinamen korrekt
- kein Bild fehlt
- keine unnötigen Kompositionsduplikate
- kein Style Drift
- wiederkehrende Figuren/Orte/Props konsistent
- kein Pseudo-Text
- Bild passt weiterhin zu seinem Audio Anchor

## Scene Card

Jede Szene besitzt vor der Prompt-Erstellung:

```text
Viewer Takeaway
Visual Purpose
Topic Anchor
Visual Form
Visual Concept
Dominant Subject
Action / State
Composition
Camera
Depth Plan
Lighting / Mood
Supporting Elements
Continuity Note
Accuracy Note
Planned Hold
Prompt QC Score
```

Nur Scene Cards mit QC >= 8/10 werden kompiliert.

## Style Lock

Der Visual Asset Hub ist universal und übernimmt **keine Stickman-, FinanzNeo- oder andere Kanalwelt automatisch**.

Ohne projektspezifischen Lock gilt der Default:

`photoreal-documentary-natural-v2`

Er steht für glaubwürdige dokumentarische Standbilder mit realistischen Materialien, Anatomie, Perspektive und natürlichen praktischen Lichtquellen.

Ein Kanal kann stattdessen einen eigenen Style Lock übergeben:

```bash
npm run flow:compile -- \
  --plan ./visual-plan.json \
  --title "..." \
  --cover-text "..." \
  --style-lock ./my-style-lock.json
```

Pflichtfelder:

```json
{
  "status": "READY",
  "style_id": "my-style-v1",
  "master_style_prompt": "...",
  "scene_style_anchor": "...",
  "global_negative_prompt": "..."
}
```

## World Lock

Der World Lock hält innerhalb eines Videos konstant:

- wiederkehrende Personen
- Orte
- Props
- Kleidung
- räumliche Logik
- Grundmaterialien / Basisfarben

Variieren dürfen, wenn sinnvoll:

- Kamera
- Perspektive
- Distanz
- Licht
- Wetter
- Tageszeit
- Stimmung
- Visual Form

Der Cover-Gewinner darf später als zusätzliche Continuity-Referenz dienen. Er darf aber **nicht** dazu führen, dass jede Szene seine Komposition oder fremde Personen klont.

## Cover-Text und Textregel

Cover:

- exakt der übergebene deutsche Text
- genau einmal
- korrekt geschrieben
- gut lesbar
- hoher Kontrast
- Hauptmotiv nicht verdecken

Bild 02–NN:

- kein sichtbarer Text
- keine Labels
- keine Bildnummern
- keine Wasserzeichen
- keine erfundenen Logos
- keine Pseudo-Schrift

Projektspezifische Ausnahmen müssen vor der Kompilierung bewusst eingebaut werden.

## Vermeidete schlechte Muster

V2 entfernt bewusst:

- 4–6 automatische Kamera-Alternativen pro normalem Beat
- parallele Flow-Batches
- `Bild 00` im YouTube-Longform-System
- Menschen als Standard-Füllmaterial
- generische Hype-Promptwörter wie `epic`, `ultra detailed`, `masterpiece`, `8k`, `bokeh`
- ungeprüft geerbte Bildwelten aus anderen Kanal-Repositories
- Cover automatisch auswählen
- generisches Stockmaterial als angeblichen Originalbeleg verwenden

## Befehle

### 1. Visual Plan

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --max-words-per-beat 14
```

### 2. Flow Production kompilieren

```bash
npm run flow:compile -- \
  --plan ./.local-storage/visual-plans/SESSION/visual-plan.json \
  --title "Wie KI Büroarbeit verändert" \
  --cover-text "KI ERSETZT BÜROJOBS?"
```

### Ausgabe

```text
flow/
  google-flow-master-prompt.txt
  flow-production-plan.json
  flow-generation-queue.json
```

`google-flow-master-prompt.txt` ist der fertige Master-Prompt für die Produktionslogik.

`flow-production-plan.json` enthält Bildnummern, Scene Cards, kompilierte Prompts und QC-Blöcke.

`flow-generation-queue.json` enthält Stage 1 und Stage 2 als maschinenlesbare Jobs.

## Zusammen mit Real Media

```text
Visual Plan
  ├─ AI Queue → Flow Compiler → KI-Bilder
  └─ Real Queue → real:integrate → B-Rolls / echte Fotos
```

Später werden beide Seiten über Beat IDs und Timings in das finale Remotion-Manifest zusammengeführt.
