# Smart Asset Discovery

Die Smart Asset Discovery ist die erste Ausbaustufe vom reinen Asset-Katalog zur aktiven Asset-Find-Pipeline.

Statt genau einen Suchbegriff an Pexels zu senden, erzeugt der Hub aus einem Thema mehrere visuelle Suchrichtungen, durchsucht Bilder und B-Rolls über mehrere Seiten, entfernt Dubletten und sortiert die Kandidaten nach Nutzbarkeit und Vielfalt.

## Schnellstart

```bash
npm run discover -- "KI ersetzt Büro-Jobs" --orientation vertical
```

Standardmäßig verwendet die Discovery:

- 8 unterschiedliche Suchrichtungen
- Videos und Fotos
- 2 Seiten pro Suchrichtung und Medientyp
- 30 Treffer pro API-Anfrage
- englische Stock-Suche (`en-US`)
- bis zu 80 gerankte Kandidaten

Damit kann ein Standardlauf theoretisch bis zu 960 Rohresultate prüfen:

```text
8 Suchrichtungen × 2 Medientypen × 2 Seiten × 30 Treffer
```

Die tatsächliche Zahl kann kleiner sein, wenn Pexels für eine Suchrichtung weniger Treffer besitzt.

## Beispiel mit größerem Suchraum

```bash
npm run discover -- \
  "industrial electrician maintenance" \
  --orientation horizontal \
  --queries 12 \
  --pages 3 \
  --per-page 40 \
  --top 100
```

## Was automatisch passiert

```text
Thema oder Szene
      ↓
Kategorie erkennen
      ↓
Suchbegriff normalisieren / wichtige deutsche Begriffe übersetzen
      ↓
mehrere visuelle Suchrichtungen erzeugen
      ↓
Pexels Video + Foto durchsuchen
      ↓
mehrere Ergebnisseiten laden
      ↓
Provider-ID-Dubletten zusammenführen
      ↓
Trefferhäufigkeit + Auflösung + Format + Videolänge bewerten
      ↓
ähnliche Suchrichtungen bei der Auswahl ausbalancieren
      ↓
gerankten Kandidaten-Pool als JSON speichern
```

## Suchplanung

Der Search Planner nutzt:

- das ursprüngliche Thema
- einfache deutsche → englische Stock-Suchbegriffe
- erkannte Hauptkategorie
- `catalog/topic-suggestions.json`
- kategoriespezifische visuelle Blickwinkel wie Wide Shot, Close-up, Hände, Arbeitsplatz, Detail oder Reaktion

Beispiel:

```text
Eingabe:
KI ersetzt Büro Jobs

Mögliche Suchrichtungen:
artificial intelligence ersetzt office jobs
KI ersetzt Büro Jobs
artificial intelligence ersetzt office jobs computer screen close up
artificial intelligence ersetzt office jobs data center servers
artificial intelligence ersetzt office jobs technology workspace
artificial intelligence ersetzt office jobs coding close up
...
```

Die V1 nutzt bewusst keinen zusätzlichen KI-Dienst. Ein späterer LLM-basierter Visual Planner kann denselben Discovery- und Provider-Layer verwenden.

## Ranking

Jeder eindeutige Kandidat erhält einen `discovery_score`.

Berücksichtigt werden unter anderem:

- Treffer über mehrere Suchrichtungen
- mehrfaches Auftauchen in den Suchergebnissen
- frühe Ergebnisseiten
- gewünschte Ausrichtung
- verfügbare Auflösung
- bei Videos eine für B-Roll brauchbare Laufzeit

Zusätzlich wird bei der finalen Auswahl ein Diversity-Penalty verwendet, damit nicht nur Kandidaten derselben Suchrichtung oder nur ein Medientyp dominieren.

## Ergebnisdatei

Die Ergebnisse werden standardmäßig lokal gespeichert:

```text
.local-storage/discovery/
```

Die JSON-Datei enthält:

- Thema
- erkannte Kategorie
- erzeugte Suchrichtungen
- Discovery-Optionen
- Anzahl API-Anfragen
- Rohresultate
- Zahl eindeutiger Kandidaten
- Fehler einzelner Suchrichtungen
- ausgewählte Bilder und B-Rolls
- Matching-Queries pro Asset
- Discovery-Score

## GitHub Actions

Über **Actions → Smart Asset Discovery → Run workflow** kann die Suche ohne lokalen Terminalbefehl gestartet werden.

Einstellbar sind:

- Thema
- Hochformat / Querformat / Quadrat / beliebig
- Bilder, Videos oder beides
- Anzahl Suchrichtungen
- Anzahl Ergebnisseiten
- Treffer pro Seite
- Größe des finalen Kandidaten-Pools

Das Resultat wird als Workflow-Artifact gespeichert.

## Aktuelle Grenze der V1

Die Discovery findet und rankt Kandidaten, lädt aber bewusst noch keine Originaldateien automatisch herunter und nimmt sie noch nicht automatisch in `catalog/assets.json` auf.

Die nächsten sinnvollen Stufen sind:

1. ausgewählte Pexels-Originale herunterladen
2. FFmpeg-Analyse automatisch ausführen
3. technische Metadaten übernehmen
4. Rechte-/Quellmetadaten vorbereiten
5. Kandidaten kontrolliert in den bestehenden Asset-Import übergeben
6. weitere Provider hinter denselben Provider-Layer hängen
