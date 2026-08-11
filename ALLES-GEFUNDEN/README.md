# ALLES GEFUNDEN

Dieser Ordner ist die zentrale, automatisch erzeugte Medienablage des Visual Asset Hub.

Nach dem Aufbau findest du hier alle im Katalog vorhandenen Assets übersichtlich nach Kanal, Sammlung und Status.

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
└── 99-Sonstiges/
```

Innerhalb jedes Kanals werden die Assets nach den echten Sammlungen des Kanal-Arsenals sortiert. Darunter folgen Statusordner:

```text
01-FREIGEGEBEN
02-REVIEW
03-EINGESCHRAENKT
04-ARCHIV
99-UNBEKANNT
```

Für jedes Asset erzeugt der Hub:

- einen verständlichen Dateinamen mit Titel und Asset-ID
- eine `-INFO.md` mit Beschreibung, technischen Daten, Tags, Quelle, Lizenz und Prüfhinweisen
- eine `-QUELLE.url`, wenn eine Quellseite vorhanden ist
- eine `-MEDIUM.url`, wenn das Originalmedium extern verlinkt ist
- eine `-VORSCHAU.url`, wenn eine externe Vorschau vorhanden ist
- eine echte Dateikopie, wenn das Medium bereits lokal im Repository vorhanden ist

## Aktualisieren

```bash
npm run vault:build
```

Der Ordner wird dabei vollständig neu aus `catalog/assets.json` aufgebaut. Die zentrale `README.md` bleibt erhalten.

## Wichtig

Dieser Ordner ist ein Arbeitsarchiv und keine automatische Rechtefreigabe. Assets mit Status `review`, `inbox`, `restricted` oder `archived` dürfen nicht allein deshalb veröffentlicht werden, weil sie hier sichtbar sind. Für die reale Nutzung gelten weiterhin die Rechte- und Review-Regeln des Visual Asset Hub.

Die erzeugten Inhalte werden lokal gehalten und nicht automatisch in Git eingecheckt. Dadurch kann der Ordner auch sehr groß werden, ohne das Repository unnötig aufzublähen.
