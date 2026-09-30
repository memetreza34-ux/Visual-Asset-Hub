# Source Coverage — v0.19

Ziel: möglichst viel **echtes, relevantes und rechtlich nachvollziehbares Material** finden, ohne die Produktionspipeline mit fragilen Website-Scrapern zu belasten.

## 1. Automatische Provider

Diese Quellen besitzen einen eigenen Adapter und können von `documentary:research` sowie `phase1:materialize` automatisch durchsucht werden.

| Provider | Typ | Key | Rolle | Rechte-Strategie |
|---|---|---|---|---|
| NASA Image & Video Library | Bild + Video | nein | official-archive | konkretes Asset vor Publish prüfen |
| NASA Scientific Visualization Studio | Bild + Video | nein | official-archive | grundsätzlich Public Domain, konkrete Seite auf Drittmaterial/Musik prüfen |
| NOAA | Bild + Video | nein | official-archive | konservativer Rights-Review |
| USGS | Bild + Video | nein | official-archive | Public-Domain-Hinweise erkennen, konkrete Seite prüfen |
| National Park Service | Bild + Video | kostenloser `NPS_API_KEY` | official-archive | NPS-Rechtefelder auswerten, Drittmaterial blockieren/reviewen |
| DVIDS | Bild + Video | kostenloser `DVIDS_API_KEY` | official-archive | Regierungsmedien reviewen; Dritt-IP, Privacy, Marken und Non-Endorsement beachten |
| NARA | Bild + Video | kostenloser `NARA_API_KEY` | official-archive | Rechte pro Record prüfen |
| Smithsonian Open Access | Bild | kostenloser Key | official-archive | nur passende Open-Access-Medien verwenden |
| Library of Congress | Bild + Video | nein | official-archive | Rechte variieren je Sammlung |
| The Met Open Access | Bild | nein | official-archive | Adapter liefert nur `isPublicDomain=true` mit Primärbild |
| Europeana | Bild + Video | kostenloser Key | archive | NC/ND bleiben blockiert/review |
| Wikimedia Commons | Bild + Video | nein | archive | Lizenz pro Datei |
| Internet Archive | Bild + Video | nein | archive | Rechte pro Item |
| Openverse | Bild | nein | open-media | konkrete CC-Lizenz normalisieren |
| Pexels | Bild + Video | Key | stock-fallback | nur Fallback |
| Pixabay | Bild + Video | Key | stock-fallback | nur Fallback |

**Priorität:** eigene approved Bibliothek → exaktes Ereignismaterial → official-archive → archive → open-media → stock-fallback.

## 2. Generischer IIIF-Resolver

Viele Museen, Bibliotheken und Archive liefern Bilder über IIIF. Dafür gibt es keinen einzelnen Rechte-Standard, aber einen gemeinsamen technischen Bildstandard.

```bash
npm run iiif:resolve -- --url <manifest-oder-info.json>
```

Der Resolver kann hochauflösende IIIF-Image-Services und direkte Bilder extrahieren. Er setzt die Rechte absichtlich auf `unknown/review`, denn **IIIF ist eine Auslieferungstechnik und keine Lizenz**.

Besonders nützlich für:
- Rijksmuseum
- Wellcome Collection
- Art Institute of Chicago
- viele Bibliotheken, Universitäten und Museumsarchive

## 3. Spezialportale — gezielte Phase-1-Recherche

Diese Quellen sind sehr wertvoll, werden aber derzeit nicht als vollautomatische Suchprovider behandelt, wenn keine ausreichend stabile offizielle Such-/Download-API für unseren Zweck vorliegt.

### NOAA Ocean Exploration Video Portal
Sehr stark für Tiefsee, Tiere, ROVs, Wracks und Expeditionen. Portalvideos können hochwertige Downloads bis hin zu ProRes anbieten. In Phase 1 als **exakte Quelle** auswählen und lokal materialisieren. Keine generischen Web-Scraper.

### Copernicus Data Space
Für Sentinel-Satellitendaten, Waldbrände, Überschwemmungen, Vulkane, Küsten, Städte und Vorher/Nachher-Szenen. Das ist kein normaler B-Roll-Katalog. Dafür ist später ein eigener **satellite-data adapter** sinnvoll, der Ort + Zeitraum + Sentinel-Produkt verarbeitet.

### ESO
Starke Astronomie-Bilder und -Videos. Portal gezielt nutzen; konkrete Lizenz/Attribution am Asset übernehmen. Ein eigener Adapter wird erst gebaut, wenn wir eine stabile offizielle maschinenlesbare Suchschnittstelle für unseren Bedarf festlegen.

### USDA ARS Image Gallery
Nützlich für Landwirtschaft, Pflanzen, Tiere, Lebensmittel und Forschung. Bis zu einem stabilen API-Vertrag als gezielte Quelle/Exact-Source behandeln.

### National Gallery of Art / Rijksmuseum / Wellcome / Art Institute Chicago
Für Geschichte, Porträts, Objekte, Kunst und historische Bildwelten. Wo IIIF vorhanden ist, zuerst `iiif:resolve` verwenden. Danach Rechte des konkreten Objekts prüfen.

### Flickr Commons / GBIF / Biodiversity Heritage Library
Sehr große Spezialarchive, aber Rechte unterscheiden sich stark je Objekt. Deshalb **Research/Review**, niemals automatische Publish-Freigabe aus dem Plattformnamen ableiten.

### Mixkit / Coverr
Moderne B-Roll als zusätzlicher Stock-Fallback. Noch nicht als automatischer Provider eingebaut, weil Stock nachrangig bleibt und Lizenzvarianten/Website-Verträge sauber normalisiert werden müssen. Pexels/Pixabay decken den automatischen Standard-Fallback bereits ab.

## 4. Was Phase 1 niemals automatisch annimmt

- "gefunden" bedeutet nicht "nutzbar"
- "Public Domain Plattform" bedeutet nicht, dass jedes eingebettete Drittmedium Public Domain ist
- ein Screenshot einer Lizenzseite erzeugt kein Nutzungsrecht
- IIIF, YouTube, TikTok, Instagram oder ein direkter Download-Link sind keine Lizenz
- Ereignisidentität ist getrennt von Copyright: ein lizenzierbares Bild kann trotzdem das falsche Ereignis zeigen

## 5. Ausbau-Regel

Neue Quellen werden nur als automatischer Provider aufgenommen, wenn mindestens diese Punkte stabil lösbar sind:

1. offizielle oder ausreichend stabile maschinenlesbare Suche,
2. Original-/Download-URL zuverlässig bestimmbar,
3. Quellen-URL bleibt erhalten,
4. Rights-Metadaten können konservativ normalisiert werden,
5. fehlender Key/Fehler blockiert nicht die restliche Pipeline,
6. Mock-Verhaltenstest vorhanden.

So wächst die Quellenabdeckung, ohne die Produktionspipeline unnötig fragil zu machen.
