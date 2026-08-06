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

## Starterbibliothek

Im Branch liegen sechs Grundassets. Beim ersten Start ergänzt `START-HERE.cmd` idempotent fünf weitere bereits bekannte Pexels-B-Rolls. Die lokale Testbibliothek enthält danach acht Pexels-Videos, drei eigene SVG-Grafiken und insgesamt elf reale Starterassets. Alle starten auf `review`.

## Aktueller Funktionsumfang

- 24 universelle und spezialisierte Hauptkategorien
- 90 klar benannte Kanal-Sammlungen
- 270 englische Pexels-Suchbegriffe
- automatische Suchplanung als JSON und CSV
- Pexels-Suche im Browser und in sicheren Batches
- lokale Inbox für eigene Medien
- stabile Asset-IDs, Dateinamen, Tags und Suchaliasse
- Rechte-, Quellen- und Lizenzverwaltung
- Dublettenprüfung
- Suche, Filter, Favoriten und Vorschauen
- feste Navigation zwischen allen Arbeitsbereichen
- Lückenempfehlungen für unvollständige Sammlungen
- getrennte Kandidaten- und Freigabefortschritte
- schnelle Review-Warteschlange
- Freigabe, Einschränkung und Archivierung im Browser
- Nutzungshistorie und Attributions-Export
- verifizierte Medienpakete für den Schnitt
- Backup und verifizierte Wiederherstellung
- Secret-, URL-, Metadaten- und Integritätsprüfungen
- gemeinsame Sperre gegen parallele Katalogänderungen

## Schnellstart unter Windows

1. Branch `agent/beta-release` als ZIP herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` doppelklicken.

Die Bibliothek startet unter:

```text
http://127.0.0.1:4173
```

Das Konsolenfenster muss geöffnet bleiben.

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
- alle automatischen Importe starten auf `review`.
- eigene Inbox-Dateien benötigen eine ausdrückliche Rechtebestätigung.
- Nicht freigegebene Assets können nicht als Medienpaket exportiert werden.
- externe Downloads blockieren lokale, private und reservierte Netzadressen.
- die lokale Verwaltungs-API bindet nur an `127.0.0.1`.
- Schreibaktionen benötigen Sitzungstoken, denselben Ursprung und eine freie gemeinsame Schreibsperre.
- fehlerhafte Import-, Paket-, Review-, Nutzungs- und Restore-Schritte werden zurückgerollt oder sicher abgebrochen.

## Bekannter externer Blocker

GitHub Actions startet in diesem Repository momentan keinen Runner und bricht vor dem ersten Workflow-Schritt ab. Der vollständige lokale Windows-Test funktioniert unabhängig davon. Das Runner-Problem ist in Issue #4 dokumentiert.

## Dokumentation

- [`docs/REAL-TEST-QUICKSTART.md`](docs/REAL-TEST-QUICKSTART.md)
- [`docs/CHANNEL-ARSENAL.md`](docs/CHANNEL-ARSENAL.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`SECURITY.md`](SECURITY.md)
- [`CHANGELOG.md`](CHANGELOG.md)
