# Visual Asset Hub

Lokaler Produktions-Hub für **faceless YouTube-Dokumentationen/Listicles** mit echten Visuals, nachvollziehbarer Rechteprüfung und einer vom Nutzer gelieferten Voiceover-Datei als Master-Audio.

**Aktueller Stand: Production Workflow v0.18.0 / Workflow v3.1**

## Kernprinzip

Der Hub ist **real-media-first, local-library-first, archive-first und local-before-phase2**:

1. bereits freigegebene passende Assets aus der eigenen lokalen Bibliothek
2. exaktes Ereignis-/Originalmaterial
3. offizielle Archive und Behördenquellen
4. Archivmaterial
5. echte Dokumente, Screenshots, wissenschaftliche Abbildungen und offizielle Karten/Diagramme
6. sehr spezifische reale B-Roll
7. generischer Stock nur als Fallback

Keine automatisch erfundenen Remotion-Erklärgrafiken. Keine Elektronen-/Partikelanimationen, generischen Pfeile/Kreise/Callouts oder mittigen Infokarten als Standard. Wenn ein Beat visuell erklärt werden muss, sucht Phase 1 reales Material oder eine echte offizielle Abbildung.

## Drei Phasen

```text
PHASE 1 — ChatGPT / Recherche
Thema
→ Fakten + Quellen
→ finales Skript
→ visual-plan.json
→ Multi-Shot shot-plan.json
→ eigene approved Bibliothek prüfen
→ nur falls nötig externe Quellen suchen
→ reale Medien lokal materialisieren
→ phase1-quality.json
→ visual-qc.json
→ Rechte/Katalog + Rights-Evidence
→ beat-bindings.json
→ STRICT LOCK

PHASE 2 — Nutzer
finales Skript → eigene Voiceover-Datei

PHASE 3 — Antigravity / Assembly
Voiceover-Timings
→ phase3-handoff.json
→ nur lokale Phase-1-Assets
→ Trim/Crop/Cut + geplante subtile Bewegung
→ Render
```

**Phase 3 hat bei Workflow v3 keinen Netzwerkzugriff auf Medien.** Wenn ein Asset fehlt, geht der Shot zurück in Phase 1.

## Schnellstart

Kernvoraussetzungen:

- Node.js 22+
- FFmpeg inklusive `ffprobe`

```bash
npm run check
npm run tools:doctor
npm run serve
```

Browser: `http://127.0.0.1:4173`

## Phase 1 — Recherche und echte Visuals

Story-/Quellen-Discovery:

```bash
npm run research:discover -- "Mars Climate Orbiter unit conversion failure"
```

GDELT funktioniert ohne Key. Optional kann eine eigene SearXNG-Instanz genutzt werden:

```env
SEARXNG_URL=http://127.0.0.1:8080
```

Webtext extrahieren:

```bash
npm run research:extract -- --url "https://example.org/article"
```

Quelle archivieren:

```bash
npm run tools -- archive --url "https://example.org/source"
```

Alias-/Entity-Erweiterung:

```bash
npm run entity:expand -- "Mars Climate Orbiter"
```

## Medienquellen

### Ohne API-Key

- NASA Image & Video Library
- NOAA
- USGS
- Library of Congress
- Wikimedia Commons
- Internet Archive
- Openverse für Bilder

### Optional mit kostenlosen Keys

- NARA / National Archives
- Smithsonian Open Access
- Europeana

### Stock nur als Fallback

- Pexels
- Pixabay

## Multi-Shot-Plan

```bash
npm run beat:plan -- --plan projects/<id>/visual-plan.json
```

Workflow v3 erlaubt **mehrere Visual-Shots pro Sprecher-Beat**. Jeder Shot besitzt eine eigene Shot-ID und verweist über `beatId` auf den Sprecher-Beat. Damit können innerhalb eines längeren Satzes mehrere echte Bilder, Clips, Crops oder Perspektiven wechseln.

## Eigene Bibliothek zuerst

```bash
npm run phase1:materialize -- --project <id> --download-top 1
```

Der Materializer prüft zuerst `catalog/assets.json` auf bereits lokal vorhandene, `approved` und für `youtube` freigegebene Assets. Ein starker lokaler Treffer kann die externe Suche überspringen. Das spart API-/Websuche und macht den Stil über viele Videos konsistenter.

Wenn trotzdem immer extern gesucht werden soll:

```bash
npm run phase1:materialize -- --project <id> --download-top 1 --always-search true
```

Lokale Wiederverwendung wird als `local-existing` protokolliert und läuft weiterhin durch Quality- und Visual-QC.

