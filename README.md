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
- kleine Vorschaubilder, aber keine kostenpflichtige Speicherung großer Originale
- transaktionale Freigabe, Einschränkung und Archivierung
- vollständiges Review-Protokoll
- Nutzungshistorie pro Asset, Projekt und Plattform
- Quellen- und Attributions-Export als Markdown und CSV
- lokale Katalog-Backups mit SHA-256-Manifest
- responsive Websuche mit Filtern, Favoriten, Pagination, Nutzungshäufigkeit und Detailansicht
- Video-Wiedergabe direkt in der Detailansicht
- Katalogbericht und statische Testversion
- automatische Prüfungen für Katalog- und Betriebsdaten

## Schnellster Start unter Windows

1. Repository als ZIP herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` doppelklicken.

Die Datei prüft den Katalog, öffnet den Browser und startet Visual Asset Hub unter `http://127.0.0.1:4173`.

## Sicherer Arbeitsablauf

1. Pexels durchsuchen.
2. `gallery.html` ansehen und passende Pexels-IDs notieren.
3. Nur diese IDs in den Katalog importieren.
4. Importierte Assets visuell und rechtlich prüfen.
5. Asset freigeben oder einschränken.
6. Reale Verwendung dokumentieren.
7. Quellen-/Attributionsdatei für das Projekt exportieren.

## Wichtige Befehle

```bash
npm run pexels:search -- --query "KI Technologie" --type video --orientation vertical --output .local-storage/pexels-search/results.json
npm run pexels:gallery -- --input .local-storage/pexels-search/results.json
npm run pexels:select -- --input .local-storage/pexels-search/results.json --ids 12345,67890 --category technology-ai --tags ai,technik
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman
npm run usage:add -- --asset VAH-XXXXXXXX --project elektro-klar-reel-01 --platform tiktok
npm run attribution:export -- --project elektro-klar-reel-01
npm run backup
npm run report
npm run site:build
npm run check
npm run serve
```

## Sicherheit und Rechte

- API-Schlüssel liegen ausschließlich in `.env` oder GitHub Secrets.
- Pexels-Importe starten immer mit Status `review`.
- Vor Freigabe müssen erkennbare Personen, Marken, sensible Themen und der konkrete Nutzungskontext geprüft werden.
- Quelle, Lizenzseite und Urheberhinweis werden pro Asset dokumentiert.
- Unbekannte oder eingeschränkte Rechte können nicht als `approved` freigegeben werden.
- Nutzungen nicht freigegebener Assets werden standardmäßig blockiert.
- Änderungen an Status und Rechten werden bei Validierungsfehlern automatisch zurückgerollt.

Weitere Details:

- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md)
- [`docs/STORAGE-AND-RIGHTS.md`](docs/STORAGE-AND-RIGHTS.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/NAMING.md`](docs/NAMING.md)
