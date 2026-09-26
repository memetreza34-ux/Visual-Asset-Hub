# Documentary Render – Antigravity → Remotion → 06-EXPORT

Stand: 2026-09-25

Dieser Block beginnt **nach** erfolgreicher Phase 3. Er verändert weder das finale Skript noch die Wort-Timings oder Szenengrenzen.

## Voraussetzung

Ein Projekt muss mindestens enthalten:

```text
01-SCRIPT/script.txt
02-AUDIO/voiceover.mp3
03-VISUALS/scene-XXX/<hauptvisual>
05-PROJECT/timeline.json
05-PROJECT/edit-plan.json
05-PROJECT/antigravity-handoff.json
05-PROJECT/phase3-state.json
```

Vor jedem Render wird automatisch derselbe Preflight wie bei

```bash
npm run documentary:phase3:validate -- --project "<projekt>"
```

ausgeführt.

Bei verändertem Skript, verändertem Voiceover, fehlendem Visual oder bereits belegtem Exportziel wird nicht gerendert.

## Einmalige Installation

Im Repository:

```bash
npm install
```

Die Remotion-Pakete sind auf exakt denselben Versionsstand gepinnt.

## Render nur vorbereiten

```bash
npm run documentary:render -- --project "<projekt>" --dry-run
```

Erzeugt:

```text
05-PROJECT/render-props.json
05-PROJECT/render-plan.json
05-PROJECT/remotion-public/
```

`remotion-public` ist ein temporärer, projektinterner Stagingbereich. Es werden nur das finale Voiceover und die tatsächlich verwendeten Hauptvisuals hineinkopiert.

## Final rendern

```bash
npm run documentary:render -- --project "<projekt>"
```

Standard:

- Remotion
- H.264 + AAC
- 1920 × 1080
- 30 fps
- BT.709
- `yuv420p`
- Voiceover als Hauptaudio
- B-Roll-Audio stumm
- Szenengrenzen aus `timeline.json`
- keine automatische Änderung des gesprochenen Textes
- keine Überschreibung bestehender `final-vN.mp4`

## Bildbewegung

Bilder erhalten standardmäßig nur eine dezente dokumentarische Bewegung:

- leichter Zoom
- sehr kleine horizontale Bewegung
- keine hektischen Effekte

Mit `motion: "none"` in der betreffenden Szene von `edit-plan.json` wird die Bewegung deaktiviert.

## Videos / B-Roll

Videos werden innerhalb der exakt vorgegebenen Szenendauer verwendet.

Optional in `edit-plan.json`:

```json
{
  "sceneId": "SCENE-004",
  "sourceInSeconds": 3.2,
  "sourceOutSeconds": 9.5,
  "loopVideo": false
}
```

Wenn kein Ausschnitt festgelegt ist, startet die Quelle bei Sekunde 0. `loopVideo` ist standardmäßig aktiv, damit ein zu kurzer Quellclip nicht zu schwarzem Bild führt.

Antigravity darf `sourceInSeconds`, `sourceOutSeconds`, `motion`, `transitionIn`, `loopVideo` und optional `overlayText` festlegen. Antigravity darf **nicht** die gesperrten Szenenzeiten verändern.

## Kurze On-Screen-Begriffe

Optional kann eine Szene in `edit-plan.json` einen kurzen Begriff erhalten:

```json
{
  "sceneId": "SCENE-006",
  "overlayText": "26. April 1986"
}
```

Der Renderer begrenzt diesen Text auf einen kurzen dokumentarischen Hinweis. Ganze Sprecher-Sätze gehören nicht als Standard-Overlay ins Bild.

## Nach erfolgreichem Render

Technisch entstehen:

```text
05-PROJECT/render-result.json
05-PROJECT/publish-state.json
```

Nutzerorientiert entstehen:

```text
06-EXPORT/
├── final-vN.mp4
├── youtube-title.txt
├── youtube-description.txt
├── youtube-tags.txt
└── thumbnail-text.txt
```

`render-result.json` enthält unter anderem Größe und SHA-256 des fertigen Videos.

## YouTube-Daten

Bevorzugt kann Phase 1 / ChatGPT folgende Datei kuratieren:

```text
05-PROJECT/publish.json
```

Beispiel:

```json
{
  "title": "Warum Tschernobyl bis heute Folgen hat",
  "description": "Fertige Beschreibung ohne abschließende Hashtags.",
  "hashtags": ["Tschernobyl", "Geschichte", "Dokumentation", "Atomkraft", "Wissen"],
  "tags": ["Tschernobyl", "Chernobyl", "Dokumentation", "Geschichte"],
  "thumbnailText": "Die Nacht der Katastrophe"
}
```

Regeln:

- `youtube-title.txt`: nur der Titel
- `youtube-description.txt`: fertige Beschreibung, am Ende exakt 5 Hashtags
- `youtube-tags.txt`: nur kommagetrennte Tags
- `thumbnail-text.txt`: nur kurzer Thumbnail-Text

Existiert `publish.json` nicht, erzeugt das Repo einen kostenlosen lokalen Fallback aus Projekttitel und Skript. Dieser Fallback verhindert leere Platzhalter; für maximale YouTube-Qualität ist ein kuratiertes `publish.json` vorzuziehen.

Manuell neu erzeugen:

```bash
npm run documentary:publish -- --project "<projekt>"
```

## Endzustand

```text
PHASE 1
Skript + Szenen + recherchierte Visuals
↓
PHASE 2
voiceover.mp3
↓
PHASE 3
exakte Wort-Timings + Timeline + Antigravity-Handoff
↓
ANTIGRAVITY
optional B-Roll-Ausschnitte / dezente Effekte / kurze Begriffe festlegen
↓
REMOTION
Preflight → Staging → Render
↓
06-EXPORT
final-vN.mp4 + direkt kopierbare YouTube-Dateien
```