## Quality + Visual-QC

```bash
npm run phase1:quality -- --project <id>
npm run visual:qc -- --project <id>
```

`phase1-quality.json` nutzt technische QC und – wenn vorhanden – pyiqa. `visual-qc.json` kombiniert anschließend:

- redaktionelle Relevanz
- Auflösung/Technik
- pyiqa-Qualität
- Rechte-Status
- Provider-/Library-Tier
- Wiederholungs-/Diversitätssignale
- optional OpenCLIP

Bewusste Wiederverwendung desselben freigegebenen Assets für verschiedene Crops wird **nicht automatisch blockiert**. Sie wird lediglich als Diversitätssignal berücksichtigt.

### Deep Mode nur bei Bedarf

```bash
npm run phase1:quality -- --project <id> --deep true
```

Deep Mode ergänzt OpenCLIP/sqlite-vec Asset-Memory und DINOv2-Dublettenprüfung. Schwere Modelle bleiben optional.

## Präziseres Rechte-Schema

Neben dem allgemeinen `licenseStatus` können Assets jetzt speichern:

```text
licenseCode
licenseVersion
commercialUse
derivativesAllowed
shareAlike
checkedAt
evidencePath
```

Unterstützte Lizenzstatus umfassen u. a. `public-domain`, `cc0`, `cc-by`, `cc-by-sa` sowie die NC/ND-Varianten. NC-Lizenzen werden nicht automatisch für YouTube-/Paid-/Client-Nutzung akzeptiert.

## Rights-Evidence

Ein Asset mit `status=approved` erzeugt beim Import automatisch eine **dauerhafte kleine Audit-Akte**:

```text
catalog/rights-evidence/<ASSET-ID>.json
```

Manuell:

```bash
npm run rights:evidence -- snapshot --asset VAH-XXXXXXXX
npm run rights:evidence -- check --asset VAH-XXXXXXXX
```

Optional kann zusätzlich die Quellseite mit Playwright erfasst werden:

```bash
npm run rights:evidence -- snapshot --asset VAH-XXXXXXXX --capture true
```

Der große Quellseiten-Capture bleibt lokal unter `.local-storage/rights-evidence/<ASSET-ID>/source-capture/`; die kleine Evidence-JSON bleibt dagegen zusammen mit dem Katalog erhalten.

Die Evidence enthält unter anderem Quelle, Lizenzstatus/-code, Prüfzeitpunkt, Asset-SHA, Attribution und einen Fingerprint. **Sie ist eine Audit-Akte und keine automatische Rechtsmeinung.** Ein Screenshot einer Quellseite erzeugt ebenfalls kein Nutzungsrecht.

## Asset-Import

Beispiel für ein freigegebenes lokales Public-Domain-Asset:

```bash
npm run asset:add -- \
  --file ./inbox/photo.jpg \
  --type image \
  --category science-engineering \
  --subject volcano \
  --action erupting \
  --shot ls \
  --title "Volcano lightning" \
  --description "USGS-Aufnahme einer Eruption mit Vulkanblitzen." \
  --tags volcano,lightning \
  --style documentary \
  --movement static \
  --license public-domain \
  --license-code public-domain \
  --source "USGS" \
  --source-url "https://www.usgs.gov/..." \
  --commercial-use true \
  --derivatives-allowed true \
  --share-alike false \
  --scopes youtube \
  --status approved
```

Bei `approved` wird automatisch Rights-Evidence angelegt. Wenn OpenCLIP/sqlite-vec installiert sind, wird das Asset zusätzlich best-effort ins lokale Asset-Memory aufgenommen. Fehlende optionale KI-Tools blockieren den Import nicht.

## Phase 1 ist erst fertig, wenn

- jeder geplante Shot einen Kandidaten besitzt,
- jedes Produktionsasset lokal vorliegt,
- jedes Asset im Katalog `approved` ist,
- `youtube` in den Usage Scopes steht,
- `unknown`, `restricted` und `editorial-only` nicht als Publish-Rechte durchgehen,
- Visual-QC bestanden ist,
- jeder Shot in `beat-bindings.json` gebunden ist,
- für jedes gebundene Asset `rights.checkedAt` gesetzt ist,
- die zugehörige Rights-Evidence-Datei dauerhaft existiert und zum Katalog passt.

Erst dann akzeptiert Workflow v3 eine Voiceover-Datei.

## Phase 2 — Nutzer-Voiceover

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Die Pipeline erzeugt oder ersetzt die Stimme nicht.

Optional Lautheit vorbereiten:

