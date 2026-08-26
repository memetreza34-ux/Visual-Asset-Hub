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

- [x] eigener Arbeitsbereich **Skript → Visuals**
- [x] nur **Fertiges Skript** ist Pflichtfeld
- [x] Skript wird nicht geschrieben, verbessert oder ergänzt
- [x] vollständiges Originalskript bleibt gespeichert und per SHA-256 dokumentiert
- [x] bis 40.000 Zeichen und maximal 120 visuelle Einheiten
- [x] Auto, Satzweise und Absatzweise
- [x] Auto verdichtet sehr viele kurze Einheiten kontrolliert auf maximal 120
- [x] Nummerierungs-/Listenpräfixe bleiben im Originaltext erhalten
- [x] nummerierte Rückbezugssätze wie `2. Sie ...` erben trotzdem Suchkontext
- [x] stabile Szenen-IDs und automatische Zeitbereiche
- [x] visuelle Absicht, Entitäten, Konzepte und 3–5 unterschiedliche Queries
- [x] providerfreundliche Übersetzungen häufiger deutscher Motive
- [x] Kontext-Vererbung für eindeutige Folgesätze und transparente Anzeige im Szenenboard
- [x] symbolische / kontextuelle B-Rolls werden gekennzeichnet
- [x] Pexels, Pixabay, Unsplash, Openverse und Wikimedia werden wiederverwendet
- [x] Gemischt versucht Video + Bild in derselben Szene zu sammeln
- [x] Schnell/Tief/Maximal nutzt nach Möglichkeit 1/3/5 Quellen und 4/8/12 maximale Suchtasks pro Szene/Seite
- [x] pro Szene werden je Modus bis zu 12/20/30 eindeutige Kandidaten behalten
- [x] echte Folgeseiten über `searchRound`, maximal 100 Seiten
- [x] Wikimedia-Pagination ohne ausgelassene Treffer
- [x] projektweite Deduplizierung und Wiederverwendungs-Penalty
- [x] bestehende Katalogassets werden verknüpft statt dupliziert
- [x] Langprojekte rendern Kandidaten ab mehr als 20 Szenen lazy
- [x] Sammelrecherche ist auf ungefähr 80 theoretische Provider-Suchtasks pro Batch gedrosselt
- [x] daraus resultieren maximal Schnell 20 / Tief 10 / Maximal 6 Szenen pro Batch
- [x] Stoppen und Fortsetzen sind vorgesehen
- [x] Projektspiegelung wird nach Erstellung inkrementell aktualisiert
- [x] manuelle Discovery-Links zu YouTube, Google Bilder/Videos/News und Wikipedia
- [x] Discovery-Links importieren nichts und sind keine Rechtefreigabe
- [x] Bilder sichtbar, Videos direkt abspielbar
- [x] Hauptvisual und mehrere Alternativen auswählbar
- [x] Import nur bewusst und jeder neue externe Import startet auf `review`
- [x] Projekte unter `.local-storage/script-visual-projects`
- [x] Spiegelung unter `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE`
- [x] Shotlist JSON/CSV und Szenenplan
- [x] Provider-Keys weder in Projekten noch `localStorage`/`sessionStorage`
- [x] Key wird erst nach erfolgreicher Anfrage genau dieses Providers als Sitzung-Key gemerkt
- [x] Pixabay-Cachetreffer validiert keinen neuen Key
- [x] Unit-/Browser-/API-/Vault-/Beta-Vertragstests vorhanden

### Später real prüfen

