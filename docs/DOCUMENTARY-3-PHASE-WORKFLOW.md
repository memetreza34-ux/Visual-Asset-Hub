# Documentary 3-Phasen-Workflow

Stand: 2026-09-25

## Zweck

Dieser Workflow ist der verbindliche Produktionsweg fuer den geplanten YouTube-Dokumentationskanal.

```text
PHASE 1 - ChatGPT / Visual Asset Hub
Skript + semantische Szenen + Online-Recherche + lokale Hauptvisuals + Quellen + Projektordner

PHASE 2 - Nutzer
finales Skript kopieren -> KI-Voice erzeugen -> voiceover.mp3 ablegen

PHASE 3 - Timing / Antigravity / Remotion
finale Audio -> echte Wort-Timings -> striktes Skript-Alignment -> reale Szenenzeiten -> Antigravity-Handoff -> Preflight -> Remotion-Render -> Export
```

Wichtig: In Phase 1 werden keine exakten Sekunden fuer die Szenen geraten. Die semantischen Szenengrenzen werden am Skript festgelegt. Exakte Zeitpunkte entstehen erst in Phase 3 aus der finalen Audiodatei.

## Verbindliche Projektstruktur

Jedes neue Dokumentationsvideo bekommt einen eigenen, leicht lesbaren Projektordner:

```text
<projektname>/
├── 01-SCRIPT/
│   └── script.txt
├── 02-AUDIO/
│   └── voiceover.mp3
├── 03-VISUALS/
│   ├── scene-001/
│   ├── scene-002/
│   ├── scene-003/
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
│   ├── publish.json                  optional, kuratiert
│   ├── publish-state.json
│   ├── render-props.json
│   ├── render-plan.json
│   ├── render-result.json            nach erfolgreichem Render
│   └── remotion-public/              temporaerer Render-Stagingbereich
└── 06-EXPORT/
    ├── final-v1.mp4
    ├── youtube-title.txt
    ├── youtube-description.txt
    ├── youtube-tags.txt
    └── thumbnail-text.txt
```

`word-timings-input.json` wird automatisch angelegt, wenn Phase 3 die Wortzeiten selbst aus dem Voiceover erzeugt. Technische Dateien bleiben komplett in `05-PROJECT`.

## 01-SCRIPT

`01-SCRIPT/script.txt` enthaelt nur den final gesprochenen Text.

Keine Regieanweisungen, keine JSON-Struktur, keine Szenenlabels. Der Nutzer soll die Datei oeffnen, `Strg+A`, `Strg+C` druecken und den Text direkt in das Voice-Tool kopieren koennen.

## Phase 1 - Skript und Visuals

ChatGPT / Visual Asset Hub erstellt:

- finales Doku-Skript
- semantische Szenen nach echten Sinn- und Visualwechseln
- pro Szene die visuelle Aufgabe
- passende Bilder und B-Rolls aus den angeschlossenen Quellen
- Quellen- und Lizenzdaten
- Hauptvisual und Alternativen
- lokale Hauptvisual-Datei je Szene, soweit der Provider einen sicheren Download erlaubt
- die Projektordnerstruktur
- optional ein kuratiertes `05-PROJECT/publish.json` fuer Titel, Beschreibung, Tags und Thumbnail-Text

Szenen werden nicht nach einer festen Sekunden- oder Bildzahl erzeugt. Neue Szenen entstehen nur bei einem echten visuellen Wechsel, zum Beispiel neue Person, neuer Ort, neue Zeit, neues Ereignis, neue Handlung oder Ursache/Folge.

Ein heruntergeladenes Visual ist nicht automatisch fuer die Veroeffentlichung freigegeben. Rechte-/Review-Status bleibt erhalten.

## Phase 2 - Voice

Der Nutzer kopiert `01-SCRIPT/script.txt` in sein KI-Voice-Tool und legt die fertige Audiodatei unter folgendem Namen ab:

```text
02-AUDIO/voiceover.mp3
```

Das Skript darf danach nicht stillschweigend veraendert werden.

Das ist die einzige normale manuelle Aufgabe zwischen Phase 1 und Phase 3.

## Phase 3 - echte Timings und Antigravity-Handoff

Standard:

