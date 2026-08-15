# ALLES GEFUNDEN

Dieser Ordner ist die zentrale, automatisch erzeugte Medienablage des Visual Asset Hub.

Hier findest du **Katalog-Assets**, **normale Suchkandidaten** und **universelle Themenrecherchen** klar getrennt. Eine Recherche kann sich auf eine Person, Firma, Marke, Produkt, Event, Ort, Technik, Sport, Historie oder ein allgemeines Thema beziehen.

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

Importierte Assets werden nach Kanal, Sammlung und Status sortiert:

```text
01-FREIGEGEBEN
02-REVIEW
03-EINGESCHRAENKT
04-ARCHIV
99-UNBEKANNT
```

Lokale Medien können als echte Dateikopie gespiegelt werden. Externe Medien erhalten Quelle-, Medium- und Vorschau-Verknüpfungen.

## Universelle Themenrecherchen

Der Browser-Arbeitsbereich **Thema recherchieren** legt jede Recherche separat unter `05-THEMENRECHERCHEN` ab.

Der Hub unterstützt unterschiedliche Recherchearten:

- Person
- Firma / Marke / Organisation
- Produkt / Objekt
- Event / Veranstaltung
- Ort / Gebäude / Region
- Technik / Gerät / System
- Sport / Kampf / Athletik
- historisches Thema
- allgemeines Thema / Konzept
- automatische Erkennung

Die Unterordner hängen von der Rechercheart ab. Eine Person bekommt andere Blickwinkel als ein Produkt, ein Ort oder ein technisches Gerät.

Beispiel Kampfsport:

```text
05-THEMENRECHERCHEN/
└── 04-Kampfsport/
    └── Conor McGregor/
        ├── 00-RECHERCHEPLAN.md
        ├── 00-IMPORTIERTE-ASSETS.md
        ├── 01-Allgemein/
        ├── 02-Training & Vorbereitung/
        ├── 03-Wettkampf & Action/
        ├── ...
        └── 99-EXTERNE-SUCHLINKS/
```

Beispiel Technik:

```text
05-THEMENRECHERCHEN/
└── 03-Elektrotechnik/
    └── RCD Schutzschalter/
        ├── 00-RECHERCHEPLAN.md
        ├── 01-Technik allgemein/
        ├── 02-Hardware & Geraet/
        ├── 03-Komponenten & Details/
        ├── 04-Betrieb & Anwendung/
        ├── 05-Installation & Aufbau/
        ├── 06-Wartung & Reparatur/
        └── ...
```

## Rechercheumfang

- **Schnell:** bis zu 6 Motivbereiche
- **Tief:** bis zu 8 Motivbereiche
- **Maximal:** bis zu 12 Motivbereiche

Bei allen fünf verfügbaren Medienquellen entstehen im Maximalmodus höchstens 60 sequenzielle Provider-Suchen.

Ein optionales Reel-Skript kann zusätzliche konkrete Suchbereiche erzeugen, beispielsweise Namen, Gegner, Firmen, Events, Jahreszahlen und zitierte Begriffe.

## Quellen

Die integrierte Recherche kann verwenden:

- Pexels
- Pixabay
- Unsplash
- Openverse
- Wikimedia Commons

Openverse und Wikimedia benötigen keinen privaten Key.

Je Bereich werden die Funde nach Quelle getrennt. Dubletten werden soweit möglich über Provider-ID sowie Quell- und Medien-URLs entfernt.

## Nach dem Import eines Themenfunds

Der ursprüngliche Recherchefund bleibt als Historie erhalten, wird aber als **bereits importiert** markiert.

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

`00-IMPORTIERTE-ASSETS.md` zeigt den aktuellen Katalogstatus der importierten Themenassets.

## Externe Suchlinks

`99-EXTERNE-SUCHLINKS` kann zusätzliche manuelle Recherchehilfen enthalten:

- YouTube-Suche
- Google Bilder
- Google Videos
- Google News
- Wikipedia-Suche
- bei Kampfsport zusätzlich eine Websuche auf der offiziellen UFC-Domain

**Diese Links sind nur Recherchehilfen.** Sichtbarkeit im Web ist keine automatische Nutzungs- oder Veröffentlichungserlaubnis. Urheber-, Personen-, Marken-, Event- und Broadcastrechte müssen separat geprüft werden.

## Normale Suchfunde

Unter `90-GEFUNDENE-KANDIDATEN` liegen Treffer aus dem normalen Arsenal Builder, die noch nicht in den Katalog importiert wurden:

```text
90-GEFUNDENE-KANDIDATEN/
└── Kanal/
    └── Sammlung/
        └── Quelle/
```

## Was pro Fund erzeugt wird

Je nach vorhandenem Material erzeugt der Hub:

- verständlichen Titel beziehungsweise Dateinamen
- `-INFO.md`
- `-QUELLE.url`
- `-MEDIUM.url`
- `-VORSCHAU.url`
- bei lokalen Katalog-Assets eine echte Dateikopie

Nicht importierte Recherchetreffer werden ausdrücklich als **NOCH NICHT IMPORTIERT** gekennzeichnet.

## Dauerhafte lokale Historie

Normale Suchfunde und Themenrecherchen bleiben beim Neuaufbau erhalten, auch wenn temporäre API-Suchdateien später bereinigt werden.

```text
05-THEMENRECHERCHEN/00-HISTORIE.md
90-GEFUNDENE-KANDIDATEN/00-HISTORIE.md
```

## Aktualisieren

```bash
npm run vault:build
```

Zusätzlich aktualisieren Starterimport, laufender lokaler Server und Themenrecherche den Ordner automatisch.

## Wichtig

`ALLES-GEFUNDEN` ist ein **Arbeits- und Recherchearchiv**, keine automatische Rechtefreigabe. Review-, Inbox-, eingeschränkte oder archivierte Assets sowie nicht importierte Such- und Themenkandidaten dürfen nicht allein deshalb veröffentlicht werden, weil sie hier sichtbar sind.

Die erzeugten Inhalte bleiben lokal und werden nicht automatisch in Git eingecheckt.
