# Beta-Testplan

## Ziel

Der komplette kostenlose Ablauf wird real auf dem lokalen Rechner geprüft:

1. Visual Asset Hub auf dem Mac starten
2. zwölf Starterassets importieren und vollständig entscheiden
3. ein echtes Kanalskript in eine Shotlist umwandeln
4. die vier Kanalbibliotheken und 90 Sammlungen prüfen
5. alle fünf Medienquellen technisch testen
6. den priorisierten Ausbau-720-Workflow testen
7. eine eigene lokale Datei importieren
8. mindestens ein Asset freigeben
9. ein verifiziertes Medienpaket erzeugen
10. ein Asset in einem echten Content-Projekt verwenden
11. Nutzung, Attribution und Backup dokumentieren

## Starterbibliothek nach `npm run starter:import`

Der Import ergänzt idempotent sechs zusätzliche Medien. Danach enthält die lokale Testbibliothek:

- acht Pexels-Videos
- drei eigene horizontale SVG-Grafiken
- ein Wikimedia-Commons-Foto für Kampfsport unter CC BY-SA 4.0
- insgesamt **zwölf Assets**
- alle Assets zunächst im Status `review`

### Bereits im Repository

- `VAH-P6153727` – robotische Hand
- `VAH-P8087308` – Person mit humanoidem Technologieobjekt
- `VAH-P8328141` – Alltagsszene mit Roboter und Getränk
- `VAH-GAINET01` – abstraktes KI-Netzwerk
- `VAH-GBIZGR01` – Business-Wachstum
- `VAH-GCIRCU01` – technischer Schaltplan-Hintergrund

### Durch den Starterimport ergänzt

- `VAH-P6120120` – Finanzanalyse mit Taschenrechner
- `VAH-P7989872` – digitale Interaktion am Smartphone
- `VAH-P6153455` – bionischer Arm
- `VAH-P6153460` – Technologieszene im Labor
- `VAH-P6153725` – robotisches Gerät in Bewegung
- `VAH-WBOX2021` – Boxtraining, Wikimedia Commons, CC BY-SA 4.0

Keines dieser Medien darf vor vollständiger Sichtprüfung als freigegeben behandelt werden.

## Test A – Mac, Start und Navigation

Im lokalen Clone:

```bash
cd ~/Downloads/Visual-Asset-Hub-clean
git pull --ff-only
npm run starter:import
npm run check
npm run serve
```

Danach:

1. `http://127.0.0.1:4173/web/` öffnen.
2. **Lokale Verwaltung aktiv** kontrollieren.
3. prüfen, ob zwölf Assets sichtbar sind.
4. Navigation testen:
   - Bibliothek
   - Skript planen
   - Eigene Dateien
   - Prüfen
   - Medien suchen
   - Ausbau 720
   - 90 Kategorien
5. prüfen, ob jede Sektion sauber angesprungen wird.

## Test B – Kanal-Arsenal und Ausbau 720

1. Die vier Kanäle öffnen:
   - Finanzen
   - Künstliche Intelligenz
   - Elektrotechnik
   - Kampfsport
2. Nach `Aktien`, `RCD`, `Boxring`, `Muay Thai`, `Roboter` und `Schaltplan` suchen.
3. Sammlungsnamen, Tags und Suchbegriffe kontrollieren.
4. Kandidaten, Reviews und Freigaben getrennt prüfen.
5. Navigation **Ausbau 720** öffnen.
6. Zielwerte kontrollieren:
   - Finanzen 160
   - KI 160
   - Elektrotechnik 160
   - Kampfsport 240
   - Gesamt 720
7. Bei einem Kanal **Top Suchlücken vorbereiten** drücken.
8. prüfen, ob höchstens fünf konkrete Sammlungen an den Arsenal Builder übergeben werden.
9. Eine Sammlung mit genügend Review-Kandidaten darf nicht unnötig erneut als Suchlücke priorisiert werden.

## Test C – fünf Medienquellen

### Pexels

- Video · Hochformat wählen.
- gültigen Pexels-Key eingeben.
- reale Suche ausführen.
- Vorschauen und Quelle prüfen.

