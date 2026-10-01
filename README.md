# Visual Asset Hub

Visual Asset Hub ist eine universelle Medienbibliothek und Visual-Discovery-Pipeline für **KI-Bilder, B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings und Grafiken**. Die Assets sind nicht an einen einzelnen Kanal oder Content-Typ gebunden, sondern können für Reels, Shorts, YouTube, Werbung, Webseiten, Apps, Präsentationen und Kundenprojekte wiederverwendet werden.

## Ziele

- **AI-first:** möglichst viele passende realistische KI-Bilder planen
- echtes Bild-/B-Roll-Material nur verwenden, wenn Authentizität oder Bewegung einen klaren Vorteil hat
- echte B-Rolls/Fotos automatisch suchen, auswählen, herunterladen und an Visual Beats binden
- aus Sprechertext automatisch mehrere Visual Beats und Shot-Varianten erzeugen
- aus einem Thema automatisch viele unterschiedliche echte Bilder und B-Rolls finden
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

## AI-first Visual Engine

Die Standardstrategie lautet **Generate first, search second**.

```bash
npm run visual:plan -- "Immer mehr Unternehmen automatisieren Büroarbeit mit künstlicher Intelligenz."
```

Für ein ganzes Skript:

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --images-per-beat 5
```

Der Planer:

- zerlegt Sprechertext in Visual Beats
- plant standardmäßig mehrere KI-Bilder pro generierbarem Beat
- erzeugt unterschiedliche Wide-, Medium-, Close-up-, Detail-, POV- und Over-the-Shoulder-Shots
- schreibt realistische englische Dokumentar-Prompts
- vermeidet typische KI-Optik wie Plastikhaut, unnötige Hologramme, falsche Anatomie und Fake-Text
- fordert echtes Material nur an, wenn es inhaltlich sinnvoller ist

Echtes Material hat insbesondere Vorrang bei:

- echten Screenshots, Webseiten und Dokumenten
- konkreten Nachrichtenereignissen und Originalaufnahmen
- exakten Marken, Produkten und Interfaces
- identifizierbaren realen Orten, wenn deren Echtheit Teil der Aussage ist
- starker Bewegung, die als echte B-Roll deutlich besser funktioniert

Jeder Lauf erzeugt:

```text
visual-plan.json
ai-generation-queue.json
real-material-queue.json
```

Es gibt **keine starre KI-/Stock-Quote**. Wenn ein Video glaubwürdig zu 95 % aus KI-Bildern bestehen kann, darf der Plan 95 % KI enthalten. Details: [`docs/AI-FIRST-VISUALS.md`](docs/AI-FIRST-VISUALS.md).

Der Plan kann auch unter **GitHub Actions → AI-first Visual Plan** erzeugt werden.

## Echte B-Rolls und Fotos automatisch integrieren

Die `real-material-queue.json` kann jetzt automatisch aufgelöst werden:

```bash
npm run real:integrate -- \
  --queue .local-storage/visual-plans/SESSION/real-material-queue.json
```

Der Resolver:

- erzeugt mehrere Suchrichtungen pro Real-Beat
- durchsucht mehrere Pexels-Seiten
- rankt und dedupliziert Kandidaten
- bevorzugt passende Auflösung, Format und brauchbare Videolänge
- lädt die beste Originaldatei herunter
- analysiert heruntergeladene Videos mit FFmpeg
- speichert Quellen- und Lizenzmetadaten
- bindet die Datei an die richtige `beat_id`
- erzeugt ein **Remotion-ready Manifest**

Ausgabe:

```text
real-media/
  real-media-resolution.json
  remotion-real-media.json
  files/
  metadata/
```

Wenn echte Beat-Zeiten aus Voiceover/Transkript vorliegen, können sie direkt übergeben werden:

```bash
npm run real:integrate -- \
  --queue ./real-material-queue.json \
  --timings ./beat-timings.json
```

Dann enthält `remotion-real-media.json` bereits Startzeit, Dauer, Trim-Start, `fit: cover` und Mute-Status pro Beat.

Wichtig: Die Pipeline ersetzt **keine exakten Belege** durch generischen Stock. Echte Screenshots, Originaldokumente, konkrete News-Ereignisse, historische Originalbelege und exakte Marken-/Produktdarstellungen werden als `manual-required` markiert. Details: [`docs/REAL-MEDIA-INTEGRATION.md`](docs/REAL-MEDIA-INTEGRATION.md).

Der kombinierte Lauf ist auch unter **GitHub Actions → AI-first Asset Pipeline** verfügbar. Dieser erstellt den Visual Plan und lädt die automatisch lösbaren echten B-Rolls/Fotos in einem Lauf.

## Smart Asset Discovery

Für die Beats, bei denen echtes Material sinnvoller ist, kann die vorhandene Discovery viele Bilder und B-Rolls suchen:

```bash
npm run discover -- "KI ersetzt Büro-Jobs" --orientation vertical
```

Ein Standardlauf erzeugt automatisch mehrere visuelle Suchrichtungen, durchsucht **Videos und Fotos**, lädt mehrere Pexels-Ergebnisseiten, entfernt Provider-Dubletten und rankt die Kandidaten nach Relevanz, technischer Nutzbarkeit und Vielfalt.

Standard:

- 8 Suchrichtungen
- Video + Foto
- 2 Seiten pro Suchrichtung und Medientyp
- 30 Treffer pro API-Anfrage
- bis zu 80 finale Kandidaten
- `en-US` als Stock-Suchsprache

Damit können theoretisch bis zu 960 Rohresultate geprüft werden:

```text
8 Queries × 2 Medientypen × 2 Seiten × 30 Treffer
```

Größerer Lauf:

```bash
npm run discover -- \
  "industrial electrician maintenance" \
  --orientation horizontal \
  --queries 12 \
  --pages 3 \
  --per-page 40 \
  --top 100
