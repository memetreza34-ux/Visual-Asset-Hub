# Beta-Testplan

## Ziel

Der komplette kostenlose Ablauf wird real geprüft:

1. Visual Asset Hub unter Windows starten
2. elf Starterassets ansehen und entscheiden
3. die vier Kanalbibliotheken durchsuchen
4. Suche, Schnellfilter, Favoriten und Auswahl-Export testen
5. mindestens ein geeignetes Asset im Browser freigeben
6. dieses Asset in einem echten Content-Projekt einsetzen
7. Nutzung, Attribution und Backup im Browser dokumentieren

## Starterbibliothek nach dem ersten Start

`START-HERE.cmd` importiert idempotent fünf zusätzliche Pexels-B-Rolls. Danach enthält die lokale Testbibliothek:

- acht vertikale Pexels-Videos
- drei eigene horizontale SVG-Grafiken
- insgesamt elf Assets
- alle Assets zunächst im Status `review`

### Bereits im Repository

- `VAH-P6153727` – robotische Hand
- `VAH-P8087308` – Person mit humanoidem Technologieobjekt
- `VAH-P8328141` – Alltagsszene mit Roboter und Getränk
- `VAH-GAINET01` – abstraktes KI-Netzwerk
- `VAH-GBIZGR01` – Business-Wachstum
- `VAH-GCIRCU01` – technischer Schaltplan-Hintergrund

### Beim ersten Start ergänzt

- `VAH-P6120120` – Finanzanalyse mit Taschenrechner
- `VAH-P7989872` – digitale Interaktion am Smartphone
- `VAH-P6153455` – bionischer Arm
- `VAH-P6153460` – Technologieszene im Labor
- `VAH-P6153725` – robotisches Gerät in Bewegung

Keines dieser Medien darf vor vollständiger Sichtprüfung als freigegeben behandelt werden.

## Test A – Windows und Oberfläche

1. Branch `agent/beta-release` herunterladen und entpacken.
2. `START-HERE.cmd` doppelklicken.
3. Prüfen, ob der Browser unter `http://127.0.0.1:4173` geöffnet wird.
4. Kontrollieren, ob **Lokale Verwaltung aktiv** angezeigt wird.
5. Prüfen, ob elf Assets sichtbar sind.
6. Kontrollieren, ob Beta-Fortschritt und offene Aufgaben angezeigt werden.
7. Die Kanal-Arsenal-Sektion öffnen.
8. Prüfen, ob vier Tabs sichtbar sind:
   - Finanzen
   - Künstliche Intelligenz
   - Elektrotechnik
   - Kampfsport
9. Nach `Aktien`, `RCD`, `Boxring`, `Muay Thai`, `Roboter` und `Schaltplan` suchen.
10. Prüfen, ob Sammlungsnamen, Tags, Suchbegriffe und Abdeckungsbalken angezeigt werden.

## Test B – Medienprüfung

Alle elf Starterassets vollständig öffnen und bewerten.

Bei jedem Asset prüfen:

- sichtbarer Inhalt stimmt mit Titel und Tags überein
- Auflösung und Ausrichtung sind brauchbar
- Personen, Logos, Marken und Kennzeichen wurden kontrolliert
- Quelle und Lizenzseite sind erreichbar
- der geplante Einsatzkontext ist passend

Für jedes der elf Assets muss eine Entscheidung gespeichert werden:

- freigeben
- einschränken
- zur Prüfung zurück
- archivieren

Der Beta-Bericht gilt erst dann als vollständig geprüft, wenn elf unterschiedliche Asset-IDs eine dokumentierte Entscheidung besitzen.

## Test C – Auswahl und Übergabe

1. Mindestens zwei Assets als Favoriten markieren.
2. `Auswahl exportieren` drücken.
3. JSON-Datei öffnen.
4. Prüfen, ob folgende Daten enthalten sind:
   - Asset-ID
   - Status
   - Quelle
   - Lizenz
   - Nutzungsbereiche
   - Attribution
5. Sicherstellen, dass Review-Assets klar als nicht freigegeben markiert sind.

## Test D – Freigabe im Browser

Empfohlenes erstes Freigabe-Testasset: `VAH-GCIRCU01`, da es eine eigene Grafik ohne Personen oder fremde Marken ist.

1. Asset öffnen und Originaldatei ansehen.
2. Prüfer und Qualitätsbewertung eintragen.
3. Eine nachvollziehbare Notiz speichern.
4. Alle vier Pflichtpunkte bestätigen:
   - Asset vollständig angesehen
   - Personen, Logos und Marken geprüft
   - Quelle, Lizenz und Nutzung geprüft
   - geplanter Einsatzkontext geprüft
5. `Freigeben` drücken.

Erwartet:

- Status wird `approved`
- Entscheidung steht in `catalog/reviews.json`
- Weboberfläche zeigt `Freigegeben`
- Freigabe ohne vollständige Pflichtprüfung wird blockiert
- Einschränkung ohne Begründung wird blockiert

## Test E – echter Content-Einsatz

1. Ein freigegebenes Asset in einem echten Reel, Short, YouTube-Video, Beitrag, einer Website oder Präsentation verwenden.
2. Dasselbe Asset in Visual Asset Hub öffnen.
3. Projekt-ID, Projektname und Plattform eintragen.
4. Optional Veröffentlichungslink und Nutzungsnotiz ergänzen.
5. `Nutzung speichern` drücken.
6. Attribution exportieren.
7. Prüfen, ob Nutzung, Projekt und Plattform nach dem Neuladen sichtbar sind.

## Test F – Arsenal-Plan und Abdeckung

Nach dem Start müssen diese Dateien vorhanden sein:

```text
reports/arsenal-plan.json
reports/arsenal-plan.csv
reports/channel-coverage.json
reports/channel-coverage.md
```

Der vollständige Plan muss enthalten:

- vier Kanäle
- 90 Sammlungen
- 360 Suchaufträge
- Video und Foto
- vertikal und horizontal

Der Abdeckungsbericht muss das Ziel von 720 freigegebenen Kanal-Assets anzeigen.

## Test G – Backup und Wiederherstellung

1. Im Browser `Katalog-Backup erstellen` drücken.
2. Prüfen, ob ein neuer Ordner unter `backups` vorhanden ist.
3. Kontrollieren, ob Manifest und SHA-256-Prüfsummen enthalten sind.
4. `RESTORE-BACKUP.cmd` testweise bis zum Dry-Run verwenden.
5. Keine echte Wiederherstellung durchführen, solange kein Testbackup ausgewählt wurde.

## Optionale Abschlussprüfung

```bash
npm run links:check -- --strict true
npm run arsenal:validate
npm run arsenal:report
npm run beta:verify
```

## Abnahmekriterien

- technische Projektprüfung erfolgreich
- elf Starterassets sichtbar
- alle elf Starterassets mit einer Entscheidung protokolliert
- vier Kanalbibliotheken und 90 Sammlungen sichtbar
- Arsenal-Plan mit 360 Aufträgen erzeugt
- mindestens ein Asset freigegeben
- mindestens eine echte Nutzung dokumentiert
- Auswahl- und Attributions-Export funktionieren
- Backup erfolgreich erzeugt
- Beta-Bericht meldet `realTestComplete: true`
- keine API-Schlüssel oder vertraulichen URLs im Repository

Die Beta gilt als **real getestet**, sobald alle Kriterien erfüllt sind. Ein Merge in `main` erfolgt erst danach.
