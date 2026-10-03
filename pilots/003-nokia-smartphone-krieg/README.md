# Video 003 — Wie Nokia den Smartphone-Krieg verlor

**Titel:** Wie Nokia den Smartphone-Krieg verlor  
**Cover-Text:** `SO VERLOR NOKIA`  
**Ziel:** ca. 2 Minuten  
**Format:** 16:9  
**Profil:** `profiles/company-documentary.json`

## Story

Das Video zeigt, wie Nokia trotz enormer Marktstärke den Übergang vom hardwaregetriebenen Handygeschäft zum software- und plattformgetriebenen Smartphone-Markt verlor. Der Kern ist nicht "Nokia baute plötzlich schlechte Handys", sondern der Wechsel der Wettbewerbsregeln: Betriebssystem, Apps, Entwickler, Touch-UX und Ökosystem wurden entscheidend.

## Visuelle Regel

Final sichtbar sind ausschließlich:

- echte Bilder
- echte B-Roll / Videos
- akzeptierte KI-Bilder

Keine Slotkarten, keine `SOURCE NEEDED`-Frames, keine Debugbilder und keine technischen Vollbildkarten. Fehlt ein echtes Marken-/Produktasset, blockiert der Render.

Exakte Kennzahlen wie `52 %` oder `5,44 Mrd. €` werden nur als kurze, verifizierte Overlays auf einem gültigen Primärvisual gezeigt.

## Produktionsstruktur

```text
00-bildprompts/google-flow-agent-prompt.txt
→ 3 Cover-Designs
→ Nutzer wählt
→ benötigte KI-Bilder in 5er-Blöcken

01-script/voice-script.txt
02-audio/
03-bilder/ki/
03-bilder/real-broll/
04-export/
99-tech/
```

## Visual-Mix

- Bild 01: gewähltes Flow-Cover
- 10 Flow-Erklärbilder: 03, 06, 09, 12, 15, 18, 21, 24, 27, 29
- 19 echte/Quellenvisuals: alle übrigen Slots 02–30

## Status

`READY_FOR_FLOW_COVER_AND_REAL_MEDIA_RESOLUTION`

Finaler Render bleibt blockiert, bis alle `source-needed`-Slots tatsächlich mit Bild/B-Roll belegt sind.