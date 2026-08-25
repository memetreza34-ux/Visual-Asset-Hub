# ALLES GEFUNDEN

Dieser Ordner ist die zentrale, automatisch erzeugte Medienablage des Visual Asset Hub.

Hier findest du **Katalog-Assets**, **normale Suchkandidaten**, **universelle Themenrecherchen** und **Skript-zu-Visual-Projekte** klar getrennt.

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
├── 06-SKRIPT-PROJEKTE/
├── 90-GEFUNDENE-KANDIDATEN/
└── 99-Sonstiges/
```

## Skript → Visuals

Der Arbeitsbereich **Skript → Visuals** ist für den Kernworkflow gedacht:

```text
fertiges Skript
→ visuelle Einheiten
→ mehrere Suchqueries pro Szene
→ Bilder und B-Rolls
→ Hauptvisual / Alternativen
→ Review-Import oder Verknüpfung mit vorhandenem Katalogasset
```

Der Hub schreibt oder verbessert dabei **kein Skript**. Der eingegebene Originaltext wird unverändert als Projektgrundlage gespeichert. Nummerierungen und Aufzählungszeichen bleiben ebenfalls im Szenen-Originaltext erhalten.

Jedes Projekt liegt separat unter:

```text
06-SKRIPT-PROJEKTE/
└── <Projektname>-<Projekt-ID>/
    ├── 00-SKRIPT.txt
    ├── 00-PROJEKT.json
    ├── 00-SZENENPLAN.md
    ├── 00-SHOTLIST.json
    ├── 00-SHOTLIST.csv
    ├── 001-SCENE-001/
    ├── 002-SCENE-002/
    └── ...
```

Pro Szene werden gespeichert:

- exakter Originaltext
- Zeitbereich
- visuelle Absicht
- erzeugte Suchqueries
- aktuelle erfolgreiche Suchseite (`searchRound`)
- gefundene Kandidaten
- Video-/Bildtyp
- Provider und Quellseite
- technischer Fit
- Hauptvisual / Alternativen
- Import- oder Katalogverknüpfungsstatus

Bei externen Kandidaten entstehen je nach Treffer zusätzlich:

- `-INFO.md`
- `-QUELLE.url`
- `-MEDIUM.url`
- `-VORSCHAU.url`

Skriptprojekte bleiben auch beim normalen `vault:build` erhalten.

### Medienmix

Bei **Gemischt** versucht der Script Visual Finder pro Szene nach Möglichkeit sowohl Video-B-Roll als auch Bilder zu sammeln.

- Pexels/Pixabay dienen als Videoquellen.
- Unsplash/Openverse/Wikimedia liefern Bildmaterial.
- Die Web-App zeigt Video- und Bildanzahl sowie den Mix-Status.
- Hauptvisuals und Alternativen bleiben beim Nachladen weiterer Treffer geschützt.

### Weitere Suchseiten

**Mehr Treffer** verwendet echte Folgeseiten:

```text
Seite 1 → Seite 2 → Seite 3 → ... → maximal Seite 100
```

`searchRound` wird im Projekt gespeichert. Eine komplett fehlgeschlagene Zusatzrunde erhöht diese Zahl nicht.

Die fünf Provider erhalten die echte Seitennummer. Wikimedia Commons berechnet den Suchoffset passend zur Seitengröße, damit keine Trefferbereiche übersprungen werden.

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

## Rechercheumfang der Themenrecherche

- **Schnell:** bis zu 6 Motivbereiche
- **Tief:** bis zu 8 Motivbereiche
- **Maximal:** bis zu 12 Motivbereiche

Bei allen fünf verfügbaren Medienquellen entstehen im Maximalmodus höchstens 60 sequenzielle Provider-Suchen.

Ein optionales Reel-Skript kann zusätzliche konkrete Suchbereiche erzeugen, beispielsweise Namen, Gegner, Firmen, Events, Jahreszahlen und zitierte Begriffe.

## Quellen

Script Visual Finder, universelle Recherche und normaler Arsenal Builder verwenden die bestehenden Provider:

- Pexels
- Pixabay
- Unsplash
- Openverse
- Wikimedia Commons

Openverse und Wikimedia benötigen keinen privaten Key.

Dubletten werden soweit möglich über Provider-ID sowie kanonisierte Quell-, Original- und Medien-URLs reduziert. Im Script Visual Finder werden bereits in anderen Szenen gefundene Medien zusätzlich niedriger priorisiert.

## Nach dem Import

Jeder **neu angelegte externe Import** startet als **`review`**. Ein Treffer wird niemals nur deshalb freigegeben, weil er in einem Skriptprojekt oder einer Themenrecherche sichtbar ist.

Existiert dieselbe Quelle oder Medienreferenz bereits im Katalog, erzeugt der Script Visual Finder kein unnötiges Duplikat. Er verknüpft den Kandidaten mit der bestehenden Katalog-Asset-ID. Der bereits vorhandene Katalogstatus wird dadurch nicht automatisch verändert.

Themenfunde werden im Themenarchiv als bereits importiert markiert. Script-Visual-Projekte speichern importierte oder verknüpfte Katalog-Asset-IDs direkt am jeweiligen Kandidaten.

## Externe Suchlinks

`05-THEMENRECHERCHEN/.../99-EXTERNE-SUCHLINKS` kann zusätzliche manuelle Recherchehilfen enthalten:

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

## Dauerhafte lokale Historie

Normale Suchfunde, Themenrecherchen und Script-Visual-Projekte bleiben beim Neuaufbau erhalten, auch wenn temporäre API-Suchdateien später bereinigt werden.

```text
05-THEMENRECHERCHEN/00-HISTORIE.md
06-SKRIPT-PROJEKTE/
90-GEFUNDENE-KANDIDATEN/00-HISTORIE.md
```

## Aktualisieren

```bash
npm run vault:build
```

Zusätzlich aktualisieren Starterimport, laufender lokaler Server, Themenrecherche und Script Visual Finder die lokale Arbeitsablage.

## Wichtig

`ALLES-GEFUNDEN` ist ein **Arbeits- und Recherchearchiv**, keine automatische Rechtefreigabe. Review-, Inbox-, eingeschränkte oder archivierte Assets sowie nicht importierte Such-, Themen- und Skriptkandidaten dürfen nicht allein deshalb veröffentlicht werden, weil sie hier sichtbar sind.

Die erzeugten Inhalte bleiben lokal und werden nicht automatisch in Git eingecheckt.
