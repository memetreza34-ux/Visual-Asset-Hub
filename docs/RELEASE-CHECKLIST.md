# Release-Checkliste

Aktueller Zielstand: **`0.4.0-beta.7`**.

Die Beta wird erst nach dem späteren vollständigen lokalen Realtest aus Draft genommen. Die folgenden technischen Funktionen sind implementiert, aber nicht allein dadurch real abgenommen.

## Technische Prüfung

- [ ] `npm run check` läuft lokal ohne Fehler
- [ ] `npm run beta:verify` meldet technisch bereit
- [ ] `npm run arsenal:validate` bestätigt Kanaldateien und Planerlexikon
- [ ] `npm run arsenal:plan` erzeugt JSON und CSV
- [ ] `npm run arsenal:expansion` erzeugt Ausbauplan Version 4
- [ ] `npm run arsenal:report` erzeugt den Abdeckungsbericht
- [ ] `npm run links:check -- --strict true` prüft externe Medien- und Quelllinks
- [ ] `npm run vault:build` erzeugt `ALLES-GEFUNDEN`
- [ ] statische Website wird mit `npm run site:build` erzeugt
- [ ] `npm run serve` startet lokal
- [ ] feste Navigation funktioniert
- [ ] lokale APIs akzeptieren nur Loopback, Same-Origin und gültiges Sitzungstoken
- [ ] gemeinsame Schreibsperre blockiert parallele Schreibaktionen
- [ ] keine Secrets oder signierten URLs befinden sich im Repository
- [ ] Katalog und Suchindex enthalten dieselben Asset-IDs

## Script Visual Finder – Skript rein → Visuals raus

### Implementiert

- [x] eigener Arbeitsbereich **Skript → Visuals** in Navigation und Web-App
- [x] nur **Fertiges Skript** ist Pflichtfeld
- [x] Projekttitel und Zuordnung sind optional
- [x] die Funktion schreibt, verbessert oder ergänzt das Skript nicht
- [x] Originalskript wird mit SHA-256 dokumentiert und lokal gespeichert
- [x] bis zu 40.000 Zeichen und maximal 120 visuelle Einheiten
- [x] Szenenmodi Auto, Satzweise und Absatzweise
- [x] lange Sätze können in kleinere visuelle Einheiten geteilt werden
- [x] Listen-/Nummerierungspräfixe werden nicht zu eigenen Szenen und bleiben im Originaltext erhalten
- [x] stabile Szenen-IDs `SCENE-001`, `SCENE-002` usw.
- [x] automatische Zeitbereiche
- [x] visuelle Absicht, Entitäten und Konzepte pro Szene
- [x] mehrere dynamische Queries pro Szene
- [x] Symbolbilder / kontextuelle B-Rolls werden als solche gekennzeichnet
- [x] Auto-Zuordnung zu Finanzen, KI, Elektrotechnik, Kampfsport oder neutral Allgemein
- [x] Allgemein beeinflusst die 720 Kanalziele nicht
- [x] Pexels, Pixabay, Unsplash, Openverse und Wikimedia werden wiederverwendet
- [x] Pixabay-24h-Cache bleibt aktiv und ist seitenspezifisch
- [x] Foto-only-Provider werden nicht als Videoquelle behandelt
- [x] Gemischt-Modus versucht Video-B-Roll und Bildmaterial pro Szene zu liefern
- [x] UI zeigt Video-/Bildanzahl und Mix-Status pro Szene
- [x] Szene-für-Szene-Suche statt unkontrollierter Massensuche
- [x] Schnell: mindestens 1 verfügbare Quelle / maximal 4 Suchtasks pro Suchseite
- [x] Tief: nach Möglichkeit mindestens 3 verfügbare Quellen / maximal 8 Suchtasks pro Suchseite
- [x] Maximal: nach Möglichkeit alle 5 verfügbaren Quellen / maximal 12 Suchtasks pro Suchseite
- [x] Providerziel passt sich an fehlende Sitzung-Keys an
- [x] **Mehr Treffer** lädt echte Folgeseiten statt erneut Seite 1
- [x] `searchRound` wird pro Szene gespeichert
- [x] maximal 100 Suchseiten pro Szene
- [x] vollständig fehlgeschlagene Runde erhöht `searchRound` nicht
- [x] Wikimedia verwendet lückenlosen `gsroffset` passend zu `perPage`
- [x] lange Projekte können gestoppt und später fortgesetzt werden
- [x] bereits fertige Szenen bleiben bei späteren Suchfehlern erhalten
- [x] Bilder direkt sichtbar
- [x] geeignete Videos direkt abspielbar
- [x] technischer Fit sichtbar
- [x] Quellseite und Creator soweit vorhanden sichtbar
- [x] Hauptvisual auswählbar
- [x] mehrere Alternativen auswählbar
- [x] Hauptvisual/Alternativen werden beim Kandidatenlimit geschützt
- [x] bereits in anderen Szenen gefundene Medien werden niedriger priorisiert
- [x] Dublettenprüfung umfasst Provider-ID, Quell-URL, Original-URL und Medienreferenz
- [x] Import nur nach bewusster Auswahl
- [x] jeder neu angelegte externe Import läuft über bestehende Asset-Pipeline und startet auf `review`
- [x] bereits vorhandene Katalogquelle wird verknüpft statt als Duplikat erneut angelegt
- [x] Projekte persistieren unter `.local-storage/script-visual-projects`
- [x] Projektübersicht und Wiederöffnen nach Browser-Neuladen
- [x] Spiegelung unter `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE`
- [x] `00-SKRIPT.txt`, `00-PROJEKT.json`, `00-SZENENPLAN.md`, `00-SHOTLIST.json`, `00-SHOTLIST.csv`
- [x] Kandidaten pro Szene mit INFO-/Quellen-/Medium-/Vorschau-Dateien
- [x] `vault:build` bewahrt Skriptprojekte
- [x] Provider-Keys werden nicht in Projektdateien geschrieben
- [x] Browser verwendet für Provider-Keys weder `localStorage` noch `sessionStorage`
- [x] neuer Key wird erst nach erfolgreicher Anfrage genau dieses Providers für die Sitzung gemerkt
- [x] keylose Provider können keinen falschen Key eines anderen Providers bestätigen
- [x] Pixabay-Cachetreffer validiert keinen neu eingegebenen Key
- [x] neue Unit-/Browser-/API-/Vault-/Beta-/Pagination-Regressionstests vorhanden

