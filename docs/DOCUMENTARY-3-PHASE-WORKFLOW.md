# Documentary 3-Phasen-Workflow

Stand: 2026-09-25

## Zweck

Dieser Workflow ist der verbindliche Produktionsweg fuer den geplanten YouTube-Dokumentationskanal.

```text
PHASE 1 - ChatGPT / Visual Asset Hub
Thema selbst waehlen + Skript + semantische Szenen + Online-Recherche + lokale Hauptvisuals + Quellen + Projektordner

PHASE 2 - Nutzer
finales Skript kopieren -> KI-Voice erzeugen -> voiceover.mp3 ablegen

PHASE 3 - Timing / Antigravity / Remotion
finale Audio -> echte Wort-Timings -> striktes Skript-Alignment -> reale Szenenzeiten -> Antigravity-Handoff -> Preflight -> Remotion-Render -> Export
```

Wichtig: In Phase 1 werden keine exakten Sekunden fuer die Szenen geraten. Die semantischen Szenengrenzen werden am Skript festgelegt. Exakte Zeitpunkte entstehen erst in Phase 3 aus der finalen Audiodatei.

## Verbindliche Videostruktur

Alle normalen Doku-Projekte liegen sichtbar im Repo-Root unter `videos/`.

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

Innerhalb der passenden Kategorie bekommt jedes Thema einen fortlaufend nummerierten Projektordner:

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
│   ├── word-timings-input.json
│   ├── word-timings.json
│   ├── timeline.json
│   ├── edit-plan.json
│   ├── antigravity-handoff.json
│   ├── phase3-state.json
│   ├── phase3-validation.json
│   ├── publish.json
│   ├── publish-state.json
│   ├── render-props.json
│   ├── render-plan.json
│   ├── render-result.json
│   └── remotion-public/
└── 06-EXPORT/
    ├── final-v1.mp4
    ├── youtube-title.txt
    ├── youtube-description.txt
    ├── youtube-tags.txt
    └── thumbnail-text.txt
