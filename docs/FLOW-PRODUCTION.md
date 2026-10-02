# Google Flow Production System V3

## Ziel

Der Visual Asset Hub erzeugt einen vollständigen Produktionsplan für Google Flow.

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
Stage 1: drei Cover
  ↓
Nutzer wählt eins
  ↓
gewähltes Cover = Bild 01 + visuelle Referenz
  ↓
Stage 2: sequenzielle Bilder
```

## Bild 01: drei Cover, eine gemeinsame Bildwelt

Stage 1 erzeugt genau drei Cover-Kandidaten A, B und C.

Alle drei müssen:

- exakt denselben Cover-Text verwenden
- dieselbe Kernidee zeigen
- denselben Style Lock verwenden
- zur selben Farb- und Lichtwelt gehören
- dieselbe wiederkehrende Figur/Objektidentität bewahren, falls relevant

Sie dürfen sich nur sinnvoll in Komposition, Framing, Kameraabstand, Negativraum und räumlicher Anordnung unterscheiden.

Die drei Cover sind **Alternativen derselben visuellen Richtung**, keine drei komplett verschiedenen Art Directions.

Nach drei akzeptablen Kandidaten gilt zwingend:

```text
STOP
↓
Nutzer wählt A, B oder C
↓
Gewinner wird Bild 01.png
↓
Stage 2 darf erst jetzt starten
```

Die Pipeline wählt niemals automatisch ein Cover aus.

## Gewähltes Cover als Referenz

Das gewählte `Bild 01.png` wird ab Stage 2 bei jedem weiteren KI-Bild als visuelle Referenz verwendet.

### Beibehalten

- Rendering-/Realismus-Niveau
- Grundfarbfamilie und Kontrastverhalten
- Material- und Texturbehandlung
- allgemeine Lichtlogik und Qualitätsstufe
- Identität wiederkehrender Personen, Props und Orte

### Bewusst variieren

- Szeneninhalt
- Kamera und Distanz
- Komposition und Motivposition
- Handlung und Pose
- lokale Stimmung, Tageszeit oder Wetter, wenn die Narration es verlangt
- Visual Form, wenn ein anderes Mittel den Beat besser erklärt

### Nicht kopieren

- Cover-Layout in jede Folgeszene
- Cover-Text in spätere Bilder
- Personen oder Objekte nur deshalb, weil sie auf dem Cover vorkommen

Die Zielregel lautet:

> Jedes Bild soll individuell für seinen Story-Beat gebaut sein, aber klar wie Teil desselben Videos wirken.

## Stage 2 entsperren

Nach der Cover-Auswahl:

```bash
npm run flow:select-cover -- \
  --production-plan .local-storage/visual-plans/SESSION/flow/flow-production-plan.json \
  --candidate B \
  --reference "Bild 01.png"
```

Ausgabe:

```text
cover-selection.json
flow-stage2-queue.json
google-flow-stage2-prompt.txt
```

`flow-stage2-queue.json` enthält die gewählte Cover-Referenz bei jedem späteren KI-Bild.

## Stage 2: streng sequenziell

```text
gewähltes Cover als Referenz setzen
  ↓
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

```text
Block 1: Bild 02–06
Block 2: Bild 07–11
Block 3: Bild 12–16
```

Das sind nur QC-Checkpoints, keine parallelen Batches.

Am Blockende prüfen:

- alle Dateinamen korrekt
- kein Bild fehlt
- keine unnötigen Kompositionsduplikate
- kein Style Drift
- Cover-Referenz bleibt als visuelle Identität erkennbar
- wiederkehrende Figuren/Orte/Props konsistent
- Text-Policy eingehalten
- jedes Bild passt zu seinem Audio Anchor

## Scene Card

Jede KI-Szene besitzt:

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
Text Policy
Planned Hold
Prompt QC Score
```

Nur Scene Cards mit QC >= 8/10 werden kompiliert.

## Text-Policy

### Cover

Bild 01 enthält exakt den vom Nutzer vorgegebenen Cover-Text, genau einmal.

### Normale Story-Bilder

Standard: **kein sichtbarer Text**.

Kurzer sichtbarer Text ist nur erlaubt, wenn er:

1. inhaltlich wirklich wichtig ist,
2. wörtlich im Sprechertext vorkommt,
3. kurz genug für das Bild ist,
4. im Scene-Card-Feld `text_policy.exact_text` steht.

Der automatische Planer erkennt konservativ unter anderem:

- Jahreszahlen wie `1955`
- Prozentwerte wie `37,5%`
- kurze Geldbeträge
- kurze ausdrücklich zitierte Bezeichnungen

Flow darf niemals zusätzliche Labels, Fake-Wörter oder Pseudo-Schrift erfinden.

## Style Lock

Der Hub bleibt universal. Er übernimmt keine Stickman-, FinanzNeo- oder andere Kanalwelt automatisch.

Default:

`photoreal-documentary-natural-v3`

Ein Kanal kann einen eigenen Style Lock übergeben:

```bash
npm run flow:compile -- \
  --plan ./visual-plan.json \
  --title "..." \
  --cover-text "..." \
  --style-lock ./my-style-lock.json
```

## World Lock

Der World Lock hält innerhalb eines Videos konstant:

- wiederkehrende Personen
- Orte
- Props
- Kleidung
- räumliche Logik
- Grundmaterialien / Basisfarben

Kamera, Perspektive, Licht, Wetter, Tageszeit und Visual Form dürfen sich ändern, wenn das den aktuellen Beat besser erklärt.

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
  --plan .local-storage/visual-plans/SESSION/visual-plan.json \
  --title "Wie KI Büroarbeit verändert" \
  --cover-text "KI ERSETZT BÜROJOBS?"
```

### 3. Nach deiner Cover-Auswahl Stage 2 freischalten

```bash
npm run flow:select-cover -- \
  --production-plan .local-storage/visual-plans/SESSION/flow/flow-production-plan.json \
  --candidate A \
  --reference "Bild 01.png"
```

## Zusammen mit Real Media

```text
Visual Plan
  ├─ AI Queue → Cover Gate → Cover-Auswahl → Flow Stage 2 → KI-Bilder
  └─ Real Queue → real:integrate → B-Rolls / echte Fotos
```

Beide Seiten bleiben über Beat IDs und spätere Timings zusammenführbar.
