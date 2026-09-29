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
- aus diesen Assets die in `shot-plan.json` vorgesehenen Crops, Freeze-Frames und Subclips erzeugen,
- die tatsächlichen Voiceover-Timings auf die 17 Beats legen,
- harte Schnitte, subtile Push-ins, Callouts und kurze Quellenlabels umsetzen,
- anschließend das finale 1920×1080-Video rendern.

Antigravity darf **keine neue Story und keine beliebigen Ersatz-B-Rolls** suchen. Wenn ein festgelegtes Asset technisch nicht verfügbar ist, muss der Beat zurück in Phase 1.

## Bildwelt

- Vulkanblitze: echtes USGS-Chaitén-Foto + kurzer USGS-Erklärseiten-Crop.
- Biolumineszenz: zwei unterschiedliche NOAA-Ocean-Exploration-Videos (Dragonfish + Dana Octopus Squid), kein Ocean-Today-Subclip.
- Lenticularwolken: NASA/USGS-Landsat + NASA Operation IceBridge.
- Rote Sprites: ausschließlich NASA/ISS-Earth-Observatory-Stills; kein fremdes TLE-Chasers-Material.
- Leuchtende Nachtwolken: NASA AIM + NASA/ISS-Earth-Observatory-Material.

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
