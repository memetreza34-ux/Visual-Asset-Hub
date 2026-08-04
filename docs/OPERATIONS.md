# Praktischer Betrieb

## Schnellstart

Unter Windows `START-HERE.cmd` doppelklicken. Danach steht die Anwendung unter `http://127.0.0.1:4173` bereit.

Während der Nutzung muss das Konsolenfenster geöffnet bleiben. Zum Beenden `STRG+C` drücken.

## Sicherer Ablauf im Browser

1. Asset öffnen und vollständig ansehen.
2. Quelle und Lizenzseite kontrollieren.
3. Die vier Pflichtprüfungen bestätigen.
4. Asset freigeben, einschränken, zurückgeben oder archivieren.
5. Nur freigegebene Assets real verwenden.
6. Projekt und Plattform direkt im Browser dokumentieren.
7. Attribution exportieren.
8. Regelmäßig ein Backup erzeugen.

Die Leiste **Lokale Verwaltung aktiv** bestätigt, dass Schreibaktionen verfügbar sind. Fehlt diese Leiste, läuft nur die statische Ansicht und es werden keine Änderungen gespeichert.

## Gezielter Pexels-Import

```bash
npm run pexels:select -- \
  --input .local-storage/pexels-search/results.json \
  --ids 12345,67890 \
  --category technology-ai \
  --tags ai,technik \
  --scopes organic-social,youtube,website
```

## Review über die Konsole

Der Browser ist der empfohlene Weg. Optional stehen weiterhin Befehle bereit:

```bash
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer Arman
npm run asset:review -- --id VAH-XXXXXXXX --decision restrict --notes "Marke sichtbar"
```

Automatische Importe dürfen nie direkt `approved` werden.

## Nutzung dokumentieren

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

Im Browser oben **Katalog-Backup erstellen** drücken oder:

```bash
npm run backup
```

Backups werden lokal unter `backups/` abgelegt und nicht automatisch zu GitHub übertragen. Jedes Backup besitzt ein Manifest mit Dateigröße und SHA-256-Prüfsumme.

## Backup wiederherstellen

Empfohlen unter Windows:

1. `RESTORE-BACKUP.cmd` doppelklicken.
2. Backup-Ordner auswählen.
3. Prüflauf abwarten.
4. Wiederherstellung ausdrücklich bestätigen.
5. Danach `START-HERE.cmd` erneut starten.

Alternativ:

```bash
npm run restore -- --backup backups/DEIN-BACKUP --dry-run true
npm run restore -- --backup backups/DEIN-BACKUP
```

Der Restore akzeptiert nur Ordner innerhalb von `backups/`. Vor der Wiederherstellung werden Manifest, JSON, Dateigrößen und SHA-256-Prüfsummen geprüft. Anschließend wird automatisch ein Sicherheitsbackup des aktuellen Zustands erstellt. Schlägt eine Validierung fehl, wird der vorherige Zustand wiederhergestellt.

## Regelmäßige Wartung

- vor größeren Importen Backup erstellen
- nach Änderungen `npm run beta:verify` ausführen
- externe Links regelmäßig mit `npm run links:check -- --strict true` prüfen
- Review-Assets nicht in echte Projekte übernehmen
- ungenutzte oder veraltete Medien archivieren
- Exportdateien und Backups nicht dauerhaft unverschlüsselt in öffentliche Cloud-Ordner legen
