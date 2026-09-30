# Video Projects

`projects/` verbindet Story-Recherche, lokal freigegebene Visuals, Nutzer-Voiceover und die Assembly-/Render-Schicht.

## Workflow v3 für faceless Dokus

### Phase 1 — Recherche + Skript + reale Produktionsassets

Visuals werden **vor** dem Voiceover festgelegt und lokal vorbereitet:

1. Thema/Fall recherchieren
2. Faktenquellen sichern
3. finales Skript + Visual-Beats festlegen
4. `beat:plan` erzeugt einen Multi-Shot-Plan
5. konkrete Original-/Archivmedien lokal materialisieren
6. `phase1:quality` ausführen
7. `visual:qc` ausführen
8. Rechte prüfen / Katalog importieren
9. jeden Shot an ein approved lokales Asset binden
10. strikten `phase1-check` bestehen

```bash
npm run beat:plan -- --plan projects/<id>/visual-plan.json
npm run phase1:materialize -- --project <id> --download-top 1
npm run phase1:quality -- --project <id>
npm run visual:qc -- --project <id>
npm run inbox:scan
npm run inbox:review
npm run phase1:bind -- auto --project <id>
npm run youtube:workflow -- phase1-check --project <id>
```

Ein Sprecher-Beat kann mehrere kurze Visual-Shots besitzen. `shot-plan.json` verknüpft jeden Shot mit `beatId`.

### Phase 2 — Nutzer-Voiceover

Erst nach bestandenem Phase-1-Gate:

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Nur die vom Nutzer gelieferte Audiodatei ist Master-Audio. Die Pipeline erzeugt oder ersetzt keine Stimme.

### Phase 3 — Timing + Assembly

```bash
npm run voiceover:align -- --project <id> --model ./models/ggml-small.bin
npm run phase3:prepare -- --project <id>
npm run youtube:workflow -- phase3-check --project <id>
```

`phase3:prepare` erzeugt `phase3-handoff.json`, `project.scenes` und `render-manifest.json`.

**Workflow v3 erlaubt in Phase 3 keinen Medien-Netzwerkzugriff.** Es werden nur lokal materialisierte Phase-1-Assets verwendet. Fehlt Material, geht der Shot zurück in Phase 1.

Erlaubte Assembly-Aktionen:

- Trim / harte Cuts
- Crop / Reframing
- Freeze Frames aus freigegebenem Material
- subtile geplante Push-ins/Pans
- Vertical-Blur-Sidefill
- echte Dokument-/Artikel-/Karten-Inserts aus Phase 1

Nicht als Standard erlaubt:

- erfundene Erklärgrafiken
- Elektronen-/Partikelanimationen
- generische Pfeile/Kreise/Callouts
- mittige Infokarten
- zufällige Ersatz-B-Roll

## Projektartefakte v3

```text
project.json
research.json
voiceover-script.txt
visual-plan.json
shot-plan.json
materialization.json
phase1-quality.json
visual-qc.json
beat-bindings.json

audio/voiceover-master.*
timings.json
phase3-handoff.json
render-manifest.json
```

## Focal Point und Motion

Der Shot-Plan kann `focus` und `motion` festlegen. Diese Werte werden bis zum Renderer durchgereicht; es gibt keine zufällige Ken-Burns-Richtung mehr.

Beispiel:

```json
{
  "focus": { "x": 72, "y": 35 },
  "motion": { "type": "push", "scaleFrom": 1.01, "scaleTo": 1.05 }
}
```

## Klassische Asset-Projekte

Der ältere manuelle `video:project create/add`-Modus bleibt für einfache Asset-Projekte verfügbar. Bei Workflow-v3-Dokus wird `project.scenes` normalerweise automatisch durch `phase3:prepare` erzeugt.

## Rechte-Gate

Workflow v3 blockiert, wenn unter anderem:

1. ein geplanter Shot kein gebundenes Asset besitzt,
2. das Asset nicht `approved` ist,
3. `youtube` nicht in den Usage Scopes steht,
4. `unknown`, `restricted` oder `editorial-only` als Publish-Rechte verwendet werden,
5. das Produktionsasset nur extern statt lokal vorliegt,
6. Visual-/Quality-QC fehlt,
7. keine echte Nutzer-Voiceover vorhanden ist.

Ein Recherche-, CLIP- oder Quality-Score ist weder eine Rechtefreigabe noch ein Beweis, dass ein Asset exakt das behauptete Ereignis zeigt.
