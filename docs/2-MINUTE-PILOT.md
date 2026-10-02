# 2-Minuten-Pilot — Produktionsstandard

## Ziel

Dieser Pilot prüft die Visual-Pipeline unter realistischen YouTube-Bedingungen, bevor weitere große Features gebaut werden.

Empfohlene Zielwerte:

- 90–150 Sekunden
- für ~2:00 Minuten: ca. 260–300 gesprochene Wörter
- `--max-words-per-beat 10`
- mindestens 24 primäre Visuals pro 100 Sekunden
- Zielkorridor 28–42 primäre Visuals pro 100 Sekunden
- mindestens 4 Visual-Starts in den ersten ~10 Sekunden
- Cover maximal 2,2 Sekunden, Ziel 2,0 Sekunden
- geplante Holds über 5,8 Sekunden prüfen
- 8,0 Sekunden ist Hard-Max für einen geplanten Beat

## 1. Visual Plan

```bash
npm run visual:plan -- \
  --file ./script.txt \
  --orientation horizontal \
  --max-words-per-beat 10
```

## 2. Flow kompilieren

```bash
npm run flow:compile -- \
  --plan .local-storage/visual-plans/SESSION/visual-plan.json \
  --title "VIDEOTITEL" \
  --cover-text "COVERTEXT" \
  --target-duration 120 \
  --pilot-strict true
```

Neu: Der Cover-Brief verwendet Titel, Cover-Text und mehrere Story-Anker des gesamten Videos. Das Cover darf nicht nur den ersten Sprecher-Satz illustrieren.

Ausgabe enthält zusätzlich:

```text
pilot-readiness.json
```

## 3. Drei Cover

Flow erzeugt ausschließlich:

```text
Bild 01 Kandidat A
Bild 01 Kandidat B
Bild 01 Kandidat C
```

Danach STOP. Nutzer wählt einen Gewinner.

## 4. Cover auswählen

```bash
npm run flow:select-cover -- \
  --production-plan ./flow/flow-production-plan.json \
  --candidate B \
  --reference "Bild 01.png"
```

Der Gewinner wird weiche Stil-/World-/Qualitätsreferenz. Folge-Bilder bleiben individuell.

## 5. Stage-2-Bilder in Flow erzeugen

Immer einzeln:

```text
aktuelles Bild
→ generieren
→ warten
→ QC
→ bei PASS akzeptieren
→ nächstes
```

Fünferblöcke sind nur QC-Checkpoints.

## 6. Sicheren Flow-Download importieren

Der ausgewählte Cover-Download wird separat übergeben. Im Stage-2-Ordner dürfen nur akzeptierte Folge-Bilder liegen.

```bash
npm run flow:import -- \
  --production-plan ./flow/flow-production-plan.json \
  --cover ./downloads/selected-cover.png \
  --source ./downloads/stage2 \
  --order auto
```

Der Import blockiert bei:

- falscher Bildanzahl
- unsicherer Reihenfolge
- verdächtig kleinen Dateien
- exakten Bildduplikaten

Ergebnis:

```text
flow/final-images/
  Bild 01.png
  Bild 02.png
  ...
  flow-import-report.json
```

## 7. Echte B-Rolls/Fotos

```bash
npm run real:integrate -- \
  --queue ./real-material-queue.json
```

Exakte Belege bleiben `manual-required`. Generischer Stock ersetzt keine Originalquelle.

## 8. AI + Real zusammenführen

```bash
npm run video:manifest -- \
  --visual-plan ./visual-plan.json \
  --production-plan ./flow/flow-production-plan.json \
  --flow-import-report ./flow/final-images/flow-import-report.json \
  --real-manifest ./real-media/remotion-real-media.json
```

Status ohne Voiceover-Timings:

```text
assets-ready-awaiting-voice-timings
```

Mit Beat-Timings:

```bash
npm run video:manifest -- \
  ... \
  --timings ./beat-timings.json
```

Nur wenn alle Beats aufgelöst und getimt sind:

```text
render-handoff-ready
```

## Definition of Done für den Pilot

Der 2-Minuten-Test ist bestanden, wenn:

1. `pilot-readiness.json` = `ready-for-asset-pilot`
2. drei brauchbare Cover existieren
3. Nutzer hat einen Cover-Gewinner gewählt
4. spätere KI-Bilder wirken zusammengehörig, aber nicht geklont
5. Flow-Import prüft exakt die erwartete Bildanzahl
6. keine auffälligen Bildduplikate vorhanden sind
7. Real-Media-Beats besitzen passende B-Rolls/Fotos oder sind transparent als offen markiert
8. `final-video-manifest.json` enthält alle Beat-Zuordnungen
9. nach Voiceover-Timing wird der Status `render-handoff-ready`
10. erst danach folgt der eigentliche Remotion-/Render-Test

## Nicht in diesem Pilot erzwungen

Die große `production-v1`-Quellenabdeckung (NASA, NOAA, USGS, NARA, Smithsonian, Library of Congress, Europeana, Wikimedia usw.) wird nicht blind in `main` gemerged. Nach dem Pilot werden die bewährten Provider gezielt in die aktuelle AI-first-Architektur migriert.
