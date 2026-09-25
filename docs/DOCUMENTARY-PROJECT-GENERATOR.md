# Doku-Projektgenerator

Stand: 2026-09-25

Der Projektgenerator setzt die verbindliche 3-Phasen-Struktur technisch um.

## Zielstruktur

```text
ALLES-GEFUNDEN/07-DOKU-PROJEKTE/<projekt>/
├── 01-SCRIPT/
│   └── script.txt
├── 02-AUDIO/
├── 03-VISUALS/
│   ├── scene-001/
│   ├── scene-002/
│   └── ...
├── 04-SOURCES/
│   ├── sources.txt
│   └── licenses.csv
├── 05-PROJECT/
│   ├── project.json
│   └── scenes.json
└── 06-EXPORT/
```

`voiceover.mp3`, finale Visual-Dateien, Timings, Export-Metadaten und `final-v1.mp4` werden nicht als leere Fake-Dateien vorab erzeugt. Sie entstehen erst in ihrer jeweiligen Produktionsphase.

## Neues Doku-Projekt aus einer Skriptdatei

```bash
npm run documentary:new -- \
  --title "Warum Tschernobyl bis heute Folgen hat" \
  --script-file ./mein-script.txt
```

Standardziel:

```text
ALLES-GEFUNDEN/07-DOKU-PROJEKTE/warum-tschernobyl-bis-heute-folgen-hat/
```

## Bestehendes Script-Visual-Projekt übernehmen

Der Script Visual Finder speichert sein Arbeitsprojekt unter `.local-storage/script-visual-projects/`.

Ein solches Projekt kann direkt in die neue Doku-Struktur überführt werden:

```bash
npm run documentary:from-script-visual -- \
  --project .local-storage/script-visual-projects/SVP-XXXXXXXXXXXX.json
```

Dabei werden automatisch übernommen:

- finales Originalskript nach `01-SCRIPT/script.txt`
- tatsächliche Szenenanzahl
- `03-VISUALS/scene-001 ... scene-NNN`
- semantischer Szenenplan nach `05-PROJECT/scenes.json`
- Visual Intent
- Medientyp
- Suchqueries
- Symbolisch/konkret-Kennzeichnung
- aktuelle Hauptvisual-/Alternativen-Auswahl

Die Szenen enthalten in Phase 1 bewusst keine verbindlichen Audiotimings. In `scenes.json` steht deshalb:

```text
timing = semantic-only-until-final-voiceover
```

Exakte Zeiten entstehen erst in Phase 3 aus `02-AUDIO/voiceover.mp3`.

## Phase 2

Der Nutzer öffnet:

```text
01-SCRIPT/script.txt
```

kopiert den vollständigen Inhalt und erzeugt damit die KI-Stimme. Die fertige Audiodatei wird abgelegt als:

```text
02-AUDIO/voiceover.mp3
```

## Spätere Phase 3

Phase 3 ergänzt anschließend mindestens:

```text
05-PROJECT/word-timings.json
05-PROJECT/timeline.json
05-PROJECT/edit-plan.json
06-EXPORT/final-v1.mp4
06-EXPORT/youtube-title.txt
06-EXPORT/youtube-description.txt
06-EXPORT/youtube-tags.txt
06-EXPORT/thumbnail-text.txt
```

Die YouTube-Textdateien enthalten ausschließlich direkt kopierbaren Inhalt, keine Labels oder Erklärtexte.