```bash
npm run audio:prepare -- --file ./voiceover.wav --output ./voiceover-normalized.wav
```

## Voiceover → Beat-Timings

```bash
npm run voiceover:align -- --project <id> --model ./models/ggml-small.bin
```

Editorial-v3-Projekte werden über `visual-plan.json` / `narrationAnchor` auf echte Voiceover-Zeitspannen ausgerichtet.

Optionaler Precision-Modus:

```bash
npm run tools -- voiceover-precision --file ./voiceover.wav
```

## Phase 3 — lokaler Antigravity-Handoff

```bash
npm run phase3:prepare -- --project <id>
```

Der Befehl erzeugt:

- `phase3-handoff.json`
- `project.scenes`
- `render-manifest.json`

Ein Sprecher-Beat mit mehreren geplanten Shots wird innerhalb seiner echten Voiceover-Zeit deterministisch und proportional aufgeteilt. Ist ein Beat zu kurz für die geplante Shot-Anzahl, blockiert die Pipeline statt eine fehlerhafte Timeline zu erzeugen.

Danach:

```bash
npm run youtube:workflow -- phase3-check --project <id>
```

### Phase-3-Regeln

Erlaubt:

- echte Videos trimmen
- echte Bilder einsetzen
- Crops/Reframing
- harte Schnitte
- Freeze-Frames aus freigegebenem Material
- Vertical-Blur-Sidefill
- subtile Push-ins/Pans
- echte Artikel-/Dokument-Crops
- echte offizielle Karten/Diagramme aus Phase 1

Nicht erlaubt:

- Runtime-Download fremder Medien
- zufällige Ersatz-B-Roll
- erfundene Teilchen-/Elektronenanimationen
- generische Pfeile/Kreise/Callouts
- mittige Infokarten als Lückenfüller
- große automatische Zahlen-Overlays

## Focal Point und Motion

Workflow v3 trägt `focus` und `motion` bis in das Render-Manifest durch. Der Renderer entscheidet die Bewegungsrichtung nicht zufällig.

Unterstützt werden unter anderem `static`, `push`, `pull`, `pan-left`, `pan-right`, `pan-up`, `pan-down`.

## Renderer-Sicherheit v3

`video-project`, `renderer/scripts/prepare-project.mjs` und der Remotion-Renderer blockieren bei Workflow v3 Remote-Medien. Das Rendern verwendet ausschließlich lokal kopierte Phase-1-Assets und die echte Nutzer-Voiceover.

## Open-Source Toolbox

```bash
npm run tools -- doctor
npm run tools -- help
```

Integriert:

- Trafilatura
- ArchiveBox
- MediaInfo
- Sharp/libvips
- sqlite-vec + OpenCLIP
- pyiqa
- WhisperX
- ffmpeg-normalize
- VMAF
- gallery-dl
- yt-dlp
- DINOv2
- GroundingDINO
- Segment Anything
- Real-ESRGAN

Schwere Tools sind standardmäßig AUS und blockieren den normalen Workflow nicht.

## Final-QC

```bash
npm run final:qc -- --file ./final.mp4
```

Optional VMAF:

```bash
npm run final:qc -- --file ./final-encode.mp4 --reference ./master.mp4
```

## Tests

Neben Syntax-/Vertragschecks existiert ein Offline-End-to-End-Verhaltenstest. Er baut einen temporären lokalen v3-Workflow mit Rights-Evidence, zwei Shots auf einem Sprecher-Beat und einem approved lokalen Asset auf, lässt `phase1-check` laufen und erzeugt anschließend `phase3-handoff.json` + `render-manifest.json` ohne Netzwerkzugriff.

## Wichtige Dateien pro v3-Projekt

```text
project.json
research.json
voiceover-script.txt
visual-plan.json
shot-plan.json
materialization.json
phase1-quality.json
visual-qc.json
beat-bindings.json

audio/voiceover-master.*
timings.json
phase3-handoff.json
render-manifest.json
```

Zusätzlich außerhalb des Projektordners:

```text
catalog/rights-evidence/<ASSET-ID>.json                # dauerhaft
.local-storage/rights-evidence/<ASSET-ID>/source-capture/  # optional, groß
.local-storage/asset-memory.sqlite                     # optional
```

## Sicherheit / Rechte

Technische Downloadbarkeit bedeutet nicht Nutzungsrecht. Externe Medien bleiben im Rechte-/Event-Review. Nutzer-Voiceover, Quellen-Provenance, lokale Phase-1-Materialisierung, Rights-Evidence und die Real-Media-First-Regel sind feste Bestandteile von Workflow v3.1.
