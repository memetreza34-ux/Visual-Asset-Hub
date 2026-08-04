# Beta-Testplan

## Ziel

Der komplette kostenlose Ablauf wird real geprüft:

1. Visual Asset Hub unter Windows starten
2. drei Pexels-Videos und drei Originalgrafiken ansehen
3. Suche, Schnellfilter, Favoriten und Auswahl-Export testen
4. mindestens ein geeignetes Asset direkt im Browser protokolliert freigeben
5. dieses Asset in einem echten Content-Projekt einsetzen
6. Nutzung, Attribution und Backup direkt im Browser dokumentieren

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
4. Kontrollieren, ob **Lokale Verwaltung aktiv** angezeigt wird.
5. Kontrollieren, ob der Beta-Fortschritt und die offenen Abnahmeschritte sichtbar sind.
6. Prüfen, ob sechs Assets angezeigt werden.
7. Schnellfilter `B-Rolls`, `Hochformat`, `Zu prüfen` und die aktiven Kategorien testen.
8. Suche mit `Roboter`, `Business`, `Schaltplan` und `KI Netzwerk` testen.
9. Ein Video öffnen und vollständig abspielen.
10. Eine Originalgrafik öffnen und in voller Größe ansehen.

## Test B – Auswahl und Übergabe

1. Zwei Assets als Favoriten markieren.
2. `Auswahl exportieren` drücken.
3. JSON-Datei öffnen.
4. Prüfen, ob Asset-ID, Status, Quelle, Lizenz, Nutzungsbereiche und Attribution enthalten sind.
5. Sicherstellen, dass bei Review-Assets eine Warnung enthalten ist.

## Test C – Review und Freigabe im Browser

Empfohlenes erstes Testasset: `VAH-GCIRCU01`, weil es eine vollständig eigene Grafik ohne erkennbare Personen oder Marken ist.

1. Asset öffnen.
2. Originaldatei ansehen.
3. Prüfer eintragen.
4. Qualitätsbewertung wählen.
5. Eine nachvollziehbare Notiz eintragen.
6. Alle vier Pflichtpunkte bestätigen:
   - Asset vollständig angesehen
   - Personen, Logos und Marken geprüft
   - Quelle, Lizenz und Nutzungsbereiche geprüft
   - Einsatzkontext geprüft
7. `Freigeben` drücken.
8. Seite wird automatisch neu geladen.

Erwartet:

- Status steht auf `approved`
- Review ist in `catalog/reviews.json` protokolliert
- Weboberfläche zeigt `Freigegeben`
- Beta-Fortschritt erkennt Review und Freigabe
- technische Prüfungen bleiben erfolgreich

Negativtest:

- Bei fehlendem Pflichtpunkt muss die Freigabe blockiert werden.
- Eine Einschränkung ohne Begründung muss blockiert werden.

## Test D – echter Content-Einsatz im Browser

1. Das freigegebene Asset in einem echten Reel, Short, Video, einer Website oder Präsentation verwenden.
2. Dasselbe Asset erneut in Visual Asset Hub öffnen.
3. Unter `Echte Verwendung dokumentieren` eintragen:
   - Projekt-ID
   - Projektname
   - Plattform
   - optional Veröffentlichungslink
   - Nutzungsnotiz
4. `Nutzung speichern` drücken.
5. Nach dem Neuladen prüfen, ob Nutzung, Projekt und Plattform angezeigt werden.
6. Projekt-ID erneut eintragen und `Attribution exportieren` drücken.
7. Prüfen, ob im Ordner `exports` Markdown- und CSV-Dateien vorhanden sind.

## Test E – Backup und Bereitschaft

1. Oben `Katalog-Backup erstellen` drücken.
2. Prüfen, ob ein neues Backup unter `backups` erzeugt wurde.
3. Beta-Fortschritt kontrollieren.
4. `Testbericht öffnen` drücken.
5. Prüfen, ob technischer Stand, Realtest-Stand und nächste Schritte stimmen.

## Optionale Abschlussprüfung in der Konsole

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
- Backup erfolgreich erzeugt
- Beta-Bericht meldet `realTestComplete: true`
- keine API-Schlüssel oder vertraulichen URLs im Repository

Die Beta gilt als **real getestet**, sobald alle Kriterien erfüllt sind. Ein Merge in `main` erfolgt erst danach.
