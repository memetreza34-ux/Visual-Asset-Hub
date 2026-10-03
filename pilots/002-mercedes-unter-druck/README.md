# Video 002 — Mercedes unter Druck

**Titel:** Warum Mercedes plötzlich unter Druck steht  
**Cover-Text:** `MERCEDES UNTER DRUCK`  
**Ziel:** ca. 2 Minuten  
**Format:** 16:9  
**Profil:** `profiles/company-documentary.json`

## Story

Das Video erklärt keinen angeblichen „Untergang“ von Mercedes. Es zeigt anhand realer 2025-Zahlen, warum der Konzern deutlich stärker unter Druck geraten ist: Absatzrückgang, China, sinkende Profitabilität, veränderte Elektrostrategie, Zölle und Kostensenkungen.

## Visualstrategie

Dieses Video ist bewusst **Real-first bei Mercedes-spezifischen Aussagen**:

- Mercedes-Logo, Fahrzeuge, Werk, MB.OS, Vorstand und Originalquellen → echtes Material
- generische Marktdynamik, abstrakte Strategie und neutrale Erklärbilder → KI möglich
- keine erfundenen Mercedes-Fahrzeuge oder Fake-Interfaces

## Harte Final-Video-Regel

Jeder sichtbare Beat braucht ein echtes visuelles Asset.

Erlaubte Primärvisuals:

- echtes Bild
- echte B-Roll / echtes Video
- akzeptiertes KI-Bild

Nicht rendern:

- `REAL SOURCE ASSET / B-ROLL`-Karten
- Bild-/Slotnummer-Karten
- Produktionsnotizen
- Debug-Frames
- Missing-Asset-Platzhalter
- technische Vollbildkarten

Wenn ein Asset fehlt, wird der Export **blockiert**. Niemals eine technische Karte als sichtbaren Ersatz einsetzen.

### Zahlen

Exakte Kennzahlen dürfen als kurze verifizierte Overlays auf einem passenden echten oder KI-Visual erscheinen. Keine sterile Vollbild-Metrikkarte nur mit Zahlen.

Beispiel:

```text
Mercedes-/China-B-Roll
+ Overlay: „China 2025: -19 %“
```

## Produktion

```text
00-bildprompts
→ 3 Cover
→ Nutzer wählt
→ benötigte KI-Bilder
→ echte Bilder / B-Rolls auflösen
→ Unified Video Manifest
→ npm run render:check
→ erst bei PASS final rendern
```

Der finale Render darf erst starten, wenn `render:check` bestätigt, dass alle Beats echte finale Visuals besitzen.

## Status

`VISUAL_ASSETS_MUST_BE_COMPLETE_BEFORE_RENDER`
