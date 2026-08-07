# Realtest-Schnellstart

## Vorbereitung auf dem Mac

1. Im lokalen Clone auf Branch `agent/beta-release` wechseln.
2. `git pull --ff-only` ausführen.
3. Node.js 22 oder neuer verwenden.
4. `npm run starter:import` ausführen.
5. `npm run check` ausführen.
6. `npm run serve` starten und das Terminalfenster geöffnet lassen.
7. `http://127.0.0.1:4173/web/` öffnen.

## Test in der Weboberfläche

### 1. Zwölf Starterassets prüfen

- Navigation **Prüfen** öffnen.
- alle zwölf Starterassets vollständig ansehen.
- für jedes Asset eine nachvollziehbare Entscheidung speichern.
- mindestens ein eindeutig geeignetes Asset freigeben.
- das Wikimedia-Kampfsportfoto nur nach Prüfung der sichtbaren Personen und unter Beachtung von CC BY-SA 4.0 freigeben.

### 2. Fünf Medienquellen real testen

Unter **Medien suchen** mindestens eine reale Suche je Quelle ausführen:

- Pexels – API-Key erforderlich
- Pixabay – API-Key erforderlich
- Unsplash – Access Key erforderlich
- Openverse – kein Key erforderlich
- Wikimedia Commons – kein Key erforderlich

Pexels und Pixabay auch mit einem Videoformat testen. Unsplash, Openverse und Wikimedia Commons nur mit Fotoformaten testen. Nur visuell brauchbare Treffer als `review` importieren; nichts blind freigeben.

### 3. Ausbau-720 prüfen

- Navigation **Ausbau 720** öffnen.
- die vier Kanalkarten prüfen.
- bei einem Kanal **Top Suchlücken vorbereiten** verwenden.
- kontrollieren, dass höchstens fünf priorisierte Sammlungen an den Builder übergeben werden.
- wenn eine Sammlung bereits genügend Review-Kandidaten besitzt, zuerst diese prüfen statt weitere Medien zu sammeln.

### 4. Eigenes Medium testen

- Navigation **Eigene Dateien** öffnen.
- eine eigene Testdatei auswählen oder in den lokalen Inbox-Workflow geben.
- Kanal und Sammlung wählen.
- Rechte ausdrücklich bestätigen.
- als `review` importieren.

### 5. Skript planen

- ein echtes Skript eines der vier Kanäle verarbeiten.
- vollständige Shotlist erzeugen.
- vorgeschlagene Sammlungen und vorhandene Assets kontrollieren.

### 6. Schnittpaket erstellen

- nur freigegebene Assets favorisieren.
- ein verifiziertes Medienpaket erstellen.
- Paket unter `exports/media-packs` prüfen.

### 7. Echte Nutzung

- ein freigegebenes Asset aus dem Paket in einem echten Reel, Video, Post oder einer Präsentation verwenden.
- Projekt und Plattform als Nutzung dokumentieren.
- Attribution exportieren.
- Backup erzeugen.

## Bestanden

Die Oberfläche beziehungsweise `npm run beta:verify` muss am Ende bestätigen:

- alle zwölf Starterassets entschieden
- alle vier Kanäle mit Assets vertreten
- eigenes Medium importiert
- mindestens ein Asset freigegeben
- echtes Skript mit Shotlist verarbeitet
- verifiziertes Schnittpaket erzeugt
- echte Nutzung dokumentiert
- `realTestComplete: true`
