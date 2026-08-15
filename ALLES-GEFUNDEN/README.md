# ALLES GEFUNDEN

Dieser Ordner ist die zentrale, automatisch erzeugte Medienablage des Visual Asset Hub.

Hier findest du **Katalog-Assets**, **normale Suchkandidaten** und **eigene Personen-/Themenrecherchen** klar getrennt. Dadurch kannst du beispielsweise eine Recherche zu `Conor McGregor` vollständig durchgehen, ohne sie mit bereits freigegebenen Medien zu verwechseln.

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
├── 05-THEMENRECHERCHEN/
├── 90-GEFUNDENE-KANDIDATEN/
└── 99-Sonstiges/
```

## Katalog-Assets

Innerhalb der vier Kanalordner werden importierte Assets nach den echten Sammlungen des Kanal-Arsenals sortiert. Darunter folgen Statusordner:

```text
01-FREIGEGEBEN
02-REVIEW
03-EINGESCHRAENKT
04-ARCHIV
99-UNBEKANNT
```

Für lokale Medien wird eine echte Dateikopie angelegt. Bei externen Medien entstehen zusätzlich verständliche Quelle-, Medium- und Vorschau-Verknüpfungen.

## Personen- und Themenrecherchen

Der Browser-Arbeitsbereich **Thema recherchieren** legt jede Recherche separat unter `05-THEMENRECHERCHEN` ab.

Beispiel:

```text
05-THEMENRECHERCHEN/
└── 04-Kampfsport/
    └── Conor McGregor/
        ├── 00-RECHERCHEPLAN.md
        ├── 00-IMPORTIERTE-ASSETS.md
        ├── 01-Allgemein/
        ├── 02-Training & Gym/
        ├── 03-Kaempfe & Action/
        ├── 04-Presse & Interviews/
        ├── 05-Wiegen & Staredown/
        ├── 06-Walkout & Arena/
        ├── 07-Portraits/
        ├── 08-Sieg & Reaktion/
        └── 99-EXTERNE-SUCHLINKS/
```

Je Bereich werden die Funde nochmals nach Quelle getrennt. Die integrierte Recherche kann Pexels, Pixabay, Unsplash, Openverse und Wikimedia Commons verwenden. Ohne private Keys bleiben Openverse und Wikimedia verfügbar.

Ein optional eingefügtes Reel-Skript kann zusätzliche Recherchebereiche für Gegner/Personen, Eventbezeichnungen und Jahreszahlen erzeugen. Bei tiefer Recherche werden höchstens acht priorisierte Bereiche beziehungsweise maximal 40 Provider-Suchen verwendet.

### Nach dem Import eines Themenfunds

Der ursprüngliche Recherchefund bleibt als Historie erhalten, wird aber nicht weiter fälschlich als „noch nicht importiert“ behandelt. Der Hub markiert ihn als **bereits in den Katalog importiert**.

Das aktuelle Katalogasset wird zusätzlich im gleichen Themenbereich gespiegelt:

```text
Bereich/
└── Quelle/
    └── 90-IMPORTIERT/
        ├── 01-FREIGEGEBEN/
        ├── 02-REVIEW/
        ├── 03-EINGESCHRAENKT/
        └── 04-ARCHIV/
```

`00-IMPORTIERTE-ASSETS.md` zeigt pro Thema die aktuell katalogisierten Rechercheassets und ihren Status. Dadurch bleibt die Recherchegeschichte erhalten, während der aktuelle Review-/Freigabestand eindeutig sichtbar ist.

### Externe Suchlinks

`99-EXTERNE-SUCHLINKS` enthält Links für zusätzliche manuelle Sichtung, zum Beispiel YouTube-, Google-Bild- und Google-Video-Suchen sowie bei Kampfsport eine Websuche auf der offiziellen UFC-Domain.

**Diese Links sind ausschließlich Recherchehilfen.** Ein dort sichtbares Bild oder Video besitzt dadurch keine automatische Nutzungs- oder Veröffentlichungserlaubnis. Broadcast-, Event-, Marken-, Personen- und Urheberrechte müssen separat geprüft werden.

## Normale noch nicht importierte Suchfunde

Unter `90-GEFUNDENE-KANDIDATEN` werden Treffer aus dem normalen Arsenal Builder gesammelt, die noch nicht in den Katalog importiert sind:

```text
90-GEFUNDENE-KANDIDATEN/
└── Kanal/
    └── Sammlung/
        └── Quelle/
```

Mehrfach gefundene identische Treffer derselben Sammlung werden dedupliziert.

## Was pro Fund erzeugt wird

Je nach vorhandenem Material erzeugt der Hub:

- einen verständlichen Titel beziehungsweise Dateinamen
- eine `-INFO.md` mit Zuordnung, technischen Daten, Quelle und Prüfhinweisen
- eine `-QUELLE.url` zur Quellseite
- eine `-MEDIUM.url` zum externen Medium
- eine `-VORSCHAU.url` zur Vorschau
- bei lokalen Katalog-Assets eine echte Dateikopie

Nicht importierte Recherchetreffer sind ausdrücklich als **NOCH NICHT IMPORTIERT** gekennzeichnet. Nach einem erfolgreichen Katalogimport wird dieser historische Eintrag entsprechend ummarkiert.

## Dauerhafte lokale Historie

Normale Suchfunde und Themenrecherchen werden beim Neuaufbau des Ordners erhalten, auch wenn die ursprünglichen temporären API-Suchdateien später bereinigt werden.

Dafür existieren unter anderem:

```text
05-THEMENRECHERCHEN/00-HISTORIE.md
90-GEFUNDENE-KANDIDATEN/00-HISTORIE.md
```

## Gesamtindex

`00-GESAMTINDEX.md`, `00-GESAMTINDEX.csv` und `00-MANIFEST.json` geben einen zentralen Überblick über Katalog-Assets, Status, Kanal/Sammlung, Quellen sowie aktuelle Recherchekandidaten. Die Historienindizes ergänzen ältere lokal erhaltene Funde.

## Aktualisieren

Manuell:

```bash
npm run vault:build
```

Zusätzlich baut `npm run starter:import` den Ordner automatisch neu auf. Während `npm run serve` läuft, wird `catalog/assets.json` überwacht und der Ordner nach Katalogänderungen aktualisiert. Eine Personen-/Themenrecherche aktualisiert den Ordner ebenfalls direkt nach dem Suchlauf.

## Wichtig

`ALLES-GEFUNDEN` ist ein **Arbeits- und Recherchearchiv**, keine automatische Rechtefreigabe. Review-, Inbox-, eingeschränkte oder archivierte Assets sowie sämtliche nicht importierten Such- und Themenkandidaten dürfen nicht allein deshalb veröffentlicht werden, weil sie hier sichtbar sind.

Die erzeugten Inhalte bleiben lokal und werden nicht automatisch in Git eingecheckt. Dadurch kann die Medienablage groß werden, ohne das Repository unnötig aufzublähen.
