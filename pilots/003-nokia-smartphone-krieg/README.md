# Video 003 — Wie Nokia den Smartphone-Krieg verlor

**Titel:** Wie Nokia den Smartphone-Krieg verlor  
**Cover-Text:** `SO VERLOR NOKIA`  
**Ziel:** ca. 2 Minuten  
**Format:** 16:9  
**Profil:** `profiles/company-documentary.json` (`company-documentary-v3`)

## Story

Das Video zeigt, wie Nokia trotz enormer Marktstärke den Übergang vom hardwaregetriebenen Handygeschäft zum software- und plattformgetriebenen Smartphone-Markt verlor. Der Kern ist nicht „Nokia baute plötzlich schlechte Handys“, sondern der Wechsel der Wettbewerbsregeln: Betriebssystem, Apps, Entwickler, Touch-UX und Ökosystem wurden entscheidend.

# Neue Bildsprache

Die erste Flow-Version war zu menschenlastig und zu ähnlich: Meetings, Entwickler, Büros und Gruppen von Business-Personen erzeugten optisch immer wieder fast dieselbe Szene.

Für dieses Video gilt jetzt:

- **Illustration first**
- **so wenig Menschen wie möglich**
- Standard für KI-Bilder: **0 Personen**
- Menschen nur, wenn sie inhaltlich wirklich nötig sind
- kurze Labels / Pfeile / Jahreszahlen sind erlaubt, wenn sie etwas erklären
- keine Textwände
- exakte Kennzahlen bleiben verifizierte Overlays im Schnitt
- direkt aufeinanderfolgende KI-Bilder müssen unterschiedliche Visual Forms nutzen

Die 10 Flow-Bilder wechseln bewusst zwischen:

1. Marktkarte
2. Split-Explainer
3. Ecosystem-Diagramm
4. Crossroads-Illustration
5. Timeline / Prozessvisual
6. Produkt + Ecosystem-Ringe
7. symbolische Plattform-Insel
8. Asset-Transfer-Infografik
9. Transformation Handys → Netzinfrastruktur
10. Prozess-Race-Metapher

Damit soll das Video wie eine abwechslungsreiche redaktionelle Wirtschafts-/Tech-Doku aussehen und nicht wie eine Sammlung ähnlicher Corporate-KI-Fotos.

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
→ 3 illustration-first Cover-Designs
→ Nutzer wählt
→ benötigte KI-Bilder in 5er-Blöcken
→ QC: keine generischen Business-Menschen / keine Wiederholungen

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

`REGENERATE_FLOW_IMAGES_WITH_ILLUSTRATION_FIRST_V3`

Die bereits erzeugten menschenlastigen Flow-Bilder gelten nicht als final akzeptiert. Der neue `google-flow-agent-prompt.txt` soll für eine neue Generation verwendet werden.

Finaler Render bleibt blockiert, bis alle `source-needed`-Slots tatsächlich mit Bild/B-Roll belegt sind und die neue Flow-Generation akzeptiert ist.