### Später real prüfen

- [ ] echtes 1-Minuten-Skript erzeugt sinnvolle visuelle Einheiten
- [ ] längeres Skript von mehreren Minuten bleibt übersichtlich und stabil
- [ ] Originalskript ist nach Speicherung inhaltlich unverändert
- [ ] nummerierte/Aufzählungs-Zeilen bleiben im Szenen-Originaltext erhalten
- [ ] mindestens zwei Szenen werden real über Provider recherchiert
- [ ] mindestens ein echter Video-Kandidat wird direkt abgespielt
- [ ] mindestens ein echter Bild-Kandidat wird sichtbar geprüft
- [ ] Gemischt-Modus liefert bei verfügbarer Videoquelle mindestens eine Szene mit Video + Bild
- [ ] UI zeigt für diese Szene **Mix erfüllt**
- [ ] mehrere Kandidaten pro Szene sind praktisch brauchbar
- [ ] **Mehr Treffer** lädt bei mindestens einer Szene Seite 2 statt erneut Seite 1
- [ ] erneutes **Mehr Treffer** kann Seite 3 laden
- [ ] bereits ausgewählte Hauptvisuals/Alternativen bleiben beim Nachladen erhalten
- [ ] Wikimedia-Seite 2 liefert einen neuen lückenlosen Trefferbereich
- [ ] **Alle Szenen recherchieren** zeigt korrekten Fortschritt
- [ ] **Stoppen** und Fortsetzen funktioniert
- [ ] einzelne Providerfehler zerstören keine bereits fertigen Szenen
- [ ] vollständig fehlgeschlagene Zusatzrunde erhöht die Suchseite nicht
- [ ] Hauptvisual und Alternativen bleiben nach Neuladen erhalten
- [ ] ein ausgewählter Kandidat wird bewusst als `review` importiert
- [ ] Test mit bereits vorhandenem Katalogtreffer verknüpft die vorhandene Asset-ID statt ein Duplikat anzulegen
- [ ] ungewählte Kandidaten werden nicht importiert
- [ ] Unsplash-Import benötigt weiterhin einen gültigen Sitzung-Key
- [ ] falscher neuer Provider-Key bleibt nach fehlgeschlagener Suche nicht im Sitzungsspeicher
- [ ] `.local-storage/script-visual-projects` enthält keine Provider-Keys
- [ ] `06-SKRIPT-PROJEKTE` enthält das echte Testprojekt
- [ ] Shotlist JSON/CSV/Markdown stimmt mit den Szenen überein
- [ ] `beta:verify` meldet `scriptVisualProjectGenerated: true`
- [ ] `beta:verify` meldet `scriptVisualMultipleScenesSearched: true`
- [ ] `beta:verify` meldet `scriptVisualMixedMediaFound: true`
- [ ] `beta:verify` meldet `scriptVisualReviewImported: true`

