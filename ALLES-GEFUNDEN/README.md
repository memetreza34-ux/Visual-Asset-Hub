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

```text
fertiges Skript
→ visuelle Einheiten
→ unterschiedliche Suchqueries pro Szene
→ Bilder und B-Rolls
→ Hauptvisual / Alternativen
→ Review-Import
```

Der Hub schreibt oder verbessert dabei kein Skript. Der vollständige Originaltext bleibt unverändert gespeichert.

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

Pro Szene werden unter anderem gespeichert:

- exakter Originaltext
- Zeitbereich
- visuelle Absicht
- Suchqueries
- übernommener Kontext, falls ein Rückbezug vorliegt
- aktuelle Suchseite `searchRound`
- gefundene Kandidaten
- Provider und Quelle
- technischer Fit
- Hauptvisual / Alternativen
- Import-/Katalogverknüpfung

Nummerierungen wie `2. Sie ...` bleiben im Originaltext erhalten, können aber für die reine Rückbezugs-Erkennung intern ignoriert werden.

Je nach Rechercheumfang kann das Projekt bis zu **12 / 20 / 30 eindeutige Kandidaten pro Szene** aufbewahren. Zusätzliche Seiten erweitern die Auswahl, statt Seite 1 zu wiederholen.

Bei langen Projekten wird nach der initialen Erstellung nur noch der betroffene Szenenordner plus die Root-Projektdateien aktualisiert. Der gesamte Projektordner wird nicht bei jeder kleinen Änderung neu aufgebaut.

Bei externen Kandidaten entstehen je nach Treffer zusätzlich:

- `-INFO.md`
- `-QUELLE.url`
- `-MEDIUM.url`
- `-VORSCHAU.url`

Skriptprojekte bleiben auch beim normalen `vault:build` erhalten.

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

Der Bereich **Thema recherchieren** legt jede Recherche separat unter `05-THEMENRECHERCHEN` ab und unterstützt Person, Firma/Marke, Produkt, Event, Ort, Technik, Sport/Kampf, Historie, allgemeine Konzepte und automatische Erkennung.

Rechercheumfang:

- Schnell: bis zu 6 Motivbereiche
- Tief: bis zu 8 Motivbereiche
- Maximal: bis zu 12 Motivbereiche / höchstens 60 sequenzielle Provider-Suchen bei fünf Quellen

Ein optionales Reel-Skript kann zusätzliche Namen, Events, Jahreszahlen und zitierte Begriffe ergänzen.

## Quellen

Script Visual Finder, universelle Recherche und Arsenal Builder verwenden:

- Pexels
- Pixabay
- Unsplash
- Openverse
- Wikimedia Commons

Openverse und Wikimedia benötigen keinen privaten Key.

Dubletten werden soweit möglich über Provider-ID sowie Quell-, Original- und Medien-URLs reduziert. Im Script Visual Finder werden bereits in anderen Szenen gefundene Medien zusätzlich niedriger priorisiert.

## Nach dem Import

Jeder **neue externe Import** startet als `review`. Ein Treffer wird niemals nur deshalb freigegeben, weil er in einem Skriptprojekt oder einer Themenrecherche sichtbar ist.

Wenn ein Script-Visual-Treffer bereits im Katalog existiert, wird die bestehende Asset-ID verknüpft statt ein Duplikat anzulegen. Der vorhandene Katalogstatus wird dadurch nicht verändert.

## Externe Suchlinks

Themenrecherchen und Script-Visual-Szenen können zusätzliche manuelle Recherchehilfen enthalten, unter anderem YouTube, Google Bilder/Videos/News und Wikipedia.

**Diese Links sind nur Recherchehilfen.** Sichtbarkeit im Web ist keine automatische Nutzungs- oder Veröffentlichungserlaubnis.

## Normale Suchfunde

Unter `90-GEFUNDENE-KANDIDATEN` liegen Treffer aus dem normalen Arsenal Builder, die noch nicht in den Katalog importiert wurden.

## Dauerhafte lokale Historie

Normale Suchfunde, Themenrecherchen und Script-Visual-Projekte bleiben beim Neuaufbau erhalten, auch wenn temporäre API-Suchdateien später bereinigt werden.

## Aktualisieren

```bash
npm run vault:build
```

Zusätzlich aktualisieren Starterimport, laufender lokaler Server, Themenrecherche und Script Visual Finder die lokale Arbeitsablage.

## Wichtig

`ALLES-GEFUNDEN` ist ein **Arbeits- und Recherchearchiv**, keine automatische Rechtefreigabe. Review-, eingeschränkte oder archivierte Assets sowie nicht importierte Such-, Themen- und Skriptkandidaten dürfen nicht allein deshalb veröffentlicht werden, weil sie hier sichtbar sind.

Die erzeugten Inhalte bleiben lokal und werden nicht automatisch in Git eingecheckt.
