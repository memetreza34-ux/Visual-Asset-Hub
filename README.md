# Visual Asset Hub

Visual Asset Hub ist eine lokale Medienbibliothek für **B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings und Grafiken**. Sie ist für wiederverwendbare Assets in Reels, Shorts, YouTube-Videos, Werbung, Webseiten, Apps und Kundenprojekten gedacht.

**Aktueller Entwicklungsstand: Production Workflow v0.6.0**

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

## Normaler Workflow

```text
Datei / Pexels
      ↓
    inbox/
      ↓
FFmpeg-Analyse
      ↓
 Browser Review
      ↓
Approve & Import
      ↓
    assets/
      ↓
Suchbarer Katalog
```

### 1. Eigene Datei aufnehmen

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

Nach erfolgreichem Import liegt die katalogisierte Datei unter `assets/`. Die ursprüngliche Inbox-Datei wird lokal unter `archive/inbox-imported/` archiviert.

### 2. Pexels-Asset in die Inbox laden

`.env.example` nach `.env` kopieren und lokal einen Pexels-Key eintragen:

```env
PEXELS_API_KEY=DEIN_KEY
```

Dann beispielsweise:

```bash
npm run pexels:grab -- "office worker laptop" --orientation vertical
```

Ein anderes Suchergebnis auswählen:

```bash
npm run pexels:grab -- "office worker laptop" --orientation vertical --pick 3
```

Foto laden:

```bash
npm run pexels:grab -- "Berlin skyline" --type photo --pick 2
```

`pexels:grab` lädt gezielt **ein** Asset statt die Stock-Bibliothek massenhaft zu kopieren. Für Videos wird standardmäßig eine sinnvolle HD/Full-HD-Datei bis etwa 1920 Pixel längster Kante bevorzugt. Quellen-, Creator- und Lizenzinformationen werden lokal neben dem Inbox-Workflow gespeichert und beim Browser-Import geschützt übernommen.

Die bestehende reine Pexels-Suche bleibt ebenfalls verfügbar:

```bash
npm run pexels:search -- "Person arbeitet am Laptop" --type video --orientation vertical --per-page 20
```

## CLI-Import

Alternativ kann direkt importiert werden:

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
npm run pexels:search -- "Suchbegriff"
npm run pexels:grab -- "Suchbegriff"
npm run asset:add -- --help
npm run validate
npm run index
npm run test
npm run check
npm run serve
```

## Struktur

```text
assets/       katalogisierte Originalmedien
previews/     generierte Vorschauen
inbox/        lokale ungeprüfte Medien
archive/      lokal archivierte Inbox-Originale
catalog/      Schema, Taxonomie und Suchindex
docs/         Regeln und Dokumentation
scripts/      Import-, Analyse- und Provider-Tools
tests/        automatisierte Tests
web/          lokale Such- und Review-Oberfläche
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

Pexels-Medien behalten beim Import ihre tatsächliche Quelle; sie werden nicht als eigene Produktion umetikettiert.

## Speicherstrategie

- Code, Metadaten und Suchindex: Git
- größere lokale Medien: Git LFS
- sehr große Bibliotheken: später S3-kompatibler Object Storage
- Secrets und lokale Such-/Provider-Metadaten: `.local-storage/` bzw. `.env`, nicht Git

## Produktionsstand

Bereits vorhanden:

- kontrollierte Taxonomie und JSON-Schema
- automatischer Asset-Import mit Rollback
- FFmpeg/ffprobe-Medienanalyse
- automatisches Thumbnailing
- Inbox-Scanner
- Browser-Review und Approve-Import
- Quellen- und Rechteprüfung
- SHA-256-Dublettenprüfung
- Pexels-Suche
- gezielter Pexels-Download in die Inbox
- responsiver Asset-Katalog mit Suche, Filtern und Detailansicht
- Video-Range-Support im lokalen Server
- automatisierte Tests und GitHub Actions

Nächste sinnvolle Schritte für die erste echte Videoproduktion sind: **echte Assets einfüllen, einen vollständigen Video-Asset-Satz als Collection zusammenstellen und den Export/Übergabe-Workflow für das Schnittprojekt bauen.**
