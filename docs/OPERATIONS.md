# Praktischer Betrieb

## Normaler Start

Unter Windows `START-HERE.cmd` doppelklicken. Der Start führt automatisch aus:

1. Bereinigung alter temporärer Suchdateien
2. idempotenter Import und Zuordnung der Starterassets
3. technische Beta-Prüfung
4. Erzeugung von Arsenal-Suchplan und Abdeckungsbericht
5. statischer Website-Build
6. Start unter `http://127.0.0.1:4173`

Das Konsolenfenster muss geöffnet bleiben. Zum Beenden `STRG+C` drücken.

## Arbeitsbereiche

Die feste Navigation enthält:

- **Bibliothek** – Assets suchen, filtern, öffnen und favorisieren
- **Eigene Dateien** – lokale Medien aus `inbox` katalogisieren
- **Prüfen** – Review-Warteschlange abarbeiten
- **Pexels suchen** – neue Stockmedien finden und auswählen
- **90 Kategorien** – Lücken, Freigaben und Sammlungen verwalten

## Empfohlener täglicher Ablauf

1. Unter **Als Nächstes ausbauen** eine schwache Sammlung wählen.
2. Arsenal Builder automatisch auf diese Sammlung stellen lassen.
3. höchstens 5 bis 12 Pexels-Kandidaten abrufen.
4. nur passende Treffer als `review` importieren.
5. eigene Aufnahmen bei Bedarf nach `inbox` kopieren und katalogisieren.
6. Review-Warteschlange öffnen.
7. jedes Asset einzeln ansehen und entscheiden.
8. freigegebene Assets favorisieren.
9. Medienpaket für das konkrete Reel oder Video erzeugen.
10. nach Veröffentlichung Nutzung und Attribution dokumentieren.
11. regelmäßig Backup erstellen.

## Pexels im Browser

1. Kanal und Sammlung auswählen.
2. Format und Suchvariante wählen.
3. Pexels-Key nur für die aktuelle Anfrage eingeben.
4. Vorschauen und Quellseiten prüfen.
5. nur geeignete Treffer markieren.
6. als `review` importieren.

Der Key wird nicht gespeichert und nach Erfolg oder Fehler aus dem Eingabefeld entfernt.

## Eigene Dateien über Inbox

1. eigene Datei nach `inbox` kopieren.
2. **Eigene Dateien** öffnen.
3. Vorschau und technische Daten kontrollieren.
4. Kanal und Sammlung auswählen.
5. Titel, Beschreibung, Tags, Quelle und Notiz eintragen.
6. notwendige Nutzungsrechte bestätigen.
7. Import starten.

Unterstützte Typen umfassen gängige Videos, Rasterbilder, SVG und GIF. Binäre Videos und Bilder verwenden Git LFS; SVG-Grafiken können im normalen Repository liegen.

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

Externe Downloads werden auf Protokoll, Weiterleitungen, private Netzadressen und Größe geprüft. Bei einem Fehler wird das unfertige Paket entfernt.

Konsole:

```bash
npm run media:pack -- --ids VAH-XXXXXXXX,VAH-YYYYYYYY --name elektro-reel-01
```

## Kanal-Arsenal

Gesamten Plan erzeugen:

```bash
npm run arsenal:plan
```

Einzelnen Kanal planen:

```bash
npm run arsenal:plan -- --channel finance
npm run arsenal:plan -- --channel ai
npm run arsenal:plan -- --channel electro
npm run arsenal:plan -- --channel combat-sports
```

Kleinen Batch vorbereiten:

```bash
npm run arsenal:plan -- --channel combat-sports --max-collections 5
npm run arsenal:search -- --max-jobs 20
```

Echte Pexels-Suche starten:

```bash
npm run arsenal:search -- --execute true --max-jobs 20
```

Nur ausgewählte Treffer importieren:

```bash
npm run arsenal:import -- --input <arsenal-suchergebnis.json> --ids 12345,67890
```

Abdeckung prüfen:

```bash
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

Der Server erlaubt immer nur eine lokale Schreibaktion gleichzeitig. Während Review, Import, Medienpaket oder einer anderen Änderung erhält eine zweite Schreibanfrage HTTP 409. Nach Abschluss kann sie erneut gestartet werden.

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
