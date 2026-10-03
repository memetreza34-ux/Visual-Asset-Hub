# Bildproduktion — Mercedes unter Druck

## Genau eine Datei an Google Flow senden

Für Google Flow wird **nur diese eine Datei verwendet**:

`google-flow-agent-prompt.txt`

Den kompletten Inhalt dieser Datei in den Google-Flow-KI-Agenten einfügen.

Der Prompt ist vollständig selbstständig und enthält bereits:

- den kompletten Cover-Brief
- Cover A / B / C als drei unterschiedliche Designs
- die Anweisung, sofort mit Cover A zu starten
- den harten STOP nach drei Covern
- die Nutzerauswahl A/B/C
- die Regel `Gewinner = Bild 01.png`
- die Verwendung von `Bild 01.png` als weiche Stil-/Continuity-Referenz
- alle benötigten Stage-2-Bildprompts vollständig inline
- die 5er-Produktionsblöcke
- QC-Regeln
- exakte Dateinamen
- Final-Cleanup

**Der Flow-Agent muss keine andere Repo-Datei lesen können.**

Er darf insbesondere nicht nach folgenden Dateien fragen:

- `cover-prompt.txt`
- `99-alle-bildprompts.txt`
- `voice-script.txt`
- lokalen Repo-Pfaden

Alles, was er für seine KI-Bilder benötigt, steht bereits im Master-Prompt.

## Ablauf

```text
Master-Prompt senden
↓
Flow startet sofort mit Cover A
↓
Cover B
↓
Cover C
↓
STOP
↓
Nutzer wählt A / B / C
↓
Gewinner = Bild 01.png
↓
Block 1: 5 benötigte Bilder
↓
Block-QC
↓
Block 2: restliche benötigte Bilder
↓
Final-QC + Cleanup
```

## Stage 2 dieses Videos

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

Nummernlücken sind Absicht. Diese Slots werden später durch echte Quellen oder verifizierte Grafiken gefüllt und werden nicht von Flow erfunden.

## Finaler Flow-Bilderordner

Am Ende dürfen aus der Flow-Produktion nur diese Dateien übrig bleiben:

- `Bild 01.png`
- `Bild 03.png`
- `Bild 09.png`
- `Bild 13.png`
- `Bild 16.png`
- `Bild 21.png`
- `Bild 22.png`
- `Bild 24.png`
- `Bild 29.png`

Nicht behalten:

- Cover A/B/C unter temporären Namen
- die zwei nicht gewählten Cover
- Fehlversuche
- Retry-Versionen
- Alternativen
- Duplikate
- Testbilder

Die wichtigste Regel ist: **ein Prompt rein → Flow startet selbst mit den drei Covern.**