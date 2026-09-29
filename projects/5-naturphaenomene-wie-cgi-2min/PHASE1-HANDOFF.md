# Phase 1 Handoff — 5 Naturphänomene, die wie CGI aussehen – aber echt sind

## Status

Recherche, Skript und redaktionelle Bildwelt sind vorbereitet. **Phase 1 ist nach Workflow v3 noch nicht abgeschlossen**, bis alle Produktionsmedien lokal materialisiert, qualitativ geprüft, rechtegeprüft, in den Katalog aufgenommen und an die geplanten Shots gebunden wurden.

## Phase 1 v3 — noch auszuführen

```bash
npm run beat:plan -- --plan projects/5-naturphaenomene-wie-cgi-2min/visual-plan.json
npm run phase1:materialize -- --project 5-naturphaenomene-wie-cgi-2min --download-top 1
npm run phase1:quality -- --project 5-naturphaenomene-wie-cgi-2min
npm run visual:qc -- --project 5-naturphaenomene-wie-cgi-2min
# Download-Inbox prüfen/importieren und Rechte bestätigen
npm run phase1:bind -- auto --project 5-naturphaenomene-wie-cgi-2min
npm run youtube:workflow -- phase1-check --project 5-naturphaenomene-wie-cgi-2min
```

Erst wenn `phase1-check` erfolgreich ist, darf Phase 2 beginnen.

## Phase 2 — Nutzer

1. `voiceover-script.txt` als Grundlage verwenden.
2. Finale Voiceover als WAV, MP3, M4A, AAC oder FLAC erzeugen.
3. Datei mit `youtube:workflow voiceover-attach` übernehmen.

## Phase 3 — Antigravity

Die Nutzer-Voiceover ist die Master-Timeline. Vor dem Rendern:

```bash
npm run voiceover:align -- --project 5-naturphaenomene-wie-cgi-2min --model <whisper-model>
npm run phase3:prepare -- --project 5-naturphaenomene-wie-cgi-2min
```

`phase3:prepare` erzeugt `phase3-handoff.json` und `render-manifest.json`.

### Harte v3-Regel

**Phase 3 hat keinen Netzwerkzugriff auf Medien.** Antigravity darf nur:

- lokal materialisierte und freigegebene Phase-1-Assets verwenden,
- daraus Crops, Standbilder und Subclips erzeugen,
- die tatsächlichen Voiceover-Timings auf die Visual-Beats legen,
- innerhalb eines Beats mehrere kurze Shots schneiden,
- harte Schnitte, Trims, Reframing und subtile geplante Push-ins/Pans umsetzen,
- vertikale Clips bei Bedarf mit Sidefill darstellen,
- anschließend das finale 1920×1080-Video rendern.

Wenn ein Asset fehlt oder ungeeignet ist, geht der betroffene Shot zurück in Phase 1. Phase 3 darf **keine Ersatz-B-Roll suchen**.

## Remotion-Regel: Assembly only

Remotion ist kein Erklärgrafik-Generator. Standardmäßig verboten:

- mittige Titel-/Infokarten während des Videos,
- automatisch erzeugte Pfeile, Kreise, Marker oder Callouts,
- Elektronen-, Partikel-, Strom-, Wind- oder andere erfundene Erkläranimationen,
- große Zahlen-Overlays nur weil im Sprechertext eine Zahl vorkommt,
- künstliche Diagramme, wenn eine echte Quelle/Abbildung vorhanden ist,
- generische Icon-/Dashboard-Szenen zwischen echten Aufnahmen.

Wenn ein Sachverhalt visuell erklärt werden muss, muss Phase 1 ein echtes Foto, Video, Dokument oder offizielles Diagramm bereitstellen.

## Bildwelt

- Vulkanblitze: echtes USGS-Chaitén-Foto + echter USGS-Erklärseiten-Crop.
- Biolumineszenz: NOAA Ocean Exploration Dragonfish + Dana Octopus Squid.
- Lenticularwolken: NASA/USGS Landsat + NASA Operation IceBridge.
- Rote Sprites: NASA/ISS Earth Observatory Stills.
- Leuchtende Nachtwolken: NASA AIM + NASA/ISS Material.

## Rechte-Regeln

- Credits aus `assets.json` übernehmen.
- NOAA Ocean Today `Bioluminescent Ocean` bleibt als excerpted B-roll gesperrt.
- Chasing-Sprites/TLE-Chasers-Material im NASA-SVS-Paket bleibt gesperrt.
- Keine Logos so inszenieren, dass eine Partnerschaft mit NASA, NOAA oder USGS suggeriert wird.

## Dateien

- `project.json` — Projektvertrag und Status
- `research.json` — Fakten und Primärquellen
- `voiceover-script.txt` — finales Skript
- `visual-plan.json` — redaktionelle Bildwelt
- `shot-plan.json` — v3 Multi-Shot-Plan
- `assets.json` — geprüfte Quellenliste
- `materialization.json` — lokale Phase-1-Downloads
- `phase1-quality.json` — technische/Bildqualitäts-Signale
- `visual-qc.json` — kombinierte Relevanz-/Qualitäts-/Rechte-QC
- `beat-bindings.json` — gebundene Produktionsassets
- `timings.json` — echte Voiceover-Beats
- `phase3-handoff.json` — lokale Antigravity-Timeline
- `render-manifest.json` — Renderer-Manifest
