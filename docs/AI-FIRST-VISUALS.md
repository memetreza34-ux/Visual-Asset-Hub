# AI-first Visual Engine

## Ziel

Visual Asset Hub soll **so viele passende KI-Bilder wie sinnvoll möglich** erzeugen. Stockmaterial ist nicht mehr der Standard. Es wird nur dann bevorzugt, wenn echtes Material einen klaren inhaltlichen Vorteil besitzt.

Grundregel:

```text
Sprechertext / Szene
        ↓
Visual Beats
        ↓
Kann die Aussage glaubwürdig als realistisches Standbild erzeugt werden?
        ├─ Ja  → mehrere KI-Bild-Shots planen
        └─ Nein → echtes Bild / echte B-Roll suchen
```

Der Planer arbeitet damit nach **Generate first, search second**.

## Was standardmäßig als KI-Bild geplant wird

Typische Beispiele:

- Menschen im Alltag
- Büros und Arbeitsplätze
- Psychologie- und Emotionsszenen
- Finanzen und abstrakte wirtschaftliche Situationen
- Wissenschaft und Bildung
- Zukunftsszenarien
- historische Rekonstruktionen, solange kein Originalbeleg benötigt wird
- symbolische Visualisierungen
- neutrale Orte und Umgebungen
- Close-ups und Detailbilder
- Establishing Shots
- Übergangsbilder

Für jeden Visual Beat werden standardmäßig **vier unterschiedliche Shot-Varianten** geplant:

1. Wide / Establishing
2. Medium
3. Close-up
4. Detail

Optional sind bis zu sechs Varianten möglich, zusätzlich POV und Over-the-Shoulder.

## Wann echtes Material Vorrang hat

### 1. Originalbelege

Beispiele:

- Screenshot einer echten Webseite
- Originaldokument
- Zeitungsseite
- echter Chart mit Quellenbezug
- Archivfoto als Beweis

Diese Inhalte dürfen nicht durch ein erfundenes KI-Bild ersetzt werden.

### 2. Konkrete reale Ereignisse

Beispiele:

- Pressekonferenz
- Demonstration
- Wahlereignis
- Sportspiel
- aktuelle Nachrichtenszene

Wenn die reale Aufnahme selbst Teil der Aussage ist, wird echtes Material geplant.

### 3. Exakte Marken, Produkte oder Oberflächen

Beispiele:

- konkretes iPhone-Modell
- echte YouTube-Oberfläche
- Firmenlogo
- bestimmtes Fahrzeugmodell
- reale Produktdarstellung

Die Pipeline soll keine erfundenen Logos oder falschen Interfaces als echten Beleg darstellen.

### 4. Authentische Bewegung

Bestimmte Vorgänge wirken als echte B-Roll deutlich besser:

- fahrende Fahrzeuge
- laufende Produktionsanlagen
- Menschenmengen in Bewegung
- Sportaktionen
- Verkehr
- Fließbandproduktion
- starke Naturbewegung

Hier wird echte B-Roll als Primärmaterial geplant. Ein KI-Standbild kann zusätzlich als Fallback bestehen bleiben.

## Realistischer Bildstil

KI-Prompts enthalten automatisch einen gemeinsamen Dokumentar-Look:

- photorealistic documentary photography
- believable present-day environment
- natural practical lighting
- realistic human anatomy and proportions
- authentic materials and textures
- candid unstaged moment
- subtle cinematic depth
- physically plausible scene

Zusätzlich werden typische KI-Artefakte explizit vermieden:

- keine unnötigen Sci-Fi-Hologramme
- keine Plastikhaut
- keine übertriebenen Gesichtsausdrücke
- keine zusätzlichen Finger oder Gliedmaßen
- keine duplizierten Personen
- keine unlesbaren Fake-UIs
- kein Text oder Wasserzeichen im Bild
- keine unmögliche Beleuchtung

Ziel ist nicht "AI Art", sondern ein Bild, das wie ein Frame aus einer hochwertigen sachlichen Dokumentation wirkt.

## Visual-Dichte

Ein längerer Sprechertext soll nicht automatisch ein einziges Bild erhalten.

Der Planer teilt den Text in **Visual Beats**. Standardmäßig darf ein Beat bis zu 24 Wörter enthalten. Ein längerer Abschnitt erzeugt dadurch mehrere visuelle Einheiten.

Beispiel:

```text
15 Sekunden Sprechertext
↓
3 Visual Beats
↓
4 KI-Shots pro Beat
↓
12 mögliche KI-Bilder
```

Die spätere Timeline kann daraus die stärksten Bilder auswählen und schneller wechseln, statt ein einzelnes Bild lange stehen zu lassen.

## Befehl

Kurzer Sprechertext:

```bash
npm run visual:plan -- "Immer mehr Unternehmen automatisieren Büroarbeit mit künstlicher Intelligenz."
```

Ganzes Skript:

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --images-per-beat 5
```

Shorts / Reels:

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation vertical \
  --images-per-beat 5 \
  --max-words-per-beat 18
```

## Ausgaben

Jeder Lauf erzeugt drei maschinenlesbare Dateien:

```text
visual-plan.json
ai-generation-queue.json
real-material-queue.json
```

### `visual-plan.json`

Enthält die gesamte Entscheidung pro Visual Beat.

### `ai-generation-queue.json`

Enthält ausschließlich die zu generierenden KI-Bilder mit:

- Beat-ID
- Shot-Typ
- Ausrichtung
- Priorität
- vollständigem englischen Bildprompt
- Negativ-/Qualitätsregeln

Diese Queue ist dafür gedacht, von einem Bildgenerator oder einer externen Produktionspipeline abgearbeitet zu werden.

### `real-material-queue.json`

Enthält ausschließlich Szenen, die besser mit echtem Material dargestellt werden:

- gewünschter Medientyp
- Grund für echtes Material
- Stock-Suchbegriff
- Information, ob ein KI-Fallback erlaubt ist

Die vorhandene Smart Asset Discovery kann diese Suchbegriffe anschließend über Pexels und spätere Provider auflösen.

## Verhältnis KI zu Stock

Es gibt **keine starre Prozentquote**.

Ein Video kann beispielsweise 95 % KI-Bilder enthalten, wenn alle Szenen glaubwürdig generierbar sind. Ein Nachrichten- oder Produktvideo kann deutlich mehr echtes Material benötigen.

Entscheidend ist:

> KI ist Standard. Echtes Material muss einen konkreten Mehrwert oder eine Authentizitätsanforderung haben.

## Nächste Integrationsstufe

Der Visual Planner erstellt bereits eine vollständige Generation Queue. Der nächste technische Schritt ist ein Generator-Adapter, der diese Queue automatisch an den gewünschten Bilddienst übergibt und die fertigen Dateien anschließend mit Metadaten in den Asset Hub importiert.