```

Beispiel fuer das erste Video:

```text
videos/umweltgeschichte/001-wie-der-aralsee-fast-verschwand-und-warum-ein-teil-zuruckkam/
```

Das zentrale Anti-Wiederholungsregister liegt getrennt unter `documentary-registry/`.

## 01-SCRIPT

`01-SCRIPT/script.txt` enthaelt nur den final gesprochenen Text.

Keine Regieanweisungen, keine JSON-Struktur, keine Szenenlabels. Der Nutzer soll die Datei oeffnen, `Strg+A`, `Strg+C` druecken und den Text direkt in das Voice-Tool kopieren koennen.

## Phase 1 - autonom

Standard:

```bash
npm run documentary:phase1
```

Phase 1 erledigt selbst:

- Themenregister pruefen
- neues, nicht wiederholtes Thema waehlen
- Kategorie bestimmen
- laufende Themennummer verwenden
- Fakten recherchieren
- finales ca. 2,5-Minuten-Doku-Skript schreiben
- semantische Szenen bilden
- Bilder und B-Rolls recherchieren
- Hauptvisual + Alternativen bestimmen
- sichere Hauptvisuals lokal materialisieren
- Quellen und Lizenzdaten speichern
- YouTube-Titel, Beschreibung, exakt 5 Hashtags, Tags und Thumbnail-Text vorbereiten

Ein heruntergeladenes Visual ist nicht automatisch fuer die Veroeffentlichung freigegeben. Rechte-/Review-Status bleibt erhalten.

## Phase 2 - Voice

Der Nutzer oeffnet im jeweiligen Videoordner:

```text
01-SCRIPT/script.txt
```

und legt die fertige Audiodatei ab als:

```text
02-AUDIO/voiceover.mp3
```

Das Skript darf danach nicht stillschweigend veraendert werden.

## Phase 3 - echte Timings und Antigravity-Handoff

Standard:

```bash
npm run documentary:phase3 -- --project "videos/<kategorie>/<nnn-thema>"
```

Ablauf:

```text
voiceover.mp3
+ script.txt
-> echte Wort-Timestamps
-> Wortfolge streng gegen finales Skript pruefen
-> semantische Szenen lueckenlos im Skript verankern
-> Szenengrenzen auf reale Audiozeiten mappen
-> word-timings.json
-> timeline.json
-> edit-plan.json
-> antigravity-handoff.json
```

### Automatische Wort-Timestamps

Wenn keine eigene Timing-Datei vorhanden ist, kann Phase 3 `02-AUDIO/voiceover.mp3` automatisch mit OpenAI `whisper-1` auf Wortebene transkribieren.

Lokal in `.env`:

```text
OPENAI_API_KEY=...
```

Der Key wird nicht in das Doku-Projekt geschrieben.

Eigene TTS-Wort-Timestamps koennen stattdessen als `05-PROJECT/word-timings-input.json` bereitgestellt werden.

### Keine geratenen Zeiten

Phase 3 darf nicht versuchen, einen Transkriptionsfehler mit geschaetzten Sekunden zu reparieren.

Abbruch statt Raten bei:

- fehlenden oder zusaetzlichen Woertern
- geaenderter Wortreihenfolge
- veraendertem finalen Skript
- Luecken zwischen den Phase-1-Szenen
- Timing-Datei, deren gespeicherter Audio-Hash zu einer anderen `voiceover.mp3` gehoert

### Render-Gate

Antigravity ist nur renderbereit, wenn:

- das Wort-Alignment exakt ist
- alle Szenengrenzen feststehen
- fuer jede Szene das lokale Hauptvisual wirklich als nichtleere Datei existiert

Ein Pfad in JSON alleine reicht nicht.

## Schnittregeln

- Szenenzeiten duerfen vom Editor nicht verschoben werden.
- Bilder koennen dezent gezoomt oder gepannt werden.
- Videos duerfen innerhalb des Quellclips passend getrimmt werden.
- `sourceInSeconds` / `sourceOutSeconds` werden nicht erfunden.
- Standarduebergang ist ein sauberer Cut, sofern kein konkreter Effekt vorgesehen ist.
- Rechtepruefung bleibt vor Veroeffentlichung erforderlich.

## Finaler Render mit Remotion

Einmalig im Repo:

```bash
npm install
```

Render nur vorbereiten und pruefen:

```bash
npm run documentary:render -- --project "videos/<kategorie>/<nnn-thema>" --dry-run
```

Final rendern:

```bash
npm run documentary:render -- --project "videos/<kategorie>/<nnn-thema>"
```

Render-Standard:

- 1920 × 1080
- 30 fps
- H.264 + AAC
- BT.709 / `yuv420p`
- Voiceover als Hauptaudio
- B-Roll-Audio stumm
- Bilder mit dezenter Doku-Bewegung
- gelockte Szenengrenzen aus `timeline.json`
- vorhandene `final-vN.mp4` niemals ueberschreiben

## 06-EXPORT

Der Exportordner ist maximal einfach und nur fuer den Upload gedacht:

```text
06-EXPORT/
├── final-vN.mp4
├── youtube-title.txt
├── youtube-description.txt
├── youtube-tags.txt
└── thumbnail-text.txt
```

`youtube-title.txt` enthaelt nur den Titel.

`youtube-description.txt` enthaelt nur die fertige Beschreibung und insgesamt exakt 5 Hashtags.

`youtube-tags.txt` enthaelt nur direkt kopierbare, kommagetrennte Tags.

`thumbnail-text.txt` enthaelt nur den kurzen Thumbnail-Wortlaut.

## Endzustand

Der Nutzer muss fuer ein fertiges Video nur noch:

1. `final-vN.mp4` hochladen.
2. `youtube-title.txt` kopieren.
3. `youtube-description.txt` kopieren.
4. `youtube-tags.txt` kopieren.
5. optional `thumbnail-text.txt` fuer das Thumbnail verwenden.

Keine technischen Projektdateien muessen fuer den Upload geoeffnet werden.
