# Beta-Testplan

## Ziel

Der komplette kostenlose Ablauf wird getestet:

1. Pexels durchsuchen
2. Ergebnisse als visuelle Galerie prüfen
3. ausgewählte Treffer als `review`-Assets importieren
4. Import über einen Pull Request kontrollieren
5. statische Katalog-Testversion erzeugen
6. Suche, Filter, Favoriten und Medienansicht prüfen

## Test A – vertikale KI-B-Rolls

- Suche: `artificial intelligence technology`
- Typ: `video`
- Kategorie: `technology-ai`
- Format: `vertical`
- Anzahl: `3`

Erwartet:

- drei neue Katalogeinträge
- Status immer `review`
- kleine lokale Vorschaubilder
- externe MP4-Dateien statt großer GitHub-Dateien
- Pexels-Quellseite und Lizenzseite gespeichert
- keine doppelten Pexels-Quellen

## Test B – horizontale Industriebilder

- Suche: `modern factory automation`
- Typ: `photo`
- Kategorie: `industry-trades`
- Format: `horizontal`
- Anzahl: `3`

## Abnahmekriterien

- alle GitHub-Prüfungen sind grün
- API-Schlüssel erscheint nirgends im Code oder Protokoll
- Such-Artifact enthält `gallery.html` und `results.json`
- Import erzeugt einen Branch und möglichst automatisch einen Pull Request
- Vorschaubilder werden im Katalog angezeigt
- externe Bild- und Videodateien lassen sich öffnen
- Filter, Suche, Favoriten und „Mehr anzeigen“ funktionieren
- Katalogbericht enthält korrekte Zahlen
- kein Pexels-Asset wird automatisch auf `approved` gesetzt
- doppelte Pexels-Quellseiten werden übersprungen

## Noch nicht Teil des Beta-Tests

- dauerhaftes eigenes Hosting sämtlicher Originaldateien
- Belastungstest mit zehntausenden Assets
- automatische KI-Erkennung von Motiven, Marken oder Personen
- rechtliche Einzelfallfreigabe ohne menschliche Sichtprüfung
- Integration in ein reales Video-Editing-Projekt

Die Beta gilt als bestanden, sobald Test A und Test B erfolgreich durchlaufen wurden und ein realer Content-Workflow mindestens ein katalogisiertes Asset verwendet hat.
