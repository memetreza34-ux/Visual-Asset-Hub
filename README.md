# Visual Asset Hub

Visual Asset Hub ist eine lokale Medienbibliothek für **B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings und Grafiken**. Sie ist für wiederverwendbare Assets in Reels, Shorts, YouTube-Videos, Werbung, Webseiten, Apps und Kundenprojekten gedacht.

**Aktueller Entwicklungsstand: Production Workflow v0.8.0**

## Schnellstart

Voraussetzungen:

- Node.js 22+
- FFmpeg inklusive `ffprobe`

```bash
npm run check
npm run serve
```

Danach läuft die Oberfläche lokal unter:

```text
http://127.0.0.1:4173
```

## End-to-End-Workflow

```text
Eigene Datei / Pexels / Pixabay / Openverse
                    ↓
                  inbox/
                    ↓
              FFmpeg-Analyse
                    ↓
               Browser Review
                    ↓
              Approve & Import
                    ↓
              Asset-Katalog
                    ↓
             Video-Projekt
                    ↓
            Render-Manifest
                    ↓
        Renderer / Remotion (nächster Layer)
```

## 1. Eigene Datei aufnehmen

Video oder Bild unter `inbox/` ablegen und im Browser **Inbox neu scannen** drücken.

Automatisch erkannt werden unter anderem:

- SHA-256
- Auflösung
- Ausrichtung
- Dauer
- FPS
- Codec
- Audio
- Alpha-Kanal
- Video-Vorschau

Danach **Prüfen & aufnehmen** öffnen, Metadaten kontrollieren und **Approve & in Bibliothek aufnehmen** wählen.

## 2. Externe Medien suchen

Die Weboberfläche kann mehrere Quellen hinter derselben Provider-Schicht durchsuchen:

- **Pexels** – Video + Bild, `PEXELS_API_KEY`
- **Pixabay** – Video + Bild, `PIXABAY_API_KEY`
- **Openverse** – offen lizenzierte Bilder, Basissuche ohne Key

`.env.example` nach `.env` kopieren und benötigte Schlüssel nur lokal eintragen:

```env
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

Im Browser kann anschließend gesucht und ein einzelner Treffer mit **In Inbox laden** übernommen werden. Quellen-, Creator- und Lizenzinformationen werden mitgeführt und beim Import serverseitig geschützt.

Alternativ per CLI:

```bash
npm run source:search -- "factory automation" --provider pexels --type video --orientation vertical
npm run source:search -- "electrician tools" --provider pixabay --type video
npm run source:search -- "circuit board" --provider openverse --type image

npm run source:grab -- "factory automation" --provider pexels --type video --pick 2
npm run source:grab -- "electrician tools" --provider pixabay --type video --pick 1
npm run source:grab -- "circuit board" --provider openverse --type image --pick 3
```

Provider-Suchen werden lokal gecacht. Pixabay-Abfragen werden damit unter anderem entsprechend der verlangten 24-Stunden-Cache-Strategie behandelt. Es gibt keinen automatischen Massendownload; nur explizit ausgewählte Treffer werden gespeichert.

### Rechte bei Openverse

Der Hub behandelt Openverse bewusst konservativ:

- CC0 → `cc0`
- Public Domain Mark → `public-domain`
- CC BY → `cc-by` + Attribution
- komplexere Bedingungen, die das aktuelle Rechte-Modell nicht vollständig ausdrücken kann → `restricted`, `review`, `internal-only`

## 3. Video-Projekt aus freigegebenen Assets bauen

Projekt anlegen:

```bash
npm run video:project -- create \
  --name "Erstes Video" \
  --format vertical \
  --scope youtube
```

Asset als Szene hinzufügen:

```bash
npm run video:project -- add \
  --project erstes-video \
  --asset VAH-XXXXXXXX \
  --duration 6
