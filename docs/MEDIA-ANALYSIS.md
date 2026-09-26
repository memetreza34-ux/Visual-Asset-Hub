# Automatische Medienanalyse

Visual Asset Hub kann lokale Medien vor dem Import automatisch mit FFmpeg analysieren. Dadurch müssen technische Metadaten nicht mehr manuell eingetragen werden.

## Voraussetzung

- Node.js 22+
- FFmpeg inklusive `ffmpeg` und `ffprobe` im `PATH`

Prüfen:

```bash
ffmpeg -version
ffprobe -version
```

## Analyse

```bash
npm run media:analyze -- --file ./inbox/clip.mp4
```

Die Ausgabe enthält soweit verfügbar:

- Dateiname und Dateigröße
- SHA-256
- Medientyp
- Ausrichtung
- Breite und Höhe
- Dauer
- FPS
- Video-Codec
- Pixel-Format
- Audio vorhanden
- Alpha-Kanal
- Pfad zur generierten Vorschau

Für Videos wird standardmäßig ein JPG-Thumbnail unter `previews/` erzeugt. Der Frame liegt ungefähr bei 25 % der Laufzeit.

## Optionen

```bash
# nur analysieren, kein Thumbnail
npm run media:analyze -- --file ./inbox/clip.mp4 --preview false

# eigener Preview-Pfad (muss unter previews/ liegen)
npm run media:analyze -- --file ./inbox/clip.mp4 --output previews/custom/clip.jpg

# Analyse zusätzlich als JSON speichern
npm run media:analyze -- --file ./inbox/clip.mp4 --json .local-storage/analysis/clip.json
```

## Sicherheitsregeln

- Originaldateien werden von der Analyse nicht verändert.
- Preview-Ausgaben außerhalb von `previews/` werden abgelehnt.
- SHA-256 wird über den tatsächlichen Dateiinhalt berechnet.
- Bei fehlendem FFmpeg wird mit einer verständlichen Fehlermeldung abgebrochen.

## Nächster Integrationsschritt

Die Analyse wird im nächsten Schritt direkt in den Inbox-/Asset-Import integriert, sodass technische Felder und Preview-Pfade automatisch in den Katalog übernommen werden.
