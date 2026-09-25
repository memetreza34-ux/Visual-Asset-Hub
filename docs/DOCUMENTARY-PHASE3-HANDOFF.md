# Documentary Phase 3 – echte Timings und Antigravity-Handoff

Phase 3 beginnt erst, wenn diese beiden finalen Dateien unverändert vorliegen:

- `01-SCRIPT/script.txt`
- `02-AUDIO/voiceover.mp3`

Die Phase darf **keine Sekunden schätzen** und das Skript nicht umschreiben.

## Standardbefehl

```bash
npm run documentary:phase3 -- --project "ALLES-GEFUNDEN/07-DOKU-PROJEKTE/<projekt>"
```

### Automatische Timing-Erzeugung

Wenn `05-PROJECT/word-timings-input.json` noch nicht existiert, verwendet der Standardbefehl `02-AUDIO/voiceover.mp3` und erzeugt Wort-Timestamps mit OpenAI `whisper-1`.

Dafür lokal setzen:

```text
OPENAI_API_KEY=...
```

Der Schlüssel wird nicht in Projektdateien geschrieben.

Für Wort-Timestamps wird bewusst `whisper-1` verwendet, weil die OpenAI-Transkriptionsschnittstelle Wort-Granularität mit `verbose_json` für dieses Modell bereitstellt. Die automatische Einzeldatei-Transkription ist auf 25 MB Audio begrenzt. Größere Audiodateien werden nicht still verarbeitet oder ungeprüft geteilt.

## Eigene exakte Wort-Timings verwenden

Wenn das verwendete TTS-System selbst verlässliche Wort-Timestamps liefert, ist das sogar vorzuziehen. Das JSON kann so aussehen:

```json
{
  "source": "mein-tts",
  "language": "de",
  "words": [
    { "word": "Berlin", "start": 0.12, "end": 0.48 },
    { "word": "verändert", "start": 0.48, "end": 0.91 }
  ]
}
```

Speicherort:

```text
05-PROJECT/word-timings-input.json
```

oder explizit:

```bash
npm run documentary:phase3 -- --project "<projekt>" --word-timings "<datei.json>"
```

## Harte Alignment-Regel

Die Wortfolge aus der Timing-Quelle wird gegen das **finale** `script.txt` geprüft.

Erlaubt sind nur unkritische Unterschiede wie:

- Groß-/Kleinschreibung
- Satzzeichen
- typografische Apostrophe

Nicht erlaubt ist stilles Raten bei:

- fehlenden Wörtern
- zusätzlichen Wörtern
- anderer Wortreihenfolge
- geändertem Skript
- Lücken zwischen den semantischen Szenen

Bei einer Abweichung wird Phase 3 beendet. Es wird keine Ersatzzeit berechnet.

## Semantische Szene → reale Audiozeit

Phase 1 legt nur den gesprochenen Abschnitt je Szene fest. Phase 3 verankert jede Szene lückenlos im finalen Skript und speichert unter anderem:

```text
startPhrase
endWord
scriptWordStart
scriptWordEnd
startSeconds
endSeconds
durationSeconds
```

Die Startzeit einer Szene ist die echte Startzeit ihres ersten gesprochenen Wortes. Die Endzeit ist die echte Endzeit ihres letzten gesprochenen Wortes.

## Erzeugte Projektdateien

Nach erfolgreicher Phase 3:

```text
05-PROJECT/
├── word-timings-input.json
├── word-timings.json
├── timeline.json
├── edit-plan.json
├── antigravity-handoff.json
└── phase3-state.json
```

### `word-timings.json`

Enthält die geprüften Wortzeiten sowie:

- Skript-SHA-256
- Audio-SHA-256
- Timing-Quelle
- Wortanzahl
- Alignment-Status

Wenn Skript oder Audio verändert werden, sind diese Timings nicht mehr gültig.

### `timeline.json`

Enthält die exakten Szenenzeiten und das lokale Hauptvisual je Szene.

### `edit-plan.json`

Technische Schnittanweisung. Bilder erhalten nur eine dezente Doku-Bewegungsempfehlung. Bei Videos werden `sourceInSeconds` und `sourceOutSeconds` **nicht erfunden**; Antigravity soll innerhalb des lokalen Quellclips den stärksten passenden Ausschnitt wählen, ohne die festgelegte Szenendauer zu verändern.

### `antigravity-handoff.json`

Maschinenlesbarer Übergabepunkt für Antigravity/Codex/Remotion.

Render-Standard:

- 16:9
- 1920 × 1080
- 30 fps
- finales Voiceover aus `02-AUDIO/voiceover.mp3`
- Szenengrenzen gesperrt
- Skript gesperrt
- vorhandene Endversion niemals überschreiben

Das nächste freie Ziel wird automatisch gewählt:

```text
06-EXPORT/final-v1.mp4
06-EXPORT/final-v2.mp4
06-EXPORT/final-v3.mp4
...
```

## Render-Gate

`canRender` wird nur `true`, wenn für jede Szene ein lokales Hauptvisual tatsächlich als nichtleere Datei im Projekt vorhanden ist.

Fehlende lokale Visuals werden in `missingLocalVisuals` aufgelistet. Ein bloßer Pfad in JSON reicht nicht.

## Rechte

Phase 3 verändert den Rechte-/Review-Status nicht.

Ein technisch renderbares Video ist nicht automatisch zur Veröffentlichung freigegeben. Vor Veröffentlichung bleiben Quellen, Lizenzen, Personen, Marken und Nutzungskontext zu prüfen.

## Ablauf A bis Z

```text
PHASE 1
finales Skript
→ semantische Szenen
→ Online-Recherche
→ Hauptvisuals lokal

PHASE 2
script.txt kopieren
→ AI Voice erzeugen
→ 02-AUDIO/voiceover.mp3

PHASE 3
voiceover.mp3
→ echte Wort-Timestamps
→ strikter Vergleich mit script.txt
→ Szenen auf reale Wortzeiten mappen
→ timeline.json
→ edit-plan.json
→ antigravity-handoff.json
→ Render
→ 06-EXPORT/final-vN.mp4
```
