# Video Projects

`projects/` verbindet Story-Recherche, freigegebene Visuals, Nutzer-Voiceover und den Remotion-Renderer.

## Workflow für faceless Dokus

### Phase 1 – Recherche + Visuals + Skript

Visuals werden **vor** dem Voiceover festgelegt:

1. Fall/Thema recherchieren
2. Faktenquellen sichern
3. Original-/Archivmaterial suchen
4. Rechte prüfen
5. Visual-Coverage sicherstellen
6. Skript und Visual-Beats gemeinsam finalisieren

Archiv-Recherche:

```bash
npm run documentary:research -- "Suchbegriff" --type video
```

Referenzvideo strukturell analysieren:

```bash
npm run reference:inspect -- "https://youtu.be/VIDEO_ID"
```

Dabei wird standardmäßig kein Referenzvideo heruntergeladen.

### Phase 2 – Nutzer-Voiceover

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Nur die vom Nutzer gelieferte Audiodatei ist Master-Audio. Die Pipeline erzeugt oder ersetzt keine Stimme.

### Phase 3 – Timing + Assembly

- echte Voiceover-Zeiten bestimmen
- nur vorher ausgewählte Visuals verwenden
- Clips trimmen
- Bilder bewegen
- vertikale Clips in 16:9 mit Sidefill darstellen
- keine neue planlose Stock-Suche

### Phase 4 – Render

Remotion konsumiert das geprüfte Render-Manifest und übernimmt Schnitt/Motion/MP4-Export.

## Klassische Asset-Projekte

Projekt anlegen:

```bash
npm run video:project -- create \
  --name "Erstes Video" \
  --format horizontal \
  --scope youtube
```

Asset hinzufügen:

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

Export:

```bash
npm run video:project -- export --project erstes-video
```

Ergebnis:

```text
projects/erstes-video/render-manifest.json
```

Das Manifest enthält Projektauflösung/FPS, Frame-Timing, Szenenreihenfolge, Asset-Quellen, Trim/Fit, Master-Audio und Attributionen.

## Rechte-Gate

Der Export wird blockiert, wenn:

1. eine Asset-ID fehlt,
2. ein Asset nicht `approved` ist,
3. der gewünschte Nutzungsbereich fehlt,
4. keine nutzbare Originalquelle vorhanden ist,
5. bei Workflow-v2-Projekten keine echte Nutzer-Voiceover-Datei vorhanden ist.

`unknown` und `restricted` werden nicht automatisch als YouTube-freigegeben behandelt.

Ein Recherche-Score ist weder eine Rechtefreigabe noch ein Beweis, dass ein Asset exakt das behauptete Ereignis zeigt.
