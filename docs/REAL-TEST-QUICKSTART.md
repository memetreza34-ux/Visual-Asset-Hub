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

### 1. Personen-/Themenrecherche real testen

Navigation **Thema recherchieren** öffnen und als Kampfsport-Thema eingeben:

```text
Conor McGregor
```

Danach:

- zuerst **Rechercheplan anzeigen** wählen.
- prüfen, dass sinnvolle Bereiche wie Training, Kämpfe, Presse, Wiegen/Staredown, Walkout und Portraits erscheinen.
- zusätzlich ein kurzes Testskript mit `Khabib Nurmagomedov`, `UFC 229` und `2018` einfügen.
- prüfen, dass skriptspezifische Suchbereiche entstehen.
- ohne private Keys mindestens Openverse und Wikimedia testen.
- danach Pexels-, Pixabay- und Unsplash-Keys nur für die Sitzung eingeben und alle fünf Quellen prüfen.
- **Alles recherchieren** starten.
- Bildtreffer visuell kontrollieren.
- mindestens einen Pexels- oder Pixabay-Videotreffer direkt im eingebauten Player abspielen.
- Quellseite und Rechtewarnung kontrollieren.
- prüfen, dass `ALLES-GEFUNDEN/05-THEMENRECHERCHEN/04-Kampfsport/Conor McGregor/` aufgebaut wurde.
- `00-RECHERCHEPLAN.md` und `99-EXTERNE-SUCHLINKS` kontrollieren.
- externe YouTube-/Google-/UFC-Suchlinks ausschließlich als Recherchehilfe behandeln, nicht als Nutzungsrecht.
- nur einen eindeutig gewünschten Treffer markieren und als `review` importieren; unmarkierte Treffer dürfen nicht importiert werden.

### 2. Zwölf Starterassets prüfen

- Navigation **Prüfen** öffnen.
- alle zwölf Starterassets vollständig ansehen.
- für jedes Asset eine nachvollziehbare Entscheidung speichern.
- mindestens ein eindeutig geeignetes Asset freigeben.
- das Wikimedia-Kampfsportfoto nur nach Prüfung der sichtbaren Personen und unter Beachtung von CC BY-SA 4.0 freigeben.

### 3. Fünf Medienquellen real testen

Unter **Medien suchen** mindestens eine reale Standardsuche je Quelle ausführen:

- Pexels – API-Key erforderlich
- Pixabay – API-Key erforderlich
- Unsplash – Access Key erforderlich
- Openverse – kein Key erforderlich
- Wikimedia Commons – kein Key erforderlich

Pexels und Pixabay auch mit einem Videoformat testen. Unsplash, Openverse und Wikimedia Commons nur mit Fotoformaten testen. Nur visuell brauchbare Treffer als `review` importieren; nichts blind freigeben.

### 4. Ausbau-720 prüfen

- Navigation **Ausbau 720** öffnen.
- die vier Kanalkarten und die globale Liste **Nächste Aufgaben** prüfen.
- kontrollieren, dass Review-Aufgaben vor unnötigen neuen Suchjobs priorisiert werden.
- bei einer echten Suchlücke den priorisierten Batch vorbereiten.
- kontrollieren, dass höchstens fünf priorisierte Sammlungen an den Builder übergeben werden.
- technischen Fit, Suchbegriff-Kette und manuellen Quellen-Fallback prüfen.

### 5. ALLES-GEFUNDEN prüfen

- `00-GESAMTINDEX.md`, CSV und Manifest öffnen.
- kontrollieren, dass zwölf Starterassets nach dem Starterimport enthalten sind.
- normale Arsenal-Suchfunde unter `90-GEFUNDENE-KANDIDATEN` kontrollieren.
- Themenfunde unter `05-THEMENRECHERCHEN` kontrollieren.
- mindestens eine echte lokale Dateikopie und eine externe `.url`-Verknüpfung prüfen.
- nach einem weiteren `npm run vault:build` kontrollieren, dass historische Themenfunde erhalten bleiben.

### 6. Eigenes Medium testen

- Navigation **Eigene Dateien** öffnen.
- eine eigene Testdatei auswählen oder in den lokalen Inbox-Workflow geben.
- Kanal und Sammlung wählen.
- Rechte ausdrücklich bestätigen.
- als `review` importieren.

### 7. Skript planen

- ein echtes Skript eines der vier Kanäle verarbeiten.
- vollständige Shotlist erzeugen.
- vorgeschlagene Sammlungen und vorhandene Assets kontrollieren.

### 8. Schnittpaket erstellen

- nur freigegebene Assets favorisieren.
- ein verifiziertes Medienpaket erstellen.
- Paket unter `exports/media-packs` prüfen.

### 9. Echte Nutzung

- ein freigegebenes Asset aus dem Paket in einem echten Reel, Video, Post oder einer Präsentation verwenden.
- Projekt und Plattform als Nutzung dokumentieren.
- Attribution exportieren.
- Backup erzeugen.

## Bestanden

Die Oberfläche beziehungsweise `npm run beta:verify` muss am Ende bestätigen beziehungsweise die Release-Checkliste muss dokumentieren:

- Personen-/Themenrecherche mit visueller Bild- und Video-Sichtung erfolgreich
- skriptspezifische Gegner-/Event-/Jahreszahl-Recherche erfolgreich
- alle fünf Medienquellen technisch geprüft
- `ALLES-GEFUNDEN` inklusive Themenordner und Historie geprüft
- alle zwölf Starterassets entschieden
- alle vier Kanäle mit Assets vertreten
- eigenes Medium importiert
- mindestens ein Asset freigegeben
- echtes Skript mit Shotlist verarbeitet
- verifiziertes Schnittpaket erzeugt
- echte Nutzung dokumentiert
- `realTestComplete: true`
