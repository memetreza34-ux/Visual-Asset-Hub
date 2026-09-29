# Editorial Shot Planning — Workflow v3

## Ziel

Dynamische faceless Story-Dokus/Listicles, bei denen **echtes Material und die Aussage des Sprechertexts** den Schnitt bestimmen. Remotion/Antigravity ist Assembly-/Motion-Schicht, nicht die Quelle der Geschichte.

## Reihenfolge

```text
research.json
  ↓
voiceover-script.txt + visual-plan.json
  ↓
beat:plan
  ↓
shot-plan.json (1 Beat → 1..n Shots)
  ↓
phase1:materialize
  ↓
phase1:quality
  ↓
visual:qc
  ↓
Rechte/Katalog + beat-bindings.json
  ↓
STRICT PHASE-1 LOCK
  ↓
Nutzer-Voiceover
  ↓
voiceover:align
  ↓
timings.json
  ↓
phase3:prepare
  ↓
phase3-handoff.json + render-manifest.json
  ↓
lokale Assembly / Render
```

## Kernregeln

1. **Phase-1-Intent gewinnt.** Der Planner darf keine neue Geschichte erfinden.
2. **Mehrere Shots pro Beat sind erlaubt.** Ein längerer Sprecher-Beat kann mehrere kurze reale Bilder/Clips/Crops enthalten.
3. **Originalmaterial vor Stock.** Exaktes Ereignis-/Originalmaterial, offizielle Archive und Dokumente haben Vorrang.
4. **Stock ist Fallback.** Generische B-Roll wird verworfen, wenn exaktes Material existiert.
5. **Rechte sind ein eigenes Gate.** Research-, CLIP- oder Quality-Score ist keine Nutzungsfreigabe.
6. **Voiceover bleibt Master.** Die Timeline richtet sich nach der Nutzer-Audio.
7. **Phase 3 ist offline.** Keine Runtime-Suche und kein Medien-Nachladen.
8. **Keine synthetischen Erklärgrafiken als Standard.** Wenn eine Erklärung ein Visual braucht, muss Phase 1 reales Material oder eine offizielle Abbildung liefern.

## Multi-Shot pro Sprecher-Beat

Explizit:

```json
{
  "id": "b03",
  "narrationAnchor": "...",
  "shots": [
    {
      "visualType": "official-archive-video",
      "visual": "wide eruption shot",
      "sourceUrl": "https://...",
      "directMediaUrl": "https://.../clip.mp4"
    },
    {
      "visualType": "detail-crop",
      "visual": "tight crop of ash plume",
      "focus": { "x": 70, "y": 35 }
    }
  ]
}
```

Alternativ kann `shotCount` gesetzt werden. Ohne explizite Vorgabe erzeugt der Planner bei Montagen, Vergleichen und längeren Visual-Intents mehrere Varianten.

Jeder Output-Shot besitzt:

- eigene `id`
- `beatId`
- `shotIndex`
- `shotCount`
- `visualIntent`
- Quellen-/Rechtehinweis
- Renderer-Präsentation
- geplante Bewegung/Focal Point
- Qualitäts-Gate

## Präsentationsmodi

- `auto` — normales Foto/Video
- `vertical-blur` — vertikaler Clip mit 16:9-Sidefill
- `contain` — Medium vollständig zeigen
- `article` — echter Webseiten-/Artikel-Crop
- `document` — echter Bericht/PDF/Screenshot
- `map` — vorbereitete echte/statische Karte
- `freeze-frame` — Standbild aus freigegebenem Parent-Asset
- `headline` — nur explizit redaktionell freigegeben; kein Default

## Overlays

Overlays sind **nicht automatisch**. Der Planner übernimmt höchstens explizite `source`, `label` oder `number`-Angaben aus Phase 1. Generische Callouts, Pfeile, Kreise, Kapitelkarten oder mittige Infokarten werden nicht erfunden.

## Focal Point + Motion

Phase 1 kann den Bildfokus definieren:

```json
{
  "focus": { "x": 78, "y": 31 },
  "motion": "subtle push toward sprite"
}
```

Im Render-Manifest wird daraus eine deterministische Motion-Spezifikation. Unterstützt werden unter anderem:

- `static`
- `push`
- `pull`
- `pan-left`
- `pan-right`
- `pan-up`
- `pan-down`

Der Renderer verwendet **keine zufällige Bewegungsrichtung** mehr.

## Lokale Materialisierung

```bash
npm run phase1:materialize -- --project <id> --download-top 1
npm run phase1:quality -- --project <id>
npm run visual:qc -- --project <id>
```

Bekannte `directMediaUrl`-Dateien werden in Phase 1 lokal heruntergeladen. Danach folgen Rechte-/Katalogprüfung und Binding.

```bash
npm run phase1:bind -- auto --project <id>
npm run youtube:workflow -- phase1-check --project <id>
```

## Phase 3

```bash
npm run voiceover:align -- --project <id> --model ./models/ggml-small.bin
npm run phase3:prepare -- --project <id>
```

`phase3:prepare` verteilt mehrere Shots deterministisch innerhalb des echten Beat-Timings. Ist ein Beat zu kurz für die geplante Shot-Anzahl, wird geblockt statt eine fehlerhafte Timeline zu erzeugen.

Der Handoff setzt zwingend:

```json
{
  "networkAllowed": false,
  "phase1AssetsOnly": true,
  "randomReplacementBroll": false,
  "syntheticExplainerGraphics": false
}
```

## Maps und Freeze Frames

Maps und Freeze Frames werden **vor** dem finalen Render als konkrete Assets vorbereitet und durchlaufen erneut Review. Sie sind keine frei erfundenen Phase-3-Visuals.

## Zielbild

Ein fertiges Video soll wie eine redaktionell geschnittene Doku wirken:

- echte Clips/Bilder dominieren
- mehrere kurze Shots pro Sprecherabschnitt sind möglich
- Dokumente/Artikel nur als kurze Belege
- Karten nur wenn räumliche Erklärung nötig ist
- harte Cuts und gezielte Reframes statt Präsentationsfolien
- keine synthetischen Lückenfüller
