# Video 003 — Wie Nokia den Smartphone-Krieg verlor

**Titel:** Wie Nokia den Smartphone-Krieg verlor  
**Cover-Text:** `SO VERLOR NOKIA`  
**Ziel:** ca. 2 Minuten  
**Format:** 16:9  
**Profil:** `profiles/company-documentary.json` (`company-documentary-v4`)

## Story

Das Video zeigt, wie Nokia trotz enormer Marktstärke den Übergang vom hardwaregetriebenen Handygeschäft zum software- und plattformgetriebenen Smartphone-Markt verlor. Der Kern ist nicht „Nokia baute plötzlich schlechte Handys“, sondern der Wechsel der Wettbewerbsregeln: Betriebssystem, Apps, Entwickler, Touch-UX und Ökosystem wurden entscheidend.

# Bildsprache V4 — realistische Editorial-Doku

Die ersten beiden Flow-Ansätze waren jeweils zu extrem:

1. zu viele generische Business-Menschen / Meetings
2. danach zu viele Infografik-, Timeline- und PowerPoint-artige Illustrationen

V4 setzt den Mittelweg als festen Standard:

- ca. **70 % realistisch / photorealistisch / hochwertige 3D-Editorial-Szene**
- ca. **20 % realistische Szene mit dezenten grafischen Hilfen**
- höchstens ca. **10 % reine Grafik**, nur wenn die Idee anders nicht sinnvoll erklärbar ist
- so wenig Menschen wie möglich
- Grafiken sind Unterstützung, nicht das gesamte Bild
- Text nur kurz und gezielt
- keine weißen Infografikposter, Icon-Wolken oder vollgeschriebenen Timelines

## Neue Flow-Bildtypen

Die 10 KI-Slots sind jetzt echte Szenen statt Diagrammfolien:

1. realistisches Retail-Regal mit alten und neuen Gerätetypen
2. echte Engineering-Werkbank mit Hardware-Teardown + dezenter Pfeil
3. leeres frühes Smartphone-Entwicklerlabor
4. physischer Strategie-/Prototypentisch
5. reale Prototypenfolge auf Werkbank + zwei kleine Labels
6. hochwertiges Produkt-/Ecosystem-Stillleben
7. realistischer Showroom als Plattform-Metapher
8. realistisches Archiv / Asset-Transfer mit höchstens einem Pfeil
9. alte Handys im Vordergrund → Netzinfrastruktur im Hintergrund
10. realistischer Laborkontrast Hardwareprozess vs. schnelle Softwareiteration

Menschen werden nur eingesetzt, wenn die Aussage sie wirklich braucht. Für diese zehn KI-Bilder ist standardmäßig **0 Personen** vorgesehen.

## Visuelle Final-Regel

Final sichtbar sind ausschließlich:

- echte Bilder
- echte B-Roll / Videos
- akzeptierte KI-Bilder

Keine Slotkarten, keine `SOURCE NEEDED`-Frames, keine Debugbilder und keine technischen Vollbildkarten. Fehlt ein echtes Marken-/Produktasset, blockiert der Render.

Exakte Kennzahlen wie `52 %` oder `5,44 Mrd. €` werden nur als kurze, verifizierte Overlays auf einem gültigen Primärvisual gezeigt.

## Produktionsstruktur

```text
00-bildprompts/google-flow-agent-prompt.txt
→ 3 realistische Cover-Designs
→ Nutzer wählt
→ benötigte KI-Bilder in 5er-Blöcken
→ QC: kein PowerPoint-Look / keine Business-Meeting-Serie

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

`REGENERATE_FLOW_IMAGES_WITH_REALISTIC_EDITORIAL_V4`

Die bereits erzeugten Business-Menschen- und Infografik-Versionen gelten nicht als final akzeptiert. Der aktuelle `google-flow-agent-prompt.txt` soll für eine neue Generation verwendet werden.

Finaler Render bleibt blockiert, bis alle `source-needed`-Slots tatsächlich mit Bild/B-Roll belegt sind und die V4-Flow-Generation akzeptiert ist.
