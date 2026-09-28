# Phase 1 Materialization – v0.14

## Ziel

`visual-plan.json` und `shot-plan.json` dürfen nicht mehr nur beschreiben, was später gezeigt werden soll. Vor der Nutzer-Voiceover muss jeder Beat auf ein **konkretes, geprüftes Produktionsasset** zeigen.

## Pipeline

```text
visual-plan.json
  ↓
beat:plan
  ↓
shot-plan.json
  ↓
phase1:materialize
  ↓
materialization.json
  ↓
Top-Kandidaten in Inbox
  ↓
visual:qc
  ↓
visual-qc.json
  ↓
Inbox Review / Rechte / Import
  ↓
phase1:bind
  ↓
beat-bindings.json
  ↓
youtube:workflow phase1-check
  ↓
ERST JETZT Nutzer-Voiceover
```

## 1. Kandidaten materialisieren

```bash
npm run phase1:materialize -- --project <id> --download-top 1
```

Standard:

- NASA / Library of Congress zuerst
- danach Wikimedia / Internet Archive
- bei Bildern zusätzlich Openverse
- Pexels/Pixabay standardmäßig AUS
- Stock nur mit `--include-stock true`

Pro Beat werden konkrete Kandidaten gespeichert mit:

- Provider
- Source URL
- Creator
- Rechte-Metadaten
- Auflösung / Dauer
- Editorial Score
- Query-Match
- Provider-Tier
- Downloadvarianten

`materialization.json` ist **keine Publikationsfreigabe**.

## 2. Visual QC

```bash
npm run visual:qc -- --project <id>
```

Prüft:

- Auflösung
- Orientierung
- Mindestdauer bei Video
- Rechte-Status
- Official Archive / Archive / Stock
- Duplikate
- optional OpenCLIP-Passung zwischen Bild/Frame und Visual-Intent

Optional streng:

```bash
npm run visual:qc -- --project <id> --require-clip true
```

OpenCLIP lokal:

```bash
python3 -m pip install open_clip_torch pillow
```

### Was weiterhin bewusst geprüft werden muss

- zeigt das Medium wirklich das behauptete Ereignis?
- ist ein Wasserzeichen / eingebranntes Logo vorhanden?
- stimmt die Lizenz auf der Originalseite noch?
- ist Attribution nötig?

CLIP ist ein Relevanzsignal, kein Faktenbeweis.

## 3. Inbox Review / Import

Heruntergeladene Kandidaten landen in `inbox/` mit Quellen-Sidecar.

```bash
npm run inbox:scan
npm run inbox:review
```

Nur Medien, die anschließend im Katalog als:

```text
status = approved
usageScopes enthält youtube
licenseStatus != unknown/restricted
```

stehen, können an einen Beat gebunden werden.

## 4. Asset an Beat binden

Automatisch nach Source-URL und bestandenem QC:

```bash
npm run phase1:bind -- auto --project <id>
```

Explizite redaktionelle Auswahl:

```bash
npm run phase1:bind -- set \
  --project <id> \
  --beat b03 \
  --asset VAH-XXXXXXXX
```

Prüfen:

```bash
npm run phase1:bind -- check --project <id>
```

Ergebnis:

```text
projects/<id>/beat-bindings.json
```

Ein Binding enthält die echte Asset-ID, Source URL, QC-Score und den Freigabemodus.

## 5. Phase-1-Gate

```bash
npm run youtube:workflow -- phase1-check --project <id>
```

v0.14 verlangt bei Editorial-Projekten:

- `research.json`
- `voiceover-script.txt`
- `visual-plan.json`
- `shot-plan.json`
- `materialization.json`
- `visual-qc.json`
- `beat-bindings.json`
- für jeden Beat ein echtes `approved` YouTube-Asset

Erst dann wird akzeptiert:

```bash
npm run youtube:workflow -- voiceover-attach --project <id> --file ./voiceover.wav
```

Die Pipeline erzeugt weiterhin **keine Ersatzstimme**.

## Qualitätsprinzip

```text
Exact event / official source
  > official archive
  > archive
  > open media
  > specific B-roll
  > generic stock
```

Wenn exaktes Material vorhanden ist, darf generischer Stock nicht automatisch gewinnen.
