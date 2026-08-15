# Beta-Testplan

## Ziel

Die Beta `0.4.0-beta.5` wird vollständig lokal geprüft. Ein Merge nach `main` ist erst erlaubt, wenn Technik, Medienquellen, Personen-/Themenrecherche, Review, Rechte, Medienpaket und echte Nutzung abgenommen sind.

Der Realtest muss mindestens nachweisen:

1. zwölf Starterassets vorhanden und vollständig entschieden
2. alle vier Kanäle vertreten
3. ein echtes Kanalskript als Shotlist verarbeitet
4. eine echte Personen-/Themenrecherche durchgeführt
5. eine skriptspezifische Themenrecherche durchgeführt
6. alle fünf integrierten Medienquellen technisch geprüft
7. `ALLES-GEFUNDEN` inklusive Themenarchiv geprüft
8. Ausbau-720- und Review-first-Workflow geprüft
9. eine eigene lokale Datei importiert
10. mindestens ein Asset freigegeben
11. ein verifiziertes Medienpaket erzeugt
12. ein Asset real verwendet und Nutzung dokumentiert
13. `realTestComplete: true`

## Vorbereitung auf dem Mac

```bash
cd ~/Downloads/Visual-Asset-Hub-clean
git fetch origin
git switch agent/beta-release
git pull --ff-only origin agent/beta-release
npm run starter:import
npm run check
npm run serve
```

Danach öffnen:

```text
http://127.0.0.1:4173/web/
```

Das Terminal bleibt während des Browsertests geöffnet.

## Test A – Start, Navigation und zwölf Starterassets

Prüfen:

- **Lokale Verwaltung aktiv** sichtbar
- zwölf Starterassets sichtbar
- Navigation enthält:
  - Bibliothek
  - Skript planen
  - Thema recherchieren
  - Eigene Dateien
  - Prüfen
  - Medien suchen
  - Ausbau 720
  - 90 Kategorien
- alle Bereiche lassen sich sauber anspringen

Starterbestand nach `npm run starter:import`:

- acht Pexels-Videos
- drei eigene SVG-Grafiken
- ein Wikimedia-Commons-Kampfsportfoto unter CC BY-SA 4.0
- alle zunächst `review`

## Test B – Personen-/Themenrecherche

Unter **Thema recherchieren**:

1. Kanal **Kampfsport** wählen.
2. Thema `Conor McGregor` eingeben.
3. **Rechercheplan anzeigen** drücken.
4. sinnvolle Bereiche prüfen, darunter Training, Kämpfe, Presse, Wiegen/Staredown, Walkout und Portraits.
5. danach ein Testskript einfügen, das `Khabib Nurmagomedov`, `UFC 229` und `2018` enthält.
6. erneut den Rechercheplan erzeugen.
7. prüfen, dass skriptspezifische Bereiche reserviert werden.
8. tiefe Recherche darf höchstens acht priorisierte Bereiche beziehungsweise 40 Provider-Suchen planen.

### Recherche ohne private Keys

- Pexels/Pixabay/Unsplash-Keyfelder leer lassen.
- Recherche starten.
- Openverse und Wikimedia müssen weiterhin nutzbar sein.

### Recherche mit allen Quellen

- Pexels-, Pixabay- und Unsplash-Key nur für die aktuelle Sitzung eingeben.
- Recherche erneut durchführen.
- die fünf integrierten Quellen technisch prüfen.
- bei Pixabay denselben Suchlauf wiederholen und 24-Stunden-Cache kontrollieren.
- Bilder direkt ansehen.
- mindestens einen Pexels- oder Pixabay-Videotreffer im eingebauten Player abspielen.
- Quellseiten öffnen und Creator/Lizenzdaten prüfen.
- Treffer dürfen niemals automatisch markiert oder freigegeben werden.

### Importtest

- genau einen geeigneten Recherchetreffer markieren.
- als `review` importieren.
- unmarkierte Treffer dürfen nicht importiert werden.
- dynamische Tags für Thema und Recherchebereich kontrollieren.
- Freigabe bleibt von Personen-, Marken-, Event-, Veranstalter-, Broadcast- und Kontextprüfung abhängig.

### Themenordner

