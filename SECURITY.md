# Sicherheit

## API-Schlüssel

- Pexels-Schlüssel niemals in Quellcode, README, Issues, Pull Requests oder Screenshots eintragen.
- Lokal nur `.env` verwenden; die Datei ist über `.gitignore` ausgeschlossen.
- In GitHub ausschließlich Repository Secrets verwenden.
- Bei versehentlicher Veröffentlichung den Schlüssel sofort bei Pexels widerrufen und neu erzeugen.

## Lokale Verwaltungsoberfläche

- Der Verwaltungsserver bindet standardmäßig ausschließlich an `127.0.0.1`.
- `HOST` nicht auf eine öffentliche Netzwerkadresse setzen.
- Eine entfernte Bindung ist nur mit `VAH_ALLOW_REMOTE=true` möglich und für den normalen Betrieb ausdrücklich nicht vorgesehen.
- Schreibaktionen benötigen ein zufälliges Sitzungstoken, denselben Browser-Ursprung und eine lokale Verbindung.
- Der Server verarbeitet JSON mit einer maximalen Größe von 64 KB und führt Benutzerwerte niemals über eine Shell aus.
- Während Visual Asset Hub läuft, darf das Konsolenfenster nicht mit unbekannten Personen oder über Remote-Desktop geteilt werden.
- Nach der Verwendung den Server mit `STRG+C` beenden.

## Medien und Rechte

- Automatisch importierte Medien starten immer mit Status `review`.
- Vor Freigabe vollständigen Inhalt, erkennbare Personen, Marken, Kennzeichen, private Daten und sensible Kontexte prüfen.
- Die Browser-Freigabe verlangt vier bestätigte Pflichtprüfungen.
- Lizenz- und Quellseite beim Import dokumentieren.
- Ein Asset mit unbekannten oder eingeschränkten Rechten darf nicht als `approved` markiert werden.
- Die Bibliothek ersetzt keine rechtliche Einzelfallprüfung für Werbung, Kundenarbeit oder sensible Themen.

## Datenintegrität

- Änderungen an Katalog-, Review- und Nutzungsdaten werden validiert.
- Schreibvorgänge werden seriell ausgeführt; parallele Katalogänderungen werden blockiert.
- Schreibvorgänge müssen bei Fehlern zurückgerollt werden.
- Vor größeren Importen oder Prüfungen ein Backup über die Weboberfläche oder `npm run backup` ausführen.
- Externe URLs mit Token-, Signatur-, Credential- oder API-Key-Parametern dürfen nicht katalogisiert werden.
- `npm run check` vor jedem Merge und Release ausführen.

## Browser-Schutz

Der lokale Server setzt unter anderem:

- Content-Security-Policy
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- restriktive Permissions-Policy
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store` für Katalog- und API-Daten

## Sicherheitsproblem melden

Keine geheimen Daten in ein öffentliches Issue schreiben. Bei einem Schlüssel-Leak zuerst den betroffenen Schlüssel sperren. Danach im Repository nur eine Beschreibung ohne Schlüssel, Token oder private URL dokumentieren.
