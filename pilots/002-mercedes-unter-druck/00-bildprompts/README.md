# Bildproduktion — Mercedes unter Druck

## Was der KI-Agent verwenden soll

Der eigentliche Prompt für den Google-Flow-KI-Agenten ist:

`google-flow-agent-prompt.txt`

Diesen Prompt vollständig an den Agenten geben. Er steuert Cover-Gate, Referenznutzung, Reihenfolge, QC, Dateinamen und Stage 2.

## Stage 1 — Cover

Der Agent liest nacheinander:

- `cover/cover-A.txt`
- `cover/cover-B.txt`
- `cover/cover-C.txt`

Jede Datei enthält einen vollständigen Google-Flow-Bildprompt.

Alle drei Cover:

- exakter sichtbarer Text `MERCEDES UNTER DRUCK`
- gleiche zugelassene Mercedes-Referenz als Ingredient, wenn vorhanden
- gleiche seriöse Wirtschafts-Doku-Bildwelt
- keine erfundenen Mercedes-Modelle oder Logos
- unterschiedliche Komposition, Fokus und Negativraum

Danach MUSS der Agent stoppen. Der Nutzer wählt A, B oder C. Gewinner = `Bild 01.png`.

## Stage 2 — echte Flow-Bildprompts

`99-alle-bildprompts.txt` enthält jetzt **keine Produktions-Stichpunkte mehr**, sondern ausschließlich vollständige, direkt ausführbare `BILDPROMPT:`-Blöcke für die Bilder, die Google Flow wirklich erzeugen soll.

Jeder Block enthält:

- exakten Audio Anchor
- Visual Purpose
- Visual Form
- vollständigen englischen Google-Flow-Prompt
- exakten Ziel-Dateinamen `Bild NN.png`

Das ausgewählte `Bild 01.png` wird bei jedem Stage-2-Prompt als **weiche Style-Referenz** verwendet. Stil, Farbwelt und Qualitätsniveau bleiben zusammenhängend; Komposition, Handlung, Kamera und Motiv müssen pro Bild individuell sein.

## Was NICHT in Flow erzeugt wird

Konkrete Mercedes-Produkte, Logos, Werke, offizielle Dokumente, echte Interfaces und exakte Geschäftszahlen werden nicht frei erfunden. Diese Slots kommen aus echten Quellen oder werden als verifizierte Grafik erzeugt. Die Zuordnung steht in:

`99-tech/REAL_MEDIA_PLAN.json`

Der Flow-Agent darf diese Nummern nicht durch generische KI-Bilder ersetzen.

## Produktionsregel

Für jedes KI-Bild:

`Prompt lesen → Bild 01 als Style-Referenz laden → genau 1 Bild erzeugen → vollständig warten → QC → korrekt als Bild NN.png speichern → nächstes Bild`

Keine Collagen, keine parallelen Szenen in einem Bild, keine sichtbaren Bildnummern, keine automatisch erfundenen Zusatztexte.