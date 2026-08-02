# Pexels einrichten

Die Pexels-Integration durchsucht kostenlose Fotos und Videos. Sie lädt standardmäßig **keine Originaldateien** herunter. Dadurch bleiben GitHub-Repository und Speicher klein.

## 1. Schlüssel lokal eintragen

Kopiere `.env.example` zu `.env` und trage deinen Schlüssel ein:

```env
PEXELS_API_KEY=DEIN_PEXELS_SCHLUESSEL
```

Die Datei `.env` wird durch `.gitignore` ausgeschlossen. Den Schlüssel niemals in `README.md`, Quellcode, Issues, Commits oder Chat-Nachrichten einfügen.

## 2. Suche starten

Video im Hochformat:

```bash
npm run pexels:search -- "Person arbeitet am Laptop" --type video --orientation vertical --per-page 20
```

Foto im Querformat:

```bash
npm run pexels:search -- "moderne Fabrik" --type photo --orientation horizontal --per-page 20
```

Hilfe:

```bash
npm run pexels:search -- --help
```

## 3. Ergebnis

Die Suchantwort wird lokal gespeichert:

```text
.local-storage/pexels-search/
```

Enthalten sind unter anderem:

- Pexels-ID
- Vorschau-URL
- verfügbare Auflösungen
- Urhebername und Profil
- Pexels-Quellseite
- Ausrichtung und Dauer
- notwendige Attribution

Diese Dateien werden nicht committed.

## Regeln

- In der Oberfläche muss ein gut sichtbarer Hinweis auf Pexels erscheinen.
- Urheber sollen nach Möglichkeit genannt und verlinkt werden.
- Medien dürfen nicht als eigene Stock-Bibliothek weiterverkauft werden.
- Vor der Aufnahme in den Hauptkatalog müssen Quelle und Nutzungsstatus geprüft werden.
- Originaldateien werden erst später gezielt und einzeln heruntergeladen.
