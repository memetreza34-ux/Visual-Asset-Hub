# Visual Asset Hub

Visual Asset Hub ist eine universelle, kostenlose Medienbibliothek für **B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings, Grafiken, Icons und Mockups**. Sie ist nicht an ein einzelnes Content-Projekt gebunden und kann für Reels, Shorts, YouTube, Werbung, Webseiten, Apps, Präsentationen und Kundenprojekte genutzt werden.

## Aktueller Funktionsumfang

- 20 feste Hauptkategorien und kontrollierte Metadaten
- einheitliche Dateinamen und stabile Asset-IDs
- Rechte-, Quellen- und Lizenzprüfung
- Dublettenprüfung über ID, Dateiname, Hash und Pexels-Quellseite
- Pexels-Suche für Fotos und Videos
- visuelle HTML-Galerie für Suchergebnisse
- gezielter Import ausgewählter Pexels-IDs
- automatische Pexels-Importe ausschließlich als `review`
- externe Vorschauen und Originaldateien ohne kostenpflichtigen Massenspeicher
- transaktionale Freigabe, Einschränkung und Archivierung
- vollständiges Review-Protokoll
- Nutzungshistorie pro Asset, Projekt und Plattform
- Quellen- und Attributions-Export als Markdown und CSV
- lokale Katalog-Backups mit SHA-256-Manifest
- responsive Websuche mit Filtern, Schnellfiltern, Favoriten, Pagination und Detailansicht
- sichtbare Statuskennzeichnung für Review, Freigabe und Einschränkung
- exportierbare Favoriten-Auswahl zur Übergabe an andere Content-Projekte
- Video-Wiedergabe direkt in der Detailansicht
- automatischer Beta-Fortschritt mit offener Abnahmeliste
- sichere lokale Verwaltungs-API ausschließlich auf `127.0.0.1`
- Review, Freigabe, Einschränkung, Nutzung, Attribution und Backup direkt im Browser
- Secret-Scanner sowie automatische Prüfungen für Katalog-, Vorschau-, Betriebs- und Webdaten
- sechs reale Beta-Testassets: drei vertikale Pexels-Videos und drei eigene horizontale SVG-Grafiken

## Schnellster Start unter Windows

