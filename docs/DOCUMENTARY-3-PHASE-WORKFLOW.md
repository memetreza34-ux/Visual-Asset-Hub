# Documentary 3-Phasen-Workflow

Stand: 2026-09-25

## Zweck

Dieser Workflow ist der verbindliche Produktionsweg fuer den geplanten YouTube-Dokumentationskanal.

```text
PHASE 1 - ChatGPT / Visual Asset Hub
Skript + Szenen + passende Bilder/B-Rolls + Quellen + Projektordner

PHASE 2 - Nutzer
finales Skript kopieren -> KI-Voice erzeugen -> voiceover.mp3 ablegen

PHASE 3 - Antigravity / Schnitt
finale Audio analysieren -> echte Timings -> Visuals synchronisieren -> Video bauen -> Export
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
│   ├── scenes.json
│   ├── word-timings.json
│   ├── timeline.json
│   └── edit-plan.json
└── 06-EXPORT/
    ├── final-v1.mp4
    ├── youtube-title.txt
    ├── youtube-description.txt
    ├── youtube-tags.txt
    └── thumbnail-text.txt
```

## 01-SCRIPT

`01-SCRIPT/script.txt` enthaelt nur den final gesprochenen Text.

Keine Regieanweisungen, keine JSON-Struktur, keine Szenenlabels. Der Nutzer soll die Datei oeffnen, `Strg+A`, `Strg+C` druecken und den Text direkt in das Voice-Tool kopieren koennen.

## Phase 1 - Skript und Visuals

ChatGPT / Visual Asset Hub erstellt:

- finales Doku-Skript
- semantische Szenen nach echten Sinn- und Visualwechseln
- pro Szene die visuelle Aufgabe
- passende Bilder und B-Rolls aus freigegebenen Quellen
- Quellen- und Lizenzdaten
- Hauptvisual und bei Bedarf Alternativen
- die Projektordnerstruktur

Szenen werden nicht nach einer festen Sekunden- oder Bildzahl erzeugt. Neue Szenen entstehen nur bei einem echten visuellen Wechsel, zum Beispiel neue Person, neuer Ort, neue Zeit, neues Ereignis, neue Handlung oder Ursache/Folge.

## Phase 2 - Voice

Der Nutzer kopiert `01-SCRIPT/script.txt` in sein KI-Voice-Tool und legt die fertige Audiodatei unter folgendem Namen ab:

```text
02-AUDIO/voiceover.mp3
```

Das Skript darf danach nicht stillschweigend veraendert werden.

## Phase 3 - Timing und Schnitt

Antigravity arbeitet mit der finalen `voiceover.mp3`.

Ablauf:

```text
voiceover.mp3
+ script.txt
-> Wort-Timings
-> Szenengrenzen auf echte Audiozeiten mappen
-> timeline.json
-> Visuals einsetzen
-> Bilder zoomen/pannen, Videos trimmen
-> Schnitt und erlaubte Effekte
-> Render
-> 06-EXPORT/final-v1.mp4
```

Keine manuell erfundenen Sekunden. Wenn die Audiodatei geaendert wird, muessen Wort-Timings und Timeline neu erzeugt werden.

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

Die Beschreibung soll sofort veroeffentlichbar sein und am Ende exakt 5 passende Hashtags enthalten.

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

1. `06-EXPORT/final-v1.mp4` bei YouTube hochladen.
2. `youtube-title.txt` komplett kopieren.
3. `youtube-description.txt` komplett kopieren.
4. `youtube-tags.txt` komplett kopieren.
5. optional `thumbnail-text.txt` fuer das Thumbnail verwenden.

Keine technischen Projektdateien muessen fuer den Upload geoeffnet werden.
