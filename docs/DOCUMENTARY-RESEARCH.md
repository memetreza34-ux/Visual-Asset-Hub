# Documentary Visual Research

Stand: 2026-09-25

## Ziel

Nach dem Doku-Szenenplan recherchiert der Visual Asset Hub automatisch passende Bilder und B-Rolls pro Szene.

Der Ablauf ist:

```text
script.txt
-> semantische Szenen
-> Doku-Evidenztyp
-> Provider-Priorität
-> mehrere Suchrichtungen
-> echte Provider-Suche
-> Deduplizierung
-> Doku-Relevanzscore
-> Hauptvisual-Empfehlung + Alternativen
-> Quellen-/Lizenzablage
```

## Ein-Befehl-Phase-1

Wenn Projektstruktur, Szenenplan und Online-Recherche in einem Lauf entstehen sollen:

```bash
npm run documentary:phase1 -- \
  --title "Warum Tschernobyl bis heute Folgen hat" \
  --script-file ./mein-script.txt \
  --research
```

Optional:

```text
--segmentation auto|sentence|paragraph
--depth quick|deep|max
--media mixed|video|photo
--per-page 3..20
--max-tasks 1..20
--alternatives 0..6
--overwrite
```

Ohne `--research` wird nur der Doku-Projekt- und Szenenplan erzeugt.

## Recherche separat starten

Für ein bereits erzeugtes Projekt:

```bash
npm run documentary:research -- \
  --project ALLES-GEFUNDEN/07-DOKU-PROJEKTE/<projekt-slug>
```

## Provider

Aktuell:

- Wikimedia Commons – keylos
- Openverse – keylos
- Pexels – API-Key
- Pixabay – API-Key
- Unsplash – API-Key

Historische, konkrete Personen-, Orts- und Ereignisszenen priorisieren Wissens-/Archivquellen. Allgemeine oder symbolische B-Roll priorisiert Stockquellen.

Fehlende API-Keys blockieren die Recherche nicht vollständig: keylose Provider bleiben nutzbar.

## Relevanzscore

Der Doku-Score bewertet Treffer anhand von:

- tatsächlichen Treffer-Metadaten
- konkreten Entitäten
- Jahreszahl-Treffern
- Eignung der Quelle für den Evidenztyp
- technischer Eignung
- Wiedervermeidungsbonus

Wichtig: Der Suchbegriff selbst wird **nicht** als Beweis gewertet, dass ein Treffer inhaltlich passt.

## Ergebnis pro Szene

Beispiel:

```text
03-VISUALS/
└── scene-001/
    ├── 00-research.json
    ├── 01-MAIN-SOURCE.url
    ├── 01-MAIN-MEDIA.url
    ├── 01-MAIN-PREVIEW.url
    ├── 02-ALT-SOURCE.url
    ├── 02-ALT-MEDIA.url
    └── 02-ALT-PREVIEW.url
```

`01-MAIN-*` ist die automatisch beste Empfehlung. `02-ALT-*` usw. sind Alternativen.

## Projektdateien

Nach der Recherche entstehen/ändern sich:

```text
04-SOURCES/
├── sources.txt
└── licenses.csv

05-PROJECT/
├── scenes.json
└── research-summary.json
```

`scenes.json` enthält pro Szene unter anderem:

- Kandidaten
- Doku-Score
- Score-Aufschlüsselung
- empfohlene Hauptauswahl
- Alternativen
- Recherchefehler
- verwendete Provider
- `review-required-before-publication`

## Rechte-Regel

Eine automatische Empfehlung ist **keine automatische Veröffentlichungsfreigabe**.

Jeder automatisch empfohlene Treffer bleibt:

```text
review-required
```

Vor Veröffentlichung müssen insbesondere Quelle, Lizenz, Urheber, sichtbare Personen/Marken sowie der konkrete Nutzungskontext geprüft werden.

## Phase-1-Endzustand

Nach erfolgreicher Recherche besitzt das Projekt:

```text
01-SCRIPT/script.txt
03-VISUALS/scene-XXX/*-SOURCE.url
03-VISUALS/scene-XXX/*-MEDIA.url
04-SOURCES/sources.txt
04-SOURCES/licenses.csv
05-PROJECT/scenes.json
05-PROJECT/research-summary.json
```

Danach erzeugt der Nutzer in Phase 2 aus `01-SCRIPT/script.txt` die finale `02-AUDIO/voiceover.mp3`.

Das eigentliche lokale Materialisieren der final freigegebenen Medien ist ein eigener nachgelagerter Schritt und darf die Rechteprüfung nicht umgehen.