### Pixabay

- einmal Video und einmal Foto testen.
- gültigen Pixabay-Key eingeben.
- bei Wiederholung derselben Suche den 24-Stunden-Cache kontrollieren.

### Unsplash

- nur Fotoformat muss auswählbar sein.
- gültigen Unsplash Access Key eingeben.
- Treffer müssen Fotograf und Unsplash dokumentieren.
- beim tatsächlichen Import muss der vorgesehene Download-Endpunkt gemeldet werden.

### Openverse

- kein Key-Feld erforderlich.
- nur Fotoformat.
- nur Public Domain, CC0, CC BY oder CC BY-SA als unterstützte offene Lizenzen übernehmen.

### Wikimedia Commons

- kein Key-Feld erforderlich.
- nur Fotoformat.
- Lizenz, Quellseite und Attribution sichtbar prüfen.

Für alle Quellen gilt:

1. nichts automatisch freigeben.
2. nur visuell geeignete Treffer markieren.
3. als `review` importieren.
4. Kanal- und Sammlungs-Tags kontrollieren.
5. keine UFC-Logos, Broadcastausschnitte, fremden Eventgrafiken oder gefährlichen Weight-Cut-Inhalte blind übernehmen.

## Test D – Batch-Suche

1. In **Ausbau 720** einen Kanal wählen.
2. **Top Suchlücken vorbereiten** drücken.
3. im Builder Quelle und Format auswählen.
4. Batch starten.
5. kontrollieren, dass maximal fünf Sammlungen sequenziell durchsucht werden.
6. jede Ergebnisgruppe muss separat auswählbar sein.
7. nur ausgewählte Medien importieren.
8. nach dem Import muss der Bestand aktualisiert werden.

## Test E – Sitzungs-Keys

1. Pexels-Key eingeben und eine Suche durchführen.
2. eine zweite Pexels-Suche ohne erneute Eingabe starten.
3. dasselbe mit Pixabay und Unsplash testen.
4. **Sitzungs-Keys löschen** drücken.
5. danach muss eine neue Key-Eingabe nötig sein.
6. Browserseite neu laden; Keys dürfen danach nicht mehr vorhanden sein.
7. im Browser-Code darf weder `localStorage` noch `sessionStorage` für API-Keys benutzt werden.

## Test F – eigene Datei

1. Eine eigene Testdatei über **Eigene Dateien** bereitstellen.
2. Vorschau, Dateityp und Dateigröße prüfen.
3. Kanal und Sammlung auswählen.
4. Titel, Beschreibung und Tags eintragen.
5. Nutzungsrechte ausdrücklich bestätigen.
6. als `review` importieren.
7. kontrollieren, ob das Asset im Katalog erscheint.

## Test G – alle zwölf Starterassets prüfen

1. Navigation **Prüfen** öffnen.
2. alle zwölf Starterassets vollständig öffnen und bewerten.
3. Bei jedem Asset prüfen:
   - sichtbarer Inhalt stimmt mit Titel und Tags überein
   - Auflösung und Ausrichtung sind brauchbar
   - Personen, Logos, Marken und Kennzeichen wurden kontrolliert
   - Quelle und Lizenzseite sind nachvollziehbar
   - geplanter Einsatzkontext ist passend
4. Prüfer, Qualität und Notiz eintragen.
5. Entscheidung speichern:
   - freigeben
   - einschränken
   - archivieren
6. nach einer Entscheidung muss automatisch das nächste offene Asset erscheinen.

Für die Beta-Abnahme müssen **zwölf unterschiedliche Starter-IDs** eine dokumentierte Entscheidung besitzen.

Für `VAH-WBOX2021` zusätzlich prüfen:

- sichtbare Personen
- Attribution `Dotun55 / Wikimedia Commons`
- Lizenz CC BY-SA 4.0
- Share-Alike-Pflichten bei Bearbeitungen

## Test H – Freigabe und Negativtests

Empfohlenes erstes Freigabe-Testasset: `VAH-GCIRCU01`, sofern die Sichtprüfung bestanden wurde.

