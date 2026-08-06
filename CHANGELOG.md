# Changelog

## 0.4.0-beta.2 – 2026-08-06

### Neu

- schnelle Review-Warteschlange für die nacheinander folgende Prüfung großer Bestände
- Kanal- und Medientypfilter innerhalb der Review-Warteschlange
- automatischer Wechsel zum nächsten Asset nach Freigabe, Einschränkung oder Archivierung
- Lückenempfehlungen für die acht derzeit schwächsten Sammlungen
- Sortierung nach Freigaben, Reviews, Alphabet oder größtem Ausbaubedarf
- direkte Übergabe einer empfohlenen Sammlung an den Arsenal Builder
- getrennte Fortschrittsbalken für Kandidaten und tatsächlich freigegebene Assets
- verifizierte lokale Medienpakete für den Videoschnitt
- Download oder Kopie ausschließlich freigegebener Favoriten
- Manifest mit SHA-256, Quellen, Lizenzstatus, Attribution und Dateigrößen
- Schutz vor privaten Downloadzielen, zu großen Dateien und unsicheren Weiterleitungen
- lokaler Inbox-Import für eigene Videos, Bilder, Grafiken und Animationen
- automatische Zuordnung eigener Dateien zu Kanal und Sammlung
- automatische Erkennung von Auflösung, Ausrichtung und Videodauer im Browser
- ausdrückliche Rechtebestätigung vor jedem Import eigener Dateien
- feste Arbeitsbereich-Navigation für Bibliothek, Inbox, Review, Pexels und Kategorien

### Verbessert

- Version auf `0.4.0-beta.2` erhöht
- Favoriten können jetzt entweder als JSON-Auswahl oder als vollständiges Schnittpaket exportiert werden
- das Kanal-Arsenal bewertet Vollständigkeit nach freigegebenen Assets statt nur nach Kandidaten
- eigene große Binärdateien werden für Git LFS vorbereitet
- zusätzliche lokale Medienformate werden korrekt ausgeliefert
- temporäre Suchdateien werden automatisch bereinigt

### Sicherheit

- Medienpakete blockieren jedes Asset ohne Status `approved`
- externe Downloads besitzen Datei- und Gesamtgrößenlimits
- lokale, private und Loopback-Downloadziele werden blockiert
- Inbox-Dateinamen werden gegen Pfadmanipulation geprüft
- eigene Dateien werden ausschließlich über die lokale Loopback-API verarbeitet
- der Inbox-Inhalt bleibt durch `.gitignore` lokal
- fehlerhafte Katalogimporte werden durch den bestehenden Import-Rollback zurückgesetzt

## 0.4.0-beta.1 – 2026-08-06

### Neu

- vier spezialisierte Kanalbibliotheken für Finanzen, KI, Elektrotechnik und Kampfsport
- 90 klar benannte Sammlungen mit 270 vorbereiteten Pexels-Suchbegriffen
- vier Suchvarianten pro Sammlung: Video/Bild und vertikal/horizontal
- vollständiger Arsenal-Plan mit 360 Suchaufträgen und bis zu 5.850 Kandidaten
- empfohlene Zielgröße von 720 freigegebenen Kanal-Assets
- automatische Validierung aller Kanal-, Sammlungs-, Tag- und Suchdaten
- Batch-Suche zur Schonung des kostenlosen Pexels-Kontingents
- automatischer Import ausgewählter Treffer mit Kanal- und Sammlungs-Tags
- Kanal-Arsenal direkt in der Weboberfläche
- Volltextsuche über Sammlungen und Suchpakete
- Fortschrittsanzeige pro Sammlung mit Freigabe- und Review-Zahlen
- automatischer Kanal-Abdeckungsbericht als Markdown und JSON
- manueller GitHub-Workflow für kanalweise Pexels-Suchbatches
- ausführliche Rechte-Regeln für generischen MMA-, UFC-, Box- und Kickbox-Content

### Kategorien

- `finance-investing`
- `artificial-intelligence`
- `electrical-engineering`
- `combat-sports`

### Zielstruktur

- Finanzen: 20 Sammlungen und 160 Zielassets
- KI: 20 Sammlungen und 160 Zielassets
- Elektrotechnik: 20 Sammlungen und 160 Zielassets
- Kampfsport: 30 Sammlungen und 240 Zielassets

### Sicherheit

- kein Suchtreffer wird automatisch in den Katalog importiert
- kein Import wird automatisch freigegeben
- UFC-Logos, Veranstaltergrafiken und Broadcastmaterial müssen ausgeschlossen oder separat lizenziert werden
- Batchgröße ist standardmäßig begrenzt
- Kanal- und Sammlungsmetadaten werden vor jeder technischen Prüfung validiert

## 0.3.0-beta.3 – 2026-08-04

### Neu

