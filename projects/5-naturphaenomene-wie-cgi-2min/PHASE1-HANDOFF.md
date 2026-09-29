# Phase 1 Handoff — 5 Naturphänomene, die wie CGI aussehen – aber echt sind

## Status

Phase 1 ist abgeschlossen. Ab hier wird **keine Voiceover erzeugt und kein Video gerendert**, bis die Nutzer-Voiceover vorliegt.

## Phase 2 — Nutzer

1. `voiceover-script.txt` exakt als Grundlage verwenden.
2. Finale Voiceover als WAV, MP3, M4A, AAC oder FLAC erzeugen.
3. Keine Bild-/Schnittarbeit nötig; die Bildwelt ist bereits in `visual-plan.json`, `shot-plan.json` und `assets.json` festgelegt.

## Phase 3 — Antigravity

Die Nutzer-Voiceover ist die Master-Timeline. Antigravity darf:

- die in `assets.json` festgelegten URLs/Dateien laden,
- aus diesen realen Assets Crops, Standbilder und Subclips erzeugen,
- die tatsächlichen Voiceover-Timings auf die 17 Beats legen,
- harte Schnitte, Trims, Reframing und sehr subtile Push-ins/Pans umsetzen,
- vertikale Clips bei Bedarf sauber mit Sidefill darstellen,
- anschließend das finale 1920×1080-Video rendern.

### Remotion-Regel: Assembly only

Remotion ist **kein Erklärgrafik-Generator**. Es darf das echte Material nur schneiden und dezent bewegen.

Standardmäßig verboten:

- mittige Titel-/Infokarten während des Videos,
- automatisch erzeugte Pfeile, Kreise, Marker oder Callouts,
- Elektronen-, Partikel-, Strom-, Wind- oder andere erfundene Erkläranimationen,
- große Zahlen-Overlays nur weil im Sprechertext eine Zahl vorkommt,
- künstliche Diagramme, wenn eine echte Quelle/Abbildung vorhanden ist,
- generische Icon-/Dashboard-Szenen zwischen echten Aufnahmen.

Wenn ein Sachverhalt visuell erklärt werden muss, muss Phase 1 dafür **ein echtes Foto, Video, Dokument oder offizielles Diagramm** bereitstellen. Die Voiceover darf Dinge erklären, ohne dass Remotion sie künstlich nachzeichnet.

Antigravity darf **keine neue Story und keine beliebigen Ersatz-B-Rolls** suchen. Wenn ein festgelegtes Asset technisch nicht verfügbar ist, muss der Beat zurück in Phase 1.

## Bildwelt

- Vulkanblitze: echtes USGS-Chaitén-Foto + kurzer echter USGS-Erklärseiten-Crop; keine Elektronen-/Asche-Partikelanimation.
- Biolumineszenz: zwei unterschiedliche NOAA-Ocean-Exploration-Videos (Dragonfish + Dana Octopus Squid); Intro-/Logo-Slates werden übersprungen.
- Lenticularwolken: NASA/USGS-Landsat + NASA Operation IceBridge; keine Windpfeile.
- Rote Sprites: ausschließlich NASA/ISS-Earth-Observatory-Stills; keine Marker/Callouts und kein fremdes TLE-Chasers-Material.
- Leuchtende Nachtwolken: NASA AIM + NASA/ISS-Earth-Observatory-Material; Höhenangaben bleiben in der Voiceover statt als große Zahl im Bild.

## Rechte-Regeln

- Credits aus `assets.json` übernehmen.
- NOAA Ocean Today `Bioluminescent Ocean` ist für dieses Projekt als B-Roll **gesperrt**, weil Ocean Today die Nutzung seiner Videos grundsätzlich in vollständiger Form verlangt und Bearbeitung/Transformation ausschließt.
- Chasing-Sprites/TLE-Chasers-Material im NASA-SVS-Paket ist **gesperrt**, weil es dort als fremdes urheberrechtlich geschütztes Material ausgewiesen wird.
- Keine Logos so inszenieren, dass eine Empfehlung/Partnerschaft mit NASA, NOAA oder USGS suggeriert wird.

## Dateien

- `project.json` — Projektvertrag und Status
- `research.json` — Fakten, Primärquellen und Rechtehinweise
- `voiceover-script.txt` — finales deutsches Skript
- `visual-plan.json` — redaktionelle Bildwelt
- `shot-plan.json` — konkrete Schnitt-/Animationsanweisungen
- `assets.json` — gesperrte Quellenliste und konkrete Medienübergabe
- `phase1-status.json` — maschinenlesbarer Phase-1-Abschluss
