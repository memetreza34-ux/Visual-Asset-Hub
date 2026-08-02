# Visual Asset Hub

Visual Asset Hub ist eine universelle Medienbibliothek für **B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings und Grafiken**. Die Assets sind nicht an einen einzelnen Kanal oder Content-Typ gebunden, sondern können für Reels, Shorts, YouTube, Werbung, Webseiten, Apps, Präsentationen und Kundenprojekte wiederverwendet werden.

## Ziele

- Assets in Sekunden finden statt Ordner manuell zu durchsuchen
- einheitliche Namen, Kategorien und Tags verwenden
- Nutzungsrechte und Quellen nachvollziehbar speichern
- Dubletten vermeiden
- Hochformat, Querformat und Quadrat gezielt filtern
- Assets lokal, über Git LFS oder in externem Object Storage verwalten
- einen automatisch erzeugten Suchindex für eine Weboberfläche bereitstellen

## Schnellstart

Benötigt wird Node.js 22 oder neuer.

```bash
npm run check
npm run serve
```

Danach ist die Bibliothek lokal unter `http://127.0.0.1:4173` erreichbar.

Neue Assets werden nicht manuell umbenannt oder in den Katalog geschrieben. Der Importbefehl erzeugt ID, Dateinamen, Sequenz, Hash, Zielordner und Metadaten automatisch:

```bash
npm run asset:add -- --help
```

Beispiel:

```bash
npm run asset:add -- \
  --file ./inbox/smartphone-scroll.mp4 \
  --type video \
  --category technology-ai \
  --subject smartphone \
  --action scrolling \
  --shot cu \
  --orientation vertical \
  --title "Person scrollt am Smartphone" \
  --description "Nahaufnahme einer Hand beim Scrollen durch eine Social-Media-App." \
  --tags smartphone,scrolling,social-media \
  --style realistic \
  --movement handheld \
  --license owned \
  --source "Eigene Produktion" \
  --scopes organic-social,youtube,website
```

Mit `--dry-run true` werden ID, Name und Ziel berechnet, ohne Dateien zu verändern.

## Kostenlose Pexels-Suche

1. `.env.example` als `.env` kopieren.
2. Den Schlüssel ausschließlich lokal eintragen:

```env
PEXELS_API_KEY=DEIN_PEXELS_SCHLUESSEL
```

3. Nach B-Rolls oder Bildern suchen:

```bash
npm run pexels:search -- "Person arbeitet am Laptop" --type video --orientation vertical --per-page 20
npm run pexels:search -- "moderne Fabrik" --type photo --orientation horizontal --per-page 20
```

Die Ergebnisse werden unter `.local-storage/pexels-search/` gespeichert. Der Schlüssel, die Suchdateien und große Medien werden nicht in GitHub veröffentlicht. Die Suche lädt zunächst nur Metadaten und Vorschaulinks, keine Originaldateien. Weitere Hinweise stehen in [`docs/PEXELS.md`](docs/PEXELS.md).

## Grundstruktur

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
archive/
catalog/
docs/
scripts/
web/
```

`inbox/` ist der lokale Eingang für neue Dateien und wird nicht veröffentlicht. Erst nach Benennung, Rechteprüfung und Katalogisierung werden Assets nach `assets/` übernommen.

## Dateinamen

```text
{type}-{category}-{subject}-{action}-{shot}-{orientation}-{sequence}.{ext}
```

Beispiele:

```text
brl-technology-ai-smartphone-scrolling-cu-vertical-0001.mp4
img-money-finance-cash-growing-not-applicable-square-0001.png
ovl-social-media-creator-notification-pop-up-transparent-0001.webm
```

Die vollständigen Regeln stehen in [`docs/NAMING.md`](docs/NAMING.md).

## Katalog

Alle durchsuchbaren Informationen liegen in [`catalog/assets.json`](catalog/assets.json). Jedes Asset besitzt unter anderem:

- stabile Asset-ID
- Titel und Beschreibung
- Typ und Hauptkategorie
- kontrollierte Tags und Such-Aliasse
- Motiv, Handlung und Kameraeinstellung
- Ausrichtung, Auflösung und Dauer
- Speicherpfad oder externe Storage-URL
- Quelle, Lizenzstatus und erlaubte Einsatzzwecke
- Erstellungs- und Importdatum
- optionalen SHA-256-Hash zur Dublettenprüfung

Das genaue Datenmodell steht in [`catalog/schema.json`](catalog/schema.json). Die kontrollierten Werte liegen in [`catalog/taxonomy.json`](catalog/taxonomy.json).

## Befehle

```bash
npm run asset:add -- --help
npm run pexels:search -- --help
npm run validate
npm run index
npm run test
npm run check
npm run serve
```

- `asset:add`: nimmt eine neue Datei sicher auf und rollt bei Fehlern zurück
- `pexels:search`: sucht kostenlose Pexels-Fotos oder -Videos und speichert Quellenangaben lokal
- `validate`: prüft IDs, Dateinamen, Kategorien, Pfade, Rechte, Laufzeiten und Dubletten
- `index`: erzeugt `catalog/search-index.json` für die Websuche
- `test`: prüft Taxonomie, Katalogvertrag, Pexels-Client und deterministische Indexierung
- `check`: führt Validierung, Indexierung und Tests aus
- `serve`: startet die lokale Suchoberfläche

## Speicher

- Kleine Textdateien, SVGs und Vorschauen können direkt im Repository liegen.
- Große Originalbilder und Videos unter `assets/` werden über Git LFS verwaltet.
- Für eine sehr große Bibliothek ist externer S3-kompatibler Object Storage vorgesehen.
- Temporäre Signed URLs und private Zugriffstokens dürfen nicht im Katalog gespeichert werden.

Details stehen in [`docs/STORAGE-AND-RIGHTS.md`](docs/STORAGE-AND-RIGHTS.md).

## Rechte und Sicherheit

Nur Assets speichern, für die eine nachvollziehbare Nutzungserlaubnis besteht. Dateien mit unbekanntem Rechtezustand bleiben in `inbox/` und erhalten nicht den Status `approved`. Quellen, Lizenz und erlaubte Nutzungsbereiche werden pro Asset dokumentiert.

Die automatische Prüfung blockiert unter anderem:

- doppelte IDs, Dateinamen oder SHA-256-Hashes
- falsche Kategorien, Typen oder Dateiendungen
- unvollständige Rechteangaben
- freigegebene Assets mit unbekannter oder abgelaufener Lizenz
- editorial-only Assets mit kommerziellen Nutzungsbereichen
- unsichere Pfade
- URLs mit erkennbaren Token-, Signatur- oder API-Key-Parametern

## Aktueller Ausbau

Die erste funktionsfähige Stufe enthält:

- universelle Taxonomie
- verbindlichen Benennungsstandard
- strukturiertes Metadatenschema
- sicheren Asset-Import
- kostenlose Pexels-Foto- und Videosuche
- Rechte- und Dublettenprüfung
- deterministischen Suchindex
- responsive Websuche mit Filtern und Detailansicht
- Git-LFS-Regeln
- automatischen GitHub-Workflow

Spätere Ausbaustufen: gezielter Originaldownload, automatische Vorschauerzeugung, Metadatenanalyse über FFmpeg, KI-Tagging, Cloud-Storage-Synchronisierung, Nutzungshistorie und visuelle Ähnlichkeitssuche.
