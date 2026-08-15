# Visual Asset Hub

Visual Asset Hub ist eine lokale Medienbibliothek und Rechercheoberfläche für **B-Rolls, Bilder, Animationen, Grafiken, Overlays, Screen-Recordings, Icons und Mockups**. Sie ist für Reels, Shorts, YouTube, Webseiten, Präsentationen und weitere Content-Projekte ausgelegt.

Aktueller Beta-Stand: **`0.4.0-beta.6`**.

## Vier spezialisierte Kanalbibliotheken

| Kanal | Sammlungen | Suchbegriffe | Ausbauziel |
|---|---:|---:|---:|
| Finanzen | 20 | 60 | 160 freigegebene Assets |
| Künstliche Intelligenz | 20 | 60 | 160 freigegebene Assets |
| Elektrotechnik | 20 | 60 | 160 freigegebene Assets |
| Kampfsport | 30 | 90 | 240 freigegebene Assets |
| **Gesamt** | **90** | **270** | **720 freigegebene Assets** |

Jede Sammlung ist für Video und Foto sowie Hoch- und Querformat vorbereitet. Die Kanalbibliotheken bilden die wiederverwendbare Grundversorgung; konkrete Reel-Themen können zusätzlich über die universelle Themenrecherche aufgebaut werden.

## Fünf Medienquellen

| Quelle | Bilder | Videos | Key |
|---|---:|---:|---:|
| Pexels | ja | ja | erforderlich |
| Pixabay | ja | ja | erforderlich |
| Unsplash | ja | nein | erforderlich |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pexels-, Pixabay- und Unsplash-Keys werden im Browser nur im Arbeitsspeicher der geöffneten Seite gehalten. Sie werden nicht in `localStorage`, `sessionStorage`, Katalogdateien oder Suchdateien gespeichert. **Sitzungs-Keys löschen** entfernt sie sofort.

Openverse und Wikimedia werden konservativ auf unterstützte offene Lizenzen begrenzt: Public Domain, CC0, CC BY und CC BY-SA. Attribution und Lizenzinformationen bleiben dokumentiert.

## Universelle Themenrecherche

Der Arbeitsbereich **Thema recherchieren** ist nicht auf Personen oder Kampfsport beschränkt. Eingaben können praktisch jedes visuelle Reel-Thema sein, zum Beispiel:

```text
Conor McGregor
NVIDIA
Tesla Model 3
Berlin
RCD Schutzschalter
Berliner Mauer
Inflation
Humanoide Roboter
```

### Recherchearten

Der Hub bietet:

- **Automatisch erkennen**
- **Person**
- **Firma / Marke / Organisation**
- **Produkt / Objekt**
- **Event / Veranstaltung**
- **Ort / Gebäude / Region**
- **Technik / Gerät / System**
- **Sport / Kampf / Athletik**
- **Historisches Thema**
- **Allgemeines Thema / Konzept**

Die Rechercheart bestimmt die visuellen Blickwinkel. Der **Zielkanal** bestimmt nur, in welchem Content-Kontext die später importierten Assets verwendet werden.

Beispiele für automatisch vorbereitete Blickwinkel:

- Person: Portrait, Karriere, Interviews, Events, Alltag, wichtige Orte, Reaktionen
- Firma/Marke: Branding, Standorte, Führung, Team, Produkte, Events, Geschichte, Kampagnen
- Produkt: Hero Shots, Close-ups, Nutzung, Unboxing, Vergleich, Produktion, Zubehör, Reparatur
- Event: Venue, Ankunft, Hauptgeschehen, Bühne, Publikum, Presse, Backstage, Reaktionen
- Ort: Wahrzeichen, Luftaufnahmen, Straßen, Innenräume, Menschen, Tag/Nacht, Verkehr, Geschichte
- Technik: Hardware, Komponenten, Betrieb, Installation, Wartung, UI, Diagramme, Produktion
- Sport/Kampf: Training, Wettkampf, Arena, Presse, Wiegen, Walkout, Portraits, Team, Reaktionen
- Historie: Archiv, Personen, Orte, Artefakte, Karten, Zeitleiste, Schlüsselereignisse, Vermächtnis
- Allgemeines Thema: Menschen, Objekte, Prozesse, Arbeit, Daten, News, Historie, Zukunft, symbolische B-Rolls

### Rechercheumfang

- **Schnell**: bis zu 6 Motivbereiche
- **Tief**: bis zu 8 Motivbereiche
- **Maximal**: bis zu 12 Motivbereiche

