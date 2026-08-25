# Realtest-Schnellstart

Zielstand: **`0.4.0-beta.7`**.

Dieser Ablauf wird erst beim späteren vollständigen lokalen Endtest verwendet.

## Vorbereitung

1. lokalen Clone auf `agent/beta-release` aktualisieren
2. `npm run starter:import`
3. `npm run check`
4. `npm run serve`
5. `http://127.0.0.1:4173/web/` öffnen

## 1. Skript → Visuals real testen

Navigation **Skript → Visuals** öffnen.

Ein fertiges Skript von ungefähr einer Minute einfügen, z. B. über **KI-Roboter bis 2035**.

Prüfen:

- nur **Fertiges Skript** ist Pflicht
- Projekt erstellen
- sinnvolle Szenen / visuelle Einheiten erscheinen
- Originaltext wird nicht umgeschrieben
- Nummerierungen/Aufzählungszeichen bleiben im Szenen-Originaltext erhalten
- pro Szene mehrere Queries sichtbar
- abstrakte Aussagen werden bei Bedarf als symbolische Visuals markiert
- Medienmodus **Gemischt** verwenden
- **Alle Szenen recherchieren** starten
- mindestens zwei Szenen real recherchieren
- Bilder direkt ansehen
- mindestens einen Videokandidaten direkt abspielen
- mindestens eine Szene zeigt **Mix erfüllt** mit Video + Bild
- Hauptvisual auswählen
- mindestens eine Alternative auswählen
- bei einer Szene **Mehr Treffer** drücken und prüfen, dass Seite 2 statt erneut Seite 1 geladen wird
- noch einmal **Mehr Treffer** und Seite 3 prüfen
- Hauptvisual/Alternative müssen beim Nachladen erhalten bleiben
- Projekt neu öffnen und Auswahl sowie Suchseite kontrollieren
- genau einen passenden neuen Kandidaten bewusst **als Review importieren**
- wenn möglich zusätzlich einen bereits im Katalog vorhandenen Treffer testen: er muss verknüpft statt dupliziert werden

Danach unter `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE/` prüfen:

- `00-SKRIPT.txt`
- `00-PROJEKT.json`
- `00-SZENENPLAN.md`
- `00-SHOTLIST.json`
- `00-SHOTLIST.csv`
- Szenenordner mit Kandidaten-INFO und Quelllinks
- `searchRound` entspricht der zuletzt erfolgreichen Suchseite

Anschließend zusätzlich ein längeres Skript testen:

- sequenzielle Suche
- Fortschrittsanzeige
- Stoppen
- Fortsetzen
- bereits fertige Szenen bleiben erhalten
- einzelne Szenen können später separat mit weiteren Suchseiten vertieft werden

Rechercheumfang kurz gegenprüfen:

- **Schnell** bleibt sparsam
- **Tief** versucht nach Möglichkeit drei verfügbare Quellen
- **Maximal** versucht nach Möglichkeit alle fünf tatsächlich verfügbaren Quellen

## 2. Provider-Key-Härtung kurz prüfen

Für mindestens einen Key-Provider:

- gültigen Key eingeben und erfolgreiche Suche durchführen
- prüfen, dass der Key für die Sitzung gemerkt wird
- **Sitzungs-Keys löschen** prüfen
- absichtlich ungültigen neuen Key verwenden und Suche scheitern lassen
- der ungültige Key darf danach nicht als gespeichert gelten
- ein erfolgreicher Openverse-/Wikimedia-Lauf darf den falschen Key nicht bestätigen

Bei Pixabay zusätzlich: Ein reiner Cachetreffer darf einen neu eingegebenen Key nicht als validiert markieren.

## 3. Universelle Themenrecherche

Unter **Thema recherchieren**:

- `Conor McGregor` als **Sport / Kampf / Athletik** prüfen
- zweite andere Rechercheart prüfen, z. B. `RCD` als Technik oder `Tesla Model 3` als Produkt
- mindestens eine skriptspezifische Recherche durchführen

Erwartung später:

```text
multipleResearchTypesVerified: true
scriptSpecificTopicResearch: true
```

## 4. Fünf Quellen

Real prüfen:

- Pexels – Foto + Video + neue Treffer auf Seite 2
- Pixabay – Foto + Video + 24h-Cache + getrennte Suchseiten
- Unsplash – Foto + Attribution + neue Treffer auf Seite 2
- Openverse – keylos + neue Treffer auf Seite 2
- Wikimedia Commons – keylos + lückenlose Pagination über `gsroffset`

Provider-Keys bleiben nur in der laufenden Browserseite und verschwinden nach Neuladen beziehungsweise **Sitzungs-Keys löschen**.

## 5. Zwölf Starterassets

Unter **Prüfen**:

- alle zwölf Starterassets ansehen
- für jedes eine Entscheidung speichern
- Personen/Marken/Quelle/Lizenz/Kontext prüfen
- mindestens ein geeignetes Asset freigeben
- Wikimedia-Starter einschließlich CC BY-SA 4.0 prüfen

## 6. Ausbau 720

- vier Kanalkarten prüfen
- 160 / 160 / 160 / 240
- Review-first prüfen
- globale nächste Aufgaben prüfen
- Video-/Fotolücken prüfen
- Batch und Fallbacks prüfen

## 7. ALLES-GEFUNDEN

Kontrollieren:

- Gesamtindex / CSV / Manifest
- `05-THEMENRECHERCHEN`
- `06-SKRIPT-PROJEKTE`
- `90-GEFUNDENE-KANDIDATEN`
- lokale Dateikopie
- externe `.url`-Links
- erneuter `vault:build` löscht Script-Visual-Projekt nicht
- Suchseite, Auswahl und Importverknüpfungen bleiben erhalten

## 8. Eigenes Medium

- eigene Datei importieren
- Rechte bestätigen
- Import als `review`

## 9. Bestehenden Skript-Planer prüfen

- **Skript planen** öffnen
- echte Shotlist erzeugen
- Sammlungen und vorhandene Assets kontrollieren
- Exporte prüfen

## 10. Medienpaket und echte Nutzung

- nur freigegebene Assets in Medienpaket
- Manifest / SHA-256 / Attribution prüfen
- mindestens ein Asset real verwenden
- Nutzung dokumentieren
- Backup erzeugen

## 11. Abschluss

Am Ende müssen insbesondere folgende Kriterien wahr sein:

```text
scriptVisualProjectGenerated: true
scriptVisualMultipleScenesSearched: true
scriptVisualMixedMediaFound: true
scriptVisualReviewImported: true
multipleResearchTypesVerified: true
scriptSpecificTopicResearch: true
starterAssetsReviewed: true
verifiedMediaPackCreated: true
realUsageRecorded: true
realTestComplete: true
```

Erst danach PR #3 aus Draft nehmen und nach `main` mergen.
