# Beta-Testplan

## Ziel

Der komplette kostenlose Ablauf wird getestet:

1. Pexels durchsuchen
2. Ergebnisse als visuelle Galerie prüfen
3. konkrete Pexels-IDs auswählen
4. ausgewählte Treffer als `review`-Assets importieren
5. Asset visuell und rechtlich prüfen
6. Asset freigeben oder einschränken
7. Verwendung in einem realen Content-Projekt dokumentieren
8. Quellen-/Attributionsdatei exportieren
9. Katalog-Backup erzeugen
10. Weboberfläche und statische Testversion prüfen

## Test A – vertikale KI-B-Rolls

- Suche: `artificial intelligence technology`
- Typ: `video`
- Kategorie: `technology-ai`
- Format: `vertical`
- Suchergebnisse: `10`
- davon gezielt importieren: `3`

Erwartet:

- exakt die ausgewählten Pexels-IDs werden importiert
- Status immer `review`
- kleine Vorschaubilder
- externe MP4-Dateien statt großer GitHub-Dateien
- Pexels-Quellseite und Lizenzseite gespeichert
- keine doppelten Pexels-Quellen

## Test B – horizontale Industriebilder

- Suche: `modern factory automation`
- Typ: `photo`
- Kategorie: `industry-trades`
- Format: `horizontal`
- Suchergebnisse: `10`
- davon gezielt importieren: `3`

## Test C – Freigabe und reale Verwendung

1. Ein passendes Asset aus Test A vollständig prüfen.
2. Mit `asset:review` freigeben.
3. Mit `usage:add` einem echten Reel-, YouTube- oder Webseitenprojekt zuordnen.
4. Mit `attribution:export` Markdown und CSV erzeugen.
5. Mit `backup` eine lokale Sicherung erzeugen.

Erwartet:

- Review-Entscheidung steht in `catalog/reviews.json`
- Asset-Status ist `approved`
- Nutzung steht in `catalog/usage.json`
- Weboberfläche zeigt Nutzungshäufigkeit, Projekt und Plattform
- Quellenexport enthält Quelle, Lizenzseite und Attribution
- Backup enthält Manifest und SHA-256-Prüfsummen

## Test D – einfacher Windows-Start

1. Repository als ZIP herunterladen und entpacken.
2. `START-HERE.cmd` doppelklicken.
3. Prüfen, ob Browser und lokaler Server automatisch starten.

## Abnahmekriterien

- `npm run check` ist lokal erfolgreich
- API-Schlüssel erscheint nirgends im Code oder Protokoll
- Suchergebnis enthält `gallery.html` und `results.json`
- nur ausgewählte IDs werden importiert
- Vorschaubilder werden angezeigt
- externe Bild- und Videodateien lassen sich öffnen
- Filter, Suche, Favoriten, Nutzungssortierung und „Mehr anzeigen“ funktionieren
- Katalogbericht enthält korrekte Review- und Nutzungszahlen
- kein Pexels-Asset wird automatisch auf `approved` gesetzt
- Nutzung eines nicht freigegebenen Assets wird blockiert
- doppelte Pexels-Quellseiten werden übersprungen
- Review- und Nutzungsdaten bestehen die Betriebsdatenprüfung
- Quellenexport und Backup funktionieren

## Noch nicht Teil dieses Beta-Tests

- dauerhaftes eigenes Hosting sämtlicher Originaldateien
- Belastungstest mit zehntausenden Assets
- automatische KI-Erkennung von Motiven, Marken oder Personen
- rechtliche Einzelfallfreigabe ohne menschliche Sichtprüfung

Die Beta gilt als bestanden, sobald Test A bis D erfolgreich durchlaufen wurden und ein echtes Content-Projekt mindestens ein freigegebenes Asset verwendet hat.