Im Maximalmodus entstehen bei allen fünf verfügbaren Quellen höchstens **60 sequenzielle Provider-Suchen**. Der Modus wird nur auf ausdrückliche Auswahl gestartet.

### Skript als Kontext

Optional kann das komplette Reel-Skript eingefügt werden. Der lokale Planner erkennt zusätzliche konkrete Begriffe, unter anderem Namen, Gegner, Events, Jahreszahlen und zitierte Begriffe. Dafür werden Suchplätze reserviert, damit skriptspezifische Motive nicht hinter allgemeinen Suchen verschwinden.

### Rechercheergebnis

Der Recherchelauf:

- durchsucht alle verfügbaren integrierten Quellen
- nutzt Openverse und Wikimedia ohne Key
- bevorzugt je Motiv Foto oder Video
- dedupliziert Treffer über Provider-ID sowie kanonisierte Quell- und Medien-URLs
- sortiert Treffer nach technischem Fit
- zeigt Bilder direkt und Videos mit Player
- importiert ausschließlich bewusst markierte Treffer
- setzt jeden Import zunächst auf `review`
- speichert keine API-Keys in Recherchedateien

## ALLES-GEFUNDEN

`ALLES-GEFUNDEN/` ist die zentrale lokale Arbeitsablage.

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

Eine konkrete Recherche wird beispielsweise so abgelegt:

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
        ├── 90-IMPORTIERT/
        └── 99-EXTERNE-SUCHLINKS/
```

Die Ordnerstruktur hängt von der gewählten Rechercheart ab. Ein Produkt erhält andere Unterordner als eine Person, ein Ort oder ein technisches System.

Pro Fund werden je nach Quelle verständliche INFO-, Quellen-, Medium- und Vorschau-Verknüpfungen erzeugt. Lokale Katalogmedien können als echte Dateikopie gespiegelt werden. Importierte Themenfunde werden klar von noch nicht importierten Recherchekandidaten getrennt.

Normale Suchfunde und Themenrecherchen bleiben lokal historisiert, auch wenn temporäre API-Suchdateien später bereinigt werden.

## Zusätzliche externe Recherchelinks

Pro Themenrecherche entstehen Links für zusätzliche manuelle Sichtung, unter anderem:

- YouTube-Suche
- Google Bilder
- Google Videos
- Google News
- Wikipedia-Suche
- bei Kampfsport zusätzlich eine Websuche auf der offiziellen UFC-Domain

Diese Links sind **nur Recherchehilfen**. Sichtbarkeit im Web ist keine Lizenz- oder Nutzungserlaubnis.

## Ausbau 720

Der Bereich **Ausbau 720** zeigt je Kanal und Sammlung:

- Kandidaten
- offene Reviews
- freigegebene Assets
- Video- und Fotolücken
- größte Freigabelücken
- priorisierte Review- und Suchaufgaben

Der Hub arbeitet **review-first**. Wenn bereits genügend Review-Kandidaten vorhanden sind, wird zuerst die Review-Warteschlange empfohlen. Neue API-Suche erfolgt nur bei echter Suchlücke.

Für neue Lücken gilt grundsätzlich:

- Video: Pexels → Pixabay
- Foto: Unsplash → Openverse → Wikimedia Commons → Pexels → Pixabay

Suchbegriffe und Quellen-Fallbacks werden nur vorbereitet und starten nicht automatisch.

## Reel- und Skript-Planer

Ein deutscher Sprechtext kann lokal in eine Shotlist umgewandelt werden. Der Planer erzeugt:

- Szenen und Zeitbereiche
- empfohlenen Medientyp
- passende Kanal-Sammlungen
- vorhandene Asset-Vorschläge
- Status- und Rechtewarnungen
- Suchbegriffe für fehlende Motive
- JSON-, CSV-, Markdown- und SRT-Ausgaben

CLI-Beispiel:

```bash
npm run script:plan -- \
  --channel electro \
  --file ./mein-reel.txt \
  --duration 45 \
  --orientation vertical
