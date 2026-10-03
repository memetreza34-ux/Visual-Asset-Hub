# Google Flow Agent Production Policy

Diese Regel gilt für alle Video-Projekte, die ihre Bilder über `00-bildprompts/` produzieren.

## 1. Cover zuerst

- Es gibt **einen Cover-Brief**.
- Google Flow erzeugt daraus exakt **3 unterschiedliche Cover-Designs**: A, B und C.
- Alle drei gehören zur gleichen Video-Bildwelt und verwenden denselben exakten Cover-Text.
- Die Designs dürfen sich in Komposition, Kamera, Framing und Negativraum deutlich unterscheiden.
- Danach gilt ein harter STOP.
- Der Agent wählt niemals selbst.
- Der Nutzer wählt A, B oder C.

Nach der Auswahl:

- Gewinner → `Bild 01.png`
- die zwei nicht gewählten Cover werden gelöscht/verworfen
- nur `Bild 01.png` darf als Cover im finalen Bilderordner bleiben
- `Bild 01.png` wird weiche Stil-/Continuity-Referenz für spätere KI-Bilder

## 2. Bilder in 5er-Produktionsblöcken

Nach der Cover-Auswahl liest der Agent die tatsächlich vorhandenen `BILDPROMPT:`-Blöcke.

Er arbeitet in Gruppen von maximal fünf **benötigten** Bildern:

`Block 1 = nächste 5 benötigte Bilder`

`Block 2 = nächste 5 benötigte Bilder`

usw.

Innerhalb eines Blocks wird trotzdem jedes Bild separat erzeugt:

`Prompt lesen → Cover-Referenz laden → 1 Bild erzeugen → warten → QC → korrekt umbenennen → nächstes Bild`

Ein 5er-Block ist niemals eine Collage und niemals ein einzelnes Bild mit fünf Szenen.

Nach jedem Block:

- Dateinamen prüfen
- fehlende Bilder prüfen
- Wiederholungen prüfen
- Stil-Drift prüfen
- Bildinhalt gegen Audio Anchor prüfen
- fehlerhafte Bilder im selben Slot neu erzeugen

## 3. Nur tatsächlich benötigte Bilder erzeugen

- Der Agent erzeugt nur Bildnummern, für die ein Flow-`BILDPROMPT:` existiert.
- Nummernlücken werden nicht automatisch aufgefüllt.
- REAL-/GRAPHIC-/SOURCE-Slots werden nicht durch KI-Ersatz gefüllt.
- Keine unnötigen Varianten nach akzeptiertem QC.

## 4. Final-only Bilderordner

`00-bildprompts/images/` ist kein Arbeitsordner, sondern ein **Final-only-Ordner**.

Dort bleiben am Ende ausschließlich:

- `Bild 01.png` = vom Nutzer gewähltes Cover
- alle akzeptierten, tatsächlich benötigten Flow-Bilder mit ihrem exakten `Bild NN.png`-Namen

Nicht erlaubt im finalen Ordner:

- Cover A/B/C Kandidaten
- die zwei nicht gewählten Cover
- Fehlversuche
- verworfene Regenerationen
- Duplikate
- Alternativen
- Dateien mit `_v2`, `retry`, `candidate`, `test`, `alt`, `final-final` usw.
- nicht benötigte Bildnummern

Temporäre Dateien müssen außerhalb des finalen Bilderordners liegen und nach Abschluss gelöscht werden.

## 5. Abschlussprüfung

Vor Fertigmeldung muss der Agent:

1. erwartete finale Dateiliste aus den Bildprompts bestimmen
2. finalen Ordner dagegen prüfen
3. alle Extras löschen
4. sicherstellen, dass keine benötigte Datei fehlt
5. finale Dateianzahl und Dateinamen melden

Erst danach ist die Flow-Bildproduktion abgeschlossen.