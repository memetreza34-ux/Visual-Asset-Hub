# Inbox

`inbox/` ist der lokale Eingang für neue, noch ungeprüfte Dateien.

Der Inhalt wird durch `.gitignore` nicht veröffentlicht. Nur diese README bleibt im Repository.

Ablauf:

1. Datei hier ablegen.
2. Quelle und Nutzungsrechte prüfen.
3. Metadaten vorbereiten.
4. Import mit `npm run asset:add -- ...` ausführen.
5. Katalogprüfung und Suchindex kontrollieren.
6. Erst danach den freigegebenen Asset-Pfad committen.

Keine privaten Kundendateien oder Dateien mit ungeklärten Rechten dauerhaft in der Inbox aufbewahren.
