# Beta-Testplan

## Ziel

Der komplette kostenlose Ablauf wird real geprüft:

1. Visual Asset Hub unter Windows starten
2. elf Starterassets ansehen und entscheiden
3. die vier Kanalbibliotheken und 90 Sammlungen durchsuchen
4. eine Pexels-Suche pro Kanal durchführen
5. eine eigene lokale Datei über `inbox` importieren
6. mindestens ein Asset freigeben
7. ein verifiziertes Medienpaket für den Schnitt erzeugen
8. ein Asset in einem echten Content-Projekt verwenden
9. Nutzung, Attribution und Backup dokumentieren

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

## Test A – Windows, Start und Navigation

1. Branch `agent/beta-release` herunterladen und entpacken.
2. Node.js 22 oder neuer installieren.
3. `START-HERE.cmd` doppelklicken.
4. Prüfen, ob `http://127.0.0.1:4173` geöffnet wird.
5. Kontrollieren, ob **Lokale Verwaltung aktiv** angezeigt wird.
6. Prüfen, ob elf Assets sichtbar sind.
7. Kontrollieren, ob Beta-Fortschritt und offene Aufgaben angezeigt werden.
8. Die feste Navigation testen:
   - Bibliothek
   - Eigene Dateien
   - Prüfen
   - Pexels suchen
   - 90 Kategorien
9. Prüfen, ob die jeweilige Sektion sauber angesprungen wird.

## Test B – Kanal-Arsenal und Lückensteuerung

1. Die vier Kanal-Tabs öffnen:
   - Finanzen
   - Künstliche Intelligenz
   - Elektrotechnik
   - Kampfsport
2. Nach `Aktien`, `RCD`, `Boxring`, `Muay Thai`, `Roboter` und `Schaltplan` suchen.
3. Prüfen, ob Sammlungsnamen, Tags und Suchbegriffe stimmen.
4. Kontrollieren, ob Kandidaten und Freigaben getrennte Fortschrittsbalken besitzen.
5. `Nur unvollständige Sammlungen` aktivieren und deaktivieren.
6. Sortierungen testen:
   - größte Lücken
   - meiste Freigaben
   - meiste Reviews
   - alphabetisch
7. Unter **Als Nächstes ausbauen** eine Empfehlung anklicken.
8. Prüfen, ob der Arsenal Builder automatisch auf den richtigen Kanal und die richtige Sammlung gestellt wird.

## Test C – Pexels Arsenal Builder

Je eine kleine Suche mit höchstens fünf Treffern durchführen:

- Finanzen → Budget und Sparen
- KI → humanoide Roboter
- Elektrotechnik → LS, RCD und Schutzgeräte
- Kampfsport → Boxtraining

Für jede Suche:

1. Kanal und Sammlung wählen.
2. `Video · Hochformat` wählen.
3. Pexels-Key lokal eingeben.
4. Suche starten.
5. Prüfen, ob der Key danach aus dem Feld entfernt wurde.
6. Vorschauen und Quellseiten ansehen.
7. nur einen geeigneten Treffer markieren.
8. als `review` importieren.
9. kontrollieren, ob Kanal- und Sammlungs-Tags korrekt gesetzt wurden.

Keine UFC-Logos, Broadcastausschnitte, fremden Eventgrafiken oder gefährlichen Weight-Cut-Inhalte importieren.

## Test D – Eigene Datei über Inbox

1. Eine eigene Testdatei nach `inbox` kopieren, zum Beispiel ein selbst aufgenommenes Video oder ein eigenes Bild.
2. In der Navigation **Eigene Dateien** öffnen.
3. `Inbox neu laden` drücken.
4. Prüfen, ob Vorschau, Dateityp und Dateigröße sichtbar sind.
5. Kanal und Sammlung auswählen.
6. Titel, Beschreibung, Tags und Quelle eintragen.
7. Nutzungsrechte ausdrücklich bestätigen.
8. Import als `review` starten.
9. Prüfen, ob die Datei danach im Katalog sichtbar ist.
10. Bei aktivierter Löschoption kontrollieren:
    - die Datei wurde aus `inbox` entfernt, oder
    - bei einem Löschproblem erscheint nur eine Warnung, obwohl der Katalogimport erfolgreich bleibt.
11. Binäre Videos und Bilder müssen als Git-LFS-Medien eingeordnet werden; SVG-Grafiken dürfen im normalen Repository liegen.

## Test E – Schnellprüfung aller Starterassets

