# Beta-Testplan

## Ziel

Der komplette kostenlose Ablauf wird real geprüft:

1. Visual Asset Hub unter Windows starten
2. drei Pexels-Videos und drei Originalgrafiken ansehen
3. Suche, Schnellfilter, Favoriten und Auswahl-Export testen
4. mindestens ein geeignetes Asset protokolliert freigeben
5. dieses Asset in einem echten Content-Projekt einsetzen
6. Nutzung und Quellen-/Attributionsdatei dokumentieren

## Vorhandene Testmedien

### Vertikale Pexels-Videos

- `VAH-P6153727` – robotische Hand
- `VAH-P8087308` – Person mit humanoidem Technologieobjekt
- `VAH-P8328141` – Alltagsszene mit Roboter und Getränk

Alle drei Videos besitzen Status `review`. Sie dürfen vor der vollständigen Sichtprüfung nicht als freigegeben behandelt werden.

### Eigene statische Originalgrafiken

- `VAH-GAINET01` – abstraktes KI-Netzwerk
- `VAH-GBIZGR01` – Business-Wachstum
- `VAH-GCIRCU01` – technischer Schaltplan-Hintergrund

Die SVG-Grafiken liegen vollständig im Repository und besitzen dokumentierte eigene Rechte. Auch sie starten für den Bedienungstest mit Status `review`.

## Test A – Windows und Weboberfläche

1. Branch `agent/beta-release` herunterladen und entpacken.
2. `START-HERE.cmd` doppelklicken.
3. Prüfen, ob der Browser unter `http://127.0.0.1:4173` geöffnet wird.
4. Kontrollieren, ob sechs Assets sichtbar sind.
5. Schnellfilter `B-Rolls`, `Hochformat`, `Zu prüfen` und die drei aktiven Kategorien testen.
6. Suche mit `Roboter`, `Business`, `Schaltplan` und `KI Netzwerk` testen.
7. Ein Video öffnen und vollständig abspielen.
8. Eine Originalgrafik öffnen und in voller Größe ansehen.

## Test B – Auswahl und Übergabe

1. Zwei Assets als Favoriten markieren.
2. `Auswahl exportieren` drücken.
3. JSON-Datei öffnen.
4. Prüfen, ob Asset-ID, Status, Quelle, Lizenz, Nutzungsbereiche und Attribution enthalten sind.
5. Sicherstellen, dass bei Review-Assets eine Warnung enthalten ist.

## Test C – Review und Freigabe

Ein Asset darf nur freigegeben werden, wenn Inhalt, Qualität, Personen, Marken, Rechte und geplanter Einsatz vollständig geprüft wurden.

Beispiel lokal:

```bash
npm run asset:review -- --id VAH-GCIRCU01 --decision approve --reviewer Arman --notes "Grafik vollständig geprüft; keine Personen oder Marken; für Elektro-Content geeignet"
```

Danach prüfen:

- Status steht auf `approved`
- Review ist in `catalog/reviews.json` protokolliert
- Weboberfläche zeigt `Freigegeben`
- `npm run check` bleibt erfolgreich

## Test D – echter Content-Einsatz

1. Das freigegebene Asset in einem echten Reel, Short, Video, einer Website oder Präsentation verwenden.
2. Nutzung dokumentieren:

```bash
npm run usage:add -- --asset VAH-GCIRCU01 --project elektro-klar-test-01 --title "Elektro Klar Test 01" --platform tiktok
```

3. Attribution exportieren:

```bash
npm run attribution:export -- --project elektro-klar-test-01
```

4. Prüfen, ob die Nutzung in der Weboberfläche erscheint.

## Abschlussprüfung

```bash
npm run links:check -- --strict true
npm run beta:verify
```

## Abnahmekriterien

- technische Projektprüfung erfolgreich
- sechs Testassets sichtbar und korrekt kategorisiert
- alle drei Videos und alle drei Grafiken visuell geprüft
- mindestens eine Review-Entscheidung protokolliert
- mindestens ein Asset freigegeben
- mindestens eine echte Nutzung dokumentiert
- Auswahl- und Attributions-Export funktionieren
- keine API-Schlüssel oder vertraulichen URLs im Repository

Die Beta gilt als **real getestet**, sobald alle Kriterien erfüllt sind. Ein Merge in `main` erfolgt erst danach.
