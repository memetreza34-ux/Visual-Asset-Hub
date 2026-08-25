# Changelog

## 0.4.0-beta.7 – 2026-08-23

### Neu

- neuer Hauptarbeitsbereich **Skript → Visuals / Script Visual Finder** für fertige Sprechertexte
- der eingegebene Skripttext wird nicht geschrieben, verbessert oder umformuliert; die Funktion dient ausschließlich der Visualsuche
- lokale Script-Visual-Projekte mit bis zu 40.000 Zeichen und maximal 120 visuellen Einheiten
- Szenenmodi **Auto**, **Satzweise** und **Absatzweise**
- automatische Zerlegung sehr langer Sätze in kleinere visuelle Einheiten; Nummerierungs- und Aufzählungspräfixe werden nicht als eigene Szene behandelt und bleiben im Szenen-Originaltext erhalten
- pro Szene visuelle Absicht, Entitäten, Konzepte, bevorzugter Medientyp und mehrere dynamische Queries
- direkter Zugriff auf Pexels, Pixabay, Unsplash, Openverse und Wikimedia Commons über die vorhandenen Provideradapter
- intelligente Suchbegrenzung pro Szene statt blind alle Queries gegen alle Provider abzufragen
- lange Projekte werden sequenziell Szene für Szene recherchiert und können gestoppt beziehungsweise später fortgesetzt werden
- vorhandene Ergebnisse bleiben erhalten, wenn eine spätere Einzelsuche fehlschlägt
- visuelles Szenenboard mit Bildern, abspielbaren Videos, technischem Fit, Provider, Query, Suchseite und Quellseite
- pro Szene **Hauptvisual** und mehrere **Alternativen** auswählbar
- bereits in anderen Szenen gefundene Medien werden projektweit niedriger priorisiert
- bewusster Import einzelner Kandidaten über die bestehende Review-Pipeline; kein automatischer Import und keine automatische Freigabe
- lokaler Projektbestand unter `.local-storage/script-visual-projects`
- neue lokale Ablage `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE`
- pro Projekt `00-SKRIPT.txt`, `00-PROJEKT.json`, `00-SZENENPLAN.md`, `00-SHOTLIST.json`, `00-SHOTLIST.csv` und Szenenordner
- Script-Visual-Projekte bleiben bei `vault:build` erhalten
- neutraler **Allgemein**-Projektmodus außerhalb der vier festen Ausbau-720-Kanäle

### Verbessert und gehärtet

- **Gemischt** sucht pro Szene nach Möglichkeit bewusst Video-B-Roll und Bildmaterial statt nur nach einer zufälligen Medienart
- die Oberfläche zeigt Video-/Bildanzahl sowie **Mix erfüllt** oder **Mix noch unvollständig**
- ausgewählte Hauptvisuals und Alternativen bleiben beim Kandidatenlimit geschützt; im Gemischt-Modus werden zusätzlich Treffer beider Medientypen bewahrt
- Recherche **Tief** berücksichtigt nach Möglichkeit mindestens drei verfügbare Quellen
- Recherche **Maximal** berücksichtigt nach Möglichkeit alle fünf tatsächlich verfügbaren Quellen mindestens einmal pro Szene
- **Mehr Treffer** verwendet echte Folgeseiten statt erneut Seite 1 zu laden; pro Szene wird `searchRound` persistiert
- Pexels, Pixabay, Unsplash, Openverse und Wikimedia erhalten die tatsächliche Seitennummer
- Wikimedia-Pagination berechnet `gsroffset` anhand der gewählten Seitengröße, damit zwischen Suchseiten keine Ergebnisse übersprungen werden
- vollständig fehlgeschlagene Suchrunden erhöhen die gespeicherte Suchseite nicht; maximal 100 Seiten pro Szene
- Kandidatendubletten werden zusätzlich über kanonisierte Quellseite, Original-Medien-URL und direkte Medienreferenz erkannt
- bereits vorhandene Katalogquellen werden mit dem Script-Visual-Projekt verknüpft statt unnötig ein zweites Katalogasset anzulegen
- neu eingegebene Pexels-/Pixabay-/Unsplash-Keys werden erst nach einer erfolgreichen Anfrage genau dieses Providers für die Sitzung gemerkt
- erfolgreiche keylose Provider können keinen fehlerhaften Key eines anderen Providers bestätigen
- ein reiner Pixabay-Cachetreffer gilt nicht als Validierung eines neu eingegebenen Pixabay-Keys
- Review-Filter **Noch keinem Kanal zugeordnet** begrenzt auch die Sammlungs-Auswahl korrekt auf ungetaggte Assets