Prüfen:

```text
ALLES-GEFUNDEN/
└── 05-THEMENRECHERCHEN/
    └── 04-Kampfsport/
        └── Conor McGregor/
```

Dort kontrollieren:

- `00-RECHERCHEPLAN.md`
- thematische Unterordner
- Quellen-Unterordner
- `-INFO.md`
- `-QUELLE.url`
- vorhandene Medium-/Vorschau-Links
- `99-EXTERNE-SUCHLINKS`

YouTube-, Google- und UFC-Websuchlinks dienen ausschließlich der zusätzlichen Sichtung. Sichtbarkeit dort bedeutet **keine Nutzungsfreigabe**.

## Test C – fünf Medienquellen im normalen Arsenal Builder

Unter **Medien suchen** mindestens eine Standardsuche pro Quelle ausführen:

### Pexels

- Foto und Video testen
- gültiger Sitzung-Key
- Vorschau, Quelle und technischer Fit prüfen

### Pixabay

- Foto und Video testen
- gültiger Sitzung-Key
- identische Suche wiederholen und 24-Stunden-Cache prüfen

### Unsplash

- nur Fotoformat
- gültiger Access Key
- Fotograf und Unsplash dokumentiert
- Download-Meldung beim tatsächlichen Import

### Openverse

- kein Key nötig
- nur Fotoformat
- nur unterstützte Public-Domain-/CC0-/CC-BY-/CC-BY-SA-Ergebnisse übernehmen

### Wikimedia Commons

- kein Key nötig
- nur Fotoformat
- Lizenz, Quellseite und Attribution prüfen

Für alle Quellen gilt: nur bewusst ausgewählte Treffer importieren und jeden Import zunächst auf `review` belassen.

## Test D – Suchbegriff-, Fallback- und Batch-Workflow

Prüfen:

- technischer Fit 0–100 sortiert nur technisch und ändert keinen Status
- Suchreihenfolge innerhalb einer Sammlung: **Suchbegriff 1 → 2 → 3 → nächste Quelle**
- Video-Fallback: Pexels → Pixabay
- Foto-Fallback: Unsplash → Openverse → Wikimedia → Pexels → Pixabay
- Fallback startet keine API-Suche automatisch
- Batch enthält höchstens fünf Sammlungen
- mehrere Ergebnisgruppen können markiert werden
- Sammelimport läuft sequenziell
- Seite lädt erst am Ende einmal neu
- importierte Karten werden gesperrt und markiert
- tatsächliche Importzahl und übersprungene Dubletten werden getrennt angezeigt

## Test E – Ausbau 720 und Review-first

Unter **Ausbau 720** prüfen:

- Finanzen 160
- KI 160
- Elektrotechnik 160
- Kampfsport 240
- Gesamtziel 720
- globale **Nächste Aufgaben** zeigt höchstens sechs Prioritäten
- Review-Aufgaben stehen vor unnötiger neuer Suche
- Freigabe-Mix und echte Such-Mix-Lücke bleiben getrennt
- vorhandene Review-Videos/Fotos verhindern redundante Nachsuche
- Suchlücken werden mit passendem Medientyp, Quelle und Format vorbereitet
- höchstens fünf priorisierte Sammlungen werden an den Builder übergeben

## Test F – Sitzungs-Keys

Für Arsenal Builder und Themenrecherche prüfen:

- Key einmal eingeben und weitere Suche derselben Sitzung ohne erneute Eingabe starten
- **Sitzungs-Keys löschen** entfernt die Schlüssel sofort
- danach ist neue Eingabe nötig
- Browserseite neu laden; Keys sind weg
- weder `localStorage` noch `sessionStorage` enthalten Provider-Keys
- Such-, Recherche- und Katalogdateien enthalten keine Provider-Keys

## Test G – ALLES-GEFUNDEN

`npm run vault:build` ausführen und prüfen:

- `00-GESAMTINDEX.md`
- `00-GESAMTINDEX.csv`
- `00-MANIFEST.json`
- vier Kanalordner
- `05-THEMENRECHERCHEN`
- `90-GEFUNDENE-KANDIDATEN`
- mindestens eine echte lokale Dateikopie
- externe Quelle-/Medium-/Vorschau-Verknüpfungen
- klare Statusordner für Katalogassets

