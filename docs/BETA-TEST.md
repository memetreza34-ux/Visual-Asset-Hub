# Beta-Testplan

## Ziel

Die Beta **`0.4.0-beta.7`** wird später vollständig lokal geprüft. Ein Merge nach `main` ist erst erlaubt, wenn insbesondere der neue Workflow **Skript rein → Visuals raus**, die fünf Medienquellen, Review, Rechte, Medienpaket und echte Nutzung abgenommen sind.

## Vorbereitung – erst beim späteren Endtest

```bash
cd ~/Downloads/Visual-Asset-Hub-clean
git fetch origin
git switch agent/beta-release
git pull --ff-only origin agent/beta-release
npm run starter:import
npm run check
npm run serve
```

Danach:

```text
http://127.0.0.1:4173/web/
```

## Test A – Start und Navigation

Prüfen:

- **Lokale Verwaltung aktiv** sichtbar
- Navigation enthält **Skript → Visuals**
- vorhandene Bereiche bleiben erreichbar: Bibliothek, Skript planen, Thema recherchieren, Eigene Dateien, Prüfen, Medien suchen, Ausbau 720, 90 Kategorien
- zwölf Starterassets nach `starter:import`

## Test B – Script Visual Finder

### B1 – 1-Minuten-Skript

Unter **Skript → Visuals** ein fertiges Skript verwenden, z. B. zu **KI-Robotern bis 2035**.

Prüfen:

1. nur das Feld **Fertiges Skript** ist zwingend erforderlich
2. Projekt ohne manuell gewählten Kanal/Titel erzeugen
3. vollständiger eingegebener Skripttext bleibt in `00-SKRIPT.txt` unverändert
4. Auto-Modus bildet sinnvolle visuelle Einheiten
5. nummerierte beziehungsweise Aufzählungs-Zeilen behalten `1.`, `2.`, `-` usw. im Szenen-Originaltext
6. jede Szene besitzt stabil `SCENE-001`, `SCENE-002` usw.
7. pro Szene entstehen mehrere sinnvolle Queries
8. konkrete Aussagen erhalten konkrete Visualrichtungen
9. abstrakte Aussagen können als symbolische / kontextuelle B-Rolls markiert werden
10. Zeitbereiche sind monoton und schließen sauber aneinander an

### B2 – echte Medienrecherche

Mindestens zwei Szenen real recherchieren. Medienpräferenz zunächst auf **Gemischt** stellen.

Prüfen:

- Openverse und Wikimedia funktionieren ohne privaten Key
- mit Sitzung-Keys zusätzlich Pexels, Pixabay und Unsplash
- Bilder werden direkt angezeigt
- geeignete Pexels-/Pixabay-Videos sind direkt abspielbar
- technischer Fit ist sichtbar
- Quellseite lässt sich öffnen
- mehrere Kandidaten pro Szene erscheinen
- pro Szene werden Video- und Bildanzahl angezeigt
- mindestens eine Szene erreicht bei verfügbarer Videoquelle **Mix erfüllt**
- mindestens ein Video- und ein Bildkandidat im Projekt
- bereits in anderen Szenen vorhandene Treffer werden niedriger priorisiert
- Dubletten aus erneut gefundenen Quell-/Original-/Medien-URLs werden nicht mehrfach als eigenständige Kandidaten behandelt
- kein Kandidat wird automatisch ausgewählt oder freigegeben

Rechercheumfang zusätzlich prüfen:

- **Schnell** bleibt sparsam
- **Tief** versucht nach Möglichkeit mindestens drei verfügbare Quellen einzubeziehen
- **Maximal** versucht nach Möglichkeit alle fünf tatsächlich verfügbaren Quellen mindestens einmal einzubeziehen
- fehlen Keys, blockiert dies Maximal nicht; die erforderliche Providerzahl passt sich an die verfügbaren Quellen an

### B3 – Mehr Treffer / Suchseiten

Bei einer bereits recherchierten Szene **Mehr Treffer** verwenden.

Prüfen:

1. erste Suche steht auf Seite 1
2. erster Klick **Mehr Treffer** lädt Seite 2
3. nächster Klick kann Seite 3 laden
4. neue Treffer werden zu den vorhandenen Kandidaten ergänzt statt Seite 1 nur zu wiederholen
5. ausgewähltes Hauptvisual und Alternativen bleiben beim Nachladen erhalten
6. `searchRound` bleibt nach Browser-Neuladen erhalten
7. eine komplett fehlgeschlagene Zusatzrunde erhöht die Suchseite nicht
8. Pixabay verwendet pro Seite einen getrennten Cacheeintrag
9. Wikimedia liefert auf Seite 2 einen neuen, lückenlosen Trefferbereich über den passenden `gsroffset`
10. nach Seite 100 wird weiteres Nachladen blockiert

### B4 – Auswahl

Prüfen:

- Kandidat als **Hauptvisual** markieren
- mindestens einen anderen als **Alternative** markieren
- Auswahl wieder lösen
- Browser neu laden und Projekt erneut öffnen
- Auswahl bleibt erhalten
- Auswahl bleibt auch nach **Mehr Treffer** erhalten

### B5 – Review-Import und Katalogverknüpfung

- genau einen gewünschten neuen Kandidaten importieren
- neu angelegtes Katalogasset startet auf `review`
- ungewählte Kandidaten bleiben unimportiert
- Script-Visual-Projekt speichert die neue Katalog-Asset-ID
- Unsplash-Import benötigt aktuellen Sitzung-Key
- keine Provider-Keys stehen in Projektdateien

Zusätzlich einen Treffer testen, dessen Quelle bereits im Katalog existiert:

- kein zweites Katalogasset anlegen
- vorhandene Katalog-Asset-ID mit dem Script-Visual-Kandidaten verknüpfen
- Oberfläche zeigt den Kandidaten danach als importiert
- vorhandener Katalogstatus wird durch die Verknüpfung nicht automatisch verändert

### B6 – Provider-Key-Härtung

Für Pexels, Pixabay und Unsplash prüfen:

- neuer gültiger Key wird erst nach erfolgreicher Anfrage genau dieses Providers für die Sitzung gemerkt
- falscher neuer Key bleibt nach fehlgeschlagener Provideranfrage nicht gespeichert
- erfolgreicher Openverse-/Wikimedia-Lauf bestätigt keinen fehlerhaften Key eines anderen Providers
- reiner Pixabay-Cachetreffer validiert keinen neu eingegebenen Pixabay-Key
- **Sitzungs-Keys löschen** entfernt alle gemerkten Keys
- Seitenreload entfernt alle Sitzungsschlüssel

### B7 – langes Skript

Ein längeres Skript mit mehreren Minuten Sprechertext verwenden.

Prüfen:

- Projekt bleibt unter 120 visuellen Einheiten oder fordert sinnvoll zur gröberen Segmentierung auf
- **Alle Szenen recherchieren** arbeitet sequenziell
- Fortschritt zeigt recherchierte Szenen
- **Stoppen** beendet nach der laufenden Szene
- **Recherche fortsetzen** setzt bei noch offenen Szenen fort
- ein Fehler einer Quelle entfernt bereits fertige Szenen nicht
- einzelne Szenen können später separat über weitere Seiten vertieft werden

### B8 – Projektordner

Prüfen:

```text
ALLES-GEFUNDEN/
└── 06-SKRIPT-PROJEKTE/
    └── <Projekt>/
        ├── 00-SKRIPT.txt
        ├── 00-PROJEKT.json
        ├── 00-SZENENPLAN.md
        ├── 00-SHOTLIST.json
        ├── 00-SHOTLIST.csv
        ├── 001-SCENE-001/
        └── ...
```

Pro recherchierter Szene mindestens INFO-/Quellenverknüpfungen prüfen. `00-PROJEKT.json` muss Suchseite, Kandidaten, Auswahl und Importverknüpfungen enthalten. Danach `vault:build` erneut ausführen; das Script-Visual-Projekt muss erhalten bleiben.

## Test C – universelle Themenrecherche

Die separate Funktion **Thema recherchieren** bleibt zu prüfen:

1. `Conor McGregor` als **Sport / Kampf / Athletik**
2. eine zweite unterschiedliche Rechercheart, z. B. `RCD` als Technik oder `Tesla Model 3` als Produkt
3. eine Recherche mit Skriptbezug, z. B. Khabib / UFC 229 / 2018

Erwartung:

- mindestens zwei dokumentierte Recherchearten
- `multipleResearchTypesVerified: true`
- `scriptSpecificTopicResearch: true`

## Test D – fünf Quellen

### Pexels
- Foto + Video
- Sitzung-Key
- Seite 2 liefert neue Treffer