### Abnahme und Tests

- neue Tests für Segmentierung, lange Skripte, visuelle Intents, Query-Erzeugung und Kanal-Autoerkennung
- Regressionstest stellt sicher, dass nummerierte und Aufzählungs-Zeilen im Szenen-Originaltext erhalten bleiben
- neue Browser-Vertragstests für Navigation, Bild-/Videoansicht, Medienmix, Hauptvisual/Alternativen, Pagination, Fortschritt und Sitzungs-Keys
- neue API-Vertragstests für Loopback-/Same-Origin-/Token-Schutz, fünf Provider, Pixabay-Cache, provider-spezifische Keyvalidierung, Katalogverknüpfung, Pagination, Projektpersistenz und Review-Import
- Open-Media-Test sichert lückenlose Wikimedia-Seiten über `gsroffset`
- neuer Vault-Vertragstest für dauerhafte `06-SKRIPT-PROJEKTE`
- `beta:verify` verlangt für die endgültige Abnahme ein echtes Script-Visual-Projekt, mindestens zwei real recherchierte Szenen, mindestens einen Video- und einen Bildkandidaten sowie mindestens einen bewusst als Review importierten Script-Visual-Treffer

### Sicherheit und Rechte

- Pexels-, Pixabay- und Unsplash-Keys bleiben auch im Script Visual Finder nur im Arbeitsspeicher der geöffneten Browserseite
- Skripte und lokale Projektdateien werden durch `.gitignore` nicht in Git veröffentlicht
- jeder neue externe Import aus einem Skriptprojekt startet auf `review`
- bereits vorhandene Katalogassets werden nur verknüpft und nicht automatisch in ihrem Freigabestatus verändert
- technische Trefferbewertung ist keine Inhalts-, Identitäts- oder Rechtefreigabe
- konkrete Personen, Marken, Events, Broadcastmaterial und symbolische B-Rolls müssen vor Veröffentlichung weiterhin manuell geprüft werden
- GitHub Actions bleiben optional und werden für die lokale Beta-Abnahme nicht benötigt

## 0.4.0-beta.6 – 2026-08-15

### Neu

- **Universelle Medienrecherche** statt nur personen-/kampfsportzentrierter Recherche
- Recherchearten: automatisch, Person, Firma/Marke/Organisation, Produkt/Objekt, Event, Ort, Technik/Gerät/System, Sport/Kampf, Historie und allgemeines Konzept
- jede Rechercheart besitzt eigene Motivgruppen und Suchstrategien
- Beispiele: Portrait/Karriere für Personen, Branding/Produkte für Firmen, Unboxing/Details für Produkte, Venue/Publikum für Events, Luftaufnahmen/Innenräume für Orte, Komponenten/Wartung für Technik und Archiv/Karten für historische Themen
- `Auto` erkennt anhand von Zielkanal und eindeutigen Begriffen einen passenden Recherchetyp
- dritter Rechercheumfang **Maximal** mit bis zu zwölf Motivbereichen und höchstens 60 Provider-Suchen
- `Schnell` bleibt auf bis zu sechs, `Tief` auf bis zu acht Motivbereiche begrenzt
- universelle Themenimporte erhalten zusätzlich `topic-type-*`-Tags und eine zur Rechercheart passende Hauptkategorie
- externe Recherchehilfen um Google News und Wikipedia-Suche ergänzt

### Verbessert

