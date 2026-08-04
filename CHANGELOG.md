# Changelog

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
- exportierbare Favoriten-Auswahl für andere Content-Projekte
- Katalog-, Betriebs-, Web- und Importtests
- Windows-Startdatei und Beta-Bereitschaftsbericht

### Sicherheit

- API-Schlüssel werden ausschließlich aus `.env` oder GitHub Secrets gelesen
- Pexels-Importe bleiben automatisch auf `review`
- nicht freigegebene Assets können nicht normal als Nutzung dokumentiert werden
- Validierungsfehler lösen ein Rollback aus
- geheime URL-Parameter werden in Betriebsdaten blockiert

### Bekannter externer Blocker

GitHub Actions stellt im Repository derzeit keinen Runner bereit. Minimale Linux- und Windows-Diagnosejobs scheitern vor dem ersten Step. Lokale Prüfungen und Anwendungscode sind davon unabhängig.
