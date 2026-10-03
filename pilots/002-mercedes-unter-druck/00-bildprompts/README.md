# Bildproduktion — Mercedes unter Druck

## Welche Datei bekommt der Google-Flow-KI-Agent?

Dem Agenten wird **`google-flow-agent-prompt.txt`** gegeben.

Der Agent liest danach:

1. `cover/cover-prompt.txt`
2. `99-alle-bildprompts.txt`
3. `../01-script/voice-script.txt`

## Stage 1 — Cover

Es gibt nur **einen Cover-Brief**. Aus diesem einen Brief erzeugt Google Flow drei unterschiedliche Designs:

- Cover A
- Cover B
- Cover C

Die drei Cover sind nur temporäre Kandidaten.

Nach A/B/C gilt ein harter STOP. Der Nutzer wählt genau einen Gewinner.

Der Gewinner wird:

`images/Bild 01.png`

Die beiden anderen Cover werden verworfen/gelöscht und dürfen **nicht** im finalen Bilderordner bleiben.

## Stage 2 — benötigte Flow-Bilder in 5er-Schritten

Nach der Cover-Auswahl verwendet Flow `Bild 01.png` als weiche Stil-/Continuity-Referenz.

Flow erzeugt nur die tatsächlich benötigten KI-Bilder aus `99-alle-bildprompts.txt`.

Für dieses Video:

### Block 1
- `Bild 03.png`
- `Bild 09.png`
- `Bild 13.png`
- `Bild 16.png`
- `Bild 21.png`

### Block 2
- `Bild 22.png`
- `Bild 24.png`
- `Bild 29.png`

Ein 5er-Block bedeutet **nicht** fünf Szenen in einem Bild. Jedes Bild wird einzeln erzeugt, geprüft und korrekt umbenannt. Nach maximal fünf akzeptierten Bildern folgt Block-QC; danach beginnt der nächste Block.

Nummernlücken sind Absicht: Diese Slots werden durch echte Quellen oder verifizierte Grafiken gefüllt. Flow darf sie nicht erfinden.

## Finaler Bilderordner

`00-bildprompts/images/` ist ein **Final-only-Ordner**.

Nach Abschluss dürfen dort für diesen Flow-Lauf nur diese Dateien liegen:

- `Bild 01.png`
- `Bild 03.png`
- `Bild 09.png`
- `Bild 13.png`
- `Bild 16.png`
- `Bild 21.png`
- `Bild 22.png`
- `Bild 24.png`
- `Bild 29.png`

Nicht erlaubt:

- Cover A/B/C als zusätzliche Dateien
- die zwei nicht gewählten Cover
- Fehlversuche
- alternative Versionen
- Duplikate
- `v2`, `retry`, `test`, `candidate`, `final-final` usw.
- KI-Ersatz für REAL/GRAPHIC-Slots

Am Ende wird der Ordner bereinigt und gegen die erwartete Dateiliste geprüft.