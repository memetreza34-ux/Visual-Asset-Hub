# Praktischer Betrieb

## Normaler Start

Unter Windows `START-HERE.cmd` doppelklicken. Der Start führt automatisch aus:

1. idempotenter Import des Finanz-/KI-Starterpakets
2. technische Beta-Prüfung
3. Erzeugung des Arsenal-Suchplans
4. Erzeugung des Kanal-Abdeckungsberichts
5. statischer Website-Build
6. Start der lokalen Bibliothek unter `http://127.0.0.1:4173`

## Sicherer Arbeitsablauf

1. Kanal und Sammlung auswählen.
2. Suchbegriffe prüfen oder den Arsenal-Plan erzeugen.
3. Pexels in kleinen Batches durchsuchen.
4. Nur visuell passende Treffer auswählen.
5. Treffer als `review` importieren.
6. Inhalt, Qualität, Personen, Marken und Rechte prüfen.
7. Asset freigeben oder einschränken.
8. Jede reale Nutzung dokumentieren.
9. Attribution exportieren.
10. Regelmäßig ein Backup erzeugen.

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

Berichte:

```text
reports/arsenal-plan.json
reports/arsenal-plan.csv
reports/channel-coverage.json
reports/channel-coverage.md
```

## Normaler Pexels-Einzelimport

```bash
npm run pexels:select -- \
  --input .local-storage/pexels-search/results.json \
  --ids 12345,67890 \
  --category artificial-intelligence \
  --tags ai,technik \
  --scopes organic-social,youtube,website
```

## Review

Bevorzugt direkt in der lokalen Weboberfläche durchführen. Alternativ:

```bash
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman
npm run asset:review -- --id VAH-XXXXXXXX --decision restrict --notes "Marke sichtbar"
```

Automatische Importe dürfen nie direkt `approved` werden.

## Nutzung dokumentieren

Bevorzugt direkt im Browser. Alternativ:

```bash
npm run usage:add -- \
  --asset VAH-XXXXXXXX \
  --project elektro-klar-reel-01 \
  --platform tiktok \
  --url https://example.com/veroeffentlichung
```

## Quellenliste exportieren

```bash
npm run attribution:export -- --project elektro-klar-reel-01
```

Die Dateien erscheinen unter `exports/` als Markdown und CSV.

## Backup

```bash
npm run backup
```

Backups werden unter `backups/` abgelegt und nicht automatisch zu GitHub übertragen.

## Wiederherstellung

Unter Windows `RESTORE-BACKUP.cmd` verwenden oder zunächst einen Dry-Run ausführen:

```bash
npm run restore -- --backup backups/<zeitstempel> --dry-run true
```

Erst nach erfolgreichem Dry-Run die Wiederherstellung bestätigen.

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
