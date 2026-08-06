# Praktischer Betrieb

## Normaler Start

Unter Windows `START-HERE.cmd` doppelklicken. Der Start führt automatisch aus:

1. Bereinigung alter temporärer Suchdateien
2. idempotenter Import und Zuordnung der Starterassets
3. technische Prüfung inklusive Skriptplaner-Benchmark
4. Beta-Bereitschaftsbericht
5. Arsenal-Suchplan und Abdeckungsbericht
6. statischer Website-Build
7. Start unter `http://127.0.0.1:4173`

Das Konsolenfenster muss geöffnet bleiben. Zum Beenden `STRG+C` drücken.

## Arbeitsbereiche

Die feste Navigation enthält:

- **Bibliothek** – Assets suchen, filtern, öffnen und favorisieren
- **Skript planen** – Sprechtext in Szenen, Zeitbereiche und Medienvorschläge umwandeln
- **Eigene Dateien** – Medien per Drag-and-drop oder aus `inbox` katalogisieren
- **Prüfen** – Review-Warteschlange abarbeiten
- **Pexels suchen** – neue Stockmedien finden und auswählen
- **90 Kategorien** – Lücken, Freigaben und Sammlungen verwalten

## Empfohlener Produktionsablauf

1. Unter **Skript planen** einen echten Sprechtext einfügen.
2. Kanal, Format und Zieldauer wählen.
3. Shotlist erzeugen und fehlende Motive kontrollieren.
4. vorhandene gute Assets favorisieren.
5. bei Lücken über **Motiv suchen** direkt zum Arsenal Builder wechseln.
6. höchstens 5 bis 12 Pexels-Kandidaten abrufen.
7. nur passende Treffer als `review` importieren.
8. eigene Aufnahmen bei Bedarf per Drag-and-drop in die lokale Inbox übertragen.
9. Review-Warteschlange öffnen und jedes Asset einzeln entscheiden.
10. freigegebene Favoriten als Medienpaket ausgeben.
11. Asset im Reel oder Video verwenden.
12. Nutzung und Attribution dokumentieren.
13. regelmäßig Backup erstellen.

## Reel- und Skript-Planer

### Browser

1. **Skript planen** öffnen.
2. Kanal wählen.
3. Reel/Short, YouTube oder Präsentation wählen.
4. Zieldauer eintragen.
5. Sprechtext einfügen.
6. optional **Nur freigegebene Assets** aktivieren.
7. Shotlist erstellen.

Ausgaben:

- Szenen mit Start, Ende und Dauer
- empfohlener Medientyp
- passende Sammlungen
- vorhandene Asset-Vorschläge
- Pexels-Suchbegriffe bei Lücken
- Bibliotheks- und Freigabeabdeckung
- JSON, CSV und Markdown

Der eingegebene Text bleibt lokal im Browser und wird nicht automatisch gespeichert.

### Konsole und SRT-Marker

```bash
npm run script:plan -- \
  --channel electro \
  --file ./mein-reel.txt \
  --duration 45 \
  --orientation vertical
```

Ausgabe unter `reports/shot-plans`:

```text
shotlist.json
shotlist.csv
shotlist.md
shotlist.srt
script.txt
```

Der Standard speichert zusätzlich unter `.local-storage/operations` einen lokalen Abnahmenachweis ohne Sprechtext. Der Nachweis kann mit `--record-evidence false` deaktiviert werden.

### Qualitätsbenchmark

```bash
npm run script:benchmark
```

Berichte:

```text
reports/planner-benchmark/benchmark.json
reports/planner-benchmark/benchmark.md
```

Der vollständige Projektcheck verlangt mindestens 85 % Top-1- und 98 % Top-3-Treffergenauigkeit auf dem festen kanalübergreifenden Benchmark.

## Pexels im Browser

1. Kanal und Sammlung auswählen.
2. Format und Suchvariante wählen.
3. Pexels-Key nur für die aktuelle Anfrage eingeben.
4. Vorschauen und Quellseiten prüfen.
5. nur geeignete Treffer markieren.
6. als `review` importieren.

Der Key wird nicht gespeichert und nach Erfolg oder Fehler aus dem Eingabefeld entfernt.

## Eigene Dateien per Drag-and-drop

1. **Eigene Dateien** öffnen.
2. Datei in den Uploadbereich ziehen oder über den Dateidialog auswählen.
3. Dateiname, Typ und Größe kontrollieren.
4. **In lokale Inbox speichern** drücken.
5. nach dem Neuladen Vorschau und technische Daten kontrollieren.
6. Kanal und Sammlung auswählen.
7. Titel, Beschreibung, Tags, Quelle und Notiz eintragen.
8. Nutzungsrechte bestätigen.
9. als `review` importieren.