1. Den Branch `agent/beta-release` als ZIP herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` doppelklicken.

Die Startdatei führt die vollständige Beta-Prüfung aus, erzeugt den Bereitschaftsbericht und das statische Testpaket, startet den lokalen Server und öffnet Visual Asset Hub unter:

```text
http://127.0.0.1:4173
```

Das Konsolenfenster muss während der Verwendung geöffnet bleiben.

## Realtest vollständig im Browser

Nach dem Start ist oben die Leiste **„Lokale Verwaltung aktiv“** sichtbar. Dann kann der komplette Test ohne Befehle erfolgen:

1. Asset öffnen und vollständig ansehen.
2. Quelle und Lizenzseite öffnen.
3. Die vier Pflichtprüfungen bestätigen.
4. Prüfer, Qualitätsbewertung und Notiz eintragen.
5. **Freigeben**, **Einschränken**, **Zur Prüfung zurück** oder **Archivieren** wählen.
6. Bei einem freigegebenen Asset Projekt und Plattform eintragen.
7. **Nutzung speichern** drücken.
8. Attribution direkt exportieren.
9. Über die obere Leiste ein Katalog-Backup erzeugen.

Jede Änderung wird durch dieselben Validatoren geprüft wie der Konsolenablauf. Bei einem Fehler werden Katalog-, Review- oder Nutzungsänderungen zurückgerollt.

## Sicherer Arbeitsablauf

1. **Suchen:** Pexels nach einem konkreten Motiv durchsuchen.
2. **Auswählen:** `gallery.html` ansehen und nur passende Pexels-IDs notieren.
3. **Importieren:** Nur ausgewählte IDs als `review` übernehmen.
4. **Prüfen:** Vollständigen Clip, sichtbare Personen, Marken, Inhalt und Rechte kontrollieren.
5. **Entscheiden:** Asset freigeben, einschränken, zurückgeben oder archivieren.
6. **Verwenden:** Nur ein freigegebenes Asset in einem echten Projekt einsetzen.
7. **Dokumentieren:** Projekt, Plattform und optionale Veröffentlichungs-URL speichern.
8. **Exportieren:** Auswahl sowie Quellen-/Attributionsdateien an das Editing- oder Content-Projekt übergeben.

## Nutzung ohne Befehle über GitHub Actions

Sobald GitHub Actions im Repository wieder Runner startet, stehen zusätzlich folgende manuelle Abläufe bereit:

- **Pexels suchen** – Ergebnisdatei und visuelle Galerie erzeugen
- **Pexels in Katalog importieren** – Treffer als Review-Assets aufnehmen
- **Asset prüfen und entscheiden** – Freigabe oder Einschränkung als Pull Request protokollieren
- **Asset-Nutzung dokumentieren** – reale Verwendung als Pull Request speichern
- **Katalogpaket exportieren** – Website, Berichte, Backup und optionale Attribution herunterladen

## Weboberfläche

- Volltextsuche nach Titel, Beschreibung, Tags, Aliasen, Kategorie und Projekt
- Filter nach Typ, Kategorie, Ausrichtung, Stil, Status, Lizenz und Nutzung
- Schnellfilter für B-Rolls, Hochformat, Review, Freigabe, Favoriten und aktive Kategorien
- Favoriten als temporäre Projektauswahl
- JSON-Export der Auswahl mit Quelle, Lizenz, Status und Attribution
- deutliche Warnung, wenn die Auswahl nicht freigegebene Medien enthält
- sichtbarer technischer Fortschritt, Realtest-Stand und nächste Abnahmeschritte

## Wichtige Befehle

```bash
npm run pexels:search -- --query "KI Technologie" --type video --orientation vertical --output .local-storage/pexels-search/results.json
npm run pexels:gallery -- --input .local-storage/pexels-search/results.json
npm run pexels:select -- --input .local-storage/pexels-search/results.json --ids 12345,67890 --category technology-ai --tags ai,technik
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman --notes "Clip vollständig geprüft"
npm run usage:add -- --asset VAH-XXXXXXXX --project elektro-klar-reel-01 --platform tiktok
npm run attribution:export -- --project elektro-klar-reel-01
npm run backup
npm run beta:verify
npm run check
npm run serve
```

## Sicherheit und Rechte

- API-Schlüssel liegen ausschließlich in `.env` oder GitHub Secrets.
- `npm run check` scannt das Repository auf offensichtliche API-Keys und Tokens.
- Externe Vorschau-URLs werden auf unsichere oder signierte Parameter geprüft.
- Die lokale Verwaltungs-API bindet standardmäßig ausschließlich an `127.0.0.1`.
- Schreibaktionen benötigen ein zufälliges Sitzungstoken und denselben Browser-Ursprung.
- Der Server setzt Content-Security-Policy, Frame-Schutz und weitere Sicherheitsheader.
- Pexels-Importe starten immer mit Status `review`.
- Vor Freigabe müssen erkennbare Personen, Marken, sensible Themen und der konkrete Nutzungskontext geprüft werden.
- Quelle, Lizenzseite und Urheberhinweis werden pro Asset dokumentiert.
- Unbekannte oder eingeschränkte Rechte können nicht als `approved` freigegeben werden.
- Nutzungen nicht freigegebener Assets werden standardmäßig blockiert.
- Änderungen an Status, Rechten und Nutzung werden bei Validierungsfehlern automatisch zurückgerollt.

## Bekannter externer Blocker

GitHub Actions stellt im Repository derzeit keinen Runner bereit. Selbst minimale Linux- und Windows-Diagnosejobs scheitern vor ihrem ersten Step und erzeugen keine Logs. Der vollständige lokale Browser-Test ist davon unabhängig; die automatische GitHub-Abnahme bleibt bis zur Korrektur der Repository-/Kontoeinstellung blockiert.

## Dokumentation

- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md)
- [`docs/STORAGE-AND-RIGHTS.md`](docs/STORAGE-AND-RIGHTS.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`docs/NAMING.md`](docs/NAMING.md)
- [`SECURITY.md`](SECURITY.md)
- [`CHANGELOG.md`](CHANGELOG.md)
