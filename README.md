# Visual Asset Hub

Visual Asset Hub ist eine universelle, kostenlose Medienbibliothek für **B-Rolls, Bilder, Animationen, Grafiken, Overlays, Screen-Recordings, Icons und Mockups**. Sie kann für Reels, Shorts, YouTube, Webseiten, Apps, Präsentationen und Kundenprojekte verwendet werden.

## Spezialisierte Kanalbibliotheken

Die Version `0.4.0-beta.3` enthält ein großes Arsenal für vier Content-Kanäle:

| Kanal | Sammlungen | Suchbegriffe | empfohlenes Ausbauziel |
|---|---:|---:|---:|
| Finanzen | 20 | 60 | 160 freigegebene Assets |
| Künstliche Intelligenz | 20 | 60 | 160 freigegebene Assets |
| Elektrotechnik | 20 | 60 | 160 freigegebene Assets |
| Kampfsport | 30 | 90 | 240 freigegebene Assets |
| **Gesamt** | **90** | **270** | **720 freigegebene Assets** |

Jede Sammlung ist für vier Grundformate vorbereitet:

- vertikales B-Roll-Video
- horizontales B-Roll-Video
- vertikales Foto
- horizontales Foto

Die 90 Sammlungen bilden eine Grundmatrix aus **360 Format-Suchaufträgen**. Pexels und Pixabay können Bilder und Videos liefern; Unsplash, Openverse und Wikimedia Commons ergänzen die Foto-Suche. Kandidaten werden niemals automatisch freigegeben.

## Fünf Medienquellen

Der lokale Arsenal Builder bündelt fünf Quellen:

| Quelle | Bilder | Videos | geheimer Key |
|---|---:|---:|---:|
| Pexels | ja | ja | ja |
| Pixabay | ja | ja | ja |
| Unsplash | ja | nein | ja |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pexels-, Pixabay- und Unsplash-Keys können für die Dauer der geöffneten Browserseite ausschließlich in einer In-Memory-Map gehalten werden. Sie werden nicht in `localStorage`, `sessionStorage`, Katalogdateien oder Suchdateien geschrieben. Über **Sitzungs-Keys löschen** können sie sofort aus dem Arbeitsspeicher entfernt werden.

Openverse und Wikimedia werden konservativ gefiltert. Automatisch berücksichtigt werden nur Public Domain, CC0, CC BY und CC BY-SA. Attribution und Lizenz-URL werden im Asset dokumentiert; CC BY-SA bleibt auch nach dem Import ausdrücklich als Share-Alike-Lizenz erkennbar.

## Ausbau 720

Der Bereich **Ausbau 720** zeigt den tatsächlichen Fortschritt je Kanal und Sammlung:

- vorhandene Kandidaten
- offene Reviews
- freigegebene Assets
- Zielstand pro Kanal
- größte Freigabe-Lücken
- priorisierte Suchlücken

Der Hub unterscheidet zwischen **mehr suchen** und **erst prüfen**. Wenn für eine Sammlung bereits genug Review-Kandidaten vorhanden sind, wird keine weitere Suche empfohlen. Für echte Lücken können bis zu fünf priorisierte Sammlungen als Batch an den Arsenal Builder übergeben werden.

Auf der Konsole erzeugt

```bash
npm run arsenal:expansion
```

einen JSON- und CSV-Ausbauplan unter `reports/`.

## Reel- und Skript-Planer

Ein deutscher Sprechtext kann direkt im lokalen Browser in eine Shotlist umgewandelt werden:

1. Kanal auswählen.
2. Reel, YouTube oder Präsentation auswählen.
3. Zieldauer festlegen.
4. Sprechtext einfügen.
5. Shotlist erzeugen.

Der Planer erstellt automatisch:

- Szenen und Zeitbereiche
- empfohlenen Medientyp
- passende Kanal-Sammlungen
- passende vorhandene Assets
- Status- und Rechtewarnungen
- vorbereitete Suchbegriffe für fehlende Motive
- Abdeckung mit vorhandenen und freigegebenen Assets
- Exporte als JSON, CSV und Markdown

Das Matching verwendet ein geprüftes Lexikon mit deutschen und englischen Fachbegriffen für Finanzen, KI, Elektrotechnik und Kampfsport. Der Text bleibt lokal und wird nicht an eine externe KI-API übertragen.

Für Textdateien steht zusätzlich ein Kommandozeilen-Export mit SRT-Markern zur Verfügung:

```bash
npm run script:plan -- \
  --channel electro \
  --file ./mein-reel.txt \
  --duration 45 \
  --orientation vertical
```

Ausgabe: JSON, CSV, Markdown, SRT und eine Kopie des Skripts unter `reports/shot-plans/`.

## Arbeitswege

### 1. Arsenal Builder

Direkt im lokalen Browser:

1. Quelle auswählen.
2. Kanal und Sammlung auswählen.
3. Video oder Foto sowie Hoch- oder Querformat wählen.
4. bei Pexels, Pixabay oder Unsplash den jeweiligen Key einmal für die aktuelle Browser-Sitzung eingeben.
5. Vorschauen und Quellen ansehen.
6. passende Treffer markieren.
7. nur ausgewählte Treffer als `review` importieren.

Mit dem Batch-Modus können bis zu fünf Sammlungen nacheinander durchsucht werden. Über **Ausbau 720** können genau die aktuell größten Suchlücken vorbereitet werden.

### 2. Eigene Dateien über `inbox`

Eigene MP4-, MOV-, WEBM-, MKV-, JPG-, PNG-, WEBP-, AVIF-, SVG-, GIF- und weitere unterstützte Dateien können lokal importiert werden. Die Weboberfläche ermöglicht:

- Kanal- und Sammlungszuordnung
- Titel und Beschreibung
- zusätzliche Tags und Suchbegriffe
- Erkennung von Auflösung, Ausrichtung und Videodauer
- ausdrückliche Rechtebestätigung
- sicheren Import als `review`

Der Inhalt von `inbox` ist über `.gitignore` ausgeschlossen und wird nicht automatisch veröffentlicht.

### 3. Freigegebene Medienpakete

Favoriten können als vollständiges Schnittpaket unter `exports/media-packs` ausgegeben werden. Enthalten sind:

- heruntergeladene oder kopierte Originaldateien
- standardisierte Dateinamen
- `manifest.json`
- SHA-256-Prüfsummen
- Quellen- und Lizenzinformationen
- `ATTRIBUTION.md`
- Paket-README

Nicht freigegebene Assets werden strikt blockiert. Pro Paket sind höchstens 20 Assets vorgesehen.

## Starterbibliothek

Im Branch liegen sechs Grundassets. `npm run starter:import` ergänzt idempotent fünf bekannte Pexels-B-Rolls und ein Wikimedia-Commons-Foto für Kampfsport unter CC BY-SA 4.0. Die lokale Testbibliothek enthält danach:

- acht Pexels-Videos
- drei eigene SVG-Grafiken
- ein Wikimedia-Commons-Foto
- **insgesamt zwölf reale Starterassets**

Alle Starterassets beginnen auf `review`. Damit sind Finanzen, KI, Elektrotechnik und Kampfsport bereits im Realtest vertreten, ohne dass etwas automatisch freigegeben wird.

## Aktueller Funktionsumfang

- 24 universelle und spezialisierte Hauptkategorien
- 90 klar benannte Kanal-Sammlungen
- 270 vorbereitete Suchbegriffe
- fünf Medienquellen in einem lokalen Builder
- Batch-Suche für bis zu fünf Sammlungen
- Ausbau-720-Dashboard mit priorisierten Suchlücken
- Review-first-Logik gegen unnötige Massenimporte
- API-Keys nur im Arbeitsspeicher der geöffneten Seite
- deutsches Skript-Matching mit kanalbezogenen Synonymen
- lokale Shotlist-Planung mit Zeitbereichen und Asset-Vorschlägen
- Shotlist-Export als JSON, CSV, Markdown und SRT
- lokale Inbox für eigene Medien
- stabile Asset-IDs, Dateinamen, Tags und Suchaliasse
- Rechte-, Quellen- und Lizenzverwaltung
- Public-Domain-, CC0-, CC-BY- und CC-BY-SA-Unterstützung
- Dublettenprüfung
- Suche, Filter, Favoriten und Vorschauen
- feste Navigation zwischen allen Arbeitsbereichen
- Lückenempfehlungen für unvollständige Sammlungen
- getrennte Kandidaten-, Review- und Freigabefortschritte
- schnelle Review-Warteschlange
- Freigabe, Einschränkung und Archivierung im Browser
- Nutzungshistorie und Attributions-Export
- verifizierte Medienpakete für den Schnitt
- Backup und verifizierte Wiederherstellung
- Secret-, URL-, Metadaten- und Integritätsprüfungen
- gemeinsame Sperre gegen parallele Katalogänderungen