## Universelle Themenrecherche

- [x] Auto, Person, Firma/Marke/Organisation, Produkt/Objekt, Event, Ort, Technik, Sport/Kampf/Athletik, Historie und allgemeines Konzept
- [x] Schnell maximal 6 Motivbereiche
- [x] Tief maximal 8 Motivbereiche
- [x] Maximal maximal 12 Motivbereiche beziehungsweise 60 Provider-Suchen bei fünf Quellen
- [x] optionale Skriptbegriffe können Namen, Events und Jahreszahlen ergänzen
- [x] Bilder und Videos werden visuell dargestellt
- [x] jeder neue Import startet als `review`
- [x] externe Discovery-Links sind als reine Recherchehilfe gekennzeichnet
- [ ] echte Sport-Recherche z. B. Conor McGregor geprüft
- [ ] mindestens eine zweite reale Rechercheart geprüft
- [ ] skriptspezifische Themenrecherche geprüft
- [ ] `multipleResearchTypesVerified: true`

## Fünf Medienquellen

### Pexels
- [ ] echte Fotosuche erfolgreich
- [ ] echte Videosuche erfolgreich
- [ ] Sitzung-Key funktioniert
- [ ] Seite 2 liefert neue Treffer

### Pixabay
- [ ] echte Fotosuche erfolgreich
- [ ] echte Videosuche erfolgreich
- [ ] 24-Stunden-Cache für identische Suche funktioniert
- [ ] Cache vermischt keine Kanal-/Projektmetadaten
- [ ] Seitennummer ist Bestandteil des Caches

### Unsplash
- [ ] echte Fotosuche erfolgreich
- [ ] Creator/Attribution korrekt
- [ ] Download-Meldung beim Import korrekt
- [ ] nach Löschen des Sitzung-Keys kein alter Schlüssel nutzbar
- [ ] Seite 2 liefert neue Treffer

### Openverse
- [ ] Suche ohne geheimen Key funktioniert
- [ ] nur unterstützte offene Lizenztypen werden übernommen
- [ ] Seite 2 liefert neue Treffer

### Wikimedia Commons
- [ ] Suche ohne geheimen Key funktioniert
- [ ] Lizenz und Attribution werden angezeigt
- [ ] `gsroffset`/Seitennavigation liefert lückenlose neue Treffer

### Gemeinsame Regeln
- [ ] Provider-Keys verschwinden nach Neuladen
- [ ] keine Provider-Keys in `localStorage` oder `sessionStorage`
- [ ] technischer Fit verändert keinen Reviewstatus
- [ ] nur markierte Treffer werden importiert
- [ ] jeder neue externe Import startet auf `review`
- [ ] Dublettenprüfung funktioniert

## ALLES-GEFUNDEN

- [x] Katalog-Assets nach Kanal/Sammlung/Status
- [x] `05-THEMENRECHERCHEN`
- [x] `06-SKRIPT-PROJEKTE`
- [x] `90-GEFUNDENE-KANDIDATEN`
- [x] lokale Suchhistorie bleibt erhalten
- [x] Script-Visual-Projekte bleiben bei Vault-Neuaufbau erhalten
- [x] erzeugte Inhalte bleiben über `.gitignore` lokal
- [ ] `npm run vault:build` läuft im echten lokalen Repository fehlerfrei
- [ ] Gesamtindex enthält nach Starterimport zwölf Starterassets
- [ ] lokale Dateikopie geprüft
- [ ] externe `.url`-Verknüpfungen geprüft
- [ ] echtes Script-Visual-Projekt bleibt nach erneutem Vault-Build erhalten
- [ ] `searchRound`, Auswahl und Importverknüpfungen bleiben erhalten
- [ ] kein Vault-Eintrag umgeht Review- oder Rechteprüfung

## Ausbau 720 und Review-first

- [x] vier spezialisierte Kanäle
- [x] 90 Sammlungen
- [x] 270 Suchbegriffe
- [x] Ziele 160 / 160 / 160 / 240 = 720
- [x] Ausbauplan unterscheidet `review-first`, `search`, `complete`
- [x] Video-/Fotolücken getrennt
- [ ] reale Zahlen im Browser stimmen
- [ ] Review-Aufgaben stehen vor unnötiger Nachsuche
- [ ] globale nächste Aufgaben funktionieren
- [ ] priorisierte Batchübergabe funktioniert

## Bestehender Skript-Planer

- [x] bestehender Bereich **Skript planen** bleibt getrennt vom Script Visual Finder
- [ ] echte Shotlist mit vorhandenen Kanal-Sammlungen prüfen
- [ ] JSON/CSV/Markdown/SRT prüfen
- [ ] `scriptPlanGenerated: true`

## Starterbibliothek und Review

- [x] acht Pexels-Videos vorgesehen
- [x] drei eigene SVG-Grafiken vorgesehen
- [x] ein Wikimedia-Commons-Foto CC BY-SA 4.0 vorgesehen
- [ ] `npm run starter:import` erzeugt idempotent 12 Starterassets
- [ ] alle vier festen Kanäle vertreten
- [ ] alle zwölf Starterassets vollständig entschieden
- [ ] mindestens ein Asset freigegeben
- [ ] Freigabe ohne vier Pflichtprüfungen wird blockiert
- [ ] Einschränkung ohne Begründung wird blockiert

## Eigene Medien

- [ ] eigener Dateiimport funktioniert
- [ ] Rechtebestätigung ist Pflicht
- [ ] Import startet auf `review`
- [ ] Inbox bleibt lokal

## Medienpaket und echte Nutzung

- [ ] ungeprüfte Assets werden aus Medienpaketen blockiert
- [ ] Paket ausschließlich mit `approved`-Assets erzeugt
- [ ] `manifest.json`, SHA-256, Quelle und Attribution geprüft
- [ ] mindestens ein freigegebenes Asset real verwendet
- [ ] Nutzung dokumentiert
- [ ] `realUsageRecorded: true`

## Backup / Restore

- [ ] Backup erzeugt
- [ ] Prüfsummenmanifest geprüft
- [ ] Restore-Dry-Run erfolgreich
- [ ] Rollback/Sicherheitsbackup geprüft

## GitHub Actions und Kostenkontrolle

- [x] Workflows ausschließlich manuell über `workflow_dispatch`
- [x] keine automatischen `push`-Trigger
- [x] keine automatischen `pull_request`-Trigger
- [x] keine automatischen `schedule`-Trigger
- [x] lokaler Vertragstest schützt diese Regel
- [ ] keine GitHub Action ist für die lokale Beta-Abnahme erforderlich

## Release

- [x] Paketversion `0.4.0-beta.7`
- [x] README auf beta.7
- [x] Changelog beta.7
- [x] Script-Visual-Doku auf aktuelle beta.7-Härtung aktualisiert
- [x] PR #3 bleibt bis zum Realtest Draft
- [ ] lokale Komplettprüfung grün
- [ ] alle neuen Script-Visual-Realtest-Kriterien `true`
- [ ] bestehende Realtest-Kriterien `true`
- [ ] `realTestComplete: true`
- [ ] PR aus Draft nehmen
- [ ] nach erfolgreicher Abnahme nach `main` mergen
- [ ] optional Beta-Tag/Release erstellen

Die Beta gilt erst als real getestet, wenn der komplette lokale Ablauf inklusive **Skript rein → Visuals raus**, realen Provider-Suchen, Medienmix, Folgeseiten, Review, Rechteprüfung, Medienpaket und dokumentierter echter Nutzung erfolgreich abgenommen wurde.
