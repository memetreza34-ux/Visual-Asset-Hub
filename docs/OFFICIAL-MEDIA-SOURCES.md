# Official Media Sources – v0.15

## Ziel

Phase 1 soll zuerst echtes, ereignisspezifisches Material aus offiziellen oder archivierten Quellen finden. Generischer Stock bleibt Fallback.

## Standardreihenfolge

1. NASA Image & Video Library
2. NOAA
3. U.S. Geological Survey (USGS)
4. Library of Congress
5. Wikimedia Commons
6. Internet Archive
7. Openverse (Bilder)
8. Pexels / Pixabay nur mit `--include-stock true`

## NOAA

Provider: `noaa`

- kein API-Key
- Bild + Video Discovery auf offiziellen NOAA-Seiten
- gefundene direkte Mediendateien können in die Inbox geladen werden
- Rechte bleiben standardmäßig `unknown/review`
- Grund: NOAA-Seiten können Drittmaterial, Logos oder abweichende Rechtehinweise enthalten

Beispiel:

```bash
npm run source:search -- "hurricane satellite" --provider noaa --type image
```

## USGS

Provider: `usgs`

- kein API-Key
- nutzt die offizielle USGS Multimedia Gallery
- Bild + Video
- erkennt `Public Domain` auf konkreten Medienseiten
- selbst erkannte Public-Domain-Treffer bleiben zunächst im Review, damit Drittmaterial/abweichende Hinweise geprüft werden

Beispiel:

```bash
npm run source:search -- "Kilauea eruption" --provider usgs --type image
```

## Phase-1 Materializer

`phase1:materialize` durchsucht die offiziellen Quellen automatisch vor den generischen Archiven:

```text
NASA → NOAA → USGS → Library of Congress
     → Wikimedia → Internet Archive → Openverse
     → Stock nur optional
```

```bash
npm run phase1:materialize -- --project <id> --download-top 1
```

## Rechte-Gate

Kein externer Treffer wird allein durch den Provider automatisch für YouTube freigegeben.

Vor Phase 2 müssen weiterhin gelten:

- konkretes Ereignis/Objekt bestätigt
- Quellseite gespeichert
- Lizenzstatus geprüft
- Watermark/Logo geprüft
- erforderliche Attribution gespeichert
- Asset im Katalog `approved`
- `youtube` in `usageScopes`

Erst danach darf das Asset an den Beat gebunden werden.

## Nächste optionale Quellen

Diese sind sinnvoll, benötigen aber einen kostenlosen API-Key bzw. Account und bleiben deshalb nachrangig:

- Smithsonian Open Access
- Europeana
- National Archives (NARA)

Sie sollen erst ergänzt werden, wenn die keylosen Quellen in realen Phase-1-Tests nicht genügend Coverage liefern.
