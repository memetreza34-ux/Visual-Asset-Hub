# Real Media Integration

## Ziel

Die AI-first Pipeline erzeugt möglichst viele KI-Bilder. Wenn ein Beat jedoch echte Bewegung oder echte Authentizität benötigt, wird er in `real-material-queue.json` geschrieben.

`npm run real:integrate` macht aus dieser Queue echte, lokal nutzbare Medien für den Videoschnitt.

```text
real-material-queue.json
        ↓
Policy Gate
        ↓
┌───────────────────────────────┐
│ echte Bewegung / Real-B-Roll │ → Pexels-Suche
└───────────────────────────────┘
        ↓
Multi-Query + Pagination
        ↓
Ranking + Deduplizierung
        ↓
beste Originaldatei
        ↓
Download
        ↓
FFmpeg-Analyse bei Video
        ↓
Beat-Binding
        ↓
remotion-real-media.json
```

## Grundregel

Die Pipeline darf keine generische Stockaufnahme als angeblich exakten Beleg verwenden.

Automatisch such- und downloadbar sind insbesondere:

- fahrende Züge, Autos und Verkehr
- Maschinen und Produktionsanlagen in Bewegung
- Menschenmengen
- Sport-/Bewegungs-B-Roll ohne konkrete Ereignisbehauptung
- Naturbewegung
- allgemeine reale Orte und Establishing Shots
- passende reale Fotos ohne Beweisfunktion

Als `manual-required` bleiben:

- echte Screenshots / Webseiten / Interfaces
- Originaldokumente
- konkrete Nachrichtenereignisse
- konkrete Marken oder Produkte, wenn Exaktheit wichtig ist
- historische Originalbelege

So verhindert die Pipeline, dass ein beliebiger Stockclip als Originalaufnahme ausgegeben wird.

## Verwendung

Zuerst den AI-first Visual Plan erstellen:

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --images-per-beat 5
```

Dadurch entsteht unter anderem:

```text
real-material-queue.json
```

Dann echtes Material auflösen:

```bash
npm run real:integrate -- \
  --queue .local-storage/visual-plans/SESSION/real-material-queue.json
```

Standardmäßig werden pro Real-Beat:

- bis zu 3 Suchrichtungen erzeugt
- 2 Pexels-Seiten pro Suchrichtung geprüft
- 30 Treffer pro Anfrage geladen
- Kandidaten dedupliziert
- Auflösung, Format, Suchtreffer und Videolänge bewertet
- der beste Treffer heruntergeladen
- 3 Alternativen in den Metadaten behalten

## Mit echten Beat-Zeiten

Wenn Voiceover-/Beat-Timings vorhanden sind, können sie direkt eingebunden werden.

```json
{
  "beats": [
    {
      "beat_id": "beat-001",
      "start_seconds": 0,
      "duration_seconds": 4.8
    },
    {
      "beat_id": "beat-002",
      "start_seconds": 4.8,
      "duration_seconds": 3.6
    }
  ]
}
```

Aufruf:

```bash
npm run real:integrate -- \
  --queue ./real-material-queue.json \
  --timings ./beat-timings.json
```

Damit enthält das Remotion-Manifest direkt `start_seconds` und `duration_seconds`.

## Ausgabe

Neben der Queue entsteht standardmäßig:

```text
real-media/
  real-media-resolution.json
  remotion-real-media.json
  files/
    beat-002-video-12345.mp4
    beat-006-image-98765.jpg
  metadata/
    beat-002-real-01.json
    beat-006-real-01.json
```

### `real-media-resolution.json`

Enthält pro Beat:

- Suchqueries
- Fehler einzelner Suchanfragen
- gewählten Kandidaten
- alternative Kandidaten
- Pexels-Quelle und Creator
- Auswahlscore
- Downloadinformationen
- technische FFmpeg-Daten
- Review-Status

### `remotion-real-media.json`

Diese Datei ist die Schnittstelle zum Videoschnitt.

Beispiel:

```json
{
  "id": "beat-002-real-01",
  "beat_id": "beat-002",
  "status": "ready",
  "source_mode": "real-media",
  "asset_type": "video",
  "provider": "pexels",
  "provider_id": "12345",
  "local_file": ".local-storage/visual-plans/session/real-media/files/beat-002-video-12345.mp4",
  "placement": {
    "start_seconds": 4.8,
    "duration_seconds": 3.6,
    "trim_start_seconds": 0,
    "fit": "cover",
    "mute": true
  }
}
```

Remotion oder ein anderer Renderer muss dadurch nicht mehr selbst suchen. Er bekommt bereits:

- welche Datei verwendet wird
- zu welchem Beat sie gehört
- wann sie startet
- wie lange sie laufen soll
- ob Audio stumm sein soll
- wie das Medium skaliert werden soll

## Videolänge und Fill

Wenn eine heruntergeladene B-Roll kürzer als der benötigte Beat ist, setzt das Manifest:

```json
"needs_additional_fill": true
```

Der Renderer kann dann den Rest des Beats beispielsweise mit:

- einem KI-Bild
- einer zweiten B-Roll
- einem alternativen Shot
- einem kontrollierten Freeze-Frame

füllen.

Ein zu kurzes Video wird nicht einfach künstlich über seine reale Länge hinaus referenziert.

## Rechte und Quellen

Jeder Download erhält eine Metadatendatei mit:

- Provider
- Provider-ID
- Asset-URL
- Creator
- Creator-URL
- Lizenzstatus
- Lizenz-URL
- Suchqueries
- Downloadzeit
- lokaler Datei

Die aktuelle automatische Downloadstufe verwendet Pexels als realen Stock-Provider. Exakte journalistische/archivarische Quellen werden nicht automatisch durch Pexels ersetzt.

## CLI-Optionen

```text
--queue <pfad>             real-material-queue.json
--timings <pfad>           optionale Beat-Timings
--output-dir <pfad>        Ausgabeverzeichnis
--queries <1-8>            Suchrichtungen je Beat
--pages <1-10>             Seiten je Query
--per-page <1-80>          Treffer je Anfrage
--alternates <0-10>        gespeicherte Alternativen
--max-dimension <px>       bevorzugte maximale Videokante
--default-duration <sek>   Dauer ohne Timing-Datei
--download <true|false>    echter Download oder Auswahltest
--locale <wert>            Pexels-Locale
```

## Was damit jetzt möglich ist

```text
Skript
 ↓
AI-first Visual Plan
 ↓
├─ KI-generierbare Beats → ai-generation-queue
│
└─ Real-Beats → real-material-queue
                 ↓
            real:integrate
                 ↓
        echte Bilder/B-Rolls
                 ↓
        FFmpeg + Quellenmeta
                 ↓
        Remotion-Beat-Binding
```

Der nächste separate Ausbau ist der Generator-Adapter für `ai-generation-queue.json`. Sobald die erzeugten KI-Dateien ebenfalls an ihre Beat-IDs gebunden werden, können beide Seiten in ein gemeinsames finales Video-Manifest zusammengeführt werden.
