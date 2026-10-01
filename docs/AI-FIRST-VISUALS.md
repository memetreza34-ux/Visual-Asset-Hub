# AI-first Visual Engine V2

## Ziel

Visual Asset Hub plant **so viele verwendbare KI-Bilder wie sinnvoll**, ohne künstlich mehrere ungenutzte Varianten derselben Szene zu erzeugen.

Die Grundregel bleibt:

```text
Sprechertext
  ↓
inhaltliche Story-Beats
  ↓
pro Beat bestes visuelles Mittel
  ├─ glaubwürdig als KI-Standbild → KI-Bild
  └─ echte Authentizität / echte Bewegung nötig → Real Media
```

## Was gegenüber V1 geändert wurde

Entfernt wurde die alte Regel "4–6 Kamera-Varianten pro Beat". Sie erzeugte viele Prompts, aber nicht automatisch viele nutzbare Timeline-Bilder.

V2 arbeitet stattdessen mit **Content Density**:

- ein Bild = ein klarer visueller Zweck
- neue Kernidee = neuer Beat
- neue Ursache/Folge = neuer Beat
- neuer Ort / Zeitraum / Akteur / Beispiel = neuer Beat
- Standard: maximal 16 Wörter pro Beat
- kleinere `--max-words-per-beat`-Werte erzeugen mehr echte Story-Bilder
- geschätzte Hold-Zeit wird pro Beat mitgeführt

Damit entstehen mehr Bilder, die tatsächlich in der Timeline verwendet werden können.

## Bild 01 = Cover + Opening

Der erste AI-Visual ist verbindlich:

```text
Bild 01 = Cover + Opening Image
```

Der Flow-Compiler erzeugt daraus später **genau drei Cover-Kandidaten**. Erst nach expliziter Nutzerauswahl wird mit Bild 02 weitergemacht.

Es gibt für YouTube-Longform in diesem System **kein Bild 00**.

## Scene Cards

Jedes primäre KI-Bild bekommt eine strukturierte Scene Card:

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

Der Bildprompt wird erst aus dieser Karte kompiliert. Flow soll nicht selbst entscheiden müssen, was eine Szene eigentlich erklären soll.

## Visual Forms

Der Planer wählt abhängig von der Aussage u. a.:

- `comparison`
- `cause-effect`
- `process-sequence`
- `system-hierarchy`
- `cutaway-section`
- `character-scene`
- `environment-overview`
- `object-focus`

Menschen sind **kein automatischer Fallback**. Eine Umgebung, ein Objekt, ein Vergleich oder ein Prozess darf die Szene tragen, wenn das die Aussage besser erklärt.

## KI-Standard

Normale generierbare Szenen werden als KI-Bild geplant, z. B.:

- Alltag und Arbeit
- Büros
- Psychologie / Emotionen
- Finanzen
- Wissenschaft / Bildung
- Zukunftsszenarien
- Rekonstruktionen ohne Beweisfunktion
- Symbolbilder
- neutrale Orte
- Close-ups / Details / Establishing Views

Der Default Style Lock ist realistisch-dokumentarisch:

- glaubwürdige reale Umgebung
- natürliche praktische Lichtquellen
- realistische Anatomie
- echte Materialien und Abnutzung
- physikalisch plausible Perspektive
- zurückhaltender Kontrast
- kein Werbe-Glanz
- keine unnötigen Sci-Fi-Hologramme
- keine Plastikhaut
- keine deformierten Hände
- keine duplizierten Personen
- keine erfundenen Logos / Fake-UIs
- kein Pseudo-Text

## Wann echtes Material Vorrang hat

### Exakte Belege

- echte Screenshots
- Webseiten / Interfaces
- Originaldokumente
- echte Charts mit Quellenbezug
- historische Originalfotos

### Konkrete reale Ereignisse

- Pressekonferenzen
- Demonstrationen
- Wahlen
- konkrete Sportereignisse
- aktuelle Nachrichtenszenen

### Exakte Marken / Produkte / Orte

Wenn die reale Identität Teil der Aussage ist, darf kein erfundenes KI-Ersatzbild als Original ausgegeben werden.

### Authentische Bewegung

- fahrende Züge / Autos
- Produktionsanlagen
- Menschenmengen
- Sportbewegung
- Verkehr
- starke Naturbewegung

Hier wird echte B-Roll bevorzugt. Ein KI-Fallback darf zusätzlich existieren, wenn die Szene ohne Täuschung als Standbild darstellbar ist.

## Befehle

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --max-words-per-beat 14
```

Mehr Bilddichte:

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --max-words-per-beat 10
```

## Ausgaben

```text
visual-plan.json
scene-cards.json
ai-generation-queue.json
real-material-queue.json
```

`ai-generation-queue.json` enthält primäre KI-Bilder plus klar markierte Fallbacks. `real-material-queue.json` enthält echte Bilder/B-Rolls. `scene-cards.json` ist die strukturierte Grundlage für Google Flow.

## Nächster Schritt: Flow Compiler

```bash
npm run flow:compile -- \
  --plan ./visual-plan.json \
  --title "Videotitel" \
  --cover-text "EXAKTER COVER TEXT"
```

Der Compiler erzeugt Cover-Gate, Master-Prompt, Bildnummerierung, World/Style Lock, Einzelgenerierung und 5er-QC-Blöcke. Details: `docs/FLOW-PRODUCTION.md`.