Der Browser überträgt die Rohdatei ausschließlich an `127.0.0.1`. Der Server prüft:

- Dateiname und Erweiterung
- angekündigte und tatsächliche Größe
- freien Speicher mit Reserve
- Dateisignatur
- bei SVG zusätzlich aktive und externe Inhalte
- Kollision mit bestehenden Dateinamen

Die Datei wird zuerst temporär geschrieben und erst nach bestandener Prüfung atomar in `inbox` übernommen. Gleichnamige Dateien werden nummeriert, nicht überschrieben.

## Eigene Dateien manuell über Inbox

Alternativ kann eine Datei direkt in den entpackten Ordner `inbox` kopiert werden. Danach unter **Eigene Dateien** auf **Inbox neu laden** drücken und den normalen Review-Import durchführen.

Unterstützt werden gängige Videos, Rasterbilder, SVG und GIF. Binäre Videos und Bilder verwenden Git LFS; SVG-Grafiken können im normalen Repository liegen.

Der Inbox-Inhalt wird durch `.gitignore` nicht veröffentlicht. Bei aktivierter Löschoption wird die Quelldatei nach einem erfolgreichen Import entfernt. Scheitert nur dieses spätere Löschen, bleibt der Katalogimport erfolgreich und es erscheint eine Warnung.

## Review-Warteschlange

Die Warteschlange enthält nur `review`- und `inbox`-Assets. Filterbar nach:

- Kanal
- Medientyp
- älteste oder neueste zuerst
- Qualität
- kanalweise Reihenfolge

Eine Freigabe verlangt weiterhin alle vier Prüfungen. Nach einer Entscheidung wird das nächste Asset angezeigt. Eine blinde Sammelfreigabe ist nicht vorgesehen.

## Favoriten und Medienpakete

Favoriten besitzen zwei Exportwege:

### Auswahl-JSON

Enthält Metadaten und darf Review-Assets enthalten. Nicht freigegebene Medien werden deutlich gewarnt.

### Medienpaket für den Schnitt

Enthält ausschließlich `approved`-Assets:

```text
exports/media-packs/<paketname>/
├── media/
├── manifest.json
├── ATTRIBUTION.md
└── README.md
```

Standardlimits:

- höchstens 20 Assets
- höchstens 300 MB je Datei
- höchstens 1,5 GB je Paket

Externe Downloads werden auf Protokoll, Weiterleitungen, private Netzadressen, Inhaltstyp und Größe geprüft. Bei einem Fehler wird das unfertige Paket entfernt.

Konsole:

```bash
npm run media:pack -- --ids VAH-XXXXXXXX,VAH-YYYYYYYY --name elektro-reel-01
```

## Kanal-Arsenal

```bash
npm run arsenal:plan
npm run arsenal:plan -- --channel combat-sports --max-collections 5
npm run arsenal:search -- --max-jobs 20
npm run arsenal:search -- --execute true --max-jobs 20
npm run arsenal:import -- --input <arsenal-suchergebnis.json> --ids 12345,67890
npm run arsenal:report
```

## Review über Konsole

```bash
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman
npm run asset:review -- --id VAH-XXXXXXXX --decision restrict --notes "Marke sichtbar"
```

Automatische Importe dürfen nie direkt `approved` werden.

## Nutzung und Attribution

```bash
npm run usage:add -- \
  --asset VAH-XXXXXXXX \
  --project elektro-klar-reel-01 \
  --platform tiktok \
  --url https://example.com/veroeffentlichung

npm run attribution:export -- --project elektro-klar-reel-01
```

## Backup und Wiederherstellung

```bash
npm run backup
npm run restore -- --backup backups/<zeitstempel> --dry-run true
```

Unter Windows kann `RESTORE-BACKUP.cmd` verwendet werden. Erst nach erfolgreichem Dry-Run eine echte Wiederherstellung bestätigen.

## Gleichzeitige Aktionen

Der Server erlaubt immer nur eine lokale Schreibaktion gleichzeitig. Während Upload, Review, Import, Medienpaket oder einer anderen Änderung erhält eine zweite Schreibanfrage HTTP 409. Nach Abschluss kann sie erneut gestartet werden.

## Kampfsport-Rechte

Bei UFC-, MMA-, Box- und Kickboxmaterial besonders prüfen:

- Event- und Veranstalterlogos
- Broadcast- oder Pay-per-View-Ausschnitte
- geschützte Gürtel- und Käfigdesigns
- Sponsorenlogos
- Pressekonferenzhintergründe
- grafische Verletzungen
- gefährliche Weight-Cut-Darstellungen

Generische Training-, Gym-, Boxsack-, Pratzen-, Ring- und Konditionsaufnahmen bevorzugen.
