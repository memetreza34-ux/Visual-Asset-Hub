# Open-Source Toolchain

## Ziel

Mehr Qualität, ohne den Workflow komplizierter zu machen.

```text
PHASE 1
Recherche → echtes Material → Rechte/QC → Visual-/Shot-Plan

PHASE 2
Nutzer erstellt die Voiceover

PHASE 3
Antigravity schneidet die festgelegten Real-Media-Assets auf die Voiceover-Timeline
```

Remotion/Antigravity ist **Assembly**, nicht Erklärgrafik-Generator. Siehe `docs/REAL-MEDIA-EDITING-POLICY.md`.

## Ein Einstiegspunkt

```bash
npm run tools -- doctor
```

Der Doctor zeigt, was lokal verfügbar ist. Fehlende optionale Tools blockieren den normalen Workflow nicht.

## Stufe A — leicht

```bash
python3 -m pip install -r requirements-tools-light.txt
```

Enthalten bzw. vorgesehen:

- Trafilatura — Haupttext/Metadaten aus Webseiten
- sqlite-vec — lokale Vektordatenbank
- Pillow — Bildbasis
- ffmpeg-normalize — Voiceover-Loudness
- gallery-dl / yt-dlp — nur für vorher rechtegeprüfte Downloads

Zusätzlich separat, falls gewünscht:

- MediaInfo — technische Medienmetadaten; ffprobe ist Fallback
- ArchiveBox — Quellenarchiv; Playwright-Capture ist Fallback
- Sharp/libvips — schneller Attention-Crop; FFmpeg ist Fallback

Sharp:

```bash
npm install --no-save sharp
```

## Stufe B — Quality

Nur wenn bessere automatische Auswahl/Asset-Memory gebraucht wird:

```bash
python3 -m pip install -r requirements-tools-quality.txt
```

Enthält:

- OpenCLIP — Text↔Bild-Relevanz und Asset-Memory
- pyiqa — Bildqualitätsmetriken
- Torch/Torchvision als Modellbasis

Der normale Workflow funktioniert auch ohne diese Stufe.

## Stufe C — Heavy

Nur für Spezialfälle:

```bash
python3 -m pip install -r requirements-tools-heavy.txt
```

- WhisperX — wortgenaue Voiceover-Timings
- DINOv2 — visuelle Dubletten/Ähnlichkeit
- GroundingDINO — textgeführter Motiv-Crop
- Segment Anything — optionales Crop-Refinement
- Real-ESRGAN — separates Binary; Upscaling nur nach explizitem Opt-in

Diese Werkzeuge sind standardmäßig **AUS** und dürfen keine neuen Doku-Inhalte erfinden.

## Phase-1 Quality Pass

Nach `phase1:materialize`:

```bash
npm run phase1:quality -- --project <id>
```

Normal prüft er die heruntergeladenen Medien technisch und nutzt pyiqa nur, wenn es vorhanden ist.

Deep Mode:

```bash
npm run phase1:quality -- --project <id> --deep true
```

Deep Mode ergänzt OpenCLIP/sqlite-vec Asset-Memory und DINOv2-Dublettenprüfung. Rechte- und Event-Review bleiben separat verpflichtend.

## Häufige Befehle

### Webseite extrahieren

```bash
npm run research:extract -- --url "https://example.org/article" --output .local-storage/research/article.json
```

### Quelle archivieren

```bash
npm run tools -- archive --url "https://example.org/source"
```

ArchiveBox wird bevorzugt, Playwright-Capture ist Fallback.

### Medien-QC

```bash
npm run tools -- media-qc --file ./inbox/clip.mp4
```

MediaInfo wird bevorzugt, ffprobe ist Fallback.

### 16:9-Bild vorbereiten

```bash
npm run image:prepare -- --file ./inbox/photo.jpg --output ./tmp/photo-16x9.jpg
```

Sharp nutzt Attention-Crop; FFmpeg ist Fallback. Es werden keine Bildinhalte generiert.

### Bildqualität

```bash
npm run tools -- image-quality --file ./inbox/photo.jpg
```

pyiqa-Scores sind Qualitätsindikatoren, keine Rechte- oder Ereignisbeweise.

### Asset-Memory

```bash
npm run tools -- asset-memory-index --file ./library/image.jpg --id VAH-123 --title "Chaiten lightning"
npm run tools -- asset-memory-search --query "dark volcanic ash cloud with lightning"
```

OpenCLIP erzeugt Embeddings, sqlite-vec speichert sie lokal.

### Voiceover normalisieren

```bash
npm run audio:prepare -- --file ./voiceover.wav --output ./voiceover-normalized.wav
```

ffmpeg-normalize wird bevorzugt; FFmpeg loudnorm ist Fallback.

### WhisperX Precision Mode

```bash
npm run tools -- voiceover-precision --file ./voiceover.wav --output .local-storage/whisperx/words.json
```

Die Nutzer-Voiceover bleibt Master-Audio; es wird keine Stimme generiert.

### Visual-Dubletten

```bash
npm run tools -- visual-dedupe --images a.jpg,b.jpg,c.jpg
```

DINOv2 erkennt Ähnlichkeit. Das beweist nicht, dass Bilder dasselbe Ereignis zeigen.

### Motiv-Crop

```bash
npm run tools -- smart-crop --file photo.jpg --prompt "volcano" --output crop.jpg
```

GroundingDINO findet das Motiv. `--sam true` kann optional Segment Anything zur Verfeinerung nutzen. Nur Crop, kein generierter Bildinhalt.

### AI-Upscaling

```bash
npm run tools -- enhance --file old-photo.jpg --allow-ai-enhancement true
```

Real-ESRGAN ist absichtlich nicht automatisch aktiv. Die Ausgabe bekommt eine `.derived.json` mit AI-Hinweis.

### Rights-Gate für Downloader

```bash
npm run tools -- safe-fetch --url "https://..." --rights-cleared true
```

Ohne `--rights-cleared true` wird abgebrochen. Der Flag ist Workflow-Dokumentation und kein Rechtsnachweis.

### Final-QC

```bash
npm run final:qc -- --file ./final.mp4
```

Optional VMAF mit Master-/Referenzdatei:

```bash
npm run final:qc -- --file ./final-encode.mp4 --reference ./master.mp4
```

## Qualitätslogik

```text
Faktenquelle       → Ist die Aussage belegbar?
Rechteprüfung      → Darf das Medium verwendet werden?
OpenCLIP           → Passt das Medium semantisch zum Beat?
DINOv2             → Ist es visuell zu ähnlich zu anderem Material?
pyiqa              → Ist die Bildqualität brauchbar?
MediaInfo/ffprobe  → Ist die Datei technisch brauchbar?
Sharp/Smart Crop   → Ist das Motiv im 16:9-Frame gut platziert?
WhisperX           → Wo liegen Wörter/Beats zeitlich?
VMAF               → Hat der finale Encode unnötig Qualität verloren?
```

## Bewusst nicht automatisch

- keine Elektronen-/Teilchenanimationen
- keine generischen Pfeile/Kreise/Callouts
- keine automatisch erzeugten Infokarten
- kein KI-Upscaling ohne Opt-in
- kein Plattform-Download ohne Rights-Gate
- kein Umschreiben der Nutzer-Voiceover
- kein Ersetzen eines fehlenden Phase-1-Assets durch zufällige B-Roll

So bleibt die Pipeline stärker, aber kontrollierbar und einfach.
