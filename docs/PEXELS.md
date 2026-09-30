# Pexels einrichten

Visual Asset Hub kann Pexels nach kostenlosen Fotos und Videos durchsuchen und **gezielt einzelne Assets** in die lokale Inbox laden.

## 1. API-Key lokal eintragen

Kopiere `.env.example` zu `.env` und trage deinen Pexels-Key ein:

```env
PEXELS_API_KEY=DEIN_PEXELS_SCHLUESSEL
```

`.env` ist über `.gitignore` ausgeschlossen. Den Schlüssel nicht in Quellcode, README, Issues oder Commits speichern.

## 2. Nur suchen

```bash
npm run pexels:search -- "Person arbeitet am Laptop" --type video --orientation vertical --per-page 20
```

Die Suchantwort landet unter:

```text
.local-storage/pexels-search/
```

## 3. Ein Asset direkt in die Inbox laden

Erstes passendes vertikales Video:

```bash
npm run pexels:grab -- "office worker laptop" --orientation vertical
```

Drittes Suchergebnis:

```bash
npm run pexels:grab -- "office worker laptop" --orientation vertical --pick 3
```

Foto:

```bash
npm run pexels:grab -- "Berlin skyline" --type photo --pick 2
```

Der Downloader bevorzugt für Videos eine sinnvolle HD/Full-HD-Variante statt automatisch die größte 4K-Datei zu laden. Die Maximalgröße kann angepasst werden:

```bash
npm run pexels:grab -- "factory machines" --max-dimension 2160
```

Nach dem Download liegen:

- das Medium unter `inbox/`
- Provider-/Creator-/Lizenzdaten lokal unter `.local-storage/inbox-source/`

Danach im Browser **Inbox neu scannen**. Die Providerdaten werden in den Review-Datensatz übernommen und beim Import serverseitig geschützt, damit Pexels-Medien nicht versehentlich als eigene Produktion gespeichert werden.

## Rechte und API-Regeln

Pexels-Inhalte bleiben Pexels-/Creator-Inhalte. Visual Asset Hub speichert deshalb Quelle und Provider-ID mit. Die Integration ist für das gezielte Finden von Produktionsassets gedacht, nicht für massenhaftes Spiegeln der Pexels-Bibliothek.

Vor produktiver Veröffentlichung gelten immer die aktuellen Pexels-Lizenz- und API-Bedingungen.
