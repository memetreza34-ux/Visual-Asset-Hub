# Visual Asset Hub

Visual Asset Hub ist eine universelle, kostenlose Medienbibliothek für **B-Rolls, Bilder, Animationen, Grafiken, Overlays, Screen-Recordings, Icons und Mockups**. Sie kann für Reels, Shorts, YouTube, Webseiten, Apps, Präsentationen und Kundenprojekte verwendet werden.

## Spezialisierte Kanalbibliotheken

Die Version `0.4.0-beta.1` enthält ein großes Arsenal für vier Content-Kanäle:

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

## Beispiele aus den Kanalpaketen

### Finanzen

Bargeld, Sparen, Banking, Aktien, Trading, Krypto, Immobilien, E-Commerce, Steuern, Inflation, Schulden, Gehalt, Wirtschaft, Versicherungen, FinTech und Betrugswarnungen.

### Künstliche Intelligenz

KI allgemein, humanoide Roboter, Machine Learning, Coding, Automatisierung, generative KI, Chatbots, neuronale Netze, Rechenzentren, Cybersecurity, Smart Home, Medizin-KI, Bildungs-KI, KI-Ethik und Content-Erstellung.

### Elektrotechnik

Elektrikerarbeit, Messgeräte, Leitungen, Schaltschränke, Instandhaltung, Motoren, SPS, Relais, Schütze, LS/RCD, Energieverteilung, Photovoltaik, Windenergie, Transformatoren, Bahntechnik, Gebäudeinstallation, PSA, Prüfung und Ausbildung.

### Kampfsport

MMA, generischer Käfig, Boxring, Boxtraining, Kickboxen, Muay Thai, Ringen, BJJ, Boxsack, Pratzen, Schattenboxen, Sparring, Wiegen, Face-off, Walkout, Bandagen, Ringrichter, Scorecards, Arena, Sieg, Erholung, Krafttraining und Regeneration.

## Aktueller Funktionsumfang

- 24 universelle und spezialisierte Hauptkategorien
- 90 klar benannte Kanal-Sammlungen
- 270 englische Pexels-Suchbegriffe
- automatische Suchplanung als JSON und CSV
- sichere Batch-Suche zur Schonung des kostenlosen API-Kontingents
- Import ausgewählter Treffer mit automatischer Kanal- und Sammlungszuordnung
- einheitliche Dateinamen und stabile Asset-IDs
- Rechte-, Quellen- und Lizenzverwaltung
- Dublettenprüfung
- Pexels-Foto- und Videosuche
- Webbibliothek mit Suche, Filtern, Favoriten und Video-Vorschau
- sichtbarer Fortschritt pro Kanal und Sammlung
- Review, Freigabe, Einschränkung und Archivierung direkt im Browser
- Nutzungshistorie nach Projekt und Plattform
- Attributions-Export
- Backup und verifizierte Wiederherstellung
- Secret-Scanner und automatische Datenprüfungen

## Schnellstart unter Windows

1. Branch `agent/beta-release` als ZIP herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` doppelklicken.

Die Startdatei:

1. prüft Code, Katalog und Tests
2. erzeugt den Beta-Bericht
3. erzeugt den vollständigen Arsenal-Suchplan
4. erzeugt den Kanal-Abdeckungsbericht
5. baut das Testpaket
6. startet die Bibliothek unter `http://127.0.0.1:4173`

Das Konsolenfenster muss geöffnet bleiben.

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

## Realtest im Browser

Nach dem Start erscheint **„Lokale Verwaltung aktiv“**. Dort können Assets ohne Konsolenbefehle:

- vollständig angesehen werden
- freigegeben oder eingeschränkt werden
- mit Qualitätsbewertung und Notiz protokolliert werden
- einem echten Projekt und einer Plattform zugeordnet werden
- als Attributionsliste exportiert werden
- über ein Katalog-Backup gesichert werden

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
npm run arsenal:validate
npm run arsenal:plan
npm run arsenal:search -- --max-jobs 20
npm run arsenal:import -- --input <datei> --ids <id1,id2>
npm run arsenal:report
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman
npm run usage:add -- --asset VAH-XXXXXXXX --project projekt-01 --platform tiktok
npm run attribution:export -- --project projekt-01
npm run backup
npm run restore -- --backup backups/<zeitstempel> --dry-run true
npm run beta:verify
npm run check
npm run serve
```

## Sicherheit

- API-Schlüssel liegen nur in `.env` oder GitHub Secrets.
- Pexels-Importe starten immer als `review`.
- Nicht freigegebene Assets können nicht normal als reale Nutzung dokumentiert werden.
- Die lokale Verwaltungs-API bindet nur an `127.0.0.1`.
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
