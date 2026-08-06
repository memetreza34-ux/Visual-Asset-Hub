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

## Reel- und Skript-Planer

- Im Browser eingegebene Skripte bleiben lokal und werden nicht an Pexels oder eine KI-API gesendet.
- Der Browser speichert den Sprechtext nicht automatisch.
- Ein Browser-Export findet ausschließlich nach bewusstem Klick statt.
- Der CLI-Planer speichert auf Wunsch einen lokalen Abnahmenachweis. Dieser enthält nur Kanal, Szenenzahl, Dauer, Abdeckung, Ausgabeordner und SHA-256 des Skripts, nicht den Sprechtext.
- CLI-Skriptdateien sind auf 1 MB begrenzt.
- Ausgabeordner müssen innerhalb des Projektverzeichnisses liegen.
- Asset-Vorschläge können ungeprüfte Medien enthalten und ersetzen keine visuelle Rechteprüfung.

## Lokale Verwaltungsoberfläche

- Der Verwaltungsserver bindet standardmäßig ausschließlich an `127.0.0.1`.
- `HOST` nicht auf eine öffentliche Netzwerkadresse setzen.
- Eine entfernte Bindung ist nur mit `VAH_ALLOW_REMOTE=true` möglich und für den normalen Betrieb ausdrücklich nicht vorgesehen.
- Schreibaktionen benötigen ein zufälliges Sitzungstoken, denselben Browser-Ursprung und eine lokale Verbindung.
- Der Server verarbeitet Verwaltungs-JSON mit einer maximalen Größe von 64 KB und führt Benutzerwerte niemals über eine Shell aus.
- Eine gemeinsame Server-Sperre erlaubt nur eine Schreibaktion gleichzeitig. Parallele Review-, Upload-, Inbox-, Pexels- oder Paketaktionen erhalten HTTP 409.
- Während Visual Asset Hub läuft, darf das Konsolenfenster nicht mit unbekannten Personen oder über Remote-Desktop geteilt werden.
- Nach der Verwendung den Server mit `STRG+C` beenden.

## Eigene Dateien, Browser-Upload und Inbox

- `inbox` ist ausschließlich ein lokaler Eingang und wird durch `.gitignore` ausgeschlossen.
- Dateien können manuell in den Ordner kopiert oder per Drag-and-drop an den lokalen Loopback-Server übertragen werden.
- Der Upload verwendet einen Rohdatenstream und schreibt keine Datei als Base64 oder JSON in den Browser-Speicher.
- Uploads benötigen Sitzungstoken, denselben Browser-Ursprung und eine lokale Verbindung.
- Pro Datei gilt ein Limit von 2 GB; zusätzlich wird eine freie Speicherreserve geprüft.
- Die Datei wird zuerst unter einem zufälligen temporären Namen geschrieben und erst nach vollständiger Übertragung und Prüfung atomar umbenannt.
- Bereits vorhandene Dateinamen werden nicht überschrieben, sondern automatisch nummeriert.
- Dateinamen werden gegen Pfadmanipulation, Steuerzeichen, versteckte Namen und reservierte Windows-Gerätenamen geprüft.
- Unterstützte Binärformate werden anhand ihrer Dateisignatur geprüft. Eine umbenannte EXE-Datei mit Bild- oder Videoendung wird blockiert.
- SVG-Dateien werden zusätzlich gegen Skripte, Event-Handler, `foreignObject`, externe Referenzen, CSS-Imports, externe `url(...)`-Ziele, Entities und XML-Stylesheets geprüft.
- Die Signaturprüfung ist kein vollständiger Malware-Scanner. Nur bekannte und vertrauenswürdige eigene Dateien verwenden.
- Nur Dateien importieren, die selbst erstellt wurden oder für die nachweisbare Nutzungsrechte bestehen.
- Der Browser verlangt vor dem Katalogimport eine ausdrückliche Rechtebestätigung.
- Binäre Videos und Rasterbilder werden für Git LFS eingeordnet.
- Scheitert nach erfolgreichem Import nur das Entfernen der Inbox-Datei, bleibt der Katalogimport gültig und es wird lediglich eine Warnung ausgegeben.
- Private Kundenmedien nicht in ein öffentliches Repository committen, auch wenn sie technisch über Git LFS gespeichert werden könnten.

## Medienpakete

- Medienpakete akzeptieren ausschließlich Assets mit Status `approved`.
- Pro Paket sind höchstens 20 Assets vorgesehen.
- Standardgrenzen: 300 MB pro Datei und 1,5 GB insgesamt.
- Externe Downloads akzeptieren ausschließlich HTTP(S).
- URLs mit Zugangsdaten sowie lokale, private und reservierte Netzadressen werden blockiert.
- DNS-Ziele werden vor dem Download geprüft; Weiterleitungen werden erneut validiert und begrenzt.
- Größen werden sowohl über `Content-Length` als auch während des Streams kontrolliert.
- HTML- und JSON-Fehlerantworten werden nicht als Medien gespeichert.
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
- Schreibvorgänge müssen bei Fehlern zurückgerollt oder vollständig verworfen werden.
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
