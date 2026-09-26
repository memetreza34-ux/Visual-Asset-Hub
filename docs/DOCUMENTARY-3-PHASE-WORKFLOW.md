# Documentary 3-Phasen-Workflow

Stand: 2026-09-26

## Zweck

Dieser Workflow ist der verbindliche Produktionsweg fuer den deutschsprachigen Faceless-Dokumentationskanal.

```text
PHASE 1 - ChatGPT / Visual Asset Hub
Thema selbst waehlen
-> recherchieren
-> finales Skript
-> semantische Szenen
-> mehrere Visual-Shots je Szene
-> Vision-Check
-> Bilder + B-Rolls lokal speichern
-> Quellen + YouTube-Daten

PHASE 2 - Nutzer
script.txt kopieren
-> KI-Voice erzeugen
-> voiceover.mp3 ablegen

PHASE 3 - Timing / Antigravity / Remotion
finale Audio
-> echte Wort-Timings
-> semantische Szenenzeiten
-> mehrere Shots innerhalb jeder gelockten Szene
-> Preflight
-> Remotion V2
-> Export
```

**Grundregel:** Eine semantische Szene ist nicht mehr gleich ein Bild. Eine Szene beschreibt einen Sinnabschnitt im Sprechertext und darf 1-3 unterschiedliche Visual-Shots enthalten. Fuer ein typisches 2,5-Minuten-Video wird grob ein Bereich von etwa 25-35 eigenstaendigen Shots angestrebt, sofern das Material dies sinnvoll hergibt.

Exakte Sprecherzeiten werden weiterhin niemals in Phase 1 geraten. Sie entstehen erst in Phase 3 aus dem finalen Voiceover.

## Verbindliche Videostruktur

Alle normalen Doku-Projekte liegen sichtbar unter `videos/`:

```text
videos/
├── umweltgeschichte/
├── geschichte/
├── technik/
├── wissenschaft/
├── wirtschaft/
├── geopolitik/
└── sonstiges/
```

Jedes Thema bekommt einen nummerierten Projektordner:

```text
videos/<kategorie>/<nnn-thema>/
├── 01-SCRIPT/
│   └── script.txt
├── 02-AUDIO/
│   └── voiceover.mp3
├── 03-VISUALS/
│   ├── scene-001/
│   ├── scene-002/
│   └── ...
├── 04-SOURCES/
│   ├── sources.txt
│   └── licenses.csv
├── 05-PROJECT/
│   ├── project.json
│   ├── scenes.json
│   ├── visual-ledger.json
│   ├── research-summary.json
│   ├── materialization-summary.json
│   ├── word-timings-input.json
│   ├── word-timings.json
│   ├── timeline.json
│   ├── edit-plan.json
│   ├── antigravity-handoff.json
│   ├── phase3-state.json
│   ├── phase3-validation.json
│   ├── publish.json
│   ├── render-props.json
│   ├── render-plan.json
│   └── render-result.json
└── 06-EXPORT/
    ├── final-vN.mp4
    ├── youtube-title.txt
    ├── youtube-description.txt
    ├── youtube-tags.txt
    └── thumbnail-text.txt
```

Das zentrale Themenregister liegt getrennt unter `documentary-registry/`.

## Phase 1 - autonomer Visual Director

Standard:

```bash
npm run documentary:phase1
```

Phase 1 erledigt selbst:

- Themenregister pruefen
- neues Thema waehlen
- Kategorie und laufende Nummer bestimmen
- Fakten mit Websuche recherchieren
- finales ca. 2,5-Minuten-Skript schreiben
- semantische Szenen bilden
- pro Szene mehrere unterschiedliche Suchrichtungen erzeugen
- passende Archive/Stockquellen dynamisch priorisieren
- Metadaten-Ranking durchfuehren
- Top-Previews mit Vision pruefen
- sichtbare Fehlmatches und Dubletten abwerten
- pro Szene 1-3 unterschiedliche Shots festlegen
- B-Roll bei `mixed` aktiv bevorzugen
- ausgewaehlte Shots lokal speichern
- Quellen und Lizenzdaten sichern
- YouTube-Titel, Beschreibung, exakt 5 Hashtags, Tags und Thumbnail-Text vorbereiten

### Sucharsenal

Der Visual Director kann aktuell nutzen:

| Provider | Bild | Video | Hauptzweck |
|---|---:|---:|---|
| Pexels | ja | ja | moderne B-Roll |
| Pixabay | ja | ja | moderne B-Roll |
| Unsplash | ja | nein | hochwertige moderne Fotos |
| Openverse | ja | nein | offene Bildquellen |
| Wikimedia Commons | ja | ja | Archive, Orte, Personen, historische Medien |
| NASA Image and Video Library | ja | ja | Raumfahrt, Satellit, Erde, Klima, Wissenschaft |
| Library of Congress | ja | ja | historische Fotos, Film und Video |

NASA und Library of Congress benoetigen fuer diese Suchintegration keinen lokalen API-Key. Pexels, Pixabay und Unsplash verwenden weiterhin ihre vorhandenen Keys.

Ein Treffer oder Download ist **keine automatische Publikationsfreigabe**. Der konkrete Rechte-/Nutzungskontext bleibt Review-Pflicht.

### Provider-balancierte Recherche

Die alte Recherche konnte ihr Suchbudget schon mit den ersten Query/Provider-Kombinationen verbrauchen. Der neue Director verwendet standardmaessig bis zu 18 gezielte Tasks pro Szene und verteilt sie ueber:

