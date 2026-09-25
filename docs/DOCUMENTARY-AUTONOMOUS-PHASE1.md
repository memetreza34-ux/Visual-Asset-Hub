# Autonome Documentary Phase 1

Stand: 2026-09-25

## Verbindliche Regel

Der Nutzer muss fuer ein normales neues Doku-Video **kein Thema und kein Skript vorgeben**.

Der Standard ist:

```bash
npm run documentary:phase1
```

Ohne weitere Argumente soll Phase 1 selbststaendig ein ca. **150 Sekunden / 2,5 Minuten** langes Doku-Projekt vorbereiten.

## Ablauf

```text
THEMEN-REGISTER pruefen
↓
neues Thema selbst auswaehlen
↓
Thema im Register reservieren
↓
Web-Recherche
↓
finales deutsches Skript ca. 2,5 Minuten
↓
YouTube-Metadaten vorbereiten
↓
semantische Szenen
↓
Visual-Recherche
↓
Hauptvisual + Alternativen
↓
Hauptvisuals lokal speichern
↓
Projektordner fertig fuer Phase 2
```

## Themenregister

Zentrale, mit dem Repo gespeicherte Dateien:

```text
documentary-registry/
├── THEMEN-REGISTER.txt
└── topic-register.json
```

`THEMEN-REGISTER.txt` ist fuer Menschen gedacht und schnell lesbar.

`topic-register.json` ist die technische Quelle fuer die Dublettenpruefung.

Vor **jeder** neuen Themenwahl wird das gesamte Register geprueft.

Ein Thema wird bereits unmittelbar nach erfolgreicher Auswahl als `reserved` eingetragen. Dadurch wird es selbst dann nicht erneut verwendet, wenn spaeter die Visual-Recherche oder ein Download fehlschlaegt.

Moegliche Statuswerte:

- `reserved`
- `phase1-complete`
- `phase1-failed`

Alle drei gelten fuer die Anti-Wiederholungslogik als bereits benutzt.

## Doppelte und sehr aehnliche Themen

Die Sperre arbeitet zweifach:

1. Das Modell erhaelt die bisherigen Themen vor seiner Themenwahl.
2. Danach prueft der lokale Code nochmals unabhaengig.

Geprueft werden unter anderem:

- normalisierter Themen-Key
- identischer Titel
- Wortueberschneidung zwischen Titel und Blickwinkel
- aehnliche Formulierungen desselben Kernthemas

Wird ein Thema als zu aehnlich erkannt, wird es verworfen und Phase 1 fordert automatisch einen anderen Vorschlag an.

## Themenqualitaet

Phase 1 soll vorzugsweise Themen auswaehlen, die:

- langfristig interessant sind
- eine klare Geschichte oder Erklaerung besitzen
- mit Fotos, Archivmaterial, Karten oder B-Roll gut visualisierbar sind
- fuer ein breites deutschsprachiges YouTube-Publikum funktionieren
- genuegend serioese Recherchequellen besitzen

Bevorzugte Felder:

- Geschichte
- Technik
- Wissenschaft
- Infrastruktur
- Natur
- ungewoehnliche Ereignisse
- Systeme
- interessante Alltagsphaenomene

Reines Tagesgeschehen und schwach visualisierbare Themen sollen vermieden werden.

## Skriptstandard

Standardziel:

```text
150 Sekunden
ca. 320–400 Woerter
horizontal 16:9
Deutsch
```

Das Skript in:

```text
01-SCRIPT/script.txt
```

enthaelt nur den final gesprochenen Text.

Keine Regieanweisungen, Szenennummern oder technischen Hinweise.

Der Nutzer soll `script.txt` oeffnen und den gesamten Inhalt direkt in sein Voice-Tool kopieren koennen.

## Recherche

Die autonome Themen- und Skriptrecherche nutzt die OpenAI Responses API mit Websuche. Das Thema wird erst nach aktueller Recherche geschrieben.

Erforderlich lokal:

```text
OPENAI_API_KEY=...
```

Optional:

```text
OPENAI_PHASE1_MODEL=gpt-5.5
```

Der API-Key wird niemals in einen Doku-Projektordner geschrieben.

Mindestens drei konkrete Skript-Recherchequellen werden gespeichert unter:

```text
04-SOURCES/script-research-sources.txt
05-PROJECT/script-research.json
```

Die Visual-Quellen bleiben getrennt davon in den bestehenden Source-/License-Dateien.

## Automatisch vorbereitete YouTube-Daten

Phase 1 erzeugt ausserdem:

```text
05-PROJECT/publish.json
```

mit:

- YouTube-Titel
- fertiger Beschreibung
- genau 5 Hashtags
- YouTube-Tags
- Thumbnail-Text mit 2–5 Woertern

Nach dem finalen Render werden diese Daten als einfache Copy-Paste-Dateien nach `06-EXPORT/` geschrieben.

## Projekt-Metadaten

Zusaetzlich entstehen:

```text
05-PROJECT/topic.json
05-PROJECT/script-research.json
05-PROJECT/publish.json
```

`topic.json` speichert unter anderem die ID aus dem zentralen Themenregister. So kann jedes Video spaeter eindeutig seinem Registereintrag zugeordnet werden.

## Manuelle Phase 1

Nur fuer Tests oder Sonderfaelle bleibt der alte Weg erhalten:

```bash
npm run documentary:phase1:from-script -- --title "..." --script-file "..." --complete
```

Dieser Befehl ist **nicht** der normale Produktionsweg.

## Gewuenschter Nutzerablauf

Bei einem neuen Video soll der Nutzer nur sagen muessen, dass ein neues Video erstellt werden soll.

Phase 1 entscheidet selbst:

```text
Welches Thema?
Welcher Blickwinkel?
Welche Fakten?
Welches Skript?
Welche Szenen?
Welche Visuals?
Welche Quellen?
Welcher YouTube-Titel?
Welche Beschreibung?
Welche 5 Hashtags?
Welche Tags?
Welcher Thumbnail-Text?
```

Der erste normale manuelle Eingriff kommt erst in Phase 2: `script.txt` kopieren, Voice erzeugen und als `02-AUDIO/voiceover.mp3` ablegen.
