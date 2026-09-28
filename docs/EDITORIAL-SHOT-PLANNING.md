# Editorial Shot Planning

## Ziel

Der Workflow soll dynamische faceless Story-Dokus/Listicles erzeugen, bei denen **echtes Material und die Aussage des Sprechertextes** den Schnitt bestimmen. Remotion ist Schnitt-/Motion-Schicht, nicht die Quelle der Geschichte.

## Reihenfolge

```text
research.json
  ↓
visual-plan.json
  ↓
beat:plan
  ↓
shot-plan.json
  ↓
Assets / Maps / Freeze-Frames / Artikel-Inserts vorbereiten
  ↓
Nutzer-Voiceover
  ↓
Timings
  ↓
project.json / render-manifest.json
  ↓
Remotion
```

## Regeln

1. **Phase-1-Intent gewinnt.** Der Beat Planner darf keine neue Geschichte erfinden.
2. **Originalmaterial vor Stock.** Exaktes Ereignis-/Originalmaterial, offizielle Archive und Dokumente haben Vorrang.
3. **Stock ist Fallback.** Generische B-Roll wird verworfen, wenn exaktes Material existiert.
4. **Rechte bleiben ein eigenes Gate.** Ein hoher CLIP- oder Research-Score ist keine Nutzungsfreigabe.
5. **Voiceover bleibt Master.** Die Timeline richtet sich nach der vom Nutzer gelieferten Audio.
6. **Kurze Visual-Beats.** Der Referenzstil kann über `reference:style` Shot-Längen/Cuts pro Minute liefern.

## Präsentationsmodi

- `auto` – normales Foto/Video, dokumentarische Bewegung
- `vertical-blur` – vertikaler Internet-/Handyclips mit unscharfem 16:9-Sidefill
- `contain` – Medien vollständig zeigen
- `article` – Screenshot einer News-/Webseite, Fokus auf oberen Artikelbereich
- `document` – Bericht/PDF/Screenshot mit langsamer Dokumentfahrt
- `map` – statische Doku-Karte mit Zoom/Callout
- `freeze-frame` – vorbereitetes Standbild/Preview statt weiterlaufendem Video
- `headline` – echtes Material bleibt Hintergrund, kurze starke Headline darüber

## Overlays

Der Renderer unterstützt:

- `label` – kurze Einordnung, z. B. `NOAA N-Prime · 2003`
- `headline` – kurze zentrale Aussage
- `number` – Impact-Zahl wie `135 MIO. $`
- `callout` – punktgenaue Markierung mit x/y-Position
- `source` – dezentes Quellenlabel

Keine Absatzkarten und keine langen Dashboard-Texte.

## Beat Planner

```bash
npm run beat:plan -- --plan projects/<id>/visual-plan.json
```

Mit Referenzstil:

```bash
npm run beat:plan -- \
  --plan projects/<id>/visual-plan.json \
  --style-profile .local-storage/reference-style/reference/style-profile.json
```

Der Output `shot-plan.json` enthält pro Beat:

- redaktionellen Visual-Typ
- Medienpriorität
- Ziel-Shotlänge
- Renderer-Modus
- Transition
- Overlays
- Preprocessing-Anweisungen
- Qualitäts-Gate

## Maps

```bash
npm run map:render -- \
  --center "2.35,48.86" \
  --zoom 5 \
  --marker "2.35,48.86,Paris" \
  --title "Frankreich" \
  --to-inbox true
```

MapLibre + OpenFreeMap; OpenStreetMap-Attribution bleibt erforderlich.

## Freeze Frames

```bash
npm run frame:extract -- --asset VAH-XXXXXXXX --at 12.4
```

Der Frame übernimmt die Rechte-/Quelleninformationen des Parent-Assets, bleibt aber erneut `review`.

## Projekt-Szene

```bash
npm run video:project -- add \
  --project <id> \
  --asset VAH-XXXXXXXX \
  --duration 5 \
  --presentation map \
  --transition cut \
  --label "Frankreich · 2014" \
  --number-text "≈ 50 MIO. €" \
  --callout "Bahnsteigkante" \
  --callout-x 63 \
  --callout-y 44 \
  --source-label "Assemblée nationale"
```

## Ziel

Ein fertiges Video soll wie eine redaktionell geschnittene Doku wirken:

- echte Clips/Bilder dominieren
- Dokumente/Headlines nur als kurze Beweise
- Karten nur wenn räumliche Erklärung nötig ist
- Freeze/Callout nur für entscheidende Details
- harte Cuts und kurze Inserts statt langer Präsentationsfolien
