# 00 — Bildprompts

Dieser Ordner ist die Google-Flow-Arbeitsfläche des Videos.

## Reihenfolge

1. `cover/cover-A.txt` in Flow ausführen und Ergebnis vollständig abwarten.
2. `cover/cover-B.txt` ausführen.
3. `cover/cover-C.txt` ausführen.
4. **STOP** — Nutzer wählt genau ein Cover.
5. Gewinner exakt als `Bild 01.png` speichern.
6. Das gewählte `Bild 01.png` bei jedem späteren KI-Bild als **weiche Style-/World-Referenz** verwenden.
7. Danach `99-alle-bildprompts.txt` der Reihe nach abarbeiten.

## Produktionsregeln

- immer nur **ein Bild gleichzeitig** erzeugen
- erzeugen → warten → prüfen → exakt umbenennen → nächstes Bild
- 5er-Blöcke sind nur QC-Checkpoints, keine parallele Generation
- Bilder sollen klar zum jeweiligen Sprechertext passen
- jedes Bild bleibt individuell in Perspektive, Handlung und Komposition
- Cover hält Stil, Farbwelt, Realismus, Lichtlogik und wiederkehrende Identitäten zusammen
- Cover-Komposition nicht in jede Szene kopieren
- Text außerhalb des Covers nur, wenn der einzelne Prompt ihn ausdrücklich erlaubt
- Beats mit `REAL B-ROLL` werden **nicht** in Flow erzeugt

## Bildablage

Akzeptierte Flow-Bilder kommen nach `images/` und werden später in `03-bilder/ki/` übernommen.
