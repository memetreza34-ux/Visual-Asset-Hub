# Visual Asset Hub

Lokaler Recherche-, Asset- und Rendering-Hub für **faceless YouTube-Dokumentationen/Listicles** mit echten Visuals, sauberer Rechteprüfung und einer vom Nutzer gelieferten Voiceover-Datei als Master-Audio.

**Aktueller Entwicklungsstand: Production Workflow v0.13.0**

## Grundidee

Der Hub ist **archive-first**, nicht stock-first:

1. exaktes Ereignis-/Originalmaterial
2. offizielle Archive und Behördenquellen
3. Archivmaterial
4. Dokumente, Screenshots, Karten und Presse-/Faktenquellen
5. sehr spezifische B-Roll
6. erklärende Grafiken
7. generischer Stock nur als Fallback

Visuals werden bereits in **Phase 1** recherchiert und ausgewählt. Die spätere Schnittphase darf die Story nicht neu erfinden.

## Produktionsfluss

```text
THEMA
  ↓
Story-/Faktenrecherche
  ↓
Visual-Recherche + Rechteprüfung
  ↓
visual-plan.json
  ↓
beat:plan → shot-plan.json
  ↓
benötigte Maps / Freeze-Frames / Artikel-Inserts vorbereiten
  ↓
NUTZER-VOICEOVER
  ↓
Voiceover-Timings
  ↓
freigegebene Assets auf echte Audio-Timeline legen
  ↓
Remotion
  ↓
FINAL MP4
```

## Schnellstart

Voraussetzungen:

- Node.js 22+
- FFmpeg inklusive `ffprobe`
- optional `yt-dlp` für Referenzvideo-Metadaten/Untertitel
- optional `whisper.cpp` für lokale Voiceover-Zeitmarken
- optional PySceneDetect + OpenCLIP für Shot-/Subclip-Intelligenz
- optional Playwright + Chromium für Artikel-/Karten-Inserts

```bash
npm run check
npm run serve
```

Browser: `http://127.0.0.1:4173`

## Phase 1 – Story + Fakten + Visuals

Breite Story-/Quellenrecherche:

```bash
npm run research:discover -- "Mars Climate Orbiter unit conversion failure"
```

GDELT läuft ohne API-Key. Optional kann eine eigene SearXNG-Instanz ergänzt werden:

```env
SEARXNG_URL=http://127.0.0.1:8080
```

Treffer dienen zur **Discovery**. Sie werden nicht automatisch zu Produktionsassets oder als frei nutzbar erklärt.

### Entity-/Alias-Erweiterung

```bash
npm run entity:expand -- "Mars Climate Orbiter"
```

Wikidata liefert alternative Labels/Aliase, damit Archive nicht nur mit einer Schreibweise durchsucht werden.

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

Pexels/Pixabay bleiben optionale Fallbacks.

## Referenzstil analysieren

```bash
npm run reference:inspect -- "https://youtu.be/VIDEO_ID"
python3 -m pip install "scenedetect[opencv]"
npm run reference:style -- --file ./reference.mp4
```

`reference:style` erzeugt ein `style-profile.json` mit Shot-Längen, Cuts/Minute und repräsentativen Frames.

## Best Subclip statt komplettes Archivvideo

```bash
python3 -m pip install open_clip_torch pillow
npm run visual:match -- --query "damaged satellite on factory floor" --images frame1.jpg,frame2.jpg
npm run clip:find -- --profile .local-storage/reference-style/archive/style-profile.json --query "damaged satellite on factory floor" --extract true
```

CLIP-Scores sind nur Relevanzsignale. Ereignisidentität und Rechte müssen weiter geprüft werden.

## Editorial Beat Planner

Nach der Phase-1-Recherche wird der visuelle Plan in konkrete Shot-Anweisungen übersetzt:

```bash
npm run beat:plan -- --plan projects/<id>/visual-plan.json
```

Optional mit dem Schnittprofil eines Referenzvideos:

```bash
npm run beat:plan -- \
  --plan projects/<id>/visual-plan.json \
  --style-profile .local-storage/reference-style/reference/style-profile.json
```

Ergebnis: `shot-plan.json` mit u. a.:

- `presentation`: auto / article / document / map / freeze-frame / headline / vertical-blur
- Shot-Dauerbereich
- harte Cuts oder Fade
- Medienpriorität
- Headline-/Zahl-/Callout-/Quellen-Overlays
- notwendige Preprocessing-Schritte
- Qualitäts-Gate: Event-Match, Rechteprüfung und semantische Relevanz

**Wichtig:** `beat:plan` übersetzt den bereits recherchierten Phase-1-Intent. Es erfindet keine neue Story und startet keine planlose B-Roll-Suche.

## Artikel-/Dokument-Inserts

```bash
npm install --no-save playwright
npx playwright install chromium
npm run research:capture -- "https://example.org/article" --to-inbox true
```

Screenshot, Haupttext, Titel, Autor, Datum und Canonical-URL werden gespeichert. Screenshots erhalten absichtlich Review-Rechte.

## Doku-Karten ohne API-Key

```bash
npm install --no-save playwright maplibre-gl
npx playwright install chromium

npm run map:render -- \
  --center "2.35,48.86" \
  --zoom 5 \
  --marker "2.35,48.86,Paris" \
  --title "Frankreich" \
  --to-inbox true
```

Routen:

```bash
npm run map:render -- \
  --center "-20,20" \
  --zoom 2 \
  --route "-43.17,-22.90;-17,5;2.35,48.86" \
  --title "Route"
```

MapLibre + OpenFreeMap werden verwendet. OpenStreetMap-Attribution bleibt verpflichtend und die Karte landet bei `--to-inbox true` zunächst im Review.

## Freeze-Frames

Aus einem katalogisierten Video:

```bash
npm run frame:extract -- --asset VAH-XXXXXXXX --at 12.4
```

Der extrahierte Frame landet standardmäßig in `inbox/`, übernimmt die Quellen-/Lizenzbedingungen des Parent-Assets und bleibt trotzdem erneut im Review.

## Inbox / Rechte-Gate

```bash
npm run inbox:scan
npm run inbox:review
```

Automatisch erkannt werden u. a. SHA-256, Auflösung, Ausrichtung, Dauer, FPS, Codec, Audio und Preview. `unknown` und `restricted` bleiben im Review.

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
- vertikale Clips mit Blur-Sidefill
- dokumentarische Ken-Burns-Bewegungen
- Artikel-/Dokument-Screenshots
- Doku-Karten
- Freeze-Frames
- Headline-Overlays
- Impact-Zahlen
- punktgenaue Callouts
- Quellenlabels
- Nutzer-Voiceover als Masterspur
- stumme B-Roll

Beispiel beim Szenenaufbau:

```bash
npm run video:project -- add \
  --project beispiel \
  --asset VAH-XXXXXXXX \
  --duration 5 \
  --presentation map \
  --label "Frankreich · 2014" \
  --callout "Bahnsteigkante" \
  --callout-x 63 \
  --callout-y 44 \
  --source-label "Assemblée nationale"
```

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
npm run beat:plan -- --plan projects/<id>/visual-plan.json
npm run map:render -- --center "13.4,52.5" --zoom 5 --marker "13.4,52.5,Berlin"
npm run frame:extract -- --asset VAH-XXXXXXXX --at 3.2
npm run inbox:scan
npm run inbox:review
npm run youtube:workflow -- help
npm run video:project -- help
npm run check
npm run serve
```

## Sicherheit / Rechte

Die schreibende Browser-API läuft nur lokal. YouTube, Newsseiten und andere fremde Plattformen werden nicht allein deshalb als Produktionsquelle behandelt, weil ein technischer Download oder Screenshot möglich wäre. Automatische Wiederverwendung bleibt gesperrt, solange keine passende Rechtsgrundlage oder Freigabe geprüft wurde.
