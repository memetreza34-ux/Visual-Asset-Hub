# YouTube Workflow v2

Der Workflow ist absichtlich streng: **Visual-Entscheidungen passieren in Phase 1. Die Nutzer-Voiceover-Datei ist ab Phase 2 die Master-Timeline. Phase 3 sucht nicht erneut kreativ nach beliebigem Stockmaterial.**

## Phase 1 – Thema, Skript und echte Visual-Auswahl

Pflichtdateien pro Projekt:

- `project.json`
- `voiceover-script.txt`
- `scene-script.json`
- `visual-plan-v2.json`
- `asset-shortlist.json`

Jede Skript-Szene erhält bereits vor der Stimme:

- klare visuelle Absicht (`visualIntent`)
- konkrete Shots statt nur allgemeiner Suchbegriffe
- Entscheidung zwischen B-Roll, Bild, Screen-Recording und eigener Remotion-Grafik
- No-Go-Liste gegen unpassende Stock-Clips
- bevorzugte Quellen
- bei externen Medien echte Kandidaten
- genau einen freigegebenen Kandidaten pro Pflicht-Shot
- externe Kandidaten nur ab **8/10 semantischer Relevanz**
- Begründung, warum der gewählte Clip zur gesprochenen Aussage passt

Befehl zum Einsammeln von Kandidaten:

```bash
npm run youtube:workflow -- phase1-discover --project handy-fokus-2min
```

Pexels und Pixabay benötigen ihre API-Keys. Openverse kann Bilder ohne Key ergänzen. Interne Remotion-Grafiken benötigen keinen Provider.

Prüfung:

```bash
npm run youtube:workflow -- phase1-check --project handy-fokus-2min
```

Solange diese Prüfung fehlschlägt, ist Phase 2 gesperrt.

## Phase 2 – ausschließlich die echte Nutzerstimme

Die Pipeline erzeugt keine Ersatzstimme und startet kein TTS.

```bash
npm run youtube:workflow -- voiceover-attach --project handy-fokus-2min --file ./meine-stimme.wav
```

Dabei werden:

- die Originaldatei ins Projekt kopiert
- Dauer mit ffprobe gemessen
- SHA-256 gespeichert
- `source: user-provided` gesetzt
- `generatedByPipeline: false` gesetzt

Workflow v2 verweigert den Export, wenn diese Bedingungen nicht erfüllt sind.

## Timing aus der echten Audiodatei

Optional kann lokal `whisper.cpp` verwendet werden. Der Hub bindet das Projekt nicht als Code-Abhängigkeit ein, sondern kann dessen `whisper-cli` aufrufen.

```bash
npm run voiceover:align -- --project handy-fokus-2min --model ./models/ggml-small.bin
```

Ergebnis:

- `projects/<id>/timings.json`
- Zeiten basieren auf der echten Voiceover-Datei
- keine starren 10-Sekunden-Szenen
- keine neue Stimme

## Phase 3 – Timing und Assembly

Phase 3 darf **keine neue kreative Stock-Suche** durchführen. Sie benutzt ausschließlich die in Phase 1 freigegebenen Visuals und passt deren Schnittpunkte an `timings.json` an.

Vor dem Rendern:

```bash
npm run youtube:workflow -- phase3-check --project handy-fokus-2min
```

Die Prüfung blockiert unter anderem:

- fehlende Nutzer-Voiceover-Datei
- fehlende `timings.json`
- überlappende oder ungültige Zeiten
- Timeline, die deutlich von der Voiceover-Länge abweicht

## Phase 4 – Render

`video:project export` schreibt die Nutzerstimme in das Render-Manifest. Der Remotion-Prepare-Schritt kopiert exakt diese Datei nach `renderer/public/audio/`. `AssetVideo` spielt sie als Master-Audiospur ab; Video-B-Roll bleibt standardmäßig stumm.

Workflow-v2-Renderer blockiert:

- fehlende Voiceover-Datei
- `sourceType` ungleich `user-provided`
- `generatedByPipeline: true`
- Szenen-Timeline, die nicht zur Voiceover-Dauer passt

## Qualitätsprinzip

Ein Clip ist nicht gut, nur weil das Suchwort vorkommt. Er muss die konkrete Aussage im jeweiligen Satz visuell tragen. Wenn Stockmaterial dafür zu allgemein wäre, wird in Phase 1 eine eigene Grafik, UI-Demo oder Animation vorgesehen.
