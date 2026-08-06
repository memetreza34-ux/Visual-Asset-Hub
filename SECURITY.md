# Sicherheit

## API-Schlüssel

- Pexels-Schlüssel niemals in Quellcode, README, Issues, Pull Requests oder Screenshots eintragen.
- Lokal kann `.env` verwendet werden; die Datei ist über `.gitignore` ausgeschlossen.
- In GitHub ausschließlich Repository Secrets verwenden.
- Bei versehentlicher Veröffentlichung den Schlüssel sofort bei Pexels widerrufen und neu erzeugen.

### Arsenal Builder im Browser

- Der eingegebene Pexels-Key wird ausschließlich vom lokalen Browser an `127.0.0.1` übertragen.
- Der Key wird nur für die aktuelle Pexels-Anfrage verwendet.
- Der Key wird nicht in Katalog, Suchergebnis, Local Storage, Session Storage, Bericht oder Logdatei gespeichert.
- Das Eingabefeld wird nach erfolgreicher oder fehlgeschlagener Suche geleert.
- Suchergebnisse enthalten nur Pexels-Metadaten, Vorschauen, Quellen und die gewählte Kanalzuordnung.
- Den Builder nur auf dem eigenen Computer verwenden und das Konsolenfenster nach der Arbeit schließen.

## Lokale Verwaltungsoberfläche

- Der Verwaltungsserver bindet standardmäßig ausschließlich an `127.0.0.1`.
- `HOST` nicht auf eine öffentliche Netzwerkadresse setzen.
- Eine entfernte Bindung ist nur mit `VAH_ALLOW_REMOTE=true` möglich und für den normalen Betrieb ausdrücklich nicht vorgesehen.
- Schreibaktionen benötigen ein zufälliges Sitzungstoken, denselben Browser-Ursprung und eine lokale Verbindung.
- Der Server verarbeitet JSON mit einer maximalen Größe von 64 KB und führt Benutzerwerte niemals über eine Shell aus.
- Eine gemeinsame Server-Sperre erlaubt nur eine Schreibaktion gleichzeitig. Parallele Review-, Inbox-, Pexels- oder Paketaktionen erhalten HTTP 409.
- Während Visual Asset Hub läuft, darf das Konsolenfenster nicht mit unbekannten Personen oder über Remote-Desktop geteilt werden.
- Nach der Verwendung den Server mit `STRG+C` beenden.

## Eigene Dateien und Inbox

- `inbox` ist ausschließlich ein lokaler Eingang und wird durch `.gitignore` ausgeschlossen.
- Nur Dateien importieren, die selbst erstellt wurden oder für die nachweisbare Nutzungsrechte bestehen.
- Der Browser verlangt vor dem Import eine ausdrückliche Rechtebestätigung.
- Dateinamen werden gegen absolute Pfade, Traversal und versteckte Dateien geprüft.
- Nicht unterstützte Dateitypen und Dateien über 2 GB werden blockiert.
- Binäre Videos und Rasterbilder werden für Git LFS eingeordnet.
- SVG-Grafiken dürfen im normalen Repository liegen, müssen aber vor Veröffentlichung auf fremden eingebetteten Inhalt geprüft werden.
- Scheitert nach erfolgreichem Import nur das Entfernen der Inbox-Datei, bleibt der Katalogimport gültig und es wird lediglich eine Warnung ausgegeben.
- Private Kundenmedien nicht in ein öffentliches Repository committen, auch wenn sie technisch über Git LFS gespeichert werden könnten.

## Medienpakete

- Medienpakete akzeptieren ausschließlich Assets mit Status `approved`.
- Pro Paket sind höchstens 20 Assets vorgesehen.
- Standardgrenzen: 300 MB pro Datei und 1,5 GB insgesamt.
- Externe Downloads akzeptieren ausschließlich HTTP(S).
- URLs mit Zugangsdaten sowie lokale und private Netzadressen werden blockiert.
- DNS-Ziele werden vor dem Download geprüft; Weiterleitungen werden erneut validiert und begrenzt.
- Größen werden sowohl über `Content-Length` als auch während des Streams kontrolliert.
- Dateien werden mit SHA-256 in `manifest.json` dokumentiert.
- Bei einem Fehler wird der temporäre Paketordner vollständig entfernt.
- Die Paketdateien liegen lokal unter `exports/media-packs` und werden nicht automatisch zu GitHub übertragen.

## Medien und Rechte

- Automatisch importierte Medien starten immer mit Status `review`.
- Vor Freigabe vollständigen Inhalt, erkennbare Personen, Marken, Kennzeichen, private Daten und sensible Kontexte prüfen.
- Die Browser-Freigabe verlangt vier bestätigte Pflichtprüfungen.
- Lizenz- und Quellseite beim Import dokumentieren.
- Ein Asset mit unbekannten oder eingeschränkten Rechten darf nicht als `approved` markiert werden.
- Die Bibliothek ersetzt keine rechtliche Einzelfallprüfung für Werbung, Kundenarbeit oder sensible Themen.

## Kampfsportmaterial

Nicht automatisch freigeben:

- UFC- oder Veranstalterlogos
- Broadcast-, TV- oder Pay-per-View-Ausschnitte
- reale Kampfausschnitte ohne belegte Nutzungserlaubnis
- geschützte Gürtel-, Käfig- oder Eventdesigns
- sichtbare Sponsorengrafiken ohne Prüfung
- grafische Verletzungen
- gefährliche Weight-Cut-Darstellungen

Generische Trainings-, Gym-, Ring-, Käfig-, Pratzen-, Boxsack- und Konditionsaufnahmen bevorzugen.

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
- `Cache-Control: no-store` für Katalog-, Inbox- und API-Daten

## Sicherheitsproblem melden

Keine geheimen Daten in ein öffentliches Issue schreiben. Bei einem Schlüssel-Leak zuerst den betroffenen Schlüssel sperren. Danach im Repository nur eine Beschreibung ohne Schlüssel, Token oder private URL dokumentieren.
