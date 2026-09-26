# Autonome Documentary Phase 1

Stand: 2026-09-25

## Verbindliche Regel

Der Nutzer muss fuer ein normales neues Doku-Video **kein Thema und kein Skript vorgeben**.

Der Standard ist:

```bash
npm run documentary:phase1
```

Ohne weitere Argumente soll Phase 1 selbststaendig ein ca. **150 Sekunden / 2,5 Minuten** langes Doku-Projekt vorbereiten.

## Sichtbare Video-Struktur

Alle normalen Videos liegen im Repo-Root unter:

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

Jedes Thema bekommt innerhalb seiner Kategorie einen nummerierten Ordner:

```text
videos/<kategorie>/<nnn-thema>/
├── 01-SCRIPT/
├── 02-AUDIO/
├── 03-VISUALS/
├── 04-SOURCES/
├── 05-PROJECT/
└── 06-EXPORT/
```

Beispiel:

```text
videos/umweltgeschichte/001-wie-der-aralsee-fast-verschwand-und-warum-ein-teil-zuruckkam/
```

Damit sind fertige und laufende Videos im Finder sofort auffindbar. Das Themenregister bleibt getrennt unter `documentary-registry/`.

## Ablauf

```text
THEMEN-REGISTER pruefen
↓
neues Thema selbst auswaehlen
↓
Kategorie bestimmen
↓
fortlaufende Nummer vergeben
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
├── topic-register.json
└── briefs/
```

`THEMEN-REGISTER.txt` ist fuer Menschen gedacht und schnell lesbar.

`topic-register.json` ist die technische Quelle fuer die Dublettenpruefung.

Vor **jeder** neuen Themenwahl wird das gesamte Register geprueft.

Ein Thema wird unmittelbar nach erfolgreicher Auswahl als `reserved` eingetragen. Dadurch wird es selbst dann nicht erneut verwendet, wenn spaeter die Visual-Recherche oder ein Download fehlschlaegt.

Moegliche Statuswerte:

- `reserved`
- `phase1-complete`
- `phase1-failed`

Alle drei gelten fuer die Anti-Wiederholungslogik als bereits benutzt.

## Doppelte und sehr aehnliche Themen

Die Sperre arbeitet zweifach:

1. Das Modell erhaelt die bisherigen Themen vor seiner Themenwahl.
2. Danach prueft der lokale Code nochmals unabhaengig.

Geprueft werden unter anderem normalisierter Themen-Key, identischer Titel und Wortueberschneidungen zwischen Titel und Blickwinkel. Wird ein Thema als zu aehnlich erkannt, wird es verworfen und ein anderes Thema gesucht.

## Themenqualitaet

Phase 1 soll vorzugsweise Themen auswaehlen, die langfristig interessant, gut visualisierbar und serioes belegbar sind.

Bevorzugt werden unter anderem Geschichte, Technik, Wissenschaft, Umweltgeschichte, Wirtschaft, Geopolitik, Infrastruktur, Natur und ungewoehnliche Ereignisse.

## Skriptstandard

Standardziel:

```text
150 Sekunden
ca. 320–400 Woerter
horizontal 16:9
Deutsch
```

Das Skript liegt im jeweiligen Video unter:

```text
01-SCRIPT/script.txt
```

und enthaelt nur den final gesprochenen Text.

## Recherche

Die autonome Themen- und Skriptrecherche nutzt die OpenAI Responses API mit Websuche.

Erforderlich lokal:

```text
OPENAI_API_KEY=...
```

Der API-Key wird niemals in einen Doku-Projektordner geschrieben.

Mindestens drei konkrete Skript-Recherchequellen werden gespeichert unter:

```text
04-SOURCES/script-research-sources.txt
05-PROJECT/script-research.json
```

## Automatisch vorbereitete YouTube-Daten

Phase 1 erzeugt ausserdem:

```text
05-PROJECT/publish.json
```

mit YouTube-Titel, fertiger Beschreibung, genau 5 Hashtags, YouTube-Tags und Thumbnail-Text.

Nach dem finalen Render werden diese Daten als einfache Copy-Paste-Dateien nach `06-EXPORT/` geschrieben.

## Manuelle Phase 1

Nur fuer Tests oder Sonderfaelle bleibt der alte Weg erhalten:

```bash
npm run documentary:phase1:from-script -- --title "..." --script-file "..." --complete
```

Dieser Befehl ist **nicht** der normale Produktionsweg.

## Gewuenschter Nutzerablauf

Bei einem neuen Video soll der Nutzer nur sagen muessen, dass ein neues Video erstellt werden soll. Phase 1 entscheidet selbst Thema, Kategorie, Blickwinkel, Fakten, Skript, Szenen, Visuals, Quellen und YouTube-Metadaten.

Der erste normale manuelle Eingriff kommt erst in Phase 2: `script.txt` kopieren, Voice erzeugen und als `02-AUDIO/voiceover.mp3` ablegen.