- Video/B-Roll
- Archivmaterial
- Fotos
- Establishing Shots
- Details
- Karten/Ortskontext
- exakte Ereignis-/Personen-/Jahreszahl-Suchen

### Visual Ledger gegen Wiederholungen

`05-PROJECT/visual-ledger.json` merkt sich video-weit:

- bereits ausgewaehlte Asset-IDs/URLs
- Motiv-/Familien-Schluessel
- Provider-Haeufigkeit
- Motiv-Haeufigkeit
- zuletzt verwendete Visuals

Dadurch werden identische Assets, sehr aehnliche Serien/Motive und zu haeufig verwendete Provider abgestraft.

### Vision-Gate

Nach dem Metadaten-Ranking prueft Phase 1 die Top-Previews nach Moeglichkeit visuell. Gespeichert werden unter anderem:

```text
visibleRelevance: 0-100
exactness: exact | contextual | symbolic | mismatch
duplicateGroup
reason
```

Richtwerte:

- 90-100: sehr starker sichtbarer Match
- 75-89: stark verwendbar
- 55-74: nur Kontext
- unter 55: nicht bevorzugen
- `mismatch`: ablehnen

Das Vision-Gate bewertet ausdruecklich das sichtbare Preview und darf Dateiname/Metadaten nicht als Beweis behandeln. Faellt der Vision-Aufruf technisch aus, bleibt die verbesserte Metadaten-/Diversitaetsauswahl als Fallback erhalten.

Optional in `.env`:

```text
OPENAI_VISION_MODEL=...
```

Fehlt diese Einstellung, wird die vorhandene Phase-1-Modellkonfiguration verwendet.

## Phase 2 - Voice

Der Nutzer oeffnet:

```text
01-SCRIPT/script.txt
```

kopiert den kompletten Text in sein Voice-Tool und speichert das Ergebnis als:

```text
02-AUDIO/voiceover.mp3
```

Danach darf das Skript nicht still veraendert werden.

## Phase 3 - echte Sprecherzeiten + mehrere Shots

Standard:

```bash
npm run documentary:phase3 -- --project "videos/<kategorie>/<nnn-thema>"
```

Ablauf:

```text
script.txt + voiceover.mp3
-> echte Wort-Timestamps
-> striktes Wort-Alignment
-> semantische Szenengrenzen auf Audio mappen
-> visualShots[] je Szene uebernehmen
-> timeline.json
-> edit-plan.json
-> antigravity-handoff.json
```

Phase 3 veraendert **nicht** die inhaltlichen Szenengrenzen. Innerhalb einer gelockten Szene duerfen jedoch die bereits ausgewaehlten Visual-Shots editorial verteilt werden.

`timeline.json` enthaelt deshalb je Szene unter anderem:

```text
visualShots[]
shotCount
```

### Keine geratenen Zeiten

Abbruch statt Raten bei:

- fehlenden/zusaetzlichen Woertern
- geaenderter Wortreihenfolge
- nachtraeglich veraendertem Skript
- falschem Audio-Hash
- Luecken in der semantischen Szenenabdeckung

Wenn keine externe Wort-Timing-Datei vorhanden ist, kann Phase 3 das Voiceover mit der bestehenden Whisper-Wort-Timestamp-Pipeline analysieren.

### Render-Gate

Der V2-Preflight prueft:

- Skript-Hash
- Audio-Hash
- exaktes Wort-Alignment
- gelockte semantische Szenen
- **jede einzelne lokale Shot-Datei**
- freies `final-vN.mp4`-Ziel

Ein einzelnes vorhandenes Hauptbild reicht nicht mehr, wenn eine Szene mehrere ausgewaehlte Shots erwartet.

## Finaler Render - Remotion V2

Dry Run:

```bash
npm run documentary:render -- --project "videos/<kategorie>/<nnn-thema>" --dry-run
```

Final:

```bash
npm run documentary:render -- --project "videos/<kategorie>/<nnn-thema>"
```

Der Renderer:

- behaelt die exakten semantischen Szenengrenzen
- verteilt mehrere Shots innerhalb dieser Grenzen
- vermeidet nach Moeglichkeit extrem kurze Shots
- zielt editorial auf etwa 3,5-7 Sekunden je Visual-Shot
- rendert B-Roll stumm
- verwendet das Voiceover als Hauptaudio
- bewegt Standbilder dezent
- nutzt 1920x1080, 30 fps, H.264 + AAC
- ueberschreibt vorhandene `final-vN.mp4` niemals

## 06-EXPORT

```text
06-EXPORT/
├── final-vN.mp4
├── youtube-title.txt
├── youtube-description.txt
├── youtube-tags.txt
└── thumbnail-text.txt
```

Die Textdateien enthalten nur direkt kopierbaren Inhalt. `youtube-description.txt` enthaelt insgesamt exakt 5 Hashtags.

## Legacy-Fallback

Der alte Ein-Visual-Workflow bleibt vorerst nur zur Fehlersuche reproduzierbar:

```bash
npm run documentary:research:legacy
npm run documentary:materialize:legacy
npm run documentary:phase3:legacy
npm run documentary:render:legacy
```

Der normale Produktionsweg verwendet dagegen Visual Director V2/V3 und Remotion V2.

Weitere technische Details: `docs/DOCUMENTARY-VISUAL-DIRECTOR-V2.md`.
