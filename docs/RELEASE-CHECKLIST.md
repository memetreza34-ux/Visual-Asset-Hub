# Release-Checkliste

## Technische Prüfung

- [ ] `npm run check` läuft lokal ohne Fehler
- [ ] `npm run beta:verify` meldet technisch bereit
- [ ] `npm run arsenal:validate` bestätigt Kanaldateien und Planerlexikon
- [ ] `npm run arsenal:plan` erzeugt JSON und CSV
- [ ] `npm run arsenal:expansion` erzeugt Ausbauplan Version 4 als JSON und CSV
- [ ] `npm run arsenal:report` erzeugt den Abdeckungsbericht
- [ ] `npm run links:check -- --strict true` prüft externe Medien- und Quelllinks
- [ ] `npm run vault:build` erzeugt `ALLES-GEFUNDEN`
- [ ] statische Website wird mit `npm run site:build` erzeugt
- [ ] Mac-Start über `npm run serve` funktioniert
- [ ] optional Windows-Start über `START-HERE.cmd` funktioniert
- [ ] Leiste `Lokale Verwaltung aktiv` wird angezeigt
- [ ] feste Arbeitsbereich-Navigation funktioniert
- [ ] lokale APIs akzeptieren nur Loopback, Sitzungstoken und denselben Ursprung
- [ ] gemeinsame Schreibsperre blockiert parallele Änderungen mit HTTP 409
- [ ] keine Secrets oder signierten URLs befinden sich im Repository
- [ ] Katalog und Suchindex enthalten dieselben Asset-IDs

## Alles-Gefunden-Ordner

- [x] zentraler Ordner `ALLES-GEFUNDEN` ist definiert
- [x] Kanäle werden als Finanzen, KI, Elektrotechnik und Kampfsport getrennt
- [x] Sammlungen verwenden verständliche Titel
- [x] Statusordner trennen Freigegeben, Review, Eingeschränkt und Archiv
- [x] `90-GEFUNDENE-KANDIDATEN` trennt noch nicht importierte Suchfunde vom Katalog
- [x] lokale Medien können als echte Dateikopie übernommen werden
- [x] externe Medien erhalten Quelle-, Medium- und Vorschau-Verknüpfungen
- [x] jeder Katalogeintrag erhält eine INFO-Datei mit Quelle, Lizenz und Prüfhinweisen
- [x] Gesamtindex wird als Markdown, CSV und JSON erzeugt
- [x] erzeugte Inhalte bleiben über `.gitignore` lokal
- [ ] `npm run vault:build` läuft im echten lokalen Repository fehlerfrei
- [ ] nach `npm run starter:import` enthält der Gesamtindex zwölf Starterassets
- [ ] ein lokales Asset liegt als echte Datei im passenden Kategorieordner
- [ ] ein externer Treffer besitzt funktionierende `.url`-Verknüpfungen
- [ ] Suchfunde aus dem Arsenal Builder erscheinen unter `90-GEFUNDENE-KANDIDATEN`
- [ ] laufender Server aktualisiert den Ordner nach einer Katalogänderung automatisch
- [ ] kein Eintrag im Ordner umgeht Review- oder Rechteprüfung

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
- [x] Ausbauplan nennt Medientyp, Format, Primärquelle und Fallbackquellen
- [ ] Finanzen-, KI-, Elektro- und Kampfsport-Bereiche vollständig sichtbar
- [ ] Kandidaten-, Review- und Freigabezahlen stimmen
- [ ] **Ausbau 720** zeigt 160/160/160/240 als Kanalziele
- [ ] globale **Nächste Aufgaben** zeigt höchstens sechs kanalübergreifende Prioritäten
- [ ] Review-Aufgaben stehen in der globalen Liste vor Suchjobs
- [ ] Video- und Fotolücken werden korrekt erkannt
- [ ] Freigabe-Mix-Lücke und echte Such-Mix-Lücke bleiben getrennt
- [ ] vorhandene Review-Videos/Fotos verhindern redundante Suche desselben Medientyps
- [ ] vorhandener ausreichender Review-Vorrat führt direkt in die Review-Warteschlange
- [ ] echte Suchlücken werden mit passender Quelle und passendem Format vorbereitet
- [ ] höchstens fünf priorisierte Sammlungen werden an den Builder übergeben
- [ ] UFC-, Event- und Broadcast-Risikohinweise werden angezeigt

## Priorisierte Review-Warteschlange

