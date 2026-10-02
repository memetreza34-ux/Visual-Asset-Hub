# Pilot 001 — Paketreise

**Titel:** Was passiert mit deinem Paket nach dem Klick auf Bestellen?  
**Cover-Text:** `SO REIST DEIN PAKET`  
**Ziel:** ca. 2 Minuten  
**Format:** 16:9  
**Status:** `READY_FOR_GOOGLE_FLOW_COVER_TEST`

## Projektstruktur

```text
001-paketreise/
├── 00-bildprompts/
│   ├── README.md
│   ├── cover/
│   │   ├── cover-A.txt
│   │   ├── cover-B.txt
│   │   └── cover-C.txt
│   ├── 99-alle-bildprompts.txt
│   └── images/
├── 01-script/
│   └── voice-script.txt
├── 02-audio/
├── 03-bilder/
│   ├── ki/
│   └── real-broll/
├── 04-export/
└── 99-tech/
    ├── pilot.json
    ├── pilot-readiness.json
    ├── pilot-run-summary.json
    ├── real-material-queue.json
    └── status.json
```

Diese Struktur folgt dem bewährten Produktionsmuster der anderen YouTube-Kanal-Repositories: Prompts → Script → Audio → Bilder/Assets → Export → technische Pläne/QC.

## 00 — Bildprompts

Hier liegt alles, was direkt für Google Flow gebraucht wird.

### Cover zuerst

1. `cover-A.txt`
2. `cover-B.txt`
3. `cover-C.txt`
4. **STOP**
5. Nutzer wählt A, B oder C
6. Gewinner wird `Bild 01.png`

Alle drei Cover verwenden exakt:

`SO REIST DEIN PAKET`

Sie gehören zur gleichen Bildwelt und variieren nur sinnvoll in Komposition, Framing und Textzone.

### Danach Stage 2

`99-alle-bildprompts.txt` enthält die geordnete Produktionsliste für die restlichen KI-Bilder und markiert gleichzeitig die vier Beats, die echte B-Roll verwenden.

Das gewählte `Bild 01.png` ist für spätere KI-Bilder eine **weiche Style-/World-/Qualitätsreferenz**. Die Szenen bleiben individuell und dürfen das Cover nicht einfach kopieren.

## 01 — Script

`01-script/voice-script.txt` ist der endgültige Sprechertext für diesen Pilot.

## 02 — Audio

Hier kommen später Voiceover, optimierte Audiodatei und Timing-/Alignment-Dateien hinein.

## 03 — Bilder

- `ki/` → akzeptierte Flow-Bilder `Bild 01.png` bis `Bild 30.png`
- `real-broll/` → echte Bewegungsclips für Förderband, Truck, Zustellfahrzeug und Verkehr

Die 4 Real-B-Roll-Beats ersetzen keine KI-Bilder zufällig, sondern sind bewusst als echte Bewegung geplant.

## 04 — Export

Hier landet später der finale Render.

## 99 — Tech

Nur technische Produktionsdaten:

- Pilot-Konfiguration
- Readiness/QC
- Run-Zusammenfassung
- Real-Media-Queue
- aktueller Produktionsstatus

## Gemessener Pilotstand

- 268 Wörter
- Ziel: 120 s
- 34 primäre Visual-Beats
- 30 KI-Bilder
- 4 echte Motion-B-Rolls
- 88 % AI / 12 % Real
- 28,3 Visuals pro 100 s
- 4 Visual-Starts in den ersten ~10 s
- Cover-Hold: 2,0 s
- längster Beat: 4,3 s
- Pilot-Gate: `ready-for-asset-pilot`
- 4/4 Real-B-Roll-Beats aufgelöst

## Nächster Schritt

Direkt in Google Flow:

```text
cover-A.txt
→ Cover A erzeugen
→ cover-B.txt
→ Cover B erzeugen
→ cover-C.txt
→ Cover C erzeugen
→ STOP
→ Nutzer wählt ein Cover
```

Erst danach beginnt die Produktion aus `99-alle-bildprompts.txt`.