```

Ein reiner Rechercheplan kann ebenfalls erzeugt werden:

```bash
npm run entity:plan -- "Conor McGregor"
```

## Arsenal Builder

Der normale Arsenal Builder bleibt für den systematischen Ausbau der 90 festen Sammlungen zuständig. Er bietet:

- fünf Medienquellen
- Batch-Suche für bis zu fünf Sammlungen
- technischen Fit 0–100
- Suchbegriff-Kette
- manuelle Provider-Fallbacks
- Sammelimport markierter Treffer
- Dublettenschutz
- Review-first-Verknüpfung mit Ausbau 720

Der technische Fit ist nur eine Produktionsvorsortierung und keine Inhalts- oder Rechtefreigabe.

## Review und Rechte

Jeder externe Import beginnt auf `review`.

Vor Freigabe werden weiterhin mindestens geprüft:

1. sichtbarer Inhalt
2. Personen, Logos, Marken und sensible Elemente
3. Quelle, Lizenz und Nutzung
4. geplanter Einsatzkontext

Besonders bei realen Personen, Firmen, Produkten, Events, Sportveranstaltungen und Broadcastmaterial bedeutet ein gefundener Treffer **nicht automatisch**, dass er in einem Reel verwendet werden darf.

## Eigene Dateien

Eigene Videos, Bilder, Grafiken und weitere unterstützte Medien können über die lokale Inbox importiert werden. Kanal, Sammlung, Titel, Beschreibung und Tags werden gespeichert. Eine ausdrückliche Rechtebestätigung ist Pflicht. Der Import startet auf `review`.

## Medienpakete

Nur `approved`-Assets können in verifizierte Schnittpakete unter `exports/media-packs` ausgegeben werden. Enthalten sind unter anderem:

- Medien
- `manifest.json`
- SHA-256-Prüfsummen
- Quelle und Lizenz
- `ATTRIBUTION.md`
- Paket-README

## Starterbibliothek

`npm run starter:import` erzeugt idempotent eine reale Testbibliothek mit **12 Starterassets**:

- 8 Pexels-Videos
- 3 eigene SVG-Grafiken
- 1 Wikimedia-Commons-Kampfsportfoto unter CC BY-SA 4.0

Alle beginnen auf `review`. Finanzen, KI, Elektrotechnik und Kampfsport sind vertreten.

## Schnellstart auf dem Mac

```bash
cd ~/Downloads/Visual-Asset-Hub-clean
git pull --ff-only
npm run starter:import
npm run arsenal:expansion
npm run check
npm run serve
```

Danach:

```text
http://127.0.0.1:4173/web/
```

## Windows

1. Branch `agent/beta-release` herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` starten.

## Wichtige Befehle

```bash
npm run starter:import
npm run cleanup:local
npm run vault:build
npm run entity:plan -- "<Thema>"
npm run script:plan -- --channel finance --file ./mein-reel.txt --duration 45
npm run arsenal:validate
npm run arsenal:plan
npm run arsenal:expansion
npm run arsenal:report
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer <name>
npm run usage:add -- --asset VAH-XXXXXXXX --project projekt-01 --platform tiktok
npm run attribution:export -- --project projekt-01
npm run media:pack -- --ids VAH-XXXXXXXX --name projekt-01
npm run backup
npm run beta:verify
npm run check
npm run serve
```

## Sicherheit und Kostenkontrolle

- lokale Verwaltungs-APIs binden nur an Loopback
- Schreibaktionen benötigen Sitzungstoken und Same-Origin
- API-Keys werden nicht persistent im Browser gespeichert
- Openverse und Wikimedia benötigen keinen geheimen Key
- externe und Inbox-Importe starten auf `review`
- nicht freigegebene Assets werden aus Medienpaketen blockiert
- GitHub-Actions-Workflows sind im Beta-Branch ausschließlich manuell über `workflow_dispatch` startbar
- keine automatischen Push-, Pull-Request- oder Schedule-Runs
- die vollständige Beta-Abnahme kann lokal ohne GitHub-hosted Runner erfolgen

## Realtest

Die Beta gilt erst als vollständig real getestet, wenn unter anderem:

- `npm run check` lokal grün ist
- alle 12 Starterassets entschieden sind
- alle fünf Medienquellen technisch getestet wurden
- eine echte universelle Themenrecherche geprüft wurde
- eine skriptspezifische Themenrecherche geprüft wurde
- eigener Inbox-Import funktioniert
- mindestens ein Asset freigegeben ist
- ein verifiziertes Medienpaket erstellt wurde
- eine reale Nutzung dokumentiert wurde
- `realTestComplete: true` gemeldet wird

Der Pull Request bleibt bis dahin Draft und wird nicht in `main` gemergt.

## Dokumentation

- [`ALLES-GEFUNDEN/README.md`](ALLES-GEFUNDEN/README.md)
- [`docs/REAL-TEST-QUICKSTART.md`](docs/REAL-TEST-QUICKSTART.md)
- [`docs/CHANNEL-ARSENAL.md`](docs/CHANNEL-ARSENAL.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`SECURITY.md`](SECURITY.md)
- [`CHANGELOG.md`](CHANGELOG.md)
