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
- [ ] feste Arbeitsbereich-Navigation funktioniert
- [ ] lokale APIs akzeptieren nur Loopback, Sitzungstoken und denselben Ursprung
- [ ] gemeinsame Schreibsperre blockiert parallele Änderungen mit HTTP 409
- [ ] keine Secrets oder signierten URLs befinden sich im Repository
- [ ] Katalog und Suchindex enthalten dieselben Asset-IDs

## Kanal-Arsenal

- [x] vier spezialisierte Kanäle vorhanden
- [x] 90 Sammlungen definiert
- [x] 270 Pexels-Suchbegriffe definiert
- [x] 360 Suchaufträge planbar
- [x] Zielgröße 720 freigegebene Kanal-Assets dokumentiert
- [ ] Finanzen-, KI-, Elektro- und Kampfsport-Tabs vollständig sichtbar
- [ ] Kandidaten- und Freigabebalken stimmen
- [ ] `Nur unvollständige Sammlungen` funktioniert
- [ ] Sortierungen nach Lücke, Freigabe, Review und Alphabet funktionieren
- [ ] Lückenempfehlung konfiguriert den Arsenal Builder korrekt
- [ ] UFC-, Event- und Broadcast-Risikohinweise werden angezeigt

## Pexels Builder

- [ ] je eine kleine Suche für Finanzen, KI, Elektro und Kampfsport erfolgreich
- [ ] API-Key wird nach Erfolg und Fehler aus dem Eingabefeld entfernt
- [ ] Suchtreffer zeigen Vorschau, Creator und Quellseite
- [ ] nur markierte Treffer werden importiert
- [ ] jeder Import startet auf `review`
- [ ] Kanal- und Sammlungs-Tags werden korrekt gesetzt
- [ ] Dubletten werden übersprungen oder blockiert

## Eigene Medien und Inbox

- [ ] eigene Video- oder Bilddatei unter `inbox` erkannt
- [ ] Vorschau, Dateityp, Größe und technische Daten sichtbar
- [ ] Import ohne Rechtebestätigung wird blockiert
- [ ] Kanal- und Sammlungszuordnung wird gespeichert
- [ ] binäre Videos und Bilder verwenden Git LFS
- [ ] SVG-Grafiken dürfen im normalen Repository liegen
- [ ] erfolgreicher Import bleibt erfolgreich, auch wenn das spätere Löschen aus `inbox` nur eine Warnung erzeugt
- [ ] Inbox-Inhalt bleibt über `.gitignore` lokal

## Starterbibliothek und Review

- [x] sechs Grundassets im Repository vorhanden
- [x] fünf zusätzliche Pexels-Starterassets vorbereitet
- [ ] erster Start ergänzt die Bibliothek idempotent auf elf Assets
- [ ] schnelle Review-Warteschlange funktioniert
- [ ] Kanal-, Typ- und Sortierfilter funktionieren
- [ ] automatische Weiterleitung zum nächsten Asset funktioniert
- [ ] alle acht Videos vollständig abgespielt und bewertet
- [ ] alle drei Originalgrafiken visuell kontrolliert
- [ ] alle elf Asset-IDs besitzen eine dokumentierte Entscheidung
- [ ] Titel, Tags und Kategorie stimmen mit dem sichtbaren Inhalt überein
- [ ] Personen, Marken und Geräte wurden bewertet
- [ ] Quelle, Creator und Lizenzseite sind erreichbar
- [ ] Freigabe ohne vier Pflichtpunkte wird blockiert
- [ ] Einschränkung ohne Begründung wird blockiert
- [ ] mindestens ein Asset wurde freigegeben

## Auswahl und Medienpakete

- [ ] Favoritenauswahl lässt sich als JSON exportieren
- [ ] JSON warnt vor ungeprüften Assets
- [ ] Medienpaket mit ungeprüftem Asset wird blockiert
- [ ] Medienpaket mit ausschließlich freigegebenen Assets wird erzeugt
- [ ] Paket enthält `media`, `manifest.json`, `ATTRIBUTION.md` und `README.md`
- [ ] Manifest enthält SHA-256, Dateigröße, Quelle, Lizenz und Attribution
- [ ] private oder lokale Downloadziele werden blockiert
- [ ] Datei- und Gesamtgrößenlimits greifen
- [ ] fehlerhafter Paketexport entfernt temporäre Dateien

## Echter Content-Test

- [ ] freigegebenes Asset wurde aus einem Medienpaket in einem realen Projekt verwendet
- [ ] Nutzung wurde direkt im Browser dokumentiert
- [ ] Attribution wurde direkt im Browser erzeugt
- [ ] fertiger Content wurde auf Quellen- und Rechteangaben geprüft
- [ ] Bereitschaftsbericht meldet `realUsageRecorded: true`

## Datensicherung

- [ ] Browser-Backup wurde erzeugt
- [ ] Backup enthält Katalog, Reviews, Nutzungen und Prüfsummenmanifest
- [ ] Restore-Dry-Run wurde erfolgreich ausgeführt
- [ ] Sicherheitsbackup und Rollback wurden kontrolliert

## Release

- [x] Changelog ist für `0.4.0-beta.2` aktuell
- [ ] Pull Request ist nicht mehr Draft
- [ ] alle verfügbaren Checks sind grün
- [ ] GitHub-Actions-Runner-Blocker ist geklärt oder die lokale Abnahme ist dokumentiert
- [ ] `realTestComplete` ist `true`
- [ ] Beta-Tag oder Release wurde erstellt

Die Beta darf erst als **real getestet** gelten, wenn alle elf Starterassets geprüft wurden, mindestens ein eigener Inbox-Import und vier Pexels-Suchen erfolgreich waren und ein freigegebenes Asset über ein Medienpaket in einem echten Content-Projekt eingesetzt wurde.