- [ ] echtes 1-Minuten-Skript erzeugt sinnvolle visuelle Einheiten
- [ ] Originalskript ist nach Speicherung unverändert
- [ ] Rückbezugssatz übernimmt sichtbar den richtigen Kontext
- [ ] nummerierter Rückbezugssatz funktioniert ebenfalls
- [ ] mindestens zwei Szenen werden real über Provider recherchiert
- [ ] mindestens eine konkrete Szene enthält gleichzeitig Video- und Bildkandidaten
- [ ] mehrere brauchbare Kandidaten pro Szene
- [ ] Tief/Maximal liefern bei vorhandenen Quellen die erwartete Quellenbreite
- [ ] **Mehr Treffer** lädt nachweislich Seite 2 und mindestens eine weitere Seite
- [ ] zusätzliche Suchseiten erhöhen die sinnvolle Auswahl bis zu den jeweiligen 12/20/30-Grenzen
- [ ] Video direkt abspielen, Bild direkt prüfen
- [ ] Hauptvisual und Alternativen bleiben nach Nachladen und Browser-Neuladen erhalten
- [ ] längeres Skript bleibt performant; Lazy-Rendering funktioniert
- [ ] Sammelbutton verwendet die modeabhängigen Batchgrößen Schnell 20 / Tief 10 / Maximal 6
- [ ] Stoppen beendet nach laufender Szene und Fortsetzen setzt korrekt weiter
- [ ] einzelne Providerfehler zerstören fertige Szenen nicht
- [ ] ein Kandidat wird bewusst als `review` importiert
- [ ] bestehender Katalogtreffer wird ohne Duplikat verknüpft
- [ ] ungewählte Kandidaten werden nicht importiert
- [ ] Unsplash-Import benötigt aktuellen Sitzung-Key
- [ ] keine Provider-Keys in Projektdateien
- [ ] `06-SKRIPT-PROJEKTE` enthält das echte Testprojekt
- [ ] inkrementelle Spiegelung verändert nur die betroffene Szene plus Root-Dateien
- [ ] erneuter `vault:build` erhält das Projekt
- [ ] Shotlist stimmt mit Szenen und Auswahl überein
- [ ] `scriptVisualProjectGenerated: true`
- [ ] `scriptVisualMultipleScenesSearched: true`
- [ ] `scriptVisualMixedMediaFound: true`
- [ ] `scriptVisualReviewImported: true`

## Universelle Themenrecherche

- [x] Auto, Person, Firma/Marke/Organisation, Produkt/Objekt, Event, Ort, Technik, Sport/Kampf/Athletik, Historie und allgemeines Konzept
- [x] Schnell maximal 6 Motivbereiche
- [x] Tief maximal 8 Motivbereiche
- [x] Maximal maximal 12 Motivbereiche / 60 Provider-Suchen
- [x] optionale Skriptbegriffe können Namen, Events und Jahreszahlen ergänzen
- [x] Bilder und Videos werden visuell dargestellt
- [x] jeder Import startet als `review`
- [x] externe Discovery-Links sind reine Recherchehilfe
- [ ] echte Sport-Recherche z. B. Conor McGregor geprüft
- [ ] mindestens eine zweite reale Rechercheart geprüft
- [ ] skriptspezifische Themenrecherche geprüft
- [ ] `multipleResearchTypesVerified: true`

## Fünf Medienquellen

### Pexels
- [ ] echte Fotosuche erfolgreich
- [ ] echte Videosuche erfolgreich
- [ ] Sitzung-Key funktioniert

### Pixabay
- [ ] echte Fotosuche erfolgreich
- [ ] echte Videosuche erfolgreich
- [ ] 24-Stunden-Cache für identische Suche funktioniert
- [ ] Seitennummer ist Teil des Caches

### Unsplash
- [ ] echte Fotosuche erfolgreich
- [ ] Creator/Attribution korrekt
- [ ] Download-Meldung beim Import korrekt

### Openverse
- [ ] Suche ohne geheimen Key funktioniert
- [ ] nur unterstützte offene Lizenztypen werden übernommen

### Wikimedia Commons
- [ ] Suche ohne geheimen Key funktioniert
- [ ] Lizenz und Attribution werden angezeigt
- [ ] Folgeseiten sind lückenlos

