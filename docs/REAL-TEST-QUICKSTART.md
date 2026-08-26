# Realtest-Schnellstart

Zielstand: **`0.4.0-beta.7`**.

Dieser Ablauf wird erst beim späteren vollständigen lokalen Endtest verwendet.

## Vorbereitung

1. lokalen Clone auf `agent/beta-release` aktualisieren
2. `npm run starter:import`
3. `npm run check`
4. `npm run serve`
5. `http://127.0.0.1:4173/web/` öffnen

## 1. Skript → Visuals

Ein fertiges Skript von ungefähr einer Minute einfügen, z. B. **KI-Roboter bis 2035**.

Prüfen:

- nur **Fertiges Skript** ist Pflicht
- Originaltext bleibt unverändert
- sinnvolle visuelle Einheiten
- 3–5 unterschiedliche Queries pro Szene
- konkrete Namen/Events/Jahre bleiben erhalten
- symbolische B-Roll wird gekennzeichnet
- Medienmodus **Gemischt**
- mindestens zwei Szenen real recherchieren
- Bild ansehen und Video direkt abspielen
- mindestens eine einzelne Szene zeigt **Mix erfüllt** mit Video + Bild
- Hauptvisual + Alternative wählen
- **Mehr Treffer** lädt Seite 2 und danach Seite 3
- Auswahl bleibt beim Nachladen und Neuladen erhalten
- genau einen neuen Kandidaten bewusst als `review` importieren
- bestehenden Katalogtreffer nach Möglichkeit auf Verknüpfung statt Duplikat prüfen

### Kontext

```text
1. OpenAI entwickelt humanoide Roboter.
2. Sie sollen später in Fabriken arbeiten.
3. Dort übernehmen sie die Montage.
```

Erwartung: Szene 2/3 zeigen **Kontext übernommen**, relevante Queries behalten `OpenAI`, Nummerierungen bleiben im Originaltext.

### Rechercheumfang

- **Schnell:** bis 12 Kandidaten, max. 20 Szenen/Sammelbatch
- **Tief:** bis 20 Kandidaten, max. 10 Szenen/Sammelbatch
- **Maximal:** bis 30 Kandidaten, max. 6 Szenen/Sammelbatch
- ungefähr höchstens 80 theoretische Provider-Suchtasks pro Batch
- Tief versucht 3, Maximal alle 5 verfügbaren Quellen

### Langes Skript

- Auto verdichtet bei Bedarf auf max. 120 visuelle Einheiten
- vollständiges Originalskript bleibt erhalten
- Kandidatenansichten bei >20 Szenen lazy
- Stoppen / Fortsetzen
- fertige Szenen bleiben bei Fehlern erhalten
- lokale Spiegelung aktualisiert nur Root-Dateien + betroffene Szene

Danach `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE/` mit Skript, Projekt, Szenenplan, Shotlist, Szenenordnern, `searchRound`, Kontext, Auswahl und Importverknüpfungen prüfen.

## 2. Provider-Key-Härtung

- gültiger Key wird erst nach erfolgreicher Provideranfrage gemerkt
- **Sitzungs-Keys löschen**
- ungültiger Key darf nicht gemerkt werden
- Openverse/Wikimedia bestätigen keinen fremden Key
- Pixabay-Cachetreffer validiert keinen neuen Key

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
- Wikimedia – keylos + lückenlose Pagination

## 5. Zwölf Starterassets

Alle zwölf prüfen/entscheiden, mindestens ein Asset freigeben, Wikimedia-Starter inkl. CC BY-SA 4.0 prüfen.

## 6. Ausbau 720

160 / 160 / 160 / 240, Review-first, globale Aufgaben, Video-/Fotolücken, Batch/Fallbacks.

## 7. ALLES-GEFUNDEN

Gesamtindex, `05-THEMENRECHERCHEN`, `06-SKRIPT-PROJEKTE`, `90-GEFUNDENE-KANDIDATEN`, lokale Kopien und `.url`-Links prüfen. `vault:build` darf Projekte/Auswahl nicht löschen.

## 8. Eigenes Medium

Datei importieren, Rechte bestätigen, Startstatus `review`.

## 9. Bestehender Skript-Planer

Echte Shotlist, Sammlungen, vorhandene Assets und Exporte prüfen.

## 10. Medienpaket und echte Nutzung

Nur freigegebene Assets; Manifest/SHA-256/Attribution; mindestens ein Asset real verwenden; Nutzung dokumentieren; Backup erzeugen.

## 11. Abschluss

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