```

Die Resultate werden unter `.local-storage/discovery/` gespeichert. Details: [`docs/DISCOVERY.md`](docs/DISCOVERY.md).

Die Discovery kann auch unter **GitHub Actions → Smart Asset Discovery** gestartet werden.

## Pexels einrichten

`.env.example` als `.env` kopieren und den Schlüssel ausschließlich lokal eintragen:

```env
PEXELS_API_KEY=DEIN_PEXELS_SCHLUESSEL
```

Die klassische Einzelsuche bleibt verfügbar:

```bash
npm run pexels:search -- "Person arbeitet am Laptop" --type video --orientation vertical --per-page 20
npm run pexels:search -- "moderne Fabrik" --type photo --orientation horizontal --per-page 20
```

Die Einzelsuche speichert Resultate unter `.local-storage/pexels-search/`. Die Discovery speichert unter `.local-storage/discovery/`. Weitere Hinweise: [`docs/PEXELS.md`](docs/PEXELS.md).

## Asset-Import

Neue Assets werden nicht manuell umbenannt oder direkt in den Katalog geschrieben. Der Importbefehl erzeugt ID, Dateinamen, Sequenz, Hash, Zielordner und Metadaten automatisch:

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

Das Datenmodell steht in [`catalog/schema.json`](catalog/schema.json), die kontrollierten Werte in [`catalog/taxonomy.json`](catalog/taxonomy.json).

## Befehle

```bash
npm run visual:plan -- --help
npm run real:integrate -- --help
npm run discover -- --help
npm run pexels:search -- --help
npm run asset:add -- --help
npm run media:analyze -- --help
npm run validate
npm run index
npm run test
npm run check
npm run serve
```

- `visual:plan`: erzeugt AI-first Visual Beats, KI-Prompts und Real-/Stock-Fallbacks
- `real:integrate`: sucht, lädt und bindet echte B-Rolls/Fotos an die Real-Beat-Queue
- `discover`: erzeugt mehrere Suchrichtungen und findet/rankt viele Bilder + B-Rolls
- `pexels:search`: führt eine einzelne Pexels-Suche aus
- `asset:add`: nimmt eine neue Datei sicher auf und rollt bei Fehlern zurück
- `media:analyze`: analysiert lokale Medien mit FFmpeg und erzeugt eine Vorschau
- `validate`: prüft IDs, Dateinamen, Kategorien, Pfade, Rechte, Laufzeiten und Dubletten
- `index`: erzeugt `catalog/search-index.json` für die Websuche
- `test`: prüft Taxonomie, Katalogvertrag, Pexels-Client, Search Planner, AI-first Visual Planner, Real-Media-Bindings und Indexierung
- `check`: führt Validierung, Indexierung und Tests aus
- `serve`: startet die lokale Suchoberfläche

## Speicher

- Kleine Textdateien, SVGs und Vorschauen können direkt im Repository liegen.
- Große Originalbilder und Videos unter `assets/` werden über Git LFS verwaltet.
- Für eine sehr große Bibliothek ist externer S3-kompatibler Object Storage vorgesehen.
- Temporäre Signed URLs und private Zugriffstokens dürfen nicht im Katalog gespeichert werden.

Details: [`docs/STORAGE-AND-RIGHTS.md`](docs/STORAGE-AND-RIGHTS.md).

## Rechte und Sicherheit

Nur Assets speichern, für die eine nachvollziehbare Nutzungserlaubnis besteht. Dateien mit unbekanntem Rechtezustand bleiben in `inbox/` und erhalten nicht den Status `approved`.

Die automatische Prüfung blockiert unter anderem:

- doppelte IDs, Dateinamen oder SHA-256-Hashes
- falsche Kategorien, Typen oder Dateiendungen
- unvollständige Rechteangaben
- freigegebene Assets mit unbekannter oder abgelaufener Lizenz
- editorial-only Assets mit kommerziellen Nutzungsbereichen
- unsichere Pfade
- URLs mit erkennbaren Token-, Signatur- oder API-Key-Parametern

## Aktueller Ausbau

Enthalten sind jetzt:

- **AI-first Visual Engine mit Visual Beats, Multi-Shot-Prompts und Real-Material-Entscheidung**
- separate `ai-generation-queue` und `real-material-queue`
- **automatischer Real-Media-Resolver mit Download, FFmpeg-Analyse und Remotion-Beat-Binding**
- Schutz vor generischem Stock als falschem Originalbeleg
- universelle Taxonomie
- verbindlicher Benennungsstandard
- strukturiertes Metadatenschema
- sicherer Asset-Import
- klassische Pexels-Foto-/Videosuche
- Smart Asset Discovery mit Multi-Query, Foto+Video, Pagination, Deduplication, Ranking und Diversity-Auswahl
- automatische Medienanalyse über FFmpeg
- Rechte- und Dublettenprüfung
- deterministischer Suchindex
- responsive Websuche mit Filtern und Detailansicht
- Git-LFS-Regeln
- GitHub-Workflows für AI-first Planung, echte Medien, Suche und Discovery

Nächste Ausbaustufen: Generator-Adapter für die automatische Abarbeitung der KI-Queue, automatisches Zusammenführen von KI- und Real-Media-Bindings in ein finales Video-Manifest, zusätzliche reale/archivarische Provider, automatische Katalogübernahme, Cloud-Storage-Synchronisierung, Nutzungshistorie und visuelle Ähnlichkeitssuche.
