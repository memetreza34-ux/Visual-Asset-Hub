# Official Media Sources – v0.16

## Ziel

Phase 1 soll zuerst echtes, ereignisspezifisches Material aus offiziellen oder archivierten Quellen finden. Generischer Stock bleibt Fallback.

## Standardreihenfolge

### Keylos immer aktiv

1. NASA Image & Video Library
2. NOAA
3. U.S. Geological Survey (USGS)
4. Library of Congress
5. Wikimedia Commons
6. Internet Archive
7. Openverse (Bilder)

### Optional mit kostenlosen API-Keys

Die folgenden Provider werden automatisch dazwischen genutzt, sobald der jeweilige Key in `.env` vorhanden ist:

- NARA / National Archives Catalog — Bild + Video
- Smithsonian Open Access — Bilder
- Europeana — Bild + Video

Stock bleibt ganz hinten:

- Pexels / Pixabay nur mit `--include-stock true`

## Effektive Phase-1-Reihenfolge

```text
NASA → NOAA → USGS
     → NARA (wenn NARA_API_KEY gesetzt)
     → Smithsonian (bei Bildern, wenn SMITHSONIAN_API_KEY gesetzt)
     → Library of Congress
     → Europeana (wenn EUROPEANA_API_KEY gesetzt)
     → Wikimedia → Internet Archive → Openverse
     → Pexels/Pixabay nur optional als Stock-Fallback
```

## NOAA

Provider: `noaa`

- kein API-Key
- Bild + Video Discovery auf offiziellen NOAA-Seiten
- gefundene direkte Mediendateien können in die Inbox geladen werden
- Rechte bleiben standardmäßig `unknown/review`
- NOAA-Seiten können Drittmaterial, Logos oder abweichende Rechtehinweise enthalten

## USGS

Provider: `usgs`

- kein API-Key
- nutzt die offizielle USGS Multimedia Gallery
- Bild + Video
- erkennt `Public Domain` auf konkreten Medienseiten
- selbst erkannte Public-Domain-Treffer bleiben zunächst im Review

## Smithsonian Open Access

Provider: `smithsonian`

- benötigt `SMITHSONIAN_API_KEY`
- kostenloser API-Key über `api.data.gov`
- in Visual Asset Hub aktuell als Bildquelle integriert
- CC0-Medien werden auf Medienebene erkannt
- Schlüssel wird nur für die API-Anfrage verwendet und nie in gespeicherten Source-URLs abgelegt
- selbst CC0-Treffer bleiben zunächst im Review für Logos, Marken und Drittinhalte

Beispiel:

```bash
npm run source:search -- "Apollo spacesuit" --provider smithsonian --type image
```

## Europeana

Provider: `europeana`

- benötigt `EUROPEANA_API_KEY`
- kostenloser persönlicher API-Key über einen kostenlosen Europeana-Account
- Bild + Video
- aggregiert Inhalte europäischer Museen, Bibliotheken und Archive
- Rechte-URI pro Treffer wird ausgewertet
- API-Key (`wskey`) wird aus allen gespeicherten Source-URLs entfernt
- Original-Datenprovider und Lizenz bleiben vor Veröffentlichung Review-Punkte

Beispiel:

```bash
npm run source:search -- "Berlin 1945" --provider europeana --type image
```

## NARA / National Archives Catalog

Provider: `nara`

- benötigt `NARA_API_KEY`
- kostenloser Read-only-Key beim National Archives Catalog
- aktueller API-v2-Endpunkt
- Bild + Video über digitale Objekte im Katalog
- direkte Objektdateien können in die Inbox geladen werden
- NARA-Bestände sind häufig gemeinfrei, können aber gespendete/geschützte Ausnahmen enthalten
- deshalb bleiben Treffer im Rights-Review, sofern kein konkreter Public-Domain-Hinweis erkannt wird

Beispiel:

```bash
npm run source:search -- "Apollo 11" --provider nara --type image
```

## `.env`

```text
SMITHSONIAN_API_KEY=
EUROPEANA_API_KEY=
NARA_API_KEY=
```

Ohne diese Werte werden die drei Provider automatisch übersprungen. Es gibt keine Pflicht, einen Key zu hinterlegen, und die keylosen Quellen funktionieren unverändert weiter.

## Phase-1 Materializer

```bash
npm run phase1:materialize -- --project <id> --download-top 1
```

Der Materializer prüft bei jedem Provider `requiresKey`. Fehlende optionale Keys erzeugen nur einen Hinweis im Materialisierungsreport und blockieren das Projekt nicht.

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
