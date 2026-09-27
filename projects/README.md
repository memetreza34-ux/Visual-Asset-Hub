# Video-Projekte

`projects/` verbindet die freigegebene Asset-Bibliothek mit einem späteren Renderer wie Remotion.

Die Asset-Bibliothek bleibt die Quelle für Dateien, Metadaten und Nutzungsrechte. Ein Video-Projekt speichert nur, **welche Asset-IDs in welcher Reihenfolge und Dauer verwendet werden**.

## Projekt anlegen

```bash
npm run video:project -- create \
  --name "Erstes Video" \
  --format vertical \
  --scope youtube
```

Ergebnis:

```text
projects/erstes-video/project.json
```

Unterstützte Formate:

- `vertical` → 1080 × 1920
- `horizontal` → 1920 × 1080
- `square` → 1080 × 1080

## Szene hinzufügen

```bash
npm run video:project -- add \
  --project erstes-video \
  --asset VAH-XXXXXXXX \
  --duration 6
```

Optional:

```bash
--trim-start 2.5
--fit contain
--scene-title "Nahaufnahme Maschine"
--notes "leichter Zoom im Renderer"
```

## Render-Manifest erzeugen

```bash
npm run video:project -- export --project erstes-video
```

Ergebnis:

```text
projects/erstes-video/render-manifest.json
```

Das Render-Manifest enthält unter anderem:

- Projektauflösung und FPS
- Gesamtdauer und Gesamtframes
- Reihenfolge der Szenen
- `fromFrame` und `durationInFrames`
- Asset-ID und Quelldatei
- Trim-Start und Fit-Modus
- erforderliche Attributionen

## Rechte-Gate

Der Export ist absichtlich streng. Er wird blockiert, wenn:

1. eine Asset-ID nicht mehr existiert,
2. ein Asset nicht `approved` ist,
3. das Asset nicht für den Nutzungsbereich des Projekts freigegeben ist,
4. keine nutzbare Originalquelle vorhanden ist.

Damit kann ein späterer Renderer nicht versehentlich ein Asset verwenden, das nur für interne oder eingeschränkte Nutzung vorgesehen ist.

## Renderer

Der nächste Layer soll das `render-manifest.json` konsumieren. Für programmatische Multi-Szenen-Videos ist Remotion vorgesehen. Der Renderer soll eine eigene Schicht bleiben; Asset-Katalog und Rechteverwaltung werden nicht in React-Komponenten dupliziert.
