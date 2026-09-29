# Visual Asset Hub

Lokaler Produktions-Hub für **faceless YouTube-Dokumentationen/Listicles** mit echten Visuals, sauberer Rechteprüfung und einer vom Nutzer gelieferten Voiceover-Datei als Master-Audio.

**Aktueller Stand: Production Workflow v0.16.0 + modulare Open-Source Toolchain**

## Grundregel

Der Hub ist **real-media-first und archive-first**:

1. exaktes Ereignis-/Originalmaterial
2. offizielle Archive und Behördenquellen
3. Archivmaterial
4. echte Dokumente, Screenshots, wissenschaftliche Abbildungen und offizielle Karten/Diagramme
5. sehr spezifische reale B-Roll
6. generischer Stock nur als Fallback

**Keine automatisch erfundenen Remotion-Erklärgrafiken.** Keine Elektronen-/Partikelanimationen, keine generischen Pfeile/Kreise/Callouts und keine mittigen Infokarten als Standard. Wenn ein Beat eine Erklärung braucht, sucht Phase 1 dafür reales Material oder eine echte offizielle Abbildung.

Siehe `docs/REAL-MEDIA-EDITING-POLICY.md`.

## Drei Phasen

```text
PHASE 1 — ChatGPT / Recherche
Thema → Fakten → Skript → echte Medien → Rechte/QC → visual-plan.json → shot-plan.json

PHASE 2 — Nutzer
finales Skript → eigene Voiceover-Datei

PHASE 3 — Antigravity
Voiceover-Timings → festgelegte Phase-1-Assets → Trim/Crop/Cut → dezente Bewegung → Final MP4
```

Phase 3 darf die Story und Bildwelt nicht neu erfinden.

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

`tools:doctor` zeigt, welche optionalen Open-Source-Helfer auf dem Rechner vorhanden sind. Fehlende optionale Tools blockieren den normalen Workflow nicht.

## Phase 1 — Recherche

### Story-/Quellen-Discovery

```bash
npm run research:discover -- "Mars Climate Orbiter unit conversion failure"
```

GDELT funktioniert ohne Key. Optional kann eine eigene SearXNG-Instanz genutzt werden:

```env
SEARXNG_URL=http://127.0.0.1:8080
```

Treffer sind Discovery-Signale und werden nicht automatisch zu freigegebenen Produktionsassets.

### Webseiteninhalt sauber extrahieren

```bash
npm run research:extract -- --url "https://example.org/article" --output .local-storage/research/article.json
```

Wenn Trafilatura installiert ist, werden Haupttext und Metadaten ohne Navigation/Footer extrahiert.

### Quelle archivieren

```bash
npm run tools -- archive --url "https://example.org/source"
```

ArchiveBox wird bevorzugt. Wenn es fehlt, nutzt der Hub den vorhandenen Playwright-Capture als Fallback.

### Entity-/Alias-Erweiterung

```bash
npm run entity:expand -- "Mars Climate Orbiter"
```

Wikidata liefert alternative Namen für bessere Archivtreffer.

## Archive-first Medienquellen

```bash
npm run documentary:research -- "Mars Climate Orbiter" --type image
npm run documentary:research -- "Apollo 11" --type video
```

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

Ranking:

```text
official-archive > archive > open-media > stock-fallback
```

## Visual- und Shot-Plan

```bash
npm run beat:plan -- --plan projects/<id>/visual-plan.json
```

Der Planner erzeugt `shot-plan.json` mit Shot-Dauer, Medienpriorität, Präsentation und Preprocessing. Er erzeugt **keine automatischen Erklärgrafiken** und erfindet keine neue Story.

## Phase-1 Materialisierung

```bash
npm run phase1:materialize -- --project <id> --download-top 1
```

Danach optional der neue einfache Qualitäts-Pass:

```bash
npm run phase1:quality -- --project <id>
```

Er prüft die bereits heruntergeladenen Medien technisch und nutzt pyiqa, wenn es vorhanden ist.

Nur bei Bedarf mit schweren optionalen Modellen:

```bash
npm run phase1:quality -- --project <id> --deep true
```

Deep Mode ergänzt Asset-Memory mit OpenCLIP/sqlite-vec und DINOv2-Dublettenprüfung. Er ist nicht erforderlich, um normale Videos zu produzieren.

Danach:

```bash
npm run visual:qc -- --project <id>
npm run inbox:scan
npm run inbox:review
npm run phase1:bind -- --project <id>
```

Phase 1 ist erst fertig, wenn die benötigten Beats an tatsächlich geprüfte Assets gebunden sind.

## Best Subclip statt komplettes Archivvideo

```bash
npm run clip:find -- --profile <style-profile.json> --query "damaged satellite" --extract true
```

