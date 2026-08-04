# Sicherheit

## API-Schlüssel

- Pexels-Schlüssel niemals in Quellcode, README, Issues, Pull Requests oder Screenshots eintragen.
- Lokal nur `.env` verwenden; die Datei ist über `.gitignore` ausgeschlossen.
- In GitHub ausschließlich Repository Secrets verwenden.
- Bei versehentlicher Veröffentlichung den Schlüssel sofort bei Pexels widerrufen und neu erzeugen.

## Medien und Rechte

- Automatisch importierte Medien starten immer mit Status `review`.
- Vor Freigabe vollständigen Inhalt, erkennbare Personen, Marken, Kennzeichen, private Daten und sensible Kontexte prüfen.
- Lizenz- und Quellseite beim Import dokumentieren.
- Ein Asset mit unbekannten oder eingeschränkten Rechten darf nicht als `approved` markiert werden.
- Die Bibliothek ersetzt keine rechtliche Einzelfallprüfung für Werbung, Kundenarbeit oder sensible Themen.

## Datenintegrität

- Änderungen an Katalog-, Review- und Nutzungsdaten werden validiert.
- Schreibvorgänge müssen bei Fehlern zurückgerollt werden.
- Vor größeren Importen `npm run backup` ausführen.
- Externe URLs mit Token-, Signatur-, Credential- oder API-Key-Parametern dürfen nicht katalogisiert werden.

## Sicherheitsproblem melden

Keine geheimen Daten in ein öffentliches Issue schreiben. Bei einem Schlüssel-Leak zuerst den betroffenen Schlüssel sperren. Danach im Repository nur eine Beschreibung ohne Schlüssel, Token oder private URL dokumentieren.
