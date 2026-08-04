# Release-Checkliste

## Technische Prüfung

- [ ] `npm run check` läuft ohne Fehler
- [ ] `npm run beta:verify` meldet technisch bereit
- [ ] statische Website wird mit `npm run site:build` erzeugt
- [ ] Windows-Start über `START-HERE.cmd` funktioniert
- [ ] Suche, Filter, Favoriten, Export und Detailansicht funktionieren
- [ ] externe Video- und Bilddateien lassen sich öffnen
- [ ] keine Secrets oder signierten URLs befinden sich im Repository

## Reale Medienprüfung

- [ ] mindestens drei vertikale Videos geprüft
- [ ] mindestens drei horizontale oder quadratische Bilder geprüft
- [ ] Titel, Tags und Kategorie stimmen mit dem sichtbaren Inhalt überein
- [ ] erkennbare Personen und Marken wurden bewertet
- [ ] Quelle, Creator und Lizenzseite sind erreichbar
- [ ] mindestens ein Asset wurde protokolliert freigegeben

## Echter Content-Test

- [ ] ein freigegebenes Asset wurde in einem realen Projekt verwendet
- [ ] Nutzung wurde mit `npm run usage:add` dokumentiert
- [ ] Auswahl-Export wurde an ein anderes Content-/Editing-Projekt übergeben
- [ ] Attribution wurde mit `npm run attribution:export` erzeugt
- [ ] fertiger Content wurde auf korrekte Quellen-/Rechteangaben geprüft

## Release

- [ ] Backup wurde erzeugt
- [ ] Changelog ist aktuell
- [ ] Pull Request ist nicht mehr Draft
- [ ] alle verfügbaren Checks sind grün
- [ ] Beta-Tag oder Release wurde erstellt

Die Beta darf erst als real getestet gelten, wenn mindestens ein freigegebenes Asset in einem echten Content-Projekt eingesetzt und dokumentiert wurde.