- sichere lokale Verwaltungs-API ausschließlich für Loopback-Verbindungen
- Review, Freigabe, Einschränkung, Rückgabe und Archivierung direkt in der Detailansicht
- verpflichtende Vier-Punkte-Prüfung vor jeder Browser-Freigabe
- reale Nutzung eines freigegebenen Assets direkt im Browser dokumentierbar
- Attributionsexport und Katalog-Backup direkt aus der Oberfläche
- automatischer Beta-Fortschritt mit technischer Quote, Realtest-Quote und offenen Aufgaben
- Bereitschaftsbericht als Markdown und JSON direkt aus der Anwendung erreichbar
- verifizierte Backup-Wiederherstellung mit Manifest-, Dateigrößen- und SHA-256-Prüfung
- geführte Windows-Wiederherstellung über `RESTORE-BACKUP.cmd`
- automatisches Sicherheitsbackup und Rollback bei einem fehlerhaften Restore
- neue Tests für API-Eingaben, HTTP-Schutz, Browser-Verknüpfung, Restore und lokale Serversicherheit

### Sicherheit

- zufälliges Sitzungstoken für alle lokalen Schreibaktionen
- Same-Origin-Prüfung und ausschließlich lokale Client-Verbindungen
- Schreibsperre gegen parallele Katalogänderungen
- maximale Request-Größe und strikte Feld-, URL-, Plattform- und Asset-ID-Validierung
- Content-Security-Policy, Frame-Schutz, Referrer-Schutz und restriktive Permissions-Policy
- kein Shell-Aufruf bei benutzerdefinierten Eingaben
- Restore akzeptiert nur verifizierte JSON-Dateien innerhalb des lokalen Backup-Ordners

### Verbessert

- `START-HERE.cmd` erzeugt vor dem Start automatisch den vollständigen Beta-Bereitschaftsbericht
- das statische Testpaket enthält den aktuellen Bereitschaftsbericht
- der reale Test kann vollständig ohne Konsole durchgeführt werden
- für die vollständige Abnahme müssen alle sechs Testassets eine dokumentierte Entscheidung besitzen
- Version auf `0.3.0-beta.3` erhöht

## 0.3.0-beta.2 – 2026-08-04

### Neu

- drei originale, vollständig eigene SVG-Grafiken für KI, Business und Elektrotechnik
- insgesamt sechs reale Beta-Testassets: drei Pexels-Videos und drei statische Originalgrafiken
- Schnellfilter für B-Rolls, Hochformat, Review, Freigabe, Favoriten und aktive Kategorien
- sichtbare Review-, Freigabe-, Einschränkungs- und Archivstatus auf jeder Karte
- deutliche Warnung bei ungeprüften Assets
- Favoriten als exportierbare Projektauswahl mit Quelle, Lizenz, Status und Attribution
- No-Code-Workflows für Asset-Review, Nutzungsdokumentation und Katalogpaket
- externer Linktest für Originaldatei, Vorschau, Quelle und Lizenzseite
- Secret-Scanner für versehentlich veröffentlichte API-Keys und Tokens
- Prüfung externer Vorschau-URLs auf signierte oder vertrauliche Parameter
- Integritätstest für lokale Originaldateien und Katalog-/Index-Synchronität
- Suchindex Version 4 mit automatischer Vorschau lokaler statischer Medien
- realistischer Beta-Score mit getrenntem technischem Stand und Realtest-Stand
- gehärteter Ein-Klick-Start unter Windows
- Security Policy und vollständige Release-Checkliste

### Verbessert

- Pexels-Vorschauen bleiben standardmäßig extern und verursachen keinen unnötigen Repository-Speicher
- alle Webmodule werden in die Syntaxprüfung einbezogen
- Status, Nutzung, Projekte und Plattformen sind direkt in der Weboberfläche sichtbar
- Auswahl kann als standardisierte JSON-Datei an andere Content- oder Editing-Projekte übergeben werden

### Sicherheit

- kein automatischer Import erhält den Status `approved`
- nicht freigegebene Assets können standardmäßig nicht als reale Nutzung dokumentiert werden
- Import-, Review- und Nutzungsvorgänge werden bei Validierungsfehlern zurückgerollt
- geheime URL-Parameter sowie offensichtliche Schlüssel- und Tokenmuster werden blockiert

## 0.3.0-beta.1 – 2026-08-04

### Neu

- echte Pexels-Foto- und Videosuche
- visuelle Suchergebnis-Galerie
- gezielter Import ausgewählter Pexels-IDs
- drei reale vertikale Pexels-Testvideos im Review-Katalog
- externe Originaldateien und Vorschaubilder ohne Massenspeicher
- sichere Review-, Freigabe-, Einschränkungs- und Archivierungsabläufe
- Review-Protokoll und Nutzungshistorie
- Quellen- und Attributions-Export
- Katalog-Backup mit SHA-256-Manifest
- statische Weboberfläche mit Suche, Filtern, Favoriten und Videoansicht
- Katalog-, Betriebs-, Web- und Importtests
- Windows-Startdatei und Beta-Bereitschaftsbericht

### Bekannter externer Blocker

GitHub Actions stellt im Repository derzeit keinen Runner bereit. Minimale Linux- und Windows-Diagnosejobs scheitern vor dem ersten Step. Lokale Prüfungen und Anwendungscode sind davon unabhängig.
