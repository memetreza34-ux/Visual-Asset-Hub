# Release-Checkliste

## Technische Prüfung

- [ ] `npm run check` läuft auf dem aktuellen Branch ohne Fehler
- [ ] `npm run beta:verify` meldet technisch bereit
- [ ] `npm run links:check -- --strict true` meldet erreichbare externe Medien- und Quelllinks
- [ ] statische Website wird mit `npm run site:build` erzeugt
- [ ] Windows-Start über `START-HERE.cmd` funktioniert
- [ ] Suche, Schnellfilter, Favoriten, Auswahl-Export und Detailansicht funktionieren
- [ ] externe Videos und lokale SVG-Grafiken lassen sich öffnen
- [ ] keine Secrets oder signierten URLs befinden sich im Repository
- [ ] Katalog und Suchindex enthalten dieselben Asset-IDs

## Reale Medienprüfung

- [x] mindestens drei vertikale Videos als Testassets vorhanden
- [x] mindestens drei horizontale statische Bilder/Grafiken als Testassets vorhanden
- [ ] alle drei Videos vollständig abgespielt und bewertet
- [ ] alle drei Originalgrafiken in der Weboberfläche visuell kontrolliert
- [ ] Titel, Tags und Kategorie stimmen mit dem sichtbaren Inhalt überein
- [ ] erkennbare Personen und Marken wurden bewertet
- [ ] Pexels-Quelle, Creator und Lizenzseite sind erreichbar
- [ ] mindestens ein Asset wurde protokolliert freigegeben

## Echter Content-Test

- [ ] ein freigegebenes Asset wurde in einem realen Projekt verwendet
- [ ] Nutzung wurde mit `npm run usage:add` oder dem GitHub-Workflow dokumentiert
- [ ] Favoriten-Auswahl wurde als JSON exportiert und an ein Content-/Editing-Projekt übergeben
- [ ] Attribution wurde mit `npm run attribution:export` erzeugt
- [ ] fertiger Content wurde auf korrekte Quellen-/Rechteangaben geprüft

## Release

- [ ] Backup wurde erzeugt
- [ ] Changelog ist aktuell
- [ ] Pull Request ist nicht mehr Draft
- [ ] alle verfügbaren Checks sind grün
- [ ] GitHub-Actions-Runner-Blocker ist geklärt oder die lokale Abnahme ist vollständig dokumentiert
- [ ] Beta-Tag oder Release wurde erstellt

Die Beta darf erst als **real getestet** gelten, wenn mindestens ein vollständig geprüftes und freigegebenes Asset in einem echten Content-Projekt eingesetzt und dokumentiert wurde.
