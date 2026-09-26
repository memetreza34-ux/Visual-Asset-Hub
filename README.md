# Visual Asset Hub

Visual Asset Hub ist eine universelle Medienbibliothek für **B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings und Grafiken**. Die Assets sind nicht an einen einzelnen Kanal oder Content-Typ gebunden, sondern können für Reels, Shorts, YouTube, Werbung, Webseiten, Apps, Präsentationen und Kundenprojekte wiederverwendet werden.

**Aktueller Entwicklungsstand: Production Workflow v0.5.0.**

## Ziele

- Assets in Sekunden finden statt Ordner manuell zu durchsuchen
- einheitliche Namen, Kategorien und Tags verwenden
- Nutzungsrechte und Quellen nachvollziehbar speichern
- Dubletten vermeiden
- Hochformat, Querformat und Quadrat gezielt filtern
- Assets lokal, über Git LFS oder in externem Object Storage verwalten
- einen automatisch erzeugten Suchindex für eine Weboberfläche bereitstellen

## Schnellstart

Benötigt werden **Node.js 22+** und für lokale Medienanalyse **FFmpeg inklusive ffprobe**.

```bash
npm run check
npm run serve
```

Danach ist die Bibliothek lokal unter `http://127.0.0.1:4173` erreichbar.

## Browser-Workflow für neue Medien

1. Videos oder Bilder lokal unter `inbox/` ablegen.
2. `npm run serve` starten.
3. Im Browser auf **Inbox neu scannen** klicken.
4. Ein Asset mit **Prüfen & aufnehmen** öffnen.
5. Titel, Kategorie, Tags, Lizenz und Nutzungsbereiche prüfen.
6. **Approve & in Bibliothek aufnehmen** klicken.

Der Hub analysiert lokale Medien automatisch mit FFmpeg/ffprobe. Dabei werden unter anderem Auflösung, Seitenverhältnis, Dauer, FPS, Codec, Audio, Alpha-Kanal und SHA-256 erkannt. Für Videos wird automatisch eine Vorschau erzeugt. Nach erfolgreichem Review wird das Original aus `inbox/` nach `archive/inbox-imported/` verschoben und die katalogisierte Kopie unter `assets/` abgelegt.

Die schreibende Review-API ist absichtlich nur aktiv, wenn der Server lokal auf `127.0.0.1`, `localhost` oder `::1` läuft.

## Kommandozeilen-Import

Neue Assets können alternativ weiterhin direkt über den Importbefehl aufgenommen werden. Technische Angaben und die Ausrichtung werden bei lokalen Dateien automatisch erkannt:

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

Mit `--dry-run true` werden ID, Name und Ziel berechnet, ohne Katalog oder Originaldatei zu verändern.

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
npm run media:analyze -- --file ./inbox/clip.mp4
npm run inbox:scan
npm run inbox:review
npm run asset:add -- --help
npm run pexels:search -- --help
npm run validate
npm run index
npm run test
npm run check
npm run serve
```

- `media:analyze`: liest technische Mediendaten mit FFmpeg/ffprobe und erzeugt optional eine Vorschau
- `inbox:scan`: analysiert alle unterstützten Medien im lokalen Inbox-Ordner
- `inbox:review`: zeigt die analysierte Review-Warteschlange im Terminal
- `asset:add`: analysiert lokale Medien automatisch, nimmt sie sicher auf und rollt Katalogänderungen bei Fehlern zurück
- `pexels:search`: sucht kostenlose Pexels-Fotos oder -Videos und speichert Quellenangaben lokal
- `validate`: prüft IDs, Dateinamen, Kategorien, Pfade, Rechte, Laufzeiten und Dubletten
- `index`: erzeugt `catalog/search-index.json` für die Websuche
- `test`: prüft Taxonomie, Katalogvertrag, Produktionsskripte, Pexels-Client und deterministische Indexierung
- `check`: führt Validierung, Indexierung und Tests aus
- `serve`: startet die lokale Such- und Review-Oberfläche

## Speicher

- Kleine Textdateien, SVGs und Vorschauen können direkt im Repository liegen.
- Große Originalbilder und Videos unter `assets/` werden über Git LFS verwaltet.
- Für eine sehr große Bibliothek ist externer S3-kompatibler Object Storage vorgesehen.
- Temporäre Signed URLs und private Zugriffstokens dürfen nicht im Katalog gespeichert werden.

Details stehen in [`docs/STORAGE-AND-RIGHTS.md`](docs/STORAGE-AND-RIGHTS.md).

## Rechte und Sicherheit

Nur Assets speichern, für die eine nachvollziehbare Nutzungserlaubnis besteht. Dateien mit unbekanntem Rechtezustand bleiben ungeprüft. Quellen, Lizenz und erlaubte Nutzungsbereiche werden pro Asset dokumentiert.

Die automatische Prüfung blockiert unter anderem:

- doppelte IDs, Dateinamen oder SHA-256-Hashes
- falsche Kategorien, Typen oder Dateiendungen
- unvollständige Rechteangaben
- freigegebene Assets mit unbekannter oder abgelaufener Lizenz
- editorial-only Assets mit kommerziellen Nutzungsbereichen
- unsichere Pfade
- URLs mit erkennbaren Token-, Signatur- oder API-Key-Parametern

Die lokale Review-API blockiert Schreibzugriffe von entfernten Clients und Cross-Site-Anfragen.

## Aktueller Ausbau

Die aktuelle Produktionsstufe enthält:

- universelle Taxonomie
- verbindlichen Benennungsstandard
- strukturiertes Metadatenschema
- automatisierte lokale Medienanalyse mit FFmpeg/ffprobe
- automatisches Video-Thumbnailing
- Inbox-Scanner und Review-Warteschlange
- Browser-Review mit Approve-&-Import-Workflow
- sicheren Asset-Import mit Rollback und Dublettenprüfung
- kostenlose Pexels-Foto- und Videosuche
- Rechte- und Dublettenprüfung
- deterministischen Suchindex
- responsive Websuche mit Filtern, Video-Player und Detailansicht
- Git-LFS-Regeln
- automatischen GitHub-Workflow

Nächste Ausbaustufen: direkter Pexels-Download in die Inbox, Bulk-Review, Collections, Nutzungshistorie, Cloud-Storage-Synchronisierung, KI-Tagging und visuelle Ähnlichkeitssuche.
