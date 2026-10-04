# Real Media Integration

## Ziel

Die AI-first Pipeline erzeugt möglichst viele KI-Bilder. Wenn ein Beat jedoch echte Bewegung oder echte Authentizität benötigt, wird er in `real-material-queue.json` geschrieben.

`npm run real:integrate` macht aus dieser Queue echte, lokal nutzbare Medien für den Videoschnitt.

```text
real-material-queue.json
        ↓
Policy Gate
        ↓
┌──────────────────────────────────┐
│ echte Bewegung / Real-B-Roll     │ → Pexels, Pixabay
│ Marken, Produkte, Ereignisse,    │ → Wikimedia Commons, Openverse,
│ Geschichte                       │   Internet Archive (+ Review)
└──────────────────────────────────┘
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

## Quellen

| Quelle | Key | Wofür |
|---|---|---|
| Pexels | `PEXELS_API_KEY` | generische B-Roll und Fotos |
| Pixabay | `PIXABAY_API_KEY` | generische B-Roll und Fotos |
| Wikimedia Commons | nein | echte Marken, Produkte, Firmengebäude, Orte, Geschichte |
| Openverse | nein | Fotos (v. a. Flickr) mit CC-Lizenz |
| Internet Archive | nein | historische Videos und Fotos |

Ohne Stock-Key weicht auch generische B-Roll auf die schlüssellosen Archive aus. Mit `--providers wikimedia,openverse` lassen sich Quellen erzwingen.

Automatisch ausgewählt werden nur Treffer mit YouTube-tauglicher Lizenz (Public Domain, CC0, CC BY, CC BY-SA, Pexels/Pixabay-Lizenz) und mindestens 800 px Kantenlänge. NC-/ND-Lizenzen und ungeklärte Rechte werden verworfen.

## Grundregel

Die Pipeline darf keine generische Stockaufnahme als angeblich exakten Beleg verwenden.

Automatisch per Stock such- und downloadbar sind insbesondere:

- fahrende Züge, Autos und Verkehr
- Maschinen und Produktionsanlagen in Bewegung
- Menschenmengen
- Sport-/Bewegungs-B-Roll ohne konkrete Ereignisbehauptung
- Naturbewegung
- allgemeine reale Orte und Establishing Shots
- passende reale Fotos ohne Beweisfunktion

Nur in Archiven gesucht (nie Stock) und immer mit Status `review-required`:

- konkrete Marken oder Produkte
- konkrete Nachrichtenereignisse
- historische Originalbelege

Als `manual-required` bleiben:

- echte Screenshots / Webseiten / Interfaces
- Originaldokumente

So verhindert die Pipeline, dass ein beliebiger Stockclip als Originalaufnahme ausgegeben wird.

## Marken und Produkte erkennen (`--entities`)

Der Planer kennt deine Firmen und Produkte nicht von selbst. Gib sie beim Planen mit:

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --entities "Nokia=Nokia mobile phone|Nokia N95|Nokia headquarters Espoo,iPhone=iPhone 2G,Lumia=Nokia Lumia,Symbian=Symbian phone"
```

- Jeder Beat mit einem dieser Namen wird echtes Archivmaterial statt KI-Bild.
- Sätze ohne Namen („Die Marke stand für …“) übernehmen den zuletzt genannten Namen.
- Nach `=` stehen Suchbegriffe, getrennt mit `|`. Sie verhindern Verwechslungen (Nokia-Firma vs. Stadt Nokia).
- Ein Treffer muss den Namen im Titel, in der Beschreibung oder in den Tags enthalten.
- Dasselbe Bild wird nicht für mehrere Beats verwendet.

## Prüfen und freigeben (`real:review`)

Archivtreffer gehen erst nach deiner Freigabe in den Render:

```bash
npm run real:review -- --dir .local-storage/visual-plans/SESSION/real-media
npm run real:review -- --dir <ordner> --approve beat-001,beat-007
npm run real:review -- --dir <ordner> --approve all
npm run real:review -- --dir <ordner> --reject beat-016
```

Prüfe bei jedem Treffer: Zeigt das Bild wirklich das Richtige? Passt die Lizenz? Bei CC BY-SA gilt zusätzlich „Weitergabe unter gleichen Bedingungen“.

Nach jeder Freigabe entsteht `credits.txt` mit allen Quellenangaben für die YouTube-Beschreibung. Bei CC-BY-Material ist diese Namensnennung Pflicht.

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

- bis zu 3 Suchrichtungen erzeugt (bei Marken: die Suchbegriffe aus `--entities`)
- 2 Seiten pro Suchrichtung und Quelle geprüft
- bis zu 30 Treffer pro Anfrage geladen (je nach Quelle weniger)
- Kandidaten dedupliziert, Lizenz und Mindestauflösung geprüft
- Auflösung, Format, Suchtreffer, Name im Titel und Videolänge bewertet
- der beste noch nicht verwendete Treffer heruntergeladen
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
  credits.txt
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

Zusätzlich: Lizenzcode, Credit-Text und ein Hinweis bei CC BY-SA. Exakte Marken, Produkte und Ereignisse werden nie durch Pexels/Pixabay ersetzt.

## CLI-Optionen

```text
--queue <pfad>             real-material-queue.json
--timings <pfad>           optionale Beat-Timings
--output-dir <pfad>        Ausgabeverzeichnis
--queries <1-8>            Suchrichtungen je Beat
--pages <1-10>             Seiten je Query und Quelle
--per-page <1-80>          Treffer je Anfrage
--alternates <0-10>        gespeicherte Alternativen
--max-dimension <px>       bevorzugte maximale Videokante
--default-duration <sek>   Dauer ohne Timing-Datei
--download <true|false>    echter Download oder Auswahltest
--locale <wert>            Suchsprache für Stock
--providers <liste>        Quellen erzwingen, z. B. wikimedia,openverse
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
