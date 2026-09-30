# Architektur-Recherche und externe Quellen

Dieses Dokument hält fest, welche externen Projekte und APIs als Referenz für Visual Asset Hub geprüft wurden und welche Entscheidungen daraus für die eigene Architektur folgen.

## Grundsatz

Visual Asset Hub bleibt eine schlanke, lokale Medienbibliothek mit kontrolliertem Import, nachvollziehbaren Rechten und einer späteren Video-Rendering-Schicht.

Externe Open-Source-Projekte dienen als **Architektur- und UX-Referenz**. Code wird nicht ungeprüft kopiert oder als neue Kernabhängigkeit übernommen.

## Open-Source-Referenzen

### ResourceSpace

Projekt: https://github.com/resourcespace/resourcespace

ResourceSpace ist ein etabliertes Open-Source-Digital-Asset-Management-System für Bilder, Videos, Illustrationen und Audio.

Für Visual Asset Hub relevante Ideen:

- klare Trennung zwischen Asset, Metadaten und Zugriff/Nutzung,
- Review- und Verwaltungsworkflow statt reinem Dateiordner,
- langfristige Erweiterbarkeit über zusätzliche Funktionen und Integrationen.

Entscheidung: **Architekturprinzipien übernehmen, nicht das System einbetten.** Visual Asset Hub bleibt deutlich kleiner und speziell auf den Content-/Video-Workflow zugeschnitten.

### Litloft

Projekt: https://github.com/mamepenguin/Litloft

Litloft ist eine selbst gehostete Medienbibliothek und verwendet unter anderem FFmpeg, SQLite, SQLite FTS5 sowie Such-/Indexierungsfunktionen. Das Projekt steht unter AGPL-3.0.

Für spätere Ausbaustufen interessante Ideen:

- SQLite als lokale Metadatenbasis,
- SQLite FTS5 für schnelle Volltextsuche,
- Import-Aktivitätsprotokoll mit Retry-Möglichkeiten,
- Thumbnail-/Medienanalyse mit FFmpeg,
- hybride bzw. semantische Suche als optionale zweite Suchstufe.

Entscheidung: **nur als technische Referenz verwenden.** Kein Litloft-Code wird in Visual Asset Hub kopiert. Die aktuelle JSON-Struktur bleibt für V1 bestehen; SQLite/FTS5 wird erst relevant, wenn die Bibliothek groß genug wird.

## Medienquellen

Alle Provider werden hinter einer gemeinsamen Provider-Schicht normalisiert. Dadurch hängen Inbox, Review, Katalog und Video-Projekte nicht direkt von einer einzelnen Stock-Plattform ab.

### Pexels

- Typen: Video, Bild
- benötigt: `PEXELS_API_KEY`
- Einsatz: primäre kostenlose B-Roll-/Fotoquelle
- Rechte- und Quellenangaben werden beim Download lokal mitgeführt

### Pixabay

- Typen: Video, Bild
- benötigt: `PIXABAY_API_KEY`
- Einsatz: zweite B-Roll-/Fotoquelle, falls Pexels schwache Treffer liefert
- Suchantworten werden mindestens 24 Stunden lokal gecacht
- keine automatischen Massendownloads
- für dauerhaft verwendete Bilder wird die Datei lokal in die Inbox geladen statt permanent vom Pixabay-CDN eingebunden

### Openverse

- Typen: aktuell Bild für Visual Asset Hub
- kein API-Key für die aktuelle Basissuche nötig
- Einsatz: offen lizenzierte und Public-Domain-Bilder

Openverse aggregiert Inhalte verschiedener Quellen. Deshalb gilt ein strengeres Rechte-Gate:

- CC0 → `cc0`, kann nach Review freigegeben werden
- Public Domain Mark → `public-domain`, kann nach Review freigegeben werden
- CC BY → `cc-by`, Attribution zwingend speichern
- Lizenzen mit zusätzlichen Bedingungen, die das aktuelle Katalogmodell nicht vollständig ausdrücken kann → `restricted` + `review` + `internal-only`

Die Lizenz eines Openverse-Treffers soll vor externer Nutzung zusätzlich auf der Originalquelle geprüft werden.

## Provider-Pipeline

```text
Pexels / Pixabay / Openverse
            ↓
    gemeinsames Provider-Modell
            ↓
       lokaler Cache
            ↓
      gezielter Download
            ↓
            inbox/
            ↓
       FFmpeg-Analyse
            ↓
    Quellen-/Rechte-Metadaten
            ↓
        Browser Review
            ↓
       approved Library
            ↓
      Video-Projektmanifest
            ↓
      Renderer (Remotion)
```

## Warum kein direkter Multi-Provider-Massendownload?

Der Hub soll Treffer zunächst anzeigen und nur explizit ausgewählte Medien herunterladen. Das reduziert Speicherverbrauch, hält Provider-Regeln ein und verhindert eine Bibliothek voller ungeprüfter Assets.

## Renderer-Entscheidung

Remotion ist als separater Renderer vorgesehen. Ein Video-Projekt exportiert dafür ein deterministisches `render-manifest.json` mit Szenen, Asset-Pfaden, Frames und Attributionen.

Der Renderer darf keine eigene Rechteentscheidung treffen. Er konsumiert ausschließlich bereits freigegebene Assets aus dem Manifest.

## Spätere Kandidaten

Erst nach einem erfolgreichen V1-End-to-End-Test prüfen:

- SQLite + FTS5 bei deutlich größerem Katalog,
- Import-Logs und Retry Queue,
- semantische Suche/Embeddings,
- visuelle Ähnlichkeit und perceptual hashing,
- S3/R2/MinIO/NAS als Original-Storage,
- KI-Tagging als optionaler Vorschlagsdienst,
- weitere Provider nur dann, wenn sie einen echten Mehrwert gegenüber Pexels/Pixabay/Openverse liefern.
