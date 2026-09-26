# Dokumentarische Visuals lokal speichern

Stand: Phase-1-Komplettlauf auf `agent/beta-release`.

## Ziel

Nach der Online-Recherche sollen die empfohlenen Hauptvisuals nicht nur als Links vorliegen. Phase 1 kann sie als echte lokale Medien in den jeweiligen Szenenordner schreiben, damit Phase 3 / Antigravity später mit lokalen Dateien arbeitet.

## Komplettlauf

```bash
npm run documentary:phase1 -- \
  --title "Tschernobyl" \
  --script-file ./script.txt \
  --complete
```

`--complete` bedeutet:

1. Projektstruktur erzeugen
2. Skript in Doku-Szenen planen
3. passende Online-Visuals recherchieren
4. Hauptvisual pro Szene auswählen
5. empfohlenes Hauptvisual als echte Datei lokal speichern
6. Quellen-, Lizenz- und Materialisierungsdaten schreiben

Standardformat ist 16:9 / horizontal.

## Ergebnis pro Szene

Beispiel:

```text
03-VISUALS/
└── scene-001/
    ├── 00-research.json
    ├── 00-local-files.json
    ├── 01-MAIN-SOURCE.url
    ├── 01-MAIN-MEDIA.url
    ├── 01-MAIN-PREVIEW.url
    └── 01-main.jpg
```

Bei Video wird entsprechend z. B. `01-main.mp4` geschrieben.

Die tatsächliche lokale Datei wird zusätzlich in `05-PROJECT/scenes.json` über `localPrimaryFile` referenziert.

## Nur ausgewählte Dateien herunterladen

Standardmäßig wird **nur das automatisch empfohlene Hauptvisual** materialisiert. Die Alternativen bleiben als Links erhalten. Dadurch wird nicht jede Suchseite heruntergeladen und der Projektordner bleibt klein.

Optional können Alternativen ebenfalls lokal gespeichert werden:

```bash
npm run documentary:phase1 -- \
  --title "Tschernobyl" \
  --script-file ./script.txt \
  --complete \
  --materialize-alternatives
```

## Separater Downloadlauf

Ein bereits recherchiertes Projekt kann später separat materialisiert werden:

```bash
npm run documentary:materialize -- --project "<projektordner>"
```

Optional:

```bash
npm run documentary:materialize -- \
  --project "<projektordner>" \
  --alternatives \
  --overwrite \
  --max-mb 750
```

## Provider-Verhalten

- **Pexels:** direkte Medien-URL wird verwendet.
- **Pixabay:** direkte Medien-URL wird verwendet.
- **Wikimedia Commons:** Originaldatei wird verwendet; die Suche filtert bereits auf erkannte Public-Domain-/CC-Klassen.
- **Openverse:** Originaldatei des jeweiligen Ursprungs wird verwendet; HTTPS und private Netzwerkziele werden geprüft.
- **Unsplash:** vor dem lokalen Speichern wird die vorhandene `download_location`-Route aufgerufen; ein normaler Direktdownload ohne Tracking ist nicht vorgesehen.

## Sicherheitsregeln

Der Materializer:

- akzeptiert nur HTTPS,
- blockiert localhost und private Netzwerkbereiche,
- erlaubt keine eingebetteten URL-Zugangsdaten,
- begrenzt Weiterleitungen,
- prüft unterstützte Bild-/Video-MIME-Typen,
- hat standardmäßig 500 MB Dateilimit pro Medium,
- schreibt zuerst eine temporäre `.part-*`-Datei,
- ersetzt die Zieldatei erst nach erfolgreichem Download.

Die lokale Doku-Ausgabe liegt unter `ALLES-GEFUNDEN/` und wird durch `.gitignore` vom Repository ausgeschlossen. Große Videos und Bilder werden dadurch nicht versehentlich committed.

## Rechte bleiben getrennt

**Download ist keine Veröffentlichungsfreigabe.**

Auch nach erfolgreicher Materialisierung bleibt der Status:

```text
review-required-before-publication
```

`sources.txt`, `licenses.csv`, Szenen-Metadaten und die Original-Quelllinks bleiben erhalten. Vor Veröffentlichung müssen Quelle, Lizenz, Attribution sowie Personen-, Marken-, Event- und Kontextrechte geprüft werden.

## Phase-Übergang

Nach vollständiger Phase 1 hat der Nutzer:

```text
01-SCRIPT/script.txt
03-VISUALS/scene-001/01-main.ext
03-VISUALS/scene-002/01-main.ext
...
04-SOURCES/sources.txt
04-SOURCES/licenses.csv
05-PROJECT/scenes.json
05-PROJECT/research-summary.json
05-PROJECT/materialization-summary.json
```

Phase 2 ergänzt nur:

```text
02-AUDIO/voiceover.mp3
```

Danach kann Phase 3 aus Audio + lokalen Visuals die exakte Timeline und den finalen Schnitt erzeugen.
