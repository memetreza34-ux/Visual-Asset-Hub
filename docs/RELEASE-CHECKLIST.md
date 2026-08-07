# Release-Checkliste

## Technische Prüfung

- [ ] `npm run check` läuft lokal ohne Fehler
- [ ] `npm run beta:verify` meldet technisch bereit
- [ ] `npm run arsenal:validate` bestätigt Kanaldateien und Planerlexikon
- [ ] `npm run arsenal:plan` erzeugt JSON und CSV
- [ ] `npm run arsenal:expansion` erzeugt Ausbauplan als JSON und CSV
- [ ] `npm run arsenal:report` erzeugt den Abdeckungsbericht
- [ ] `npm run links:check -- --strict true` prüft externe Medien- und Quelllinks
- [ ] statische Website wird mit `npm run site:build` erzeugt
- [ ] Mac-Start über `npm run serve` funktioniert
- [ ] optional Windows-Start über `START-HERE.cmd` funktioniert
- [ ] Leiste `Lokale Verwaltung aktiv` wird angezeigt
- [ ] feste Arbeitsbereich-Navigation funktioniert
- [ ] lokale APIs akzeptieren nur Loopback, Sitzungstoken und denselben Ursprung
- [ ] gemeinsame Schreibsperre blockiert parallele Änderungen mit HTTP 409
- [ ] keine Secrets oder signierten URLs befinden sich im Repository
- [ ] Katalog und Suchindex enthalten dieselben Asset-IDs

## Reel- und Skript-Planer

- [x] Planer ist für Finanzen, KI, Elektrotechnik und Kampfsport definiert
- [x] Fachbegriffe und Synonyme werden gegen vorhandene Sammlungen validiert
- [ ] Navigation **Skript planen** öffnet den Planer
- [ ] deutsches Skript wird sinnvoll in Szenen zerlegt
- [ ] letzter Zeitwert entspricht exakt der gewählten Zieldauer
- [ ] passende Sammlungen werden für alle vier Kanäle erkannt
- [ ] vorhandene Assets werden mit Status und Qualität vorgeschlagen
- [ ] Modus **Nur freigegebene Assets** schließt Review-Assets aus
- [ ] fehlende Motive liefern einen passenden Suchbegriff
- [ ] **Motiv suchen** konfiguriert den Arsenal Builder korrekt
- [ ] Planer-Favoriten aktualisieren die Projektauswahl
- [ ] JSON-, CSV- und Markdown-Export im Browser funktionieren
- [ ] CLI erzeugt JSON, CSV, Markdown, SRT und Skriptkopie
- [ ] Skripttext wird nicht automatisch gespeichert oder extern übertragen

## Kanal-Arsenal und Ausbau 720

- [x] vier spezialisierte Kanäle vorhanden
- [x] 90 Sammlungen definiert
- [x] 270 Suchbegriffe definiert
- [x] 360 Grundformat-Suchaufträge planbar
- [x] Zielgröße 720 freigegebene Kanal-Assets dokumentiert
- [x] Ausbauplaner unterscheidet `search`, `review-first` und `complete`
- [ ] Finanzen-, KI-, Elektro- und Kampfsport-Bereiche vollständig sichtbar
- [ ] Kandidaten-, Review- und Freigabezahlen stimmen
- [ ] **Ausbau 720** zeigt 160/160/160/240 als Kanalziele
- [ ] Top-Suchlücken werden korrekt priorisiert
- [ ] höchstens fünf priorisierte Sammlungen werden an den Builder übergeben
- [ ] vorhandener ausreichender Review-Vorrat verhindert unnötige Nachsuche
- [ ] UFC-, Event- und Broadcast-Risikohinweise werden angezeigt

## Medienquellen-Builder

### Pexels

- [ ] echte Suche erfolgreich
- [ ] Foto und Video unterstützt
- [ ] API-Key kann für die aktuelle Seite im Arbeitsspeicher gehalten werden

