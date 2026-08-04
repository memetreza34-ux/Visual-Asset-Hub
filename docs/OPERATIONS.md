# Praktischer Betrieb

## Sicherer Ablauf

1. Pexels durchsuchen und die erzeugte `gallery.html` ansehen.
2. Nur passende Pexels-IDs gezielt importieren.
3. Importierte Assets bleiben auf `review`.
4. Inhalt, Qualität, erkennbare Personen, Marken und Nutzungskontext prüfen.
5. Asset freigeben oder einschränken.
6. Jede reale Nutzung dokumentieren.
7. Für jedes Projekt eine Quellen-/Attributionsdatei exportieren.

## Gezielter Pexels-Import

```bash
npm run pexels:select -- \
  --input .local-storage/pexels-search/results.json \
  --ids 12345,67890 \
  --category technology-ai \
  --tags ai,technik \
  --scopes organic-social,youtube,website
```

## Review

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

```bash
npm run backup
```

Backups werden lokal unter `backups/` abgelegt und nicht automatisch zu GitHub übertragen.