## Schnellstart auf dem Mac

```bash
cd ~/Downloads/Visual-Asset-Hub-clean
git pull --ff-only
npm run starter:import
npm run check
npm run serve
```

Danach öffnen:

```text
http://127.0.0.1:4173/web/
```

Das Terminalfenster muss während der lokalen Nutzung geöffnet bleiben.

## Schnellstart unter Windows

1. Branch `agent/beta-release` als ZIP herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` doppelklicken.

Die Bibliothek startet unter `http://127.0.0.1:4173/web/`.

## Schnelle Review-Warteschlange

Die Warteschlange zeigt ausschließlich offene Assets. Sie kann nach Kanal und Medientyp gefiltert werden. Pro Asset stehen Vorschau, Quelle, Lizenz, Qualitätsbewertung, Pflichtprüfung und einzelne Entscheidungen bereit. Nach einer Entscheidung wird das nächste Asset angezeigt. Eine blinde Sammelfreigabe gibt es nicht.

## Medienpaket über die Konsole

```bash
npm run media:pack -- \
  --ids VAH-XXXXXXXX,VAH-YYYYYYYY \
  --name elektro-reel-01
```

Nur `approved`-Assets werden exportiert. Standardlimits:

- maximal 20 Assets
- maximal 300 MB pro Datei
- maximal 1,5 GB pro Paket

## Besondere Rechte-Regeln für MMA/UFC-Content

Nicht automatisch freigeben:

- UFC- und Veranstalterlogos
- TV-, Pay-per-View- oder Broadcastausschnitte
- echte Kampfausschnitte ohne nachgewiesene Rechte
- geschützte Gürtel- und Eventdesigns
- sichtbare Sponsoren- und Mikrofonmarken
- grafische Verletzungen
- gefährliche Weight-Cut-Darstellungen

## Wichtige Befehle

```bash
npm run starter:import
npm run cleanup:local
npm run script:plan -- --channel finance --file ./mein-reel.txt --duration 45
npm run arsenal:validate
npm run arsenal:plan
npm run arsenal:expansion
npm run arsenal:import -- --input <datei> --ids <id1,id2>
npm run arsenal:report
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman
npm run usage:add -- --asset VAH-XXXXXXXX --project projekt-01 --platform tiktok
npm run attribution:export -- --project projekt-01
npm run media:pack -- --ids VAH-XXXXXXXX --name projekt-01
npm run backup
npm run restore -- --backup backups/<zeitstempel> --dry-run true
npm run beta:verify
npm run check
npm run serve
```

## Sicherheit

- Pexels-, Pixabay- und Unsplash-Keys werden im Browser nur im Arbeitsspeicher der aktuellen Seite gehalten; optional können CLI-Workflows lokale `.env`-Werte verwenden.
- Openverse und Wikimedia benötigen keinen geheimen Key.
- Skripttexte bleiben lokal und werden nicht automatisch gespeichert oder übertragen.
- alle automatischen Importe starten auf `review`.
- eigene Inbox-Dateien benötigen eine ausdrückliche Rechtebestätigung.
- Nicht freigegebene Assets können nicht als Medienpaket exportiert werden.
- externe Downloads blockieren lokale, private und reservierte Netzadressen.
- die lokale Verwaltungs-API bindet nur an `127.0.0.1`.
- Schreibaktionen benötigen Sitzungstoken, denselben Ursprung und eine freie gemeinsame Schreibsperre.
- fehlerhafte Import-, Paket-, Review-, Nutzungs- und Restore-Schritte werden zurückgerollt oder sicher abgebrochen.

## Bekannter externer Blocker

GitHub Actions erhält für dieses Repository aktuell keinen GitHub-hosted Runner. Die GitHub-Anmerkung verweist auf eine Billing-/Spending-Sperre. Da der lokale Workflow unabhängig davon funktioniert und keine zusätzlichen GitHub-Actions-Kosten benötigt, erfolgt die Beta-Abnahme lokal auf dem Mac beziehungsweise unter Windows. Issue #4 dokumentiert den externen Runner-Blocker.

## Dokumentation

- [`docs/REAL-TEST-QUICKSTART.md`](docs/REAL-TEST-QUICKSTART.md)
- [`docs/SCRIPT-PLANNER.md`](docs/SCRIPT-PLANNER.md)
- [`docs/CHANNEL-ARSENAL.md`](docs/CHANNEL-ARSENAL.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`SECURITY.md`](SECURITY.md)
- [`CHANGELOG.md`](CHANGELOG.md)