Danach temporäre Suchdaten im vorgesehenen Cleanup-Workflow bereinigen beziehungsweise einen weiteren Vault-Build ausführen. Historische normale Suchfunde und Themenrecherchen müssen erhalten bleiben.

## Test H – eigene Datei

Unter **Eigene Dateien**:

1. eigene Testdatei bereitstellen.
2. Vorschau, Dateityp und technische Daten prüfen.
3. Kanal und Sammlung wählen.
4. Titel/Beschreibung/Tags ergänzen.
5. Rechte ausdrücklich bestätigen.
6. als `review` importieren.
7. Asset im Katalog und in `ALLES-GEFUNDEN` kontrollieren.

## Test I – alle zwölf Starterassets entscheiden

Unter **Prüfen** jedes Starterasset vollständig ansehen und kontrollieren:

- sichtbarer Inhalt passt zu Titel und Tags
- technische Qualität ausreichend
- Personen, Logos, Marken und Kennzeichen geprüft
- Quelle und Lizenz nachvollziehbar
- Einsatzkontext geprüft

Erlaubte Entscheidungen:

- freigeben
- einschränken
- archivieren

Für die Beta-Abnahme müssen zwölf unterschiedliche Starter-IDs eine dokumentierte Entscheidung besitzen.

Für `VAH-WBOX2021` zusätzlich Attribution, sichtbare Personen, CC BY-SA 4.0 und Share-Alike-Pflichten prüfen.

## Test J – Freigabe-Negativtests

Prüfen:

- Freigabe mit fehlendem Pflichtpunkt wird blockiert
- Einschränkung ohne Begründung wird blockiert
- ungeprüftes Asset kann nicht in ein Medienpaket
- zweite parallele Schreibaktion wird mit HTTP 409 blockiert

Mindestens ein eindeutig geeignetes Asset nach vollständiger Vier-Punkte-Prüfung freigeben.

## Test K – Skript-Planer

Ein echtes Skript eines Kanals verarbeiten und prüfen:

- sinnvolle Szenentrennung
- exakte Zieldauer
- passende Sammlungen
- Assetstatus sichtbar
- Warnung bei ungeprüften Assets
- fehlende Motive liefern Suchbegriffe
- JSON-, CSV- und Markdown-Export

Zusätzlich CLI:

```bash
npm run script:plan -- \
  --channel electro \
  --file ./mein-testskript.txt \
  --duration 45 \
  --orientation vertical
```

Unter `reports/shot-plans` müssen JSON, CSV, Markdown, SRT und Skriptkopie vorhanden sein.

## Test L – Medienpaket und echte Nutzung

1. nur freigegebene Assets favorisieren.
2. verifiziertes Medienpaket erzeugen.
3. Manifest, SHA-256, Quelle, Lizenz und Attribution prüfen.
4. ein freigegebenes Asset aus dem Paket in echtem Content verwenden.
5. Projekt und Plattform dokumentieren.
6. Attribution exportieren.

## Test M – Berichte, Backup und Abschluss

```bash
npm run arsenal:expansion
npm run arsenal:report
npm run backup
npm run beta:verify
npm run check
```

Prüfen:

- Ausbauplan JSON/CSV
- Kanalabdeckung JSON/Markdown
- Beta-Readiness JSON/Markdown
- Backup-Manifest und Prüfsummen
- `topicResearchGenerated: true`
- `scriptSpecificTopicResearch: true`
- `starterAssetsReviewed: true`
- `verifiedMediaPackCreated: true`
- `realUsageRecorded: true`
- `realTestComplete: true`

## Abnahmekriterien

Die Beta gilt erst als **real getestet**, wenn alle oben genannten technischen und manuellen Prüfungen erfüllt sind. Insbesondere ist eine sichtbare Person oder ein bekannter Name im Rechercheergebnis niemals automatisch ein Nachweis für Identität oder Nutzungsrecht. Der konkrete Inhalt und die Rechte werden vor jeder Veröffentlichung separat geprüft.

Der Pull Request bleibt bis dahin Draft und wird nicht in `main` gemergt.