### Gemeinsame Regeln
- [ ] Provider-Keys verschwinden nach Neuladen
- [ ] keine Provider-Keys in `localStorage` oder `sessionStorage`
- [ ] technischer Fit verändert keinen Reviewstatus
- [ ] nur markierte Treffer werden importiert
- [ ] jeder neue Import startet auf `review`
- [ ] Dublettenprüfung funktioniert

## ALLES-GEFUNDEN

- [x] Katalog-Assets nach Kanal/Sammlung/Status
- [x] `05-THEMENRECHERCHEN`
- [x] `06-SKRIPT-PROJEKTE`
- [x] `90-GEFUNDENE-KANDIDATEN`
- [x] lokale Suchhistorie bleibt erhalten
- [x] Script-Visual-Projekte bleiben bei Vault-Neuaufbau erhalten
- [x] erzeugte Inhalte bleiben lokal
- [ ] `npm run vault:build` läuft lokal fehlerfrei
- [ ] Gesamtindex enthält nach Starterimport zwölf Starterassets
- [ ] lokale Dateikopie geprüft
- [ ] externe `.url`-Verknüpfungen geprüft
- [ ] echtes Script-Visual-Projekt bleibt nach erneutem Vault-Build erhalten
- [ ] kein Vault-Eintrag umgeht Review/Rechteprüfung

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

- [x] **Skript planen** bleibt getrennt vom Script Visual Finder
- [ ] echte Shotlist mit vorhandenen Kanal-Sammlungen prüfen
- [ ] JSON/CSV/Markdown/SRT prüfen
- [ ] `scriptPlanGenerated: true`

## Starterbibliothek und Review

- [x] acht Pexels-Videos vorgesehen
- [x] drei eigene SVG-Grafiken vorgesehen
- [x] ein Wikimedia-Commons-Foto CC BY-SA 4.0 vorgesehen
- [ ] `starter:import` erzeugt idempotent 12 Starterassets
- [ ] alle vier festen Kanäle vertreten
- [ ] alle zwölf Starterassets entschieden
- [ ] mindestens ein Asset freigegeben
- [ ] Freigabe ohne Pflichtprüfungen wird blockiert

## Eigene Medien

- [ ] eigener Dateiimport funktioniert
- [ ] Rechtebestätigung ist Pflicht
- [ ] Import startet auf `review`
- [ ] Inbox bleibt lokal

## Medienpaket und echte Nutzung

- [ ] ungeprüfte Assets werden aus Medienpaketen blockiert
- [ ] Paket ausschließlich mit `approved`-Assets
- [ ] Manifest, SHA-256, Quelle und Attribution geprüft
- [ ] mindestens ein freigegebenes Asset real verwendet
- [ ] Nutzung dokumentiert
- [ ] `realUsageRecorded: true`

## Backup / Restore

- [ ] Backup erzeugt
- [ ] Prüfsummenmanifest geprüft
- [ ] Restore-Dry-Run erfolgreich
- [ ] Rollback/Sicherheitsbackup geprüft

## GitHub Actions und Kostenkontrolle

- [x] Workflows ausschließlich `workflow_dispatch`
- [x] keine automatischen Push-/PR-/Schedule-Trigger
- [x] lokaler Vertragstest schützt diese Regel
- [ ] keine GitHub Action für lokale Beta-Abnahme erforderlich

## Release

- [x] Paketversion `0.4.0-beta.7`
- [x] README auf beta.7
- [x] Changelog beta.7
- [x] PR #3 bleibt bis zum Realtest Draft
- [ ] lokale Komplettprüfung grün
- [ ] alle Script-Visual-Realtest-Kriterien `true`
- [ ] bestehende Realtest-Kriterien `true`
- [ ] `realTestComplete: true`
- [ ] PR aus Draft nehmen
- [ ] nach erfolgreicher Abnahme nach `main` mergen

Die Beta gilt erst als real getestet, wenn der komplette lokale Ablauf inklusive **Skript rein → Visuals raus**, realen Provider-Suchen, Review, Rechteprüfung, Medienpaket und dokumentierter echter Nutzung erfolgreich abgenommen wurde.
