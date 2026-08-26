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

Ein fertiges Skript von ungefähr einer Minute einfügen, z. B. **KI-Roboter bis 2035**.

Prüfen:

- nur **Fertiges Skript** ist Pflicht
- Originaltext bleibt unverändert
- sinnvolle visuelle Einheiten
- 3–5 unterschiedliche Queries pro Szene
- konkrete Namen/Events/Jahre bleiben in passenden Queries
- symbolische B-Roll wird bei abstrakten Aussagen gekennzeichnet
- Medienmodus **Gemischt**
- mindestens zwei Szenen real recherchieren
- Bild ansehen und Video direkt abspielen
- mindestens eine einzelne Szene zeigt **Mix erfüllt** mit Video + Bild
- Hauptvisual + Alternative wählen
- **Mehr Treffer** lädt Seite 2, danach Seite 3
- Auswahl bleibt beim Nachladen und Neuladen erhalten
- genau einen neuen Kandidaten bewusst als `review` importieren
- bereits vorhandenen Katalogtreffer nach Möglichkeit auf Verknüpfung statt Duplikat prüfen

### Kontext kurz prüfen

```text
1. OpenAI entwickelt humanoide Roboter.
2. Sie sollen später in Fabriken arbeiten.
3. Dort übernehmen sie die Montage.
```

Erwartung:

- Szene 2/3 zeigen **Kontext übernommen**
- relevante Queries behalten `OpenAI`
- Nummerierungen bleiben im Originaltext

### Rechercheumfang kurz prüfen

- **Schnell:** bis 12 Kandidaten behalten, Sammelbatch max. 20 Szenen
- **Tief:** bis 20 Kandidaten behalten, Sammelbatch max. 10 Szenen
- **Maximal:** bis 30 Kandidaten behalten, Sammelbatch max. 6 Szenen
- Sammelbatch bleibt bei ungefähr höchstens 80 theoretischen Provider-Suchtasks
- Tief versucht nach Möglichkeit 3 Quellen, Maximal alle 5 verfügbaren Quellen

### Langes Skript

Ein mehrminütiges Skript testen:

- Auto verdichtet bei Bedarf auf max. 120 visuelle Einheiten
- vollständiges Originalskript bleibt erhalten
- Kandidatenansichten werden bei >20 Szenen lazy geladen
- Stoppen / Fortsetzen
- fertige Szenen bleiben bei Fehlern erhalten
- lokale Projektspiegelung aktualisiert nur Root-Dateien + betroffene Szene

Danach `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE/` prüfen:

- `00-SKRIPT.txt`
- `00-PROJEKT.json`
- `00-SZENENPLAN.md`
- `00-SHOTLIST.json`
- `00-SHOTLIST.csv`
- Szenenordner
- `searchRound`, Kontext, Auswahl und Importverknüpfungen

## 2. Provider-Key-Härtung

- gültigen Key eingeben und Provider erfolgreich suchen
- Key wird erst dann für die Sitzung gemerkt
- **Sitzungs-Keys löschen** prüfen
- ungültigen neuen Key scheitern lassen; er darf nicht gemerkt werden
- Openverse/Wikimedia dürfen keinen fremden Key bestätigen
- Pixabay-Cachetreffer validiert keinen neu eingegebenen Key

## 3. Universelle Themenrecherche

- `Conor McGregor` als **Sport / Kampf / Athletik**
- zweite andere Rechercheart, z. B. `RCD` oder `Tesla Model 3`
- mindestens eine skriptspezifische Recherche

Erwartung:

```text
multipleResearchTypesVerified: true
scriptSpecificTopicResearch: true
```

## 4. Fünf Quellen

- Pexels – Foto + Video + Seite 2
- Pixabay – Foto + Video + 24h-Cache + getrennte Seiten
- Unsplash – Foto + Attribution + Seite 2
- Openverse – keylos + Seite 2
- Wikimedia Commons – keylos + lückenlose Pagination

## 5. Zwölf Starterassets

- alle zwölf prüfen und entscheiden
- Personen/Marken/Quelle/Lizenz/Kontext
- mindestens ein Asset freigeben
- Wikimedia-Starter inkl. CC BY-SA 4.0 prüfen

## 6. Ausbau 720

- 160 / 160 / 160 / 240
- Review-first
- globale nächste Aufgaben
- Video-/Fotolücken
- Batch/Fallbacks

## 7. ALLES-GEFUNDEN

- Gesamtindex / CSV / Manifest
- `05-THEMENRECHERCHEN`
- `06-SKRIPT-PROJEKTE`
- `90-GEFUNDENE-KANDIDATEN`
- lokale Kopien / `.url`-Links
- erneuter `vault:build` erhält Script-Visual-Projekt, Suchseiten und Auswahl

## 8. Eigenes Medium

- Datei importieren
- Rechte bestätigen
- Startstatus `review`

## 9. Bestehenden Skript-Planer prüfen

- echte Shotlist
- Sammlungen / vorhandene Assets
- Exporte

## 10. Medienpaket und echte Nutzung

- nur freigegebene Assets
- Manifest / SHA-256 / Attribution
- mindestens ein Asset real verwenden
- Nutzung dokumentieren
- Backup erzeugen

## 11. Abschluss

Erforderlich sind insbesondere:

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
