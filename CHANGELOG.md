# Changelog

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
