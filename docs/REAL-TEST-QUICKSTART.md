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
- pro Szene mehrere Queries sichtbar
- abstrakte Aussagen werden bei Bedarf als symbolische Visuals markiert
- **Alle Szenen recherchieren** starten
- mindestens zwei Szenen real recherchieren
- Bilder direkt ansehen
- mindestens einen Videokandidaten direkt abspielen
- Hauptvisual auswählen
- mindestens eine Alternative auswählen
- Projekt neu öffnen und Auswahl kontrollieren
- genau einen passenden Kandidaten bewusst **als Review importieren**

Danach unter `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE/` prüfen:

- `00-SKRIPT.txt`
- `00-PROJEKT.json`
- `00-SZENENPLAN.md`
- `00-SHOTLIST.json`
- `00-SHOTLIST.csv`
- Szenenordner mit Kandidaten-INFO und Quelllinks

Anschließend zusätzlich ein längeres Skript testen:

- sequenzielle Suche
- Fortschrittsanzeige
- Stoppen
- Fortsetzen
- bereits fertige Szenen bleiben erhalten

## 2. Universelle Themenrecherche

Unter **Thema recherchieren**:

- `Conor McGregor` als **Sport / Kampf / Athletik** prüfen
- zweite andere Rechercheart prüfen, z. B. `RCD` als Technik oder `Tesla Model 3` als Produkt
- mindestens eine skriptspezifische Recherche durchführen

Erwartung später:

```text
multipleResearchTypesVerified: true
scriptSpecificTopicResearch: true
```

## 3. Fünf Quellen

Real prüfen:

- Pexels – Foto + Video
- Pixabay – Foto + Video + 24h-Cache
- Unsplash – Foto + Attribution
- Openverse – keylos
- Wikimedia Commons – keylos

Provider-Keys bleiben nur in der laufenden Browserseite und verschwinden nach Neuladen beziehungsweise **Sitzungs-Keys löschen**.

## 4. Zwölf Starterassets

Unter **Prüfen**:

- alle zwölf Starterassets ansehen
- für jedes eine Entscheidung speichern
- Personen/Marken/Quelle/Lizenz/Kontext prüfen
- mindestens ein geeignetes Asset freigeben
- Wikimedia-Starter einschließlich CC BY-SA 4.0 prüfen

## 5. Ausbau 720

- vier Kanalkarten prüfen
- 160 / 160 / 160 / 240
- Review-first prüfen
- globale nächste Aufgaben prüfen
- Video-/Fotolücken prüfen
- Batch und Fallbacks prüfen

## 6. ALLES-GEFUNDEN

Kontrollieren:

- Gesamtindex / CSV / Manifest
- `05-THEMENRECHERCHEN`
- `06-SKRIPT-PROJEKTE`
- `90-GEFUNDENE-KANDIDATEN`
- lokale Dateikopie
- externe `.url`-Links
- erneuter `vault:build` löscht Script-Visual-Projekt nicht

## 7. Eigenes Medium

- eigene Datei importieren
- Rechte bestätigen
- Import als `review`

## 8. Bestehenden Skript-Planer prüfen

- **Skript planen** öffnen
- echte Shotlist erzeugen
- Sammlungen und vorhandene Assets kontrollieren
- Exporte prüfen

## 9. Medienpaket und echte Nutzung

- nur freigegebene Assets in Medienpaket
- Manifest / SHA-256 / Attribution prüfen
- mindestens ein Asset real verwenden
- Nutzung dokumentieren
- Backup erzeugen

## 10. Abschluss

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
