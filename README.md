# Visual Asset Hub

Lokaler Produktions-Hub für **faceless YouTube-Dokumentationen/Listicles** mit echten Visuals, nachvollziehbarer Rechteprüfung und einer vom Nutzer gelieferten Voiceover-Datei als Master-Audio.

**Aktueller Stand: Production Workflow v0.19.0 / Workflow v3.1**

## Kernprinzip

Der Hub ist **real-media-first, local-library-first, archive-first und local-before-phase2**.

Priorität:

1. bereits freigegebene passende Assets aus der eigenen Bibliothek
2. exaktes Ereignis-/Originalmaterial
3. offizielle Archive, Behörden, Wissenschafts- und Museumsquellen
4. Archivmaterial
5. echte Dokumente, Screenshots und offizielle Diagramme/Karten
6. sehr spezifische reale B-Roll
7. Stock nur als Fallback

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

**Phase 3 hat keinen Netzwerkzugriff auf Medien.** Fehlt ein Asset, geht der Shot zurück in Phase 1.

## Schnellstart

Voraussetzungen:

- Node.js 22+
- FFmpeg inklusive `ffprobe`

```bash
npm run check
npm run tools:doctor
npm run serve
```

## Recherche

```bash
npm run research:discover -- "Mars Climate Orbiter unit conversion failure"
npm run documentary:research -- "Kilauea eruption" --type video
npm run research:extract -- --url "https://example.org/article"
npm run tools -- archive --url "https://example.org/source"
npm run entity:expand -- "Mars Climate Orbiter"
```

GDELT funktioniert ohne Key. Optional kann eine eigene SearXNG-Instanz über `SEARXNG_URL` genutzt werden.

## Medienquellen v0.19

### Automatisch, ohne API-Key

- NASA Image & Video Library
- **NASA Scientific Visualization Studio (SVS)**
- NOAA
- USGS
- Library of Congress
- **The Met Open Access** — nur API-Objekte mit `isPublicDomain=true`
- Wikimedia Commons
- Internet Archive
- Openverse für Bilder

### Automatisch, mit kostenlosen Keys

- **National Park Service** — `NPS_API_KEY`
- **DVIDS** — `DVIDS_API_KEY`
- NARA / National Archives — `NARA_API_KEY`
- Smithsonian Open Access — `SMITHSONIAN_API_KEY`
- Europeana — `EUROPEANA_API_KEY`

Fehlt ein optionaler Key, wird nur dieser Provider übersprungen. Die restliche Pipeline läuft weiter.

### Stock nur als Fallback

- Pexels
- Pixabay

Weitere Spezialportale und ihre Automatisierungsstufe stehen in `docs/SOURCE-COVERAGE.md`.

## IIIF für Museen und Archive

Viele Museen und Bibliotheken nutzen IIIF. Ein generischer Resolver kann aus einem Manifest oder `info.json` hochauflösende Bild-URLs extrahieren:

```bash
npm run iiif:resolve -- --url <manifest-oder-info.json>
```

Wichtig: **IIIF ist keine Lizenz.** Alle IIIF-Treffer bleiben im Rights-Review.

## Multi-Shot-Plan

```bash
npm run beat:plan -- --plan projects/<id>/visual-plan.json
```

Ein Sprecher-Beat darf mehrere echte Visual-Shots besitzen. Jeder Shot hat eine eigene Shot-ID und verweist mit `beatId` auf den Sprecher-Beat.

## Phase 1 — Materialisierung

```bash
npm run phase1:materialize -- --project <id> --download-top 1
```

Der Materializer prüft zuerst `catalog/assets.json` auf bereits lokale, `approved` und für YouTube freigegebene Assets. Nur wenn kein starker lokaler Treffer reicht, werden externe Quellen durchsucht.

Vollständige externe Suche erzwingen:

```bash
npm run phase1:materialize -- --project <id> --download-top 1 --always-search true
```

Danach:

```bash
npm run phase1:quality -- --project <id>
npm run visual:qc -- --project <id>
# Inbox/Downloads prüfen und Rechte bestätigen
npm run phase1:bind -- auto --project <id>
npm run youtube:workflow -- phase1-check --project <id>
```

## Quality + Visual-QC

`phase1-quality.json` nutzt technische QC und optional pyiqa. `visual-qc.json` kombiniert unter anderem:

- redaktionelle Relevanz
- Technik/Auflösung
- Bildqualität
- Rechte-Status
- Provider-Tier
- Wiederholungs-/Diversitätssignale
- optional OpenCLIP

Deep Mode:

```bash
npm run phase1:quality -- --project <id> --deep true
```