### Pixabay

- [ ] echte Suche erfolgreich
- [ ] Foto und Video unterstützt
- [ ] 24-Stunden-Cache für gleiche Suchen funktioniert
- [ ] API-Key kann für die aktuelle Seite im Arbeitsspeicher gehalten werden

### Unsplash

- [ ] echte Fotosuche erfolgreich
- [ ] Videoformat ist nicht auswählbar
- [ ] Fotograf und Unsplash werden dokumentiert
- [ ] Download-Ereignis wird beim Import gemeldet
- [ ] Access Key kann für die aktuelle Seite im Arbeitsspeicher gehalten werden

### Openverse

- [ ] Suche funktioniert ohne geheimen Key
- [ ] nur Fotoformat
- [ ] nur unterstützte offene Lizenztypen werden übernommen

### Wikimedia Commons

- [ ] Suche funktioniert ohne geheimen Key
- [ ] nur Fotoformat
- [ ] Lizenzmetadaten und Attribution werden angezeigt

### Gemeinsame Builder-Regeln

- [ ] **Sitzungs-Keys löschen** entfernt alle drei gespeicherten Keys aus dem Arbeitsspeicher
- [ ] Neuladen der Seite entfernt die Sitzungs-Keys
- [ ] weder `localStorage` noch `sessionStorage` speichern API-Keys
- [ ] Batch-Suche verarbeitet höchstens fünf Sammlungen sequenziell
- [ ] Suchtreffer zeigen Vorschau, Creator/Quelle und Quellseite
- [ ] nur markierte Treffer werden importiert
- [ ] jeder Import startet auf `review`
- [ ] Kanal- und Sammlungs-Tags werden korrekt gesetzt
- [ ] Dubletten werden übersprungen oder blockiert

## Eigene Medien und Inbox

- [ ] eigene Video- oder Bilddatei lokal erkannt
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
- [x] ein CC-BY-SA-Wikimedia-Kampfsport-Starter vorbereitet
- [ ] `npm run starter:import` ergänzt die Bibliothek idempotent auf zwölf Assets
- [ ] alle vier Kanäle sind nach dem Starterimport vertreten
- [ ] schnelle Review-Warteschlange funktioniert
- [ ] Kanal-, Typ- und Sortierfilter funktionieren
- [ ] automatische Weiterleitung zum nächsten Asset funktioniert
- [ ] alle acht Videos vollständig abgespielt und bewertet
- [ ] alle drei Originalgrafiken visuell kontrolliert
- [ ] Wikimedia-Kampfsportfoto inklusive Personen- und Lizenzprüfung kontrolliert
- [ ] alle zwölf Asset-IDs besitzen eine dokumentierte Entscheidung
- [ ] Titel, Tags und Kategorie stimmen mit dem sichtbaren Inhalt überein
- [ ] Personen, Marken und Geräte wurden bewertet
- [ ] Quelle, Creator und Lizenzseite sind erreichbar
- [ ] CC BY-SA 4.0 Attribution und Share-Alike-Hinweis bleiben erhalten
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

- [x] Changelog-Basis für `0.4.0-beta.3` vorhanden
- [ ] aktuelle Erweiterungen im Changelog dokumentiert
- [ ] Pull Request ist nicht mehr Draft
- [ ] lokale Komplettprüfung ist grün
- [ ] GitHub-Actions-Runner-Blocker ist als externer Billing-/Spending-Blocker dokumentiert
- [ ] `realTestComplete` ist `true`
- [ ] Beta-Tag oder Release wurde erstellt

Die Beta darf erst als **real getestet** gelten, wenn ein echtes Skript geplant, alle zwölf Starterassets geprüft, alle fünf Medienquellen technisch getestet, mindestens ein eigener Inbox-Import erfolgreich und ein freigegebenes Asset über ein verifiziertes Medienpaket in einem echten Content-Projekt eingesetzt wurde.
