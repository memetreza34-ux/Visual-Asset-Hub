# ALLES GEFUNDEN

Dieser Ordner ist die zentrale, automatisch erzeugte Medienablage des Visual Asset Hub.

Hier findest du sowohl **alle bereits im Katalog vorhandenen Assets** als auch **alle noch nicht importierten Treffer aus den lokalen Mediensuchen**. Alles bleibt klar getrennt, damit Suchfunde nicht mit freigegebenen Assets verwechselt werden.

## Struktur

```text
ALLES-GEFUNDEN/
├── 00-GESAMTINDEX.md
├── 00-GESAMTINDEX.csv
├── 00-MANIFEST.json
├── 01-Finanzen/
├── 02-KI/
├── 03-Elektrotechnik/
├── 04-Kampfsport/
├── 90-GEFUNDENE-KANDIDATEN/
└── 99-Sonstiges/
```

### Katalog-Assets

Innerhalb der Kanäle werden die Assets nach den echten Sammlungen des Kanal-Arsenals sortiert. Darunter folgen Statusordner:

```text
01-FREIGEGEBEN
02-REVIEW
03-EINGESCHRAENKT
04-ARCHIV
99-UNBEKANNT
```

### Noch nicht importierte Suchfunde

Unter `90-GEFUNDENE-KANDIDATEN` werden Treffer gesammelt, die bei Pexels, Pixabay, Unsplash, Openverse oder Wikimedia gefunden wurden, aber noch nicht in den Katalog importiert sind.

Die Struktur lautet:

```text
90-GEFUNDENE-KANDIDATEN/
└── Kanal/
    └── Sammlung/
        └── Quelle/
```

Mehrfach gefundene identische Treffer derselben Sammlung werden dedupliziert.

## Was pro Eintrag erzeugt wird

Für Katalog-Assets erzeugt der Hub:

- einen verständlichen Dateinamen mit Titel und Asset-ID
- eine `-INFO.md` mit Beschreibung, technischen Daten, Tags, Quelle, Lizenz und Prüfhinweisen
- eine `-QUELLE.url`, wenn eine Quellseite vorhanden ist
- eine `-MEDIUM.url`, wenn das Originalmedium extern verlinkt ist
- eine `-VORSCHAU.url`, wenn eine externe Vorschau vorhanden ist
- eine echte Dateikopie, wenn das Medium bereits lokal im Repository vorhanden ist

Für noch nicht importierte Suchfunde erzeugt der Hub ebenfalls verständliche Titel, `INFO`-Dateien und vorhandene Quelle-/Medium-/Vorschau-Verknüpfungen. Diese Treffer werden ausdrücklich als **NOCH NICHT IMPORTIERT** markiert.

## Gesamtindex

`00-GESAMTINDEX.md`, `00-GESAMTINDEX.csv` und `00-MANIFEST.json` enthalten den gesamten Überblick über:

- Katalog-Assets
- Freigabe- und Review-Status
- Kanal und Sammlung
- Quelle und Lizenz
- lokale Kopien
- noch nicht importierte Suchfunde

## Aktualisieren

Manuell:

```bash
npm run vault:build
```

Zusätzlich baut `npm run starter:import` den Ordner automatisch neu auf.

Während `npm run serve` läuft, wird `catalog/assets.json` überwacht. Nach Importen oder Statusänderungen wird der Ordner automatisch erneut aufgebaut.

## Wichtig

Dieser Ordner ist ein Arbeitsarchiv und keine automatische Rechtefreigabe. Assets mit Status `review`, `inbox`, `restricted` oder `archived` sowie alle Einträge unter `90-GEFUNDENE-KANDIDATEN` dürfen nicht allein deshalb veröffentlicht werden, weil sie hier sichtbar sind. Für die reale Nutzung gelten weiterhin die Rechte- und Review-Regeln des Visual Asset Hub.

Die erzeugten Inhalte werden lokal gehalten und nicht automatisch in Git eingecheckt. Dadurch kann der Ordner auch sehr groß werden, ohne das Repository unnötig aufzublähen.