### Pixabay
- Foto + Video
- Sitzung-Key
- identische Suche auf derselben Seite erneut ausführen und 24h-Cache prüfen
- Seite 2 besitzt einen eigenen Cachekontext

### Unsplash
- Foto
- Sitzung-Key
- Creator/Attribution
- Import-Downloadmeldung
- Seite 2 liefert neue Treffer

### Openverse
- keylos
- nur unterstützte offene Lizenztypen
- Seite 2 liefert neue Treffer

### Wikimedia Commons
- keylos
- Lizenz/Attribution
- lückenlose Seitennavigation über `gsroffset`

Für alle: nur bewusst ausgewählte Treffer importieren; jeder neu angelegte externe Import beginnt auf `review`.

## Test E – Provider-Keys

Für Script Visual Finder, Themenrecherche und Arsenal Builder:

- Key in laufender Seite nutzbar
- **Sitzungs-Keys löschen** entfernt ihn
- Seitenreload entfernt ihn
- keine Keys in `localStorage`
- keine Keys in `sessionStorage`
- keine Keys in Projekt-, Such- oder Katalogdateien
- ungültiger neu eingegebener Key bleibt nach fehlgeschlagener Suche nicht gemerkt

## Test F – ALLES-GEFUNDEN

Prüfen:

- `00-GESAMTINDEX.md`, CSV, Manifest
- 01–04 Kanalordner
- `05-THEMENRECHERCHEN`
- `06-SKRIPT-PROJEKTE`
- `90-GEFUNDENE-KANDIDATEN`
- lokale Dateikopie
- externe `.url`-Verknüpfungen
- Historie bleibt nach erneutem Build erhalten
- Script-Visual-Suchseiten und Auswahl bleiben nach erneutem Build erhalten

## Test G – Ausbau 720 / Review-first

Prüfen:

- Finanzen 160
- KI 160
- Elektrotechnik 160
- Kampfsport 240
- Gesamt 720
- Review-Aufgaben vor unnötigen Suchjobs
- Video-/Fotolücken
- globale nächste Aufgaben
- Batch/Fallbacks
- technischer Fit verändert keinen Status

## Test H – bestehender Skript-Planer

Der ältere Bereich **Skript planen** darf durch Script Visual Finder nicht regressieren.

Prüfen:

- echte Shotlist
- Kanal-Sammlungen
- vorhandene Assets
- JSON/CSV/Markdown
- CLI zusätzlich JSON/CSV/Markdown/SRT/Skriptkopie

## Test I – eigene Datei

- eigene Datei über Inbox/Browser hochladen
- Rechte bestätigen
- als `review` importieren
- Katalog und ALLES-GEFUNDEN prüfen

## Test J – zwölf Starterassets / Review

Alle zwölf Starterassets vollständig entscheiden.

Prüfen:

- Inhalt
- Technik
- Personen/Marken
- Quelle/Lizenz
- Einsatzkontext
- Wikimedia-Starter zusätzlich CC BY-SA 4.0 / Attribution / Share-Alike
- mindestens ein Asset freigeben
- Freigabe ohne vier Pflichtpunkte muss blockiert werden

## Test K – Medienpaket und reale Nutzung

1. nur freigegebene Assets verwenden
2. verifiziertes Medienpaket erzeugen
3. SHA-256, Manifest, Quelle, Lizenz, Attribution prüfen
4. ein Asset tatsächlich in einem Content-Projekt einsetzen
5. Nutzung dokumentieren

## Test L – Backup und Abschluss

Später ausführen:

```bash
npm run arsenal:expansion
npm run arsenal:report
npm run backup
npm run beta:verify
npm run check
```

Der Bereitschaftsbericht muss insbesondere melden:

```text
scriptVisualProjectGenerated: true
scriptVisualMultipleScenesSearched: true
scriptVisualMixedMediaFound: true
scriptVisualReviewImported: true
multipleResearchTypesVerified: true
scriptSpecificTopicResearch: true
starterAssetsReviewed: true
verifiedMediaPackCreated: true
realUsageRecorded: true
realTestComplete: true
```

## Abnahme

Erst wenn alle technischen und manuellen Realtests bestanden sind, darf PR #3 aus Draft genommen und nach `main` gemergt werden. Ein gefundener Medienkandidat ist niemals automatisch eine Identitäts-, Lizenz- oder Nutzungsfreigabe.
