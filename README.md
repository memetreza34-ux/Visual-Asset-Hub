# Visual Asset Hub

Visual Asset Hub ist eine universelle, kostenlose Medienbibliothek für **B-Rolls, Bilder, Animationen, Grafiken, Overlays, Screen-Recordings, Icons und Mockups**. Sie kann für Reels, Shorts, YouTube, Webseiten, Apps, Präsentationen und Kundenprojekte verwendet werden.

## Spezialisierte Kanalbibliotheken

Die Version `0.4.0-beta.2` enthält ein großes Arsenal für vier Content-Kanäle:

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

Der vollständige Suchplan umfasst **360 Pexels-Suchaufträge** und kann bis zu **5.850 Kandidaten** liefern. Kandidaten werden niemals automatisch freigegeben.

## Drei Quellenwege

### 1. Pexels Arsenal Builder

Direkt im lokalen Browser:

1. Kanal auswählen.
2. Sammlung auswählen.
3. Video oder Foto sowie Hoch- oder Querformat wählen.
4. Pexels-Key nur für diese eine lokale Anfrage eingeben.
5. Vorschauen ansehen.
6. passende Treffer markieren.
7. nur ausgewählte Treffer als `review` importieren.

Der Key wird nicht gespeichert und nach jeder Anfrage aus dem Feld entfernt.

### 2. Eigene Dateien über `inbox`

Eigene MP4-, MOV-, WEBM-, MKV-, JPG-, PNG-, WEBP-, AVIF-, SVG-, GIF- und weitere unterstützte Dateien können in den lokalen Ordner `inbox` kopiert werden. Die Weboberfläche erkennt diese Dateien, zeigt eine Vorschau und ermöglicht:

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

## Beispiele aus den Kanalpaketen

### Finanzen

Bargeld, Sparen, Banking, Aktien, Trading, Krypto, Immobilien, E-Commerce, Steuern, Inflation, Schulden, Gehalt, Wirtschaft, Versicherungen, FinTech und Betrugswarnungen.

### Künstliche Intelligenz

KI allgemein, humanoide Roboter, Machine Learning, Coding, Automatisierung, generative KI, Chatbots, neuronale Netze, Rechenzentren, Cybersecurity, Smart Home, Medizin-KI, Bildungs-KI, KI-Ethik und Content-Erstellung.

### Elektrotechnik

Elektrikerarbeit, Messgeräte, Leitungen, Schaltschränke, Instandhaltung, Motoren, SPS, Relais, Schütze, LS/RCD, Energieverteilung, Photovoltaik, Windenergie, Transformatoren, Bahntechnik, Gebäudeinstallation, PSA, Prüfung und Ausbildung.

### Kampfsport

MMA, generischer Käfig, Boxring, Boxtraining, Kickboxen, Muay Thai, Ringen, BJJ, Boxsack, Pratzen, Schattenboxen, Sparring, Wiegen, Face-off, Walkout, Bandagen, Ringrichter, Scorecards, Arena, Sieg, Erholung, Krafttraining und Regeneration.

## Starterbibliothek

Im Branch liegen sechs Grundassets. Beim ersten Start ergänzt `START-HERE.cmd` idempotent fünf weitere bereits bekannte Pexels-B-Rolls. Die lokale Testbibliothek enthält danach:

- acht Pexels-Videos
- drei eigene SVG-Grafiken
- insgesamt elf reale Starterassets
- Status aller Assets zunächst `review`

Die fünf zusätzlichen Starter-B-Rolls decken Finanzen, mobile KI, bionische Technik, Labor und Robotik ab. Es wird dafür beim Start keine neue Pexels-API-Anfrage benötigt.

## Aktueller Funktionsumfang

- 24 universelle und spezialisierte Hauptkategorien
- 90 klar benannte Kanal-Sammlungen
- 270 englische Pexels-Suchbegriffe
- automatische Suchplanung als JSON und CSV
- sichere Batch-Suche zur Schonung des kostenlosen API-Kontingents
- Import ausgewählter Treffer mit automatischer Kanal- und Sammlungszuordnung
- lokale Inbox für eigene Medien
- einheitliche Dateinamen und stabile Asset-IDs
- Rechte-, Quellen- und Lizenzverwaltung
- Dublettenprüfung
- Pexels-Foto- und Videosuche
- Webbibliothek mit Suche, Filtern, Favoriten und Video-Vorschau
- feste Navigation zwischen allen Arbeitsbereichen
- Lückenempfehlungen für unvollständige Sammlungen
- getrennte Kandidaten- und Freigabefortschritte
- schnelle Review-Warteschlange
- Review, Freigabe, Einschränkung und Archivierung direkt im Browser
- Nutzungshistorie nach Projekt und Plattform
- Attributions-Export
- verifizierte Medienpakete für den Schnitt
- Backup und verifizierte Wiederherstellung
- Secret-Scanner und automatische Datenprüfungen