- [ ] Filter nach Kanal funktioniert
- [ ] Filter nach Sammlung funktioniert
- [ ] Filter nach Medientyp funktioniert
- [ ] Standardreihenfolge **Größter Ausbau-Effekt** funktioniert
- [ ] sichtbare Ausbau-Priorität enthält eine nachvollziehbare Begründung
- [ ] Entscheidung aktualisiert die verbleibende Priorität
- [ ] Review-Empfehlung aus **Ausbau 720** öffnet die passende Sammlung
- [ ] keine Prioritätslogik umgeht die Vier-Punkte-Freigabeprüfung
- [ ] Freigabe, Einschränkung und Archivierung bleiben Einzelentscheidungen

## Medienquellen-Builder

### Pexels

- [ ] echte Suche erfolgreich
- [ ] Foto und Video unterstützt
- [ ] API-Key kann für die aktuelle Seite im Arbeitsspeicher gehalten werden

### Pixabay

- [ ] echte Suche erfolgreich
- [ ] Foto und Video unterstützt
- [ ] 24-Stunden-Cache für gleiche Suchen funktioniert
- [ ] Cache-Antwort übernimmt niemals falsche Kanal- oder Sammlungsmetadaten
- [ ] API-Key kann für die aktuelle Seite im Arbeitsspeicher gehalten werden

### Unsplash

- [ ] echte Fotosuche erfolgreich
- [ ] Videoformat ist nicht auswählbar
- [ ] Fotograf und Unsplash werden dokumentiert
- [ ] Download-Ereignis wird beim Import gemeldet
- [ ] Access Key kann für die aktuelle Seite im Arbeitsspeicher gehalten werden
- [ ] nach **Sitzungs-Keys löschen** kann ein bereits geladenes Ergebnis nicht mit einem alten Key importiert werden

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
- [ ] Suchtreffer zeigen **Technischen Fit 0–100** mit nachvollziehbarer technischer Begründung
- [ ] Technischer Fit ändert keinen Review- oder Freigabestatus
- [ ] vor dem Provider-Fallback werden zuerst weitere vorbereitete Suchbegriffe derselben Sammlung angeboten
- [ ] Suchablauf ist **Suchbegriff 1 → 2 → 3 → nächste Quelle**
- [ ] nur markierte Treffer werden importiert
- [ ] jeder Import startet auf `review`
- [ ] Kanal- und Sammlungs-Tags werden korrekt gesetzt
- [ ] tatsächliche Importzahl und übersprungene Dubletten werden getrennt gemeldet
- [ ] Openverse/Wikimedia-Dubletten werden auch über Original-Medien-URL erkannt
- [ ] gruppenübergreifender Sammelimport verarbeitet ausgewählte Batch-Gruppen nacheinander
- [ ] Sammelimport lädt die Seite erst nach Abschluss einmal neu
- [ ] bereits importierte Karten werden deaktiviert und markiert
- [ ] Video-Fallback Pexels → Pixabay wird nur vorbereitet
- [ ] Foto-Fallback Unsplash → Openverse → Wikimedia → Pexels → Pixabay wird nur vorbereitet
- [ ] Fallback übernimmt Sammlung, Format und Suchbegriff, startet aber keine API-Anfrage automatisch

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

## GitHub Actions und Kostenkontrolle

- [x] alle Workflows im Beta-Branch besitzen `workflow_dispatch`
- [x] automatische `push`-Trigger entfernt
- [x] automatische `pull_request`-Trigger entfernt
- [x] automatische `schedule`-Trigger ausgeschlossen
- [x] lokaler Vertragstest blockiert versehentlich reaktivierte automatische Trigger
- [ ] keine manuelle GitHub-Action ist für die lokale Beta-Abnahme erforderlich

## Release

- [x] Changelog für `0.4.0-beta.4` vorhanden
- [x] Paketversion auf `0.4.0-beta.4` gesetzt
- [ ] Pull Request ist nicht mehr Draft
- [ ] lokale Komplettprüfung ist grün
- [ ] `realTestComplete` ist `true`
- [ ] Beta-Tag oder Release wurde erstellt

Die Beta darf erst als **real getestet** gelten, wenn ein echtes Skript geplant, alle zwölf Starterassets geprüft, alle fünf Medienquellen technisch getestet, der `ALLES-GEFUNDEN`-Ordner lokal geprüft, mindestens ein eigener Inbox-Import erfolgreich und ein freigegebenes Asset über ein verifiziertes Medienpaket in einem echten Content-Projekt eingesetzt wurde.