OpenCLIP kann passende Shots ranken. Der Score beweist weder Ereignisidentität noch Nutzungsrechte.

## Bildvorbereitung

```bash
npm run image:prepare -- --file ./inbox/photo.jpg --output ./tmp/photo-16x9.jpg
```

Sharp/libvips wird bevorzugt und nutzt einen Attention-Crop. Ohne Sharp gibt es einen FFmpeg-Fallback. Es werden keine Bildinhalte generiert.

Optionale Spezialfälle:

```bash
npm run tools -- image-quality --file ./inbox/photo.jpg
npm run tools -- smart-crop --file ./inbox/photo.jpg --prompt "volcano" --output ./tmp/crop.jpg
npm run tools -- visual-dedupe --images a.jpg,b.jpg,c.jpg
```

GroundingDINO/SAM und DINOv2 sind schwere optionale Helfer und standardmäßig aus.

## Lokales Asset-Gedächtnis

```bash
npm run tools -- asset-memory-index --file ./library/image.jpg --id VAH-123 --title "Chaiten lightning"
npm run tools -- asset-memory-search --query "dark ash cloud with lightning"
```

OpenCLIP erzeugt Embeddings; sqlite-vec speichert und durchsucht sie lokal. Das spart bei späteren Videos unnötige Neusuche.

## Phase 2 — Nutzer-Voiceover

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Die Pipeline erzeugt oder ersetzt die Stimme nicht.

Arbeitskopie auf saubere Lautheit bringen:

```bash
npm run audio:prepare -- --file ./voiceover.wav --output ./voiceover-normalized.wav
```

`ffmpeg-normalize` wird bevorzugt; FFmpeg `loudnorm` ist der Fallback.

Zeitmarken:

```bash
npm run voiceover:align -- --project <id>
```

Optional Precision Mode mit WhisperX:

```bash
npm run tools -- voiceover-precision --file ./voiceover.wav --output .local-storage/whisperx/words.json
```

Die Nutzer-Voiceover bleibt immer Master-Audio.

## Phase 3 — Antigravity / Assembly

Erlaubt:

- echte Videos trimmen
- echte Fotos/B-Rolls einsetzen
- harte Schnitte
- Crops/Reframing
- dezente Push-ins/Pans
- Freeze-Frames aus freigegebenem Material
- Vertical-Blur-Sidefill
- echte Dokument-/Artikel-Crops
- echte offizielle Karten/Diagramme aus Phase 1

Nicht automatisch erlaubt:

- erfundene Teilchen-/Elektronenanimationen
- generische Pfeile/Kreise/Callouts
- mittige Infokarten
- Kapitelkarten als Lückenfüller
- große Zahlen-Overlays nur weil die Voiceover eine Zahl nennt
- beliebige Ersatz-B-Roll, wenn ein Phase-1-Asset fehlt

Wenn das richtige Material fehlt, geht der Beat zurück in Phase 1.

## Final-QC

```bash
npm run final:qc -- --file ./final.mp4
```

Optional VMAF gegen eine Master-/Referenzdatei:

```bash
npm run final:qc -- --file ./final-encode.mp4 --reference ./master.mp4
```

VMAF wird nur genutzt, wenn der lokale FFmpeg-Build `libvmaf` enthält.

## Open-Source Toolbox

Alle neuen Helfer laufen über **einen** Einstiegspunkt:

```bash
npm run tools -- doctor
npm run tools -- help
```

Integriert sind:

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

Details und Installationsstufen: `docs/OPEN-SOURCE-TOOLCHAIN.md`.

## Rights-Gate für technische Downloader

`gallery-dl` und `yt-dlp` bedeuten nicht automatisch, dass ein Medium verwendet werden darf.

```bash
npm run tools -- safe-fetch --url "https://..." --rights-cleared true
```

Ohne explizites `--rights-cleared true` blockiert der Hub den Download. Auch dieser Flag ist nur Workflow-Dokumentation und kein Rechtsnachweis.

## Optionales KI-Upscaling

Real-ESRGAN ist standardmäßig aus:

```bash
npm run tools -- enhance --file old-photo.jpg --allow-ai-enhancement true
```

Jede Ausgabe erhält eine Sidecar-Datei, die das AI-Upscaling markiert. Solche Bilder dürfen nicht als forensische/wissenschaftliche Detailbeweise behandelt werden.

## Sicherheit / Rechte

Die schreibende Browser-API läuft nur lokal. Fremde Plattformen werden nicht deshalb zu Produktionsquellen, weil ein technischer Download möglich ist. Externe Medien bleiben im Rechte-/Event-Review. Nutzer-Voiceover, Quellen-Provenance und die Real-Media-First-Regel bleiben feste Bestandteile des Workflows.
