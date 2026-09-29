# Open-Source Toolchain

## Ziel

Mehr Qualität, ohne den Workflow komplizierter zu machen.

Der Standard bleibt:

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

## Stufe A — normal / leicht

Diese Werkzeuge liefern den größten Nutzen und sollen bevorzugt werden:

| Tool | Aufgabe | Verhalten |
|---|---|---|
| FFmpeg / ffprobe | Schnitt, Frames, Audio, Basis-QC | Kern |
| Trafilatura | Haupttext/Metadaten aus Webseiten | optional, sehr empfohlen |
| ArchiveBox | Quellen lokal archivieren | optional; Playwright-Capture ist Fallback |
| MediaInfo | technische Medienmetadaten | optional; ffprobe ist Fallback |
| Sharp/libvips | schneller 16:9-Crop/Resize | optional; FFmpeg ist Fallback |
| sqlite-vec + OpenCLIP | lokales Asset-Gedächtnis | optional |
| pyiqa | Bildqualitätsmessung | optional |
| ffmpeg-normalize | Voiceover-Lautheit | optional; FFmpeg loudnorm ist Fallback |
| VMAF | Final-Encode-Vergleich | optional, wenn Referenz vorhanden |
| gallery-dl / yt-dlp | technischer Abruf erlaubter Medien | nur hinter Rights-Gate |

### Leichte Python-Pakete

```bash
python3 -m pip install -r requirements-tools-light.txt
```

Zusätzlich je nach Betriebssystem:

```text
ArchiveBox
MediaInfo
ffmpeg-normalize
gallery-dl
yt-dlp
```

Sharp bleibt absichtlich optional:

```bash
npm install --no-save sharp
```

## Stufe B — schwere optionale KI-Helfer

Nur installieren, wenn sie gebraucht werden:

```bash
python3 -m pip install -r requirements-tools-heavy.txt
```

| Tool | Aufgabe | Standard |
|---|---|---|
| WhisperX | wortgenaue Voiceover-Timings | AUS; whisper.cpp bleibt Standard |
| DINOv2 | visuelle Dubletten/Ähnlichkeit | AUS |
| GroundingDINO | textgeführter Motiv-Crop | AUS |
| Segment Anything | optionales Crop-Refinement | AUS |
| Real-ESRGAN | altes kleines Material hochskalieren | AUS + explizite Freigabe nötig |

Diese Tools dürfen **keine neuen Doku-Inhalte erfinden**.

## Häufige Befehle

### Webseiteninhalt sauber extrahieren

```bash
npm run research:extract -- --url "https://example.org/article" --output .local-storage/research/article.json
```

Trafilatura extrahiert Haupttext und Metadaten. Das ist eine Recherchehilfe und keine Aussage über Medienrechte.

### Quelle archivieren

```bash
npm run tools -- archive --url "https://example.org/source"
```

Wenn ArchiveBox vorhanden ist, wird es verwendet. Sonst fällt der Hub auf den bestehenden Playwright-Artikel-Capture zurück.

### Medien-QC

```bash
npm run tools -- media-qc --file ./inbox/clip.mp4
```

MediaInfo wird bevorzugt. Wenn es fehlt, wird ffprobe benutzt.

### Bild auf 16:9 vorbereiten

```bash
npm run image:prepare -- --file ./inbox/photo.jpg --output ./tmp/photo-16x9.jpg
```

Sharp nutzt einen Attention-Crop. Ohne Sharp wird ein sauberer FFmpeg-Center-Crop verwendet. Es werden keine Bildinhalte generiert.

### Bildqualität messen

```bash
npm run tools -- image-quality --file ./inbox/photo.jpg
```

`pyiqa` liefert technische/no-reference Qualitätssignale. Diese Scores ersetzen weder semantische Relevanz noch Rechteprüfung.

### Asset-Memory

```bash
npm run tools -- asset-memory-index --file ./library/image.jpg --id VAH-123 --title "Chaiten lightning"
npm run tools -- asset-memory-search --query "dark volcanic ash cloud with lightning"
```

OpenCLIP erzeugt Embeddings, sqlite-vec speichert und durchsucht sie lokal. Ein Treffer ist nur ein Retrieval-Signal.

### Voiceover normalisieren

```bash
npm run audio:prepare -- --file ./voiceover.wav --output ./voiceover-normalized.wav
```

`ffmpeg-normalize` wird bevorzugt. Sonst wird FFmpeg `loudnorm` benutzt.

### WhisperX Precision Mode

```bash
npm run tools -- voiceover-precision --file ./voiceover.wav --output .local-storage/whisperx/words.json
```

Nur wenn WhisperX installiert ist. Die Nutzer-Voiceover bleibt unverändert Master-Audio; das Tool erzeugt keine Stimme.

### Visual-Dubletten finden

```bash
npm run tools -- visual-dedupe --images a.jpg,b.jpg,c.jpg
```

DINOv2 erkennt ähnliche Bilder. Es beweist nicht, dass zwei Bilder dasselbe Ereignis zeigen.

### Motiv-Crop

```bash
npm run tools -- smart-crop --file photo.jpg --prompt "volcano" --output crop.jpg
```

GroundingDINO findet das Motiv und setzt nur den Crop. Mit `--sam true` kann Segment Anything zusätzlich verfeinern. Kein generierter Bildinhalt.

### Real-ESRGAN

```bash
npm run tools -- enhance --file old-photo.jpg --allow-ai-enhancement true
```

Absichtlich nicht automatisch. Jede Ausgabe erhält eine `.derived.json`, die das KI-Upscaling kennzeichnet. Nicht für forensische/wissenschaftliche Detailbeweise verwenden.

### Rights-Gate für Downloader

```bash
npm run tools -- safe-fetch --url "https://..." --rights-cleared true
```

Ohne `--rights-cleared true` wird abgebrochen. Der Flag dokumentiert nur, dass der Workflow die Rechte vorher geprüft hat; er ist selbst kein Rechtsnachweis.

### Final-QC

```bash
npm run final:qc -- --file ./final.mp4
```

Mit einer Master-/Referenzdatei und einem FFmpeg-Build mit libvmaf:

```bash
npm run final:qc -- --file ./final-encode.mp4 --reference ./master.mp4
```

## Qualitätslogik

Die Tools werden nicht einfach zu einem großen Score vermischt. Jede Ebene beantwortet eine andere Frage:

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

## Was bewusst NICHT automatisch passiert

- keine Elektronen-/Teilchenanimationen
- keine generischen Pfeile/Kreise/Callouts
- keine automatisch erzeugten Infokarten
- kein KI-Upscaling ohne expliziten Opt-in
- kein Download von Social-/Video-Plattformen ohne Rights-Gate
- kein automatisches Umschreiben der Nutzer-Voiceover
- kein Ersetzen eines fehlenden Phase-1-Assets durch zufällige B-Roll

So bleibt die Pipeline leistungsfähiger, ohne unkontrollierbar oder kompliziert zu werden.