## Schnellstart unter Windows

1. Branch `agent/beta-release` als ZIP herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` doppelklicken.

Die Startdatei:

1. ergänzt die lokale Starterbibliothek sicher auf elf Assets
2. bereinigt alte temporäre Suchdateien
3. prüft Code, Katalog und Tests
4. erzeugt den Beta-Bericht
5. erzeugt den vollständigen Arsenal-Suchplan
6. erzeugt den Kanal-Abdeckungsbericht
7. baut das Testpaket
8. startet die Bibliothek unter `http://127.0.0.1:4173`

Das Konsolenfenster muss geöffnet bleiben.

## Schnelle Review-Warteschlange

Die Warteschlange zeigt ausschließlich offene `review`- und `inbox`-Assets. Sie kann nach Kanal und Medientyp gefiltert werden. Pro Asset stehen zur Verfügung:

- vollständige Video- oder Bildvorschau
- Quelle und Lizenzseite
- Metadaten und Tags
- Qualitätsbewertung
- vier verpflichtende Prüfpunkte
- Freigeben und weiter
- Einschränken und weiter
- Archivieren und weiter
- Überspringen

Eine Freigabe bleibt immer eine einzelne menschliche Entscheidung. Es gibt keine blinde Sammelfreigabe.

## Arsenal planen

Alle vier Kanäle:

```bash
npm run arsenal:plan
```

Nur Kampfsport:

```bash
npm run arsenal:plan -- --channel combat-sports
```

Nur fünf Elektro-Sammlungen:

```bash
npm run arsenal:plan -- --channel electro --max-collections 5
```

Ausgaben:

```text
reports/arsenal-plan.json
reports/arsenal-plan.csv
reports/channel-coverage.json
reports/channel-coverage.md
```

## Pexels-Suchbatch

Zuerst Dry-Run:

```bash
npm run arsenal:search -- --max-jobs 20
```

Echte Suche mit lokalem `PEXELS_API_KEY`:

```bash
npm run arsenal:search -- --execute true --max-jobs 20
```

Die Batchgröße ist standardmäßig auf 20 Aufträge begrenzt. Ergebnisse liegen geordnet unter:

```text
.local-storage/arsenal-search/<kanal>/<sammlung>/
```

## Ausgewählte Arsenal-Treffer importieren

```bash
npm run arsenal:import -- \
  --input .local-storage/arsenal-search/electro/circuit-breakers-rcd/electro-circuit-breakers-rcd-video-vertical.json \
  --ids 12345,67890
```

Der Import übernimmt automatisch:

- Hauptkategorie
- Kanal-Tag
- Sammlungs-Tag
- Suchbegriff
- Tags
- Ausrichtung
- Status `review`

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

## Realtest im Browser

Nach dem Start erscheint **„Lokale Verwaltung aktiv“**. Der Test umfasst:

- elf Starterassets ansehen und entscheiden
- eigene Testdatei über `inbox` importieren
- Pexels-Suche für jeden Kanal ausführen
- mindestens ein Asset freigeben
- Favoriten-Auswahl exportieren
- freigegebenes Medienpaket erzeugen
- Asset in einem echten Content-Projekt verwenden
- Nutzung und Attribution dokumentieren
- Backup erstellen

Für die aktuelle Beta-Abnahme müssen alle elf Starterassets eine dokumentierte Entscheidung besitzen.

## Besondere Rechte-Regeln für MMA/UFC-Content

Die Bibliothek verwendet generische Kampfsport-Stockaufnahmen. Nicht automatisch freigeben:

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
npm run arsenal:validate
npm run arsenal:plan
npm run arsenal:search -- --max-jobs 20
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

- API-Schlüssel liegen nur in `.env` oder GitHub Secrets.
- Pexels-Importe starten immer als `review`.
- eigene Inbox-Dateien benötigen eine ausdrückliche Rechtebestätigung.
- Nicht freigegebene Assets können nicht als Medienpaket exportiert werden.
- externe Paketdownloads blockieren lokale und private Netzadressen.
- die lokale Verwaltungs-API bindet nur an `127.0.0.1`.
- Schreibaktionen benötigen ein zufälliges Sitzungstoken und denselben Ursprung.
- Unbekannte oder eingeschränkte Rechte verhindern eine Freigabe.
- Fehlerhafte Import-, Review-, Nutzungs- und Restore-Schritte werden zurückgerollt.

## Bekannter externer Blocker

GitHub Actions startet in diesem Repository momentan keinen Runner und bricht vor dem ersten Workflow-Schritt ab. Der vollständige lokale Windows-Test funktioniert unabhängig davon. Das Runner-Problem ist in Issue #4 dokumentiert.

## Dokumentation

- [`docs/CHANNEL-ARSENAL.md`](docs/CHANNEL-ARSENAL.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`SECURITY.md`](SECURITY.md)
- [`CHANGELOG.md`](CHANGELOG.md)