Deep Mode ergänzt OpenCLIP/sqlite-vec Asset-Memory und DINOv2-Dublettenprüfung. Schwere Modelle bleiben optional.

## Rechte + Evidence

Unterstützt werden unter anderem:

```text
public-domain
cc0
cc-by
cc-by-sa
cc-by-nd
cc-by-nc / cc-by-nc-sa / cc-by-nc-nd
editorial-only
restricted
unknown
```

Zusätzliche Rights-Felder können `licenseCode`, `licenseVersion`, `commercialUse`, `derivativesAllowed`, `shareAlike`, `checkedAt` und `evidencePath` speichern.

Approved Assets erhalten eine dauerhafte Audit-Akte:

```text
catalog/rights-evidence/<ASSET-ID>.json
```

Manuell:

```bash
npm run rights:evidence -- snapshot --asset VAH-XXXXXXXX
npm run rights:evidence -- check --asset VAH-XXXXXXXX
```

Optional kann die Quellseite lokal mitgesichert werden:

```bash
npm run rights:evidence -- snapshot --asset VAH-XXXXXXXX --capture true
```

Evidence/Screenshot ist eine Audit-Hilfe und **keine automatische Rechtsmeinung**. Ereignisidentität und Nutzungsrechte bleiben getrennte Gates.

## Phase 1 ist erst fertig, wenn

- jeder geplante Shot einen Kandidaten besitzt,
- jedes Produktionsasset lokal vorliegt,
- jedes Asset im Katalog `approved` ist,
- YouTube im Usage Scope steht,
- Visual-QC bestanden ist,
- jeder Shot gebunden ist,
- `rights.checkedAt` vorhanden ist,
- die zugehörige Rights-Evidence existiert und zum Katalog passt.

Erst dann akzeptiert Workflow v3 die Nutzer-Voiceover.

## Phase 2 — Nutzer-Voiceover

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Die Pipeline erzeugt oder ersetzt die Stimme nicht.

Optional:

```bash
npm run audio:prepare -- --file ./voiceover.wav --output ./voiceover-normalized.wav
```

## Voiceover → Timings

```bash
npm run voiceover:align -- --project <id> --model ./models/ggml-small.bin
```

Optionaler Precision-Modus:

```bash
npm run tools -- voiceover-precision --file ./voiceover.wav
```

## Phase 3 — Antigravity-Handoff

```bash
npm run phase3:prepare -- --project <id>
npm run youtube:workflow -- phase3-check --project <id>
```

Erzeugt unter anderem:

- `phase3-handoff.json`
- `project.scenes`
- `render-manifest.json`

Erlaubt sind Trims, Crops/Reframing, harte Schnitte, Freeze-Frames aus freigegebenem Material, Vertical-Blur-Sidefill und subtile geplante Push-ins/Pans.

Nicht erlaubt sind Runtime-Webdownloads, zufällige Ersatz-B-Roll oder künstliche Erklärgrafiken als Lückenfüller.

## Focal Point und Motion

`focus` und `motion` werden bis ins Render-Manifest durchgereicht. Unterstützt werden unter anderem:

```text
static
push
pull
pan-left / pan-right
pan-up / pan-down
```

Der Renderer entscheidet die Bewegungsrichtung nicht zufällig.

## Open-Source Toolbox

```bash
npm run tools -- doctor
npm run tools -- help
```

Modular integriert sind unter anderem Trafilatura, ArchiveBox, MediaInfo, Sharp/libvips, sqlite-vec + OpenCLIP, pyiqa, WhisperX, ffmpeg-normalize, VMAF, gallery-dl, yt-dlp, DINOv2, GroundingDINO, Segment Anything und Real-ESRGAN.

Schwere Tools sind standardmäßig AUS und blockieren den normalen Workflow nicht.

## Final-QC

```bash
npm run final:qc -- --file ./final.mp4
```

Optional mit Referenz:

```bash
npm run final:qc -- --file ./final-encode.mp4 --reference ./master.mp4
```

## Tests

Die Pipeline besitzt Syntax-/Vertrags-/Provider-Tests und einen Offline-End-to-End-Test für:

```text
lokales approved Asset
→ Rights-Evidence
→ Multi-Shot Phase 1
→ phase1-check
→ Nutzer-Voiceover-Timing-Fixture
→ phase3:prepare
→ lokales Render-Manifest
```

## Sicherheit

Technische Downloadbarkeit bedeutet nicht Nutzungsrecht. Externe Medien bleiben im Rechte-/Event-Review. Die Nutzer-Voiceover, Quellen-Provenance, lokale Phase-1-Materialisierung, Rights-Evidence und Real-Media-First-Regel sind feste Bestandteile von Workflow v3.1.