- Zielkanal bestimmt nur noch die spätere Content-Zuordnung; die Rechercheart bestimmt die Motive
- Skriptanalyse berücksichtigt weiterhin konkrete Namen, Events, Jahreszahlen und zitierte Begriffe und reserviert dafür Suchplätze
- Browseroberfläche erklärt universelle Recherche explizit und bietet alle Recherchearten direkt an
- Rechercheplan zeigt erkannte Rechercheart, Modus und maximale Provider-Suchen
- Formularlayout für zusätzliche Recherchefelder responsiv überarbeitet
- Servergrenze für bewusst gewählten Maximalmodus auf 60 sequenzielle Suchaufgaben erweitert
- alter Versionstest von beta.3 auf den aktuellen Paketstand korrigiert

### Sicherheit und Rechte

- Maximalmodus startet nur nach ausdrücklicher Nutzereingabe und importiert weiterhin nichts automatisch
- alle externen Treffer bleiben bis zur manuellen Sicht- und Rechteprüfung `review`
- Firmen-, Produkt-, Event-, Personen-, Marken-, Broadcast- und Urheberrechte werden weiterhin nicht aus Suchsichtbarkeit abgeleitet
- API-Keys bleiben ausschließlich im Arbeitsspeicher der geöffneten Browserseite

## 0.4.0-beta.5 – 2026-08-15

### Neu

- eigener Browser-Arbeitsbereich **Thema recherchieren** für beliebige Personen und Reel-Themen
- automatische Recherchepläne für Finanzen, KI, Elektrotechnik und Kampfsport
- Kampfsport-Recherche mit Bereichen für Allgemein, Training, Kämpfe, Presse, Wiegen/Staredown, Walkout, Portraits und Sieg/Reaktion
- optionales Reel-Skript erweitert die Recherche um erkannte Gegner/Personen, Eventbezeichnungen und Jahreszahlen
- skriptspezifische Begriffe erhalten reservierte Plätze vor weniger wichtigen generischen Suchbereichen
- tiefe Recherche auf maximal acht priorisierte Bereiche und 40 Provider-Suchen begrenzt
- alle fünf integrierten Quellen können in einer Themenrecherche genutzt werden; Openverse und Wikimedia funktionieren weiterhin ohne Key
- quellenübergreifende Themenrecherche dedupliziert Treffer über Provider-ID sowie kanonisierte Quell- und Medien-URLs
- Bilder werden direkt angezeigt; Pexels-/Pixabay-Videotreffer können direkt im Recherchebereich abgespielt werden
- markierte Themenfunde können gruppenübergreifend sequenziell als `review` importiert werden
- Themenfunde erhalten eigene Tags für Person/Thema und Recherchebereich
- neues dauerhaftes Archiv `ALLES-GEFUNDEN/05-THEMENRECHERCHEN`
- automatische Themenstruktur nach Kanal → Thema → Recherchebereich → Quelle
- `00-RECHERCHEPLAN.md` pro Themenrecherche mit Suchbereichen, Quellen und Rechtehinweisen
- zusätzliche manuelle Discovery-Verknüpfungen zu YouTube, Google Bilder/Video und bei Kampfsport zur Websuche auf der offiziellen UFC-Domain
- CLI-Rechercheplan über `npm run entity:plan -- "<Thema>"`

### Verbessert

- `ALLES-GEFUNDEN` archiviert jetzt Katalog-Assets, normale Suchkandidaten und Personen-/Themenrecherchen getrennt
- Themenrecherchen bleiben auch nach Bereinigung temporärer API-Suchdateien lokal erhalten
- Gesamtindex und Manifest unterscheiden normale Kandidaten und Themenrecherche-Funde
- Arbeitsbereich-Navigation um **Thema recherchieren** ergänzt
- lokale Serververwaltung bindet `/entity-api/` in dieselbe Loopback-, Same-Origin-, Token- und Schreibsperren-Logik ein
- Recherche-Keys für Pexels, Pixabay und Unsplash bleiben ausschließlich im Arbeitsspeicher der geöffneten Seite
- direkte Videowiedergabe wählt eine geeignete vorhandene Videorendition und lädt nur Metadaten vor
- Release-Checkliste enthält einen eigenen Realtest für Personen-/Themenrecherche
- README und `ALLES-GEFUNDEN`-Dokumentation auf beta.5 aktualisiert

### Sicherheit und Rechte

