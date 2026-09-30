# Story Discovery & Editorial Inserts

Diese Schicht liegt vor der eigentlichen Medienauswahl. Sie soll gute Fälle, Primärquellen und Artikel finden, bevor das Skript finalisiert wird.

## GDELT

`research:discover` nutzt GDELT standardmäßig ohne API-Key:

```bash
npm run research:discover -- "Mars Climate Orbiter unit conversion failure"
```

GDELT ist Discovery, keine Rechtefreigabe. Treffer werden nach Query-Relevanz und Autoritäts-Domain gerankt.

## SearXNG

Optional kann eine eigene kostenlose SearXNG-Instanz angeschlossen werden:

```env
SEARXNG_URL=http://127.0.0.1:8080
```

Die SearXNG-Instanz muss JSON-Ausgabe erlauben. Öffentliche Instanzen werden nicht fest im Repo verdrahtet, weil JSON dort häufig deaktiviert oder rate-limitiert ist.

## Behörden-/Primärquellen

Bei Discovery erhalten u. a. folgende Domains einen hohen Authority-Boost:

- nasa.gov
- noaa.gov
- usgs.gov
- ntsb.gov
- bea.aero
- europa.eu
- loc.gov
- si.edu

Ein hoher Authority-Score bedeutet nicht automatisch, dass Bilder oder Videos der Seite wiederverwendet werden dürfen.

## Artikel erfassen

```bash
npm install --no-save playwright
npx playwright install chromium
npm run research:capture -- "https://example.org/article"
```

Gespeichert werden:

- Full-page Screenshot
- Haupttext
- Titel/H1
- Autor
- Veröffentlichungsdatum, sofern vorhanden
- Canonical-URL
- OpenGraph-Bild-URL

Für einen späteren Video-Insert kann der Screenshot direkt in die Inbox gelegt werden:

```bash
npm run research:capture -- "https://example.org/article" --to-inbox true
```

Der Screenshot erhält absichtlich:

```text
licenseStatus = unknown
suggestedStatus = review
suggestedScopes = internal-only
```

Damit erzwingt der normale Review-Workflow eine manuelle Rechte-/Zitatprüfung.

## Renderer

Für freigegebene Artikel-/Dokument-Screenshots unterstützt Remotion `presentation: "article"` bzw. `presentation: "document"`. Der Renderer fokussiert den oberen Teil der Seite und führt eine dezente Kamerafahrt aus, statt den Screenshot statisch wie eine PowerPoint-Folie zu zeigen.
