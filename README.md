# Visual Asset Hub

Lokaler Recherche-, Asset- und Rendering-Hub für **faceless YouTube-Dokumentationen/Listicles** mit echten Visuals, sauberer Rechteprüfung und einer vom Nutzer gelieferten Voiceover-Datei als Master-Audio.

**Aktueller Entwicklungsstand: Production Workflow v0.12.0**

## Grundidee

Der Hub ist **archive-first**, nicht stock-first:

1. exaktes Ereignis-/Originalmaterial
2. offizielle Archive und Behördenquellen
3. Archivmaterial
4. Dokumente, Screenshots, Karten und Presse-/Faktenquellen
5. sehr spezifische B-Roll
6. erklärende Grafiken
7. generischer Stock nur als Fallback

Visuals werden bereits in **Phase 1** recherchiert und ausgewählt. Phase 3 richtet die vorhandenen Visuals nur noch an der echten Voiceover-Datei aus.

## Schnellstart

Voraussetzungen:

- Node.js 22+
- FFmpeg inklusive `ffprobe`
- optional `yt-dlp` für Referenzvideo-Metadaten/Untertitel
- optional `whisper.cpp` für lokale Voiceover-Zeitmarken
- optional PySceneDetect + OpenCLIP für Shot-/Subclip-Intelligenz
- optional Playwright + Chromium für Artikel-/Screenshot-Inserts

```bash
npm run check
npm run serve
```

Browser:

```text
http://127.0.0.1:4173
```

## Phase 1 – Story + Fakten + Visuals

Breite Story-/Quellenrecherche:

```bash
npm run research:discover -- "Mars Climate Orbiter unit conversion failure"
```

Standardmäßig wird **GDELT** ohne API-Key durchsucht. Optional kann eine eigene kostenlose SearXNG-Instanz ergänzt werden:

```env
SEARXNG_URL=http://127.0.0.1:8080
```

```bash
npm run research:discover -- "Mars Climate Orbiter" --limit 40
```

Treffer dienen zur **Discovery**. Sie werden nicht automatisch zu Produktionsassets oder als frei nutzbar erklärt.

### Entity-/Alias-Erweiterung

```bash
npm run entity:expand -- "Mars Climate Orbiter"
```

Wikidata liefert alternative deutsche/englische Labels und Aliase, damit Archive nicht nur mit einer Schreibweise durchsucht werden.

## Archive-first Medienrecherche

```bash
npm run documentary:research -- "Mars Climate Orbiter" --type image
npm run documentary:research -- "Apollo 11" --type video
```

Keyless-Quellen:

- **NASA Image & Video Library**
- **Library of Congress**
- **Wikimedia Commons**
- **Internet Archive**
- **Openverse** für offene Bilder

Ranking:

```text
official-archive > archive > open-media > stock-fallback
```

Pexels/Pixabay bleiben optionale Fallbacks und brauchen nur dann Keys:

```env
PEXELS_API_KEY=
PIXABAY_API_KEY=
```

## Referenzstil wirklich analysieren

Metadaten/Untertitel eines Referenzvideos:

```bash
npm run reference:inspect -- "https://youtu.be/VIDEO_ID"
```

Lokale Referenz-MP4 visuell in Shots zerlegen:

```bash
python3 -m pip install "scenedetect[opencv]"
npm run reference:style -- --file ./reference.mp4
```

Ergebnis: `style-profile.json` mit u. a. Shot-Anzahl, Cuts/Minute, Median-/Durchschnittslänge und repräsentativen Frames.

## Best Subclip statt komplettes Archivvideo

OpenCLIP lokal installieren:

```bash
python3 -m pip install open_clip_torch pillow
```

Frames gegen einen Sprecher-/Visual-Beat ranken:

```bash
npm run visual:match -- \
  --query "damaged satellite on factory floor" \
  --images frame1.jpg,frame2.jpg,frame3.jpg
```

Langes Archivvideo analysieren und beste Shots finden:

```bash
npm run clip:find -- \
  --profile .local-storage/reference-style/archive/style-profile.json \
  --query "damaged satellite on factory floor" \
  --extract true
```

CLIP-Scores sind nur Relevanzsignale. Ereignisidentität und Rechte müssen weiter geprüft werden.

## Artikel-/Dokument-Inserts

Playwright lokal installieren:

```bash
npm install --no-save playwright
npx playwright install chromium
```

Artikel als Recherchebeweis erfassen:

```bash
npm run research:capture -- "https://example.org/article"
```

Speichert Screenshot, Haupttext, Titel, Autor, Datum und Canonical-URL.

Optional direkt als **Review-Asset** in die Inbox:

```bash
npm run research:capture -- "https://example.org/article" --to-inbox true
```

Das Asset erhält absichtlich `unknown/review`-Rechte. Ein Webseiten-Screenshot wird niemals automatisch als frei nutzbar markiert.

## Inbox / Rechte-Gate

```bash
npm run inbox:scan
npm run inbox:review
```

Automatisch erkannt werden u. a. SHA-256, Auflösung, Ausrichtung, Dauer, FPS, Codec, Audio und Preview.

Externe Medien behalten Quelle, Creator und Lizenzinformationen. `unknown` und `restricted` bleiben im Review.

## Phase 2 – deine Voiceover

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Die Pipeline erzeugt oder ersetzt die Stimme nicht.

Optional:

```bash
npm run voiceover:align -- --project <id>
```

## Phase 3/4 – Schnitt + Remotion

Der Renderer unterstützt inzwischen:

- harte Cuts als Standard
- normale 16:9-Videos
- vertikale Handy-/Internetclips mit Blur-Sidefill
- dokumentarische Ken-Burns-Bewegungen für Bilder
- Artikel-/Dokument-Screenshots mit Top-Fokus und leichter Kamerafahrt
- Nutzer-Voiceover als Masterspur
- stumme B-Roll

Remotion bleibt Schnitt-/Motion-Schicht; es soll nicht die komplette Bildwelt als Dashboard erzeugen.

## Wichtige Befehle

```bash
npm run research:discover -- "Suchbegriff"
npm run research:capture -- "https://example.org/article" --to-inbox true
npm run documentary:research -- "Suchbegriff" --type video
npm run entity:expand -- "Entity"
npm run reference:inspect -- "https://youtu.be/VIDEO_ID"
npm run reference:style -- --file ./reference.mp4
npm run visual:match -- --query "Beschreibung" --images a.jpg,b.jpg
npm run clip:find -- --profile <style-profile.json> --query "Beschreibung" --extract true
npm run source:search -- "Suchbegriff" --provider nasa --type image
npm run source:grab -- "Suchbegriff" --provider library-of-congress --type image
npm run inbox:scan
npm run inbox:review
npm run youtube:workflow -- help
npm run video:project -- help
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
docs/         Regeln und Architektur
projects/     Video-Projekte, Phase-1-Pläne und Render-Manifeste
renderer/     Remotion-Renderer
scripts/      Recherche-, Matching-, Import-, Analyse- und Projekt-Tools
tests/        automatisierte Tests
web/          lokale Quellen-, Review- und Bibliotheksoberfläche
```

## Sicherheit / Rechte

Die schreibende Browser-API läuft nur lokal auf `127.0.0.1`, `localhost` oder `::1`.

YouTube, Newsseiten und andere fremde Plattformen werden nicht allein deshalb als Produktionsquelle behandelt, weil ein technischer Download oder Screenshot möglich wäre. Automatische Wiederverwendung bleibt gesperrt, solange keine passende Rechtsgrundlage oder Freigabe geprüft wurde.