```

Render-Manifest erzeugen:

```bash
npm run video:project -- export --project erstes-video
```

Der Export blockiert automatisch:

- fehlende Assets
- Assets, die nicht `approved` sind
- Assets ohne Freigabe für den gewünschten Nutzungsbereich
- Assets ohne nutzbare Originalquelle

Das Ergebnis `projects/<projekt>/render-manifest.json` enthält Reihenfolge, Dauer, Frames, Asset-Pfade und notwendige Attributionen und ist als Übergabepunkt an einen späteren Remotion-Renderer gedacht.

Mehr dazu: [`projects/README.md`](projects/README.md).

## CLI-Import

Direkter Import bleibt möglich:

```bash
npm run asset:add -- \
  --file ./inbox/smartphone-scroll.mp4 \
  --type video \
  --category technology-ai \
  --subject smartphone \
  --action scrolling \
  --shot cu \
  --title "Person scrollt am Smartphone" \
  --description "Nahaufnahme einer Hand beim Scrollen durch eine Social-Media-App." \
  --tags smartphone,scrolling,social-media \
  --style realistic \
  --movement handheld \
  --license owned \
  --source "Eigene Produktion" \
  --scopes organic-social,youtube,website
```

Technische Werte und Ausrichtung werden bei lokalen Dateien automatisch analysiert. Exakte Dubletten werden über SHA-256 blockiert.

## Wichtige Befehle

```bash
npm run media:analyze -- --file ./inbox/clip.mp4
npm run inbox:scan
npm run inbox:review
npm run source:search -- "Suchbegriff" --provider openverse --type image
npm run source:grab -- "Suchbegriff" --provider pexels --type video
npm run video:project -- help
npm run asset:add -- --help
npm run validate
npm run index
npm run test
npm run check
npm run serve
```

Die älteren direkten Pexels-Befehle `pexels:search` und `pexels:grab` bleiben aus Kompatibilitätsgründen verfügbar.

## Struktur

```text
assets/       katalogisierte Originalmedien
previews/     generierte Vorschauen
inbox/        lokale ungeprüfte Medien
archive/      lokal archivierte Inbox-Originale
catalog/      Schema, Taxonomie und Suchindex
docs/         Regeln, Provider- und Architektur-Dokumentation
projects/     Video-Projekte und Render-Manifeste
scripts/      Import-, Analyse-, Provider- und Projekt-Tools
tests/        automatisierte Tests
web/          lokale Suche, Quellenbrowser und Review-Oberfläche
```

## Sicherheit und Rechte

Der Hub speichert pro Asset Quelle, Lizenzstatus und erlaubte Einsatzzwecke. Die Validierung blockiert unter anderem:

- doppelte IDs, Dateinamen und SHA-256-Hashes
- ungültige Kategorien, Dateitypen und Pfade
- unvollständige Rechteinformationen
- `approved` bei unbekannter oder eingeschränkter Lizenz
- abgelaufene Freigaben
- problematische `editorial-only`-Nutzung
- URLs mit erkennbaren Secret-/Token-Parametern

Die schreibende Browser-API läuft absichtlich nur bei lokalem Serverbetrieb auf `127.0.0.1`, `localhost` oder `::1`. Entfernte und Cross-Site-Schreibzugriffe werden blockiert.

Drittanbieter-Medien behalten beim Import ihre tatsächliche Quelle und Rechte. Die Browserfelder können diese serverseitigen Provenienz-Daten nicht in „Eigene Produktion“ umdeklarieren.

## Speicherstrategie

- Code, Metadaten und Suchindex: Git
- größere lokale Medien: Git LFS
- sehr große Bibliotheken: später S3-kompatibler Object Storage
- Secrets, Cache und lokale Provider-Metadaten: `.env` bzw. `.local-storage/`, nicht Git

## Produktionsstand

Bereits vorhanden:

- kontrollierte Taxonomie und JSON-Schema
- automatischer Asset-Import mit Rollback
- FFmpeg/ffprobe-Medienanalyse und Thumbnailing
- Inbox-Scanner
- Browser-Review und Approve-Import
- SHA-256-Dublettenprüfung
- einheitliche Provider-Schicht für Pexels, Pixabay und Openverse
- lokale Provider-Caches und gezielter Download
- Quellen-/Lizenz-Provenienz bis in den Katalog
- responsiver Asset-Katalog mit Suche, Filtern und Detailansicht
- Video-Range-Support im lokalen Server
- Video-Projekt- und Rechte-Gate für Render-Manifeste
- automatisierte Tests und GitHub Actions

Architektur-Recherche und Open-Source-Referenzen: [`docs/ARCHITECTURE-RESEARCH.md`](docs/ARCHITECTURE-RESEARCH.md).

Der nächste große Schritt ist der **Renderer**: ein kleines Remotion-Modul, das `render-manifest.json` liest und daraus die erste echte Multi-Szenen-Komposition erzeugt.