1. Navigation **Prüfen** öffnen.
2. Nacheinander nach Finanzen, KI und Elektrotechnik filtern.
3. Alle elf Starterassets vollständig öffnen und bewerten.
4. Bei jedem Asset prüfen:
   - sichtbarer Inhalt stimmt mit Titel und Tags überein
   - Auflösung und Ausrichtung sind brauchbar
   - Personen, Logos, Marken und Kennzeichen wurden kontrolliert
   - Quelle und Lizenzseite sind erreichbar
   - der geplante Einsatzkontext ist passend
5. Prüfer, Qualität und Notiz eintragen.
6. Eine Entscheidung speichern:
   - freigeben
   - einschränken
   - archivieren
   - überspringen und später erneut prüfen
7. Prüfen, ob nach einer Entscheidung automatisch das nächste Asset erscheint.

Für die Beta-Abnahme müssen alle elf unterschiedlichen Starter-IDs eine dokumentierte Entscheidung besitzen.

## Test F – Freigabe und Negativtests

Empfohlenes erstes Freigabe-Testasset: `VAH-GCIRCU01`, da es eine eigene Grafik ohne Personen oder fremde Marken ist.

1. Asset vollständig ansehen.
2. Alle vier Pflichtpunkte bestätigen:
   - Asset vollständig angesehen
   - Personen, Logos und Marken geprüft
   - Quelle, Lizenz und Nutzung geprüft
   - geplanter Einsatzkontext geprüft
3. `Freigeben & weiter` drücken.

Negativtests:

- Freigabe mit fehlendem Pflichtpunkt muss blockiert werden.
- Einschränkung ohne Begründung muss blockiert werden.
- Ungeprüftes Asset darf nicht in ein Medienpaket exportiert werden.
- Während einer laufenden Schreibaktion muss eine zweite Schreibaktion mit HTTP 409 blockiert werden.

## Test G – Auswahl und Medienpaket

1. Mindestens ein freigegebenes Asset als Favorit markieren.
2. Optional ein noch ungeprüftes Asset zusätzlich markieren.
3. `Auswahl exportieren` testen; die JSON-Datei darf Review-Assets enthalten, muss sie aber warnend kennzeichnen.
4. `Medienpaket erstellen` drücken.
5. Prüfen, ob ein Review-Asset das Paket blockiert.
6. Danach nur freigegebene Favoriten auswählen.
7. Einen Paketnamen eingeben.
8. Paket unter `exports/media-packs` kontrollieren.

Erforderliche Inhalte:

```text
media/
manifest.json
ATTRIBUTION.md
README.md
```

Im Manifest prüfen:

- Asset-ID und standardisierter Dateiname
- Dateigröße
- SHA-256-Prüfsumme
- Quelle und Quellseite
- Lizenzstatus und Lizenzseite
- Attribution
- lokaler Medienpfad

## Test H – echter Content-Einsatz

1. Ein freigegebenes Asset aus dem Medienpaket in einem echten Reel, Short, Video, Beitrag, einer Website oder Präsentation verwenden.
2. Dasselbe Asset in Visual Asset Hub öffnen.
3. Projekt-ID, Projektname und Plattform eintragen.
4. optional Veröffentlichungslink und Nutzungsnotiz ergänzen.
5. `Nutzung speichern` drücken.
6. Attribution exportieren.
7. Prüfen, ob Nutzung, Projekt und Plattform nach dem Neuladen sichtbar sind.

## Test I – Arsenal-Plan und Abdeckung

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

## Test J – Backup und Wiederherstellung

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
npm run check
```

## Abnahmekriterien

- technische Projektprüfung erfolgreich
- elf Starterassets sichtbar
- alle elf Starterassets mit einer Entscheidung protokolliert
- feste Arbeitsbereich-Navigation funktioniert
- vier Kanalbibliotheken und 90 Sammlungen sichtbar
- Lückenempfehlung konfiguriert den Arsenal Builder korrekt
- vier kleine Pexels-Suchen erfolgreich
- mindestens ein eigener Inbox-Import erfolgreich
- Schnellprüfung wechselt nach Entscheidungen weiter
- mindestens ein Asset freigegeben
- Auswahl- und Attributions-Export funktionieren
- verifiziertes Medienpaket erfolgreich erzeugt
- mindestens eine echte Nutzung dokumentiert
- Backup erfolgreich erzeugt
- Beta-Bericht meldet `realTestComplete: true`
- keine API-Schlüssel oder vertraulichen URLs im Repository

Die Beta gilt als **real getestet**, sobald alle Kriterien erfüllt sind. Ein Merge in `main` erfolgt erst danach.