- Themenrecherche importiert nichts automatisch und setzt keinen Treffer automatisch auf `approved`
- externe YouTube-/Google-/UFC-Suchlinks sind ausdrücklich nur Discovery-Hilfen und keine Lizenz- oder Nutzungserlaubnis
- sichtbare Personen, Marken, Veranstalter-, Broadcast- und Nutzungskontexte bleiben Pflichtprüfung vor Veröffentlichung
- Pexels-, Pixabay- und Unsplash-Keys werden weder in Recherche-, Such- noch Katalogdateien geschrieben
- Openverse/Wikimedia-Lizenzdaten bleiben beim späteren Import erhalten; CC BY und CC BY-SA benötigen weiterhin Attribution

## 0.4.0-beta.4 – 2026-08-07

### Neu

- Arsenal Builder auf fünf Medienquellen erweitert: Pexels, Pixabay, Unsplash, Openverse und Wikimedia Commons
- Pixabay-Suche für Bilder und Videos mit 24-Stunden-API-Cache
- Unsplash-Fotosuche mit Fotografenattribution und vorgeschriebener Download-Meldung beim Import
- Openverse- und Wikimedia-Commons-Suche ohne geheimen API-Key
- konservativer Open-Lizenzfilter für Public Domain, CC0, CC BY und CC BY-SA
- `cc-by-sa` als eigener Lizenzstatus mit verpflichtender Attribution und Share-Alike-Hinweis
- Batch-Suche für bis zu fünf Sammlungen pro Durchlauf
- gesamter Suchbatch kann über alle Ergebnisgruppen markiert und sequenziell als `review` importiert werden
- bereits importierte Batch-Karten werden gesperrt und sichtbar als importiert markiert
- manueller Quellen-Fallback mit gleicher Sammlung, gleichem Format und gleichem Suchbegriff
- Video-Fallbackkette: Pexels → Pixabay
- Foto-Fallbackkette: Unsplash → Openverse → Wikimedia Commons → Pexels → Pixabay
- Ausbau-720-Dashboard mit Fortschritt für Finanzen, KI, Elektrotechnik und Kampfsport
- Smart-Medienmix erkennt Video- und Fotolücken pro Sammlung
- priorisierte Top-Suchlücken können mit empfohlener Quelle und Format direkt an den Arsenal Builder übergeben werden
- Ausbau-Dashboard leitet Sammlungen mit ausreichendem Review-Vorrat direkt in die Review-Warteschlange
- Review-Warteschlange mit Sammlungsfilter und Sortierung **Größter Ausbau-Effekt**
- sichtbare Review-Priorität aus Freigabelücke, Medienmix, Qualität und dokumentiertem Rechte-Status
- CLI-Ausbauplan Version 3 über `npm run arsenal:expansion` als JSON und CSV
- CLI-Ausbauplan unterscheidet `review-first`, `search` und `complete` und nennt Primär- sowie Fallbackquelle
- Pexels-, Pixabay- und Unsplash-Keys können nur für die aktuelle Browserseite im Arbeitsspeicher gehalten werden
- Schaltfläche **Sitzungs-Keys löschen** entfernt alle gespeicherten Provider-Keys sofort aus dem Arbeitsspeicher
- CC-BY-SA-4.0-Kampfsport-Starter `VAH-WBOX2021` aus Wikimedia Commons
- Starterbibliothek auf zwölf reale Assets erweitert und alle vier Kanäle im Starter-Realtest vertreten

### Verbessert

- Navigation um **Medien suchen** und **Ausbau 720** erweitert
- Realtest, README, Kanal-Arsenal und Release-Checkliste auf Mac, fünf Quellen und zwölf Starterassets aktualisiert
- Openverse filtert nicht unterstützte Bildformate vor dem Import
- Wikimedia filtert nicht unterstützte MIME-Typen und unklare Lizenztypen vor dem Import
- API-Keys werden weder in `localStorage` noch in `sessionStorage` geschrieben
- priorisierte Batches verwenden konkrete Sammlungs-IDs statt nur fünf benachbarte Sammlungen
- Review-first steht vor neuer API-Suche, wenn bereits genug Kandidaten vorhanden sind
- tatsächliche Importzahl und übersprungene Dubletten werden getrennt gemeldet
- Openverse- und Wikimedia-Importe erkennen Dubletten zusätzlich über die Original-Medien-URL
- Batch-Import lädt die Seite erst nach Abschluss aller ausgewählten Gruppen einmal neu
- alle GitHub-Actions-Workflows sind auf `workflow_dispatch` beschränkt; Push-, Pull-Request- und Schedule-Trigger sind entfernt
- lokaler Regressionstest blockiert die erneute Einführung automatischer GitHub-Actions-Trigger

