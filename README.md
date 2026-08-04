# Visual Asset Hub

Visual Asset Hub ist eine universelle, kostenlose Medienbibliothek für **B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings, Grafiken, Icons und Mockups**. Sie ist nicht an ein einzelnes Content-Projekt gebunden und kann für Reels, Shorts, YouTube, Werbung, Webseiten, Apps, Präsentationen und Kundenprojekte genutzt werden.

## Aktueller Funktionsumfang

- 20 feste Hauptkategorien und kontrollierte Metadaten
- einheitliche Dateinamen und stabile Asset-IDs
- Rechte-, Quellen- und Lizenzprüfung
- Dublettenprüfung über ID, Dateiname, Hash und Pexels-Quellseite
- Pexels-Suche für Fotos und Videos
- visuelle HTML-Galerie für Pexels-Suchergebnisse
- automatischer Pexels-Import als externe `review`-Einträge
- kleine lokale Vorschaubilder, aber keine teure Speicherung der Originale
- responsive Websuche mit Filtern, Favoriten, Pagination und Detailansicht
- Video-Wiedergabe direkt in der Detailansicht
- Katalogbericht und statische Testversion als GitHub-Artifact
- automatische Tests über GitHub Actions

## Einfachste Nutzung ohne lokale Installation

### Nur suchen

1. Repository öffnen.
2. **Actions → Pexels suchen → Run workflow**.
3. Suchbegriff, Medientyp, Format und Anzahl auswählen.
4. Nach dem Lauf das Artifact herunterladen und `gallery.html` öffnen.

### In den Katalog übernehmen

1. **Actions → Pexels in Katalog importieren → Run workflow**.
2. Suchthema, Typ, Kategorie, Format und Anzahl auswählen.
3. Der Workflow legt die Treffer mit Status `review` an und speichert kleine Vorschaubilder.
4. Anschließend den erzeugten Pull Request prüfen und erst danach mergen.

Die Originaldateien bleiben zunächst bei Pexels verlinkt. Dadurch entstehen keine Speichergebühren.

## Lokal starten

Benötigt wird Node.js 22 oder neuer.

```bash
npm run check
npm run serve
```

Danach ist die Bibliothek unter `http://127.0.0.1:4173` erreichbar.

## Wichtige Befehle

```bash
npm run pexels:search -- --query "KI Technologie" --type video --orientation vertical
npm run pexels:gallery -- --input .local-storage/pexels-search/results.json
npm run pexels:import -- --query "KI Technologie" --type video --category technology-ai --count 5
npm run asset:add -- --help
npm run report
npm run site:build
npm run check
```

## Sicherheit und Rechte

- API-Schlüssel liegen ausschließlich in `.env` oder GitHub Secrets.
- Pexels-Importe starten immer mit Status `review`.
- Vor Freigabe müssen erkennbare Personen, Marken, sensible Themen und der konkrete Nutzungskontext geprüft werden.
- Quelle, Lizenzseite und Urheberhinweis werden pro Asset dokumentiert.
- Unbekannte oder eingeschränkte Rechte können nicht als `approved` freigegeben werden.

Weitere Details:

- [`docs/WORKFLOW.md`](docs/WORKFLOW.md)
- [`docs/STORAGE-AND-RIGHTS.md`](docs/STORAGE-AND-RIGHTS.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/NAMING.md`](docs/NAMING.md)
