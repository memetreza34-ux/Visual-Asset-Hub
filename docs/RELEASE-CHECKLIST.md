# Release-Checkliste

## Technische Prüfung

- [ ] `npm run check` läuft ohne Fehler
- [ ] `npm run beta:verify` meldet technisch bereit
- [ ] `npm run arsenal:validate` bestätigt alle Kanaldateien
- [ ] `npm run arsenal:plan` erzeugt JSON und CSV
- [ ] `npm run arsenal:report` erzeugt den Abdeckungsbericht
- [ ] `npm run links:check -- --strict true` prüft externe Medien- und Quelllinks
- [ ] statische Website wird mit `npm run site:build` erzeugt
- [ ] Windows-Start über `START-HERE.cmd` funktioniert
- [ ] Leiste `Lokale Verwaltung aktiv` wird angezeigt
- [ ] Beta-Fortschritt und Kanal-Arsenal werden angezeigt
- [ ] Suche, Filter, Favoriten, Auswahl-Export und Detailansicht funktionieren
- [ ] lokale Review-, Nutzungs-, Attributions- und Backup-Aktionen funktionieren
- [ ] keine Secrets oder signierten URLs befinden sich im Repository
- [ ] Katalog und Suchindex enthalten dieselben Asset-IDs

## Kanal-Arsenal

- [x] vier spezialisierte Kanäle vorhanden
- [x] 90 Sammlungen definiert
- [x] 270 Pexels-Suchbegriffe definiert
- [x] 360 Suchaufträge planbar
- [x] Zielgröße 720 freigegebene Kanal-Assets dokumentiert
- [ ] Finanzen-Tab vollständig sichtbar
- [ ] KI-Tab vollständig sichtbar
- [ ] Elektrotechnik-Tab vollständig sichtbar
- [ ] Kampfsport-Tab vollständig sichtbar
- [ ] Abdeckungsbalken und Bestandszahlen stimmen
- [ ] UFC-, Event- und Broadcast-Risikohinweise werden angezeigt

## Starterbibliothek

- [x] sechs Grundassets im Repository vorhanden
- [x] fünf zusätzliche Pexels-Starterassets vorbereitet
- [ ] erster Start ergänzt die Bibliothek idempotent auf elf Assets
- [ ] alle acht Videos vollständig abgespielt und bewertet
- [ ] alle drei Originalgrafiken visuell kontrolliert
- [ ] alle elf Asset-IDs besitzen eine dokumentierte Entscheidung
- [ ] Titel, Tags und Kategorie stimmen mit dem sichtbaren Inhalt überein
- [ ] erkennbare Personen, Marken und Geräte wurden bewertet
- [ ] Pexels-Quelle, Creator und Lizenzseite sind erreichbar
- [ ] Browser blockiert eine Freigabe ohne vollständige Pflichtprüfung
- [ ] Browser blockiert eine Einschränkung ohne Begründung
- [ ] mindestens ein Asset wurde direkt im Browser freigegeben

## Echter Content-Test

- [ ] ein freigegebenes Asset wurde in einem realen Projekt verwendet
- [ ] Nutzung wurde direkt im Browser dokumentiert
- [ ] Favoriten-Auswahl wurde als JSON exportiert
- [ ] Attribution wurde direkt im Browser erzeugt
- [ ] fertiger Content wurde auf Quellen- und Rechteangaben geprüft
- [ ] Bereitschaftsbericht meldet `realUsageRecorded: true`

## Datensicherung

- [ ] Browser-Backup wurde erzeugt
- [ ] Backup enthält Katalog, Reviews, Nutzungen und Prüfsummenmanifest
- [ ] Restore-Dry-Run wurde erfolgreich ausgeführt

## Release

- [x] Changelog ist für `0.4.0-beta.1` aktuell
- [ ] Pull Request ist nicht mehr Draft
- [ ] alle verfügbaren Checks sind grün
- [ ] GitHub-Actions-Runner-Blocker ist geklärt oder die lokale Abnahme ist dokumentiert
- [ ] `realTestComplete` ist `true`
- [ ] Beta-Tag oder Release wurde erstellt

Die Beta darf erst als **real getestet** gelten, wenn alle elf Starterassets geprüft wurden und mindestens ein freigegebenes Asset in einem echten Content-Projekt eingesetzt und dokumentiert wurde.
