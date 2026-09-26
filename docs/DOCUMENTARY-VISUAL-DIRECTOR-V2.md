# Documentary Visual Director V2/V3

Stand: 2026-09-26

## Warum dieser Umbau existiert

Der erste 2,5-Minuten-Realtest zeigte drei wiederkehrende Qualitätsprobleme:

1. Eine semantische Szene wurde praktisch als `1 Szene = 1 Visual` behandelt.
2. Metadaten konnten hoch bewertet werden, obwohl das sichtbare Motiv nur schwach passte.
3. Historische Quellen lieferten im bisherigen Workflow fast nur Standbilder; echte B-Roll ging bei Auswahl und Render teilweise verloren.

Die neue Pipeline trennt deshalb **semantische Szenen** von **visuellen Shots**.

```text
Skript
→ semantische Szenen
→ mehrere Suchrichtungen je Szene
→ provider-balancierte Recherche
→ Metadaten-Ranking
→ Vision-Gate auf echten Previews
→ mehrere unterschiedliche Shots je Szene
→ lokale Shot-Dateien
→ exakte Audio-Szenengrenzen
→ mehrere 3,5–7-s-Shots innerhalb der gelockten Szene
→ Remotion
```

## Ziel für ca. 150 Sekunden

Nicht mehr ein langes Bild pro Szene. Eine normale Szene darf 1–3 Shots besitzen. Bei typischen 2,5-Minuten-Skripten soll dadurch grob ein Bereich von etwa **25–35 eigenständigen Visual-Shots** erreichbar werden, ohne künstlich Szenengrenzen im Sprechertext zu erfinden.

## Suchbudget

V2 verwendet standardmäßig bis zu **18 provider-balancierte Suchaufgaben pro Szene** statt acht Aufgaben, die von den ersten Query/Provider-Kombinationen aufgefressen werden konnten.

Video wird bei `mixed` vor Foto versucht. Danach werden Archiv-, Foto-, Detail-, Karten-, Establishing- und B-Roll-Suchrichtungen gemischt.

## Visuelles Ledger

`05-PROJECT/visual-ledger.json` protokolliert bereits verwendete:

- Asset-Identitäten
- Motiv-/Familien-Schlüssel
- Provider-Verteilung
- Motivhäufigkeit
- letzte Visuals

Gleiche Assets, sehr ähnliche Titel-/Creator-Familien und wiederholte Motive werden abgestraft. Innerhalb einer Szene werden zusätzlich gleiche Vision-Dublettengruppen vermieden.

## Vision-Gate

V3 prüft die Top-Previews mit einem vision-fähigen OpenAI-Modell. Das Modell soll ausdrücklich nur bewerten, was sichtbar ist, nicht was Dateiname oder Metadaten behaupten.

Pro Kandidat entstehen:

- `visibleRelevance` 0–100
- `exactness`: `exact`, `contextual`, `symbolic`, `mismatch`
- `duplicateGroup`
- kurze Begründung

Standard:

- `90–100`: sehr starker sichtbarer Match
- `75–89`: stark verwendbar
- `55–74`: nur Kontext
- `<55`: nicht bevorzugen
- `mismatch`: ablehnen

Wenn der Vision-Aufruf fehlschlägt oder keine nutzbaren Preview-URLs vorhanden sind, bleibt die Metadaten-/Diversitätsauswahl als Fallback erhalten. Ein Vision-Ausfall blockiert Phase 1 also nicht vollständig.

Optionale lokale Einstellung:

```text
OPENAI_VISION_MODEL=...
```

Ohne eigene Einstellung wird das bereits für Phase 1 konfigurierte Modell verwendet.

## Arsenal

### Stock / moderne B-Roll

- Pexels – Bild + Video
- Pixabay – Bild + Video
- Unsplash – Foto

### Freie / offene Suche

- Openverse – Foto
- Wikimedia Commons – **Foto + WebM/MP4-Video**

### Neue Archiv-/Spezialprovider

- NASA Image and Video Library – Bild + Video; besonders für Raumfahrt, Satelliten, Erde, Klima und Naturereignisse
- Library of Congress – Fotos sowie Film/Video; besonders für historische und US-bezogene Themen

Neue Provider bedeuten keine automatische Veröffentlichungsfreigabe. Der konkrete Rechte-/Nutzungskontext bleibt Review-Pflicht.

## Wikimedia-Video

Der alte Adapter war absichtlich auf Bild-MIME-Typen begrenzt. V2 akzeptiert zusätzlich sichere Videoformate (`video/webm`, `video/mp4`) und kann für Video-Szenen gezielt Commons-Videodateien suchen.

## Shot-Dateien

Phase 1 speichert pro Szene nicht nur `localPrimaryFile`, sondern zusätzlich:

```text
localShots[]
```

mit:

- `shotId`
- `candidateKey`
- Provider
- Bild/Video
- lokalem Pfad
- Review-Status

`localPrimaryFile` bleibt nur für Rückwärtskompatibilität erhalten.

## Phase 3

Die semantischen Szenengrenzen werden weiterhin ausschließlich aus finalem Skript + finalem Voiceover erzeugt. Daran ändert V2 nichts.

Innerhalb einer bereits gelockten Szene dürfen mehrere Visual-Shots verteilt werden. Das ist eine Schnittentscheidung und keine neue erfundene Sprecherzeit.

`timeline.json` enthält deshalb jetzt je Szene:

```text
visualShots[]
shotCount
```

Der Preflight prüft jede lokale Shot-Datei, nicht mehr nur ein Hauptvisual.

## Remotion

Der Standardrenderer ist `documentary-render-v2.mjs` mit `DocumentaryV2`.

Er:

- erhält die exakten semantischen Szenengrenzen
- verteilt die vorhandenen Shots innerhalb dieser Grenzen
- vermeidet nach Möglichkeit Shots deutlich unter ca. 2,5 Sekunden
- zielt editorial auf ca. 3,5–7 Sekunden je Shot
- lässt B-Roll stumm
- behält das Voiceover als Hauptaudio
- nutzt dezente Bewegung für Bilder

## Legacy-Fallback

Die alten Module bleiben vorerst verfügbar:

```text
documentary:research:legacy
documentary:materialize:legacy
documentary:phase3:legacy
documentary:render:legacy
```

Dadurch kann der bisherige Realtest reproduziert werden, während V2/V3 getestet wird.

## Noch offen nach diesem Umbau

Vor Merge nach `main` weiterhin real testen:

1. Wikimedia-Video mit echtem Commons-WebM
2. NASA Bild + Video
3. Library-of-Congress-Treffer mit real materialisierbarer Datei
4. Vision-Gate mit realen Preview-URLs
5. mindestens 20 unterschiedliche lokale Shots in einem ca. 2,5-Minuten-Projekt
6. deutlich sichtbarer B-Roll-Anteil
7. keine auffälligen Motivwiederholungen in benachbarten Shots
8. Phase 3 + V2-Preflight
9. finaler Remotion-V2-Render

Erst danach die Qualität des ersten Tests erneut gegen den neuen Export vergleichen.