Vor Freigabe alle Pflichtpunkte bestätigen:

- Asset vollständig angesehen
- Personen, Logos und Marken geprüft
- Quelle, Lizenz und Nutzung geprüft
- geplanter Einsatzkontext geprüft

Negativtests:

- Freigabe mit fehlendem Pflichtpunkt muss blockiert werden.
- Einschränkung ohne Begründung muss blockiert werden.
- ungeprüftes Asset darf nicht in ein Medienpaket exportiert werden.
- während einer laufenden Schreibaktion muss eine zweite Schreibaktion mit HTTP 409 blockiert werden.

## Test I – Skript-Planer

1. **Skript planen** öffnen.
2. ein echtes Skript mit mindestens vier Sätzen verwenden.
3. Kanal, Zieldauer und Format wählen.
4. Shotlist erzeugen.
5. kontrollieren:
   - Szenen sinnvoll getrennt
   - letzter Zeitwert entspricht der Zieldauer
   - Sammlungen passen zum Sprechtext
   - vorhandene Assets zeigen Status
   - ungeprüfte Assets zeigen Warnung
   - fehlende Motive liefern Suchbegriffe
6. JSON, CSV und Markdown exportieren.
7. zusätzlich CLI-Test:

```bash
npm run script:plan -- \
  --channel electro \
  --file ./mein-testskript.txt \
  --duration 45 \
  --orientation vertical
```

Unter `reports/shot-plans` prüfen:

- `shotlist.json`
- `shotlist.csv`
- `shotlist.md`
- `shotlist.srt`
- `script.txt`

## Test J – Medienpaket

1. mindestens ein freigegebenes Asset favorisieren.
2. optional ein Review-Asset zusätzlich markieren und den Negativtest ausführen.
3. nur freigegebene Favoriten für das endgültige Paket verwenden.
4. verifiziertes Medienpaket erstellen.
5. unter `exports/media-packs` prüfen:

```text
media/
manifest.json
ATTRIBUTION.md
README.md
```

Im Manifest prüfen:

- Asset-ID
- Dateiname
- Dateigröße
- SHA-256
- Quelle
- Lizenz
- Attribution
- lokaler Medienpfad

## Test K – echter Content-Einsatz

1. ein freigegebenes Asset aus dem Medienpaket in einem echten Content-Projekt verwenden.
2. Projekt-ID, Projektname und Plattform dokumentieren.
3. optional Veröffentlichungslink und Nutzungsnotiz ergänzen.
4. Attribution exportieren.
5. Nutzung nach dem Neuladen kontrollieren.

## Test L – Berichte, Backup und Abschluss

```bash
npm run arsenal:expansion
npm run arsenal:report
npm run backup
npm run beta:verify
npm run check
```

Prüfen:

- `reports/arsenal-expansion-plan.json`
- `reports/arsenal-expansion-plan.csv`
- `reports/channel-coverage.json`
- `reports/channel-coverage.md`
- Beta-Bericht
- Backup-Manifest und Prüfsummen

## Abnahmekriterien

- technische lokale Projektprüfung erfolgreich
- zwölf Starterassets sichtbar
- alle zwölf Starterassets mit einer Entscheidung protokolliert
- alle vier Kanäle vertreten
- fünf Medienquellen technisch geprüft
- Openverse und Wikimedia ohne API-Key verwendbar
- Pexels/Pixabay/Unsplash-Keys nur im Seitenspeicher gehalten
- Ausbau-720-Priorisierung funktioniert
- Review-first-Logik verhindert unnötige Nachsuche
- Skript-Planer erzeugt plausible Shotlist und Exporte
- mindestens ein eigener Inbox-Import erfolgreich
- mindestens ein Asset freigegeben
- verifiziertes Medienpaket erfolgreich erzeugt
- mindestens eine echte Nutzung dokumentiert
- Attribution und Backup erfolgreich erzeugt
- `realTestComplete: true`
- keine API-Schlüssel oder vertraulichen URLs im Repository

Die Beta gilt als **real getestet**, sobald alle Kriterien erfüllt sind. Ein Merge in `main` erfolgt erst danach.