```bash
npm run documentary:phase3 -- --project "ALLES-GEFUNDEN/07-DOKU-PROJEKTE/<projekt>"
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

Gross-/Kleinschreibung und reine Satzzeichenunterschiede duerfen normalisiert werden.

### Audio-/Skript-Invalidierung

`word-timings.json` und `phase3-state.json` speichern SHA-256-Hashes fuer Skript und Audio.

Wird `voiceover.mp3` nach einer automatischen Transkription ausgetauscht, wird die alte Timing-Eingabe verworfen und neu erzeugt. Wird das Skript nach Phase 1 veraendert, wird Phase 3 blockiert und Phase 1 muss fuer dieses finale Skript neu erzeugt werden.

### Render-Gate

Antigravity ist nur renderbereit, wenn:

- das Wort-Alignment exakt ist
- alle Szenengrenzen feststehen
- fuer jede Szene das lokale Hauptvisual wirklich als nichtleere Datei existiert

Ein Pfad in JSON alleine reicht nicht.

Fehlende Visuals werden in `missingLocalVisuals` aufgelistet.

### Schnittregeln

- Szenenzeiten duerfen vom Editor nicht verschoben werden.
- Bilder koennen dezent gezoomt oder gepannt werden.
- Videos duerfen innerhalb des Quellclips passend getrimmt werden.
- `sourceInSeconds` / `sourceOutSeconds` werden vom Visual Asset Hub nicht erfunden, solange der konkrete Quellclip nicht inhaltlich zeitcodiert analysiert wurde.
- Antigravity darf optional kurze `overlayText`-Begriffe, `loopVideo`, `motion` und `transitionIn` setzen.
- Standarduebergang ist ein sauberer Cut, sofern kein konkreter Effekt vorgesehen ist.
- Rechtepruefung bleibt vor Veroeffentlichung erforderlich.

Mehr Details: `docs/DOCUMENTARY-PHASE3-HANDOFF.md`.

## Finaler Render mit Remotion

Einmalig im Repo:

```bash
npm install
```

Render nur vorbereiten und pruefen:

```bash
npm run documentary:render -- --project "ALLES-GEFUNDEN/07-DOKU-PROJEKTE/<projekt>" --dry-run
```

Final rendern:

```bash
npm run documentary:render -- --project "ALLES-GEFUNDEN/07-DOKU-PROJEKTE/<projekt>"
```

Vor jedem Render laeuft der Phase-3-Preflight erneut. Erst danach wird ein projektinterner Remotion-Stagingbereich erzeugt und das Video gebaut.

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

Mehr Details: `docs/DOCUMENTARY-RENDER.md`.

## 06-EXPORT - maximal einfach

Der Exportordner ist fuer den Nutzer gedacht. Technische JSON-Dateien gehoeren nicht hier hinein.

### `final-v1.mp4`

Das fertige YouTube-Video.

Bestehende finale Videos niemals ueberschreiben. Neue Fassungen werden fortlaufend gespeichert:

```text
final-v1.mp4
final-v2.mp4
final-v3.mp4
```

Phase 3 waehlt bereits vor dem Rendern das naechste freie Ziel.

### `youtube-title.txt`

Enthaelt ausschliesslich den finalen YouTube-Titel.

Kein Praefix wie `Titel:` und keine Erklaerung.

Beispielinhalt:

```text
Warum Tschernobyl bis heute Folgen hat
```

Der Nutzer kann die Datei oeffnen, `Strg+A`, `Strg+C` und direkt in YouTube einfuegen.

### `youtube-description.txt`

Enthaelt ausschliesslich die komplette fertige YouTube-Beschreibung.

Die Beschreibung soll sofort veroeffentlichbar sein und insgesamt exakt 5 passende Hashtags enthalten. Alte oder versehentlich bereits eingetragene Hashtag-Tokens werden vor dem finalen Export entfernt; die fuenf vorgesehenen Hashtags werden am Ende neu angehaengt.

Kein Praefix wie `Beschreibung:`. Keine Platzhalter. Keine Hinweise fuer den Nutzer.

Format:

```text
<Fertige natuerliche Videobeschreibung in mehreren kurzen Absaetzen.>

<Optional sinnvolle Quellen-/Hinweise, wenn fuer das Video vorgesehen.>

#Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5
```

### `youtube-tags.txt`

Enthaelt ausschliesslich passende YouTube-Tags als direkt kopierbare, kommagetrennte Zeile.

Beispiel:

```text
Tschernobyl, Chernobyl, Dokumentation, Geschichte, Atomkraft, Sowjetunion, Reaktorunfall
```

Kein Praefix wie `Tags:`.

### `thumbnail-text.txt`

Enthaelt nur den kurzen Text, der fuer das Thumbnail empfohlen wird. Idealerweise 2 bis 5 Woerter.

Kein Praefix wie `Thumbnail:`.

Wenn fuer ein Video bewusst kein Thumbnail-Text vorgesehen ist, darf die Datei entfallen.

## YouTube-Metadaten

Bevorzugt erstellt Phase 1 / ChatGPT ein kuratiertes:

```text
05-PROJECT/publish.json
```

Fehlt diese Datei, erzeugt das Repo einen lokalen kostenlosen Fallback aus Projekttitel und Skript, damit keine Platzhalter im Export landen.

Manuell neu erzeugen:

```bash
npm run documentary:publish -- --project "ALLES-GEFUNDEN/07-DOKU-PROJEKTE/<projekt>"
```

## Copy-Paste-Regel

Alle nutzerorientierten `.txt`-Dateien muessen so geschrieben sein, dass ihr kompletter Inhalt direkt kopiert und am vorgesehenen Ort eingefuegt werden kann.

Nicht erlaubt:

```text
Titel: ...
Hier ist deine Beschreibung: ...
Hashtags: ...
Kopiere folgenden Text: ...
```

Richtig:

```text
youtube-title.txt       -> nur der Titel
youtube-description.txt -> nur Beschreibung + exakt 5 Hashtags
youtube-tags.txt        -> nur kommagetrennte Tags
thumbnail-text.txt      -> nur Thumbnail-Wortlaut
```

## Endzustand

Der Nutzer soll am Ende nur noch folgendes tun muessen:

1. `06-EXPORT/final-vN.mp4` bei YouTube hochladen.
2. `youtube-title.txt` komplett kopieren.
3. `youtube-description.txt` komplett kopieren.
4. `youtube-tags.txt` komplett kopieren.
5. optional `thumbnail-text.txt` fuer das Thumbnail verwenden.

Keine technischen Projektdateien muessen fuer den Upload geoeffnet werden.
