# Visual Asset Hub

Lokaler Recherche-, Asset- und Rendering-Hub für **faceless YouTube-Dokumentationen/Listicles** mit echten Visuals, sauberer Rechteprüfung und einer vom Nutzer gelieferten Voiceover-Datei als Master-Audio.

**Aktueller Entwicklungsstand: Production Workflow v0.10.0**

## Grundidee

Der Hub ist **archive-first**, nicht stock-first:

1. exaktes Ereignis-/Originalmaterial
2. Archivmaterial
3. Dokumente, Screenshots, Karten und Behörden-/Pressequellen
4. sehr spezifische B-Roll
5. erklärende Grafiken
6. generischer Stock nur als Fallback

Visuals werden bereits in **Phase 1** recherchiert und ausgewählt. Phase 3 richtet die vorhandenen Visuals nur noch an der echten Voiceover-Datei aus.

## Schnellstart

Voraussetzungen:

- Node.js 22+
- FFmpeg inklusive `ffprobe`
- optional `yt-dlp` für Referenzvideo-Analyse
- optional `whisper.cpp` für lokale Voiceover-Zeitmarken

```bash
npm run check
npm run serve
```

Browser:

```text
http://127.0.0.1:4173
```

## Kostenloser Doku-Workflow

```text
Thema / Fall
    ↓
Fakten + Originalmaterial + Archive recherchieren
    ↓
Visual-Coverage prüfen
    ↓
Skript passend zum verfügbaren Material finalisieren
    ↓
Nutzer erstellt Voiceover
    ↓
Voiceover-Timings
    ↓
vorher ausgewählte Assets schneiden
    ↓
Remotion
    ↓
MP4
```

## Doku-Recherche über mehrere Quellen

```bash
npm run documentary:research -- "Concorde crash Air France 4590" --type video
npm run documentary:research -- "Theranos Elizabeth Holmes" --type image
```

Standardquellen ohne API-Key:

- **Wikimedia Commons** – Bilder + Videos
- **Internet Archive** – historische Videos/Bilder/Sammlungen
- **Openverse** – offene Bilder

Stock ist standardmäßig ausgeschaltet. Nur ausdrücklich ergänzen:

```bash
npm run documentary:research -- "warehouse accident" --type video --include-stock true
```

Der Recherche-Score ist nur eine Vorauswahl. Er beweist nicht, dass ein Asset exakt das behauptete Ereignis zeigt; dieser Event-Match muss in Phase 1 geprüft werden.

## Einzelne Quellen durchsuchen

```bash
npm run source:search -- "Apollo 11" --provider wikimedia --type image
npm run source:search -- "historic news film" --provider internet-archive --type video
npm run source:search -- "historic map" --provider openverse --type image

npm run source:grab -- "Apollo 11" --provider wikimedia --type image --pick 1
```

Pexels/Pixabay bleiben optionale Stock-Fallbacks:

```env
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

Für den normalen archive-first Ablauf sind diese Keys **nicht nötig**.

## Referenzvideo analysieren

YouTube-/andere unterstützte Referenzvideos können kostenlos mit `yt-dlp` strukturell untersucht werden:

```bash
npm run reference:inspect -- "https://youtu.be/VIDEO_ID"
```

Standardmäßig wird **kein Referenzvideo heruntergeladen**. Der Inspector speichert:

- Titel/Kanal/Dauer
- Kapitel
- Thumbnail-URL
- Beschreibung
- verfügbare Untertitel/Auto-Captions für Struktur- und Timinganalyse

Die Referenz wird ausdrücklich mit `mediaDownloaded: false` und `autoReuseAllowed: false` markiert.

Falls `yt-dlp` fehlt:

```bash
brew install yt-dlp
```

oder

```bash
pipx install yt-dlp
```

Kein API-Key nötig.

## Eigene Dateien / Inbox

Video oder Bild unter `inbox/` ablegen:

```bash
npm run inbox:scan
npm run inbox:review
```

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

Danach im Browser prüfen und in die Bibliothek übernehmen.

## Rechte-Gate

Externe Medien behalten beim Import Quelle, Creator und Lizenzinformationen.

Automatisch blockiert bzw. im Review gehalten werden insbesondere:

- `unknown`
- `restricted`
- unklare Nutzungsbereiche
- fehlende Rechteinformationen
- abgelaufene Freigaben

Ein Browserformular kann fremdes Material nicht in „Eigene Produktion“ umdeklarieren.

## Voiceover

Der Workflow akzeptiert ausschließlich die finale, vom Nutzer gelieferte Audio als Master:

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Die Pipeline erzeugt oder ersetzt die Stimme nicht.

Optional lokale Zeitmarken mit `whisper.cpp`:

```bash
npm run voiceover:align -- --project <id>
```

## Video-Projekte

```bash
npm run video:project -- create --name "Erstes Video" --format horizontal --scope youtube
npm run video:project -- add --project erstes-video --asset VAH-XXXXXXXX --duration 6
npm run video:project -- export --project erstes-video
```

Der Export blockiert nicht freigegebene Assets und fehlende Nutzungsrechte.

## Remotion

Remotion ist die **Schnitt-/Motion-Schicht**, nicht die komplette Bildwelt.

Es übernimmt unter anderem:

- Sequencing
- Zoom/Pan
- Crop
- Blur-Sidefill für vertikale Clips in 16:9
- Übergänge
- Karten-/Datenanimationen, wenn nötig
- kurze Text-Overlays
- SFX-Timing
- finalen MP4-Render

Der Zielstil ist eine dynamische Story-Doku mit echten Visuals, nicht eine Folge schwarzer Dashboard-Karten.

## Wichtige Befehle

```bash
npm run documentary:research -- "Suchbegriff" --type video
npm run reference:inspect -- "https://youtu.be/VIDEO_ID"
npm run source:search -- "Suchbegriff" --provider wikimedia --type image
npm run source:grab -- "Suchbegriff" --provider internet-archive --type video
npm run media:analyze -- --file ./inbox/clip.mp4
npm run inbox:scan
npm run inbox:review
npm run youtube:workflow -- help
npm run video:project -- help
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
docs/         Regeln, Provider- und Architektur-Dokumentation
projects/     Video-Projekte, Phase-1-Pläne und Render-Manifeste
renderer/     Remotion-Renderer
scripts/      Recherche-, Import-, Analyse-, Provider- und Projekt-Tools
tests/        automatisierte Tests
web/          lokale Quellen-, Review- und Bibliotheksoberfläche
```

## Dokumentation

- `docs/DOCUMENTARY-RESEARCH.md` – archive-first Wissenswert-/Story-Doku-Workflow
- `docs/MEDIA-ANALYSIS.md` – FFmpeg/ffprobe
- `docs/WORKFLOW.md` – Asset-Workflow
- `docs/STORAGE-AND-RIGHTS.md` – Speicher und Rechte
- `docs/TAXONOMY.md` – Katalogstruktur
- `docs/ARCHITECTURE-RESEARCH.md` – Architektur-/Open-Source-Recherche

## Sicherheit

Die schreibende Browser-API läuft nur lokal auf `127.0.0.1`, `localhost` oder `::1`. Entfernte und Cross-Site-Schreibzugriffe werden blockiert.

YouTube und andere fremde Plattformen werden nicht allein deshalb als Produktionsquelle behandelt, weil ein technischer Download möglich wäre. Automatische Wiederverwendung fremder Clips bleibt gesperrt, solange keine passende Rechtsgrundlage oder Erlaubnis vorliegt.
