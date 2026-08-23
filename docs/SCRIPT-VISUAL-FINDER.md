# Script Visual Finder

Stand: `0.4.0-beta.7`

## Zweck

**Skript rein → Visuals raus.**

Der Nutzer liefert ein fertiges Skript. Visual Asset Hub schreibt, verbessert, ergänzt oder ersetzt diesen Text nicht. Die Funktion dient ausschließlich dazu, für den vorhandenen Text geeignete Bilder und B-Rolls zu recherchieren und für den Schnitt zu organisieren.

## Workflow

```text
fertiges Skript
→ visuelle Einheiten
→ visuelle Absicht
→ mehrere Suchqueries
→ Providerrecherche
→ Kandidaten pro Szene
→ Hauptvisual / Alternativen
→ Review-Import
→ lokale Shotlist / Projektablage
```

## Eingabe

Pflicht:

- fertiges Skript

Optional beziehungsweise vorbelegt:

- Projekttitel
- Zuordnung: Auto, Allgemein, Finanzen, KI, Elektrotechnik, Kampfsport
- Szenenmodus: Auto, Satzweise, Absatzweise
- Format: vertikal oder horizontal
- Medienpräferenz: gemischt, Video, Bild
- Rechercheumfang: Schnell, Tief, Maximal
- Treffer je Provider-Suche
- Pexels-/Pixabay-/Unsplash-Sitzungskeys

## Grenzen

- maximal 40.000 Skriptzeichen
- maximal 120 visuelle Einheiten
- keine automatische Skripterstellung
- keine automatische Inhaltsfreigabe
- keine automatische Rechtefreigabe
- keine automatische Auswahl eines Hauptvisuals

## Visuelle Analyse

Pro Einheit werden lokal erzeugt:

- Originaltext der visuellen Einheit
- geschätzter Zeitbereich
- visuelle Absicht
- Entitäten
- Konzepte
- visuelle Kategorie
- bevorzugter Medientyp
- 3–5 unterschiedliche Queries
- Kennzeichnung symbolischer / kontextueller B-Roll

Unterstützte interne Visualrichtungen umfassen unter anderem Person, Produkt, Ort, Event, Technik, Finanzen, Historie, Prozess, Action und abstrakte Konzepte.

## Provider

Es werden die bestehenden Adapter wiederverwendet:

| Provider | Bilder | Videos | Key |
|---|---:|---:|---:|
| Pexels | ja | ja | ja |
| Pixabay | ja | ja | ja |
| Unsplash | ja | nein | ja |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pixabay verwendet weiterhin den bestehenden 24-Stunden-Cache.

## Recherche pro Szene

Die Suche feuert nicht blind jede Query gegen jede Quelle ab.

### Schnell

- Ziel: ungefähr 4 eindeutige Kandidaten
- mindestens 1 Provider
- maximal 4 Suchtasks pro Szene

### Tief

- Ziel: ungefähr 6 Kandidaten
- mindestens 2 Provider
- maximal 8 Suchtasks pro Szene

### Maximal

- Ziel: ungefähr 8 Kandidaten
- mindestens 3 Provider
- maximal 12 Suchtasks pro Szene

Sobald das Kandidatenziel und die gewünschte Providerbreite erreicht sind, endet der Suchlauf für diese Szene.

## Lange Skripte

Der Browser recherchiert Szene für Szene sequenziell.

Dadurch:

- keine unkontrollierte Request-Explosion
- Fortschritt sichtbar
- Recherche stoppbar
- später fortsetzbar
- fertige Szenen bleiben gespeichert
- einzelne Providerfehler zerstören kein komplettes Projekt

## Kandidaten

Die Weboberfläche zeigt pro Treffer:

- Bild oder Video-Player
- Titel
- Provider
- Medientyp
- technischer Fit
- verwendete Query
- Creator soweit vorhanden
- Quellseite
- Wiederverwendungshinweis

Der Nutzer kann einen Kandidaten als **Hauptvisual** oder **Alternative** markieren.

Bereits in anderen Szenen vorkommende Kandidaten werden niedriger priorisiert, aber nicht vollständig verboten.

## Import

Ein Kandidat wird nur nach ausdrücklichem Klick importiert.

Der Import verwendet die vorhandene Arsenal-Importpipeline und setzt das Asset auf:

```text
review
```

Importierte Katalog-Asset-IDs werden im Script-Visual-Projekt am Kandidaten gespeichert.

## Lokale Persistenz

Arbeitsdaten:

```text
.local-storage/script-visual-projects/
```

Menschenlesbare Spiegelung:

```text
ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE/
```

Pro Projekt:

```text
00-SKRIPT.txt
00-PROJEKT.json
00-SZENENPLAN.md
00-SHOTLIST.json
00-SHOTLIST.csv
001-SCENE-001/
002-SCENE-002/
...
```

`vault:build` bewahrt diese Projekte.

## API-Sicherheit

Die API liegt unter:

```text
/script-visual-api/
```

Sie ist Teil derselben lokalen Schutzarchitektur:

- Loopback-only
- Same-Origin für Schreibaktionen
- `X-VAH-Token`
- gemeinsame Server-Schreibsperre
- begrenzte Requestgröße

Provider-Keys werden nicht in Projekten oder Suchmetadaten gespeichert.

## Rechte

Ein Suchtreffer ist keine Veröffentlichungserlaubnis.

Vor Freigabe weiterhin prüfen:

- Urheber / Lizenz
- Attribution
- Personen
- Marken / Logos
- Events / Veranstalter
- Broadcastmaterial
- Kontext

Symbolische B-Rolls dürfen nicht als Beleg dafür dargestellt werden, dass sie das im Skript genannte konkrete Ereignis zeigen.

## Beta-Abnahme

`beta:verify` verlangt für beta.7 zusätzlich:

```text
scriptVisualProjectGenerated: true
scriptVisualMultipleScenesSearched: true
scriptVisualMixedMediaFound: true
scriptVisualReviewImported: true
```

Diese Kriterien können erst durch den späteren echten lokalen Browser-/API-Test erfüllt werden.