### Fehlerbehebungen

- Pixabay-API-Cache und Import-Suchergebnis sind getrennt: dieselbe gecachte API-Antwort kann wiederverwendet werden, ohne Kanal- oder Sammlungsmetadaten eines anderen Jobs zu übernehmen
- Unsplash-Import kann nach **Sitzungs-Keys löschen** keinen alten Schlüssel aus einem bereits gerenderten Ergebnis weiterverwenden
- Batch-Ergebnisse bleiben nach dem Import einer einzelnen Gruppe erhalten und können weiter bearbeitet werden
- Startseite leitet stabil auf `/web/` um, damit CSS- und JavaScript-Pfade korrekt aufgelöst werden
- lokale Tests für IPv4-gemappte IPv6-Adressen, neue Themenkategorien und gemeinsame Schreibsperren korrigiert

### Sicherheit und Kostenkontrolle

- alle externen Importe bleiben bis zur manuellen Sichtprüfung auf `review`
- auch die Ausbau-Priorität löst niemals eine automatische Freigabe aus
- Openverse und Wikimedia übernehmen nur eindeutig unterstützte offene Lizenztypen
- CC BY und CC BY-SA erzwingen dokumentierte Attribution
- sichtbare Personen, Marken, Logos und Nutzungskontext bleiben auch bei offenen Lizenzen Pflichtprüfung
- Quellen-Fallbacks werden nur vorbereitet und starten keine API-Anfrage ohne ausdrücklichen Klick
- GitHub Actions startet im Beta-Branch nicht automatisch durch Push, Pull Request oder Zeitplan
- die vollständige Beta-Abnahme erfolgt lokal auf dem Mac; GitHub-hosted Runner sind für die Abnahme nicht erforderlich

## 0.4.0-beta.3 – 2026-08-06

### Neu

- lokaler Reel- und Skript-Planer für Finanzen, KI, Elektrotechnik und Kampfsport
- automatische Zerlegung deutscher Sprechtexte in bis zu 20 Szenen
- proportionale Zeitplanung für Reels, Shorts, YouTube und Präsentationen
- Zuordnung jeder Szene zu passenden Kanal-Sammlungen
- bis zu drei vorhandene Asset-Vorschläge pro Szene
- sichtbare Trennung zwischen freigegebenen und ungeprüften Vorschlägen
- direkter Wechsel vom Szenenvorschlag zum Pexels Arsenal Builder
- direkte Übernahme vorgeschlagener Assets in Favoriten und Medienpakete
- Bibliotheks- und Freigabeabdeckung pro Shotlist
- Export als JSON, CSV und Markdown im Browser
- Kommandozeilen-Export als JSON, CSV, Markdown und SRT
- deutsches und englisches Synonymlexikon mit Fachbegriffen aller vier Kanäle
- automatische Prüfung aller Lexikonregeln gegen die 90 vorhandenen Sammlungen

### Verbessert

- Version auf `0.4.0-beta.3` erhöht
- Arbeitsbereich-Navigation um **Skript planen** ergänzt
- Favoriten aus dem Skript-Planer aktualisieren sofort die Projektauswahl
- fehlende Szenenmotive liefern konkrete Pexels-Suchbegriffe
- Skripttexte bleiben lokal und werden nicht automatisch gespeichert oder übertragen

### Sicherheit

- der Browser-Planer benötigt keine externe KI-API
- Skriptdateien für den CLI-Planer sind auf 1 MB begrenzt
- CLI-Ausgabeordner müssen innerhalb des Projektverzeichnisses liegen
- Review-Assets werden im freigegebenen Modus vollständig ausgeschlossen
- jeder ungeprüfte Vorschlag erhält eine deutliche Veröffentlichungswarnung

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
