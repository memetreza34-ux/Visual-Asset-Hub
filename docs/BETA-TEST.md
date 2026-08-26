# Beta-Testplan

## Ziel

Die Beta **`0.4.0-beta.7`** wird später vollständig lokal geprüft. Ein Merge nach `main` ist erst erlaubt, wenn insbesondere **Skript rein → Visuals raus**, die fünf Medienquellen, Review, Rechte, Medienpaket und echte Nutzung abgenommen sind.

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

Danach `http://127.0.0.1:4173/web/` öffnen.

## Test A – Start und Navigation

- **Lokale Verwaltung aktiv** sichtbar
- Navigation enthält **Skript → Visuals**
- alle bestehenden Bereiche bleiben erreichbar
- zwölf Starterassets nach `starter:import`

## Test B – Script Visual Finder

### B1 – 1-Minuten-Skript

Ein fertiges Skript verwenden, z. B. **KI-Roboter bis 2035**.

Prüfen:

1. nur **Fertiges Skript** ist zwingend
2. Projekt ohne manuell gewählten Titel/Kanal erzeugen
3. vollständiger Text bleibt in `00-SKRIPT.txt` unverändert
4. Auto-Modus bildet sinnvolle visuelle Einheiten
5. Nummerierungen/Aufzählungen bleiben im Szenen-Originaltext
6. `SCENE-001`, `SCENE-002` usw. stabil
7. 3–5 unterschiedliche statt nahezu identische Queries pro Szene
8. konkrete Namen/Events/Jahre bleiben in passenden Queries erhalten
9. häufige deutsche Motive werden providerfreundlich übersetzt
10. abstrakte Aussagen können symbolische B-Roll erhalten
11. Zeitbereiche sind monoton

### B2 – Szenenkontext

Skript mit Rückbezügen verwenden:

```text
1. OpenAI entwickelt humanoide Roboter.
2. Sie sollen später in Fabriken arbeiten.
3. Dort übernehmen sie die Montage.
```

Prüfen:

- Szene 2 und 3 zeigen **Kontext übernommen**
- `OpenAI` bleibt in relevanten Suchqueries erhalten
- Nummerierungen `1.`, `2.`, `3.` bleiben im Originaltext
- ein neuer expliziter Akteur in einer späteren Szene setzt den Kontext neu
- Kontextfelder stehen getrennt in der Projektdatei
- Voice-over-/Originaltext wird niemals umgeschrieben

### B3 – echte Medienrecherche

Mindestens zwei Szenen im Modus **Gemischt** real recherchieren.

Prüfen:

- Openverse/Wikimedia ohne privaten Key
- mit Sitzung-Keys zusätzlich Pexels/Pixabay/Unsplash
- Bilder sichtbar, Videos direkt abspielbar
- technischer Fit, Quelle und Creator sichtbar
- mindestens eine einzelne Szene erreicht **Mix erfüllt** mit Video + Bild
- keine automatische Auswahl/Freigabe
- Dubletten über Provider-/Quell-/Medienreferenzen reduziert

Rechercheumfang:

- **Schnell:** nach Möglichkeit mindestens 1 Quelle, max. 4 Suchtasks/Seite, bis 12 Kandidaten behalten
- **Tief:** nach Möglichkeit mindestens 3 Quellen, max. 8 Suchtasks/Seite, bis 20 Kandidaten behalten
- **Maximal:** nach Möglichkeit alle 5 verfügbaren Quellen, max. 12 Suchtasks/Seite, bis 30 Kandidaten behalten
- fehlen Keys, passt sich die benötigte Quellenzahl an die tatsächlich verfügbaren Quellen an

### B4 – Mehr Treffer / Suchseiten

Bei einer recherchierten Szene **Mehr Treffer** verwenden.

1. erste Suche = Seite 1
2. erster Nachladevorgang = Seite 2
3. danach Seite 3 möglich
4. zusätzliche Treffer werden ergänzt
5. Hauptvisual/Alternativen bleiben erhalten
6. `searchRound` bleibt nach Neuladen erhalten
7. komplett fehlgeschlagene Zusatzrunde erhöht die Seite nicht
8. Pixabay besitzt seitenspezifischen Cache
9. Wikimedia-Seiten sind lückenlos über passenden `gsroffset`
10. Seite 100 blockiert weiteres Nachladen
11. zusätzliche Seiten können die Kandidatenmenge bis zur 12/20/30-Grenze des Modus vergrößern

### B5 – Auswahl

- Hauptvisual markieren
- mindestens eine Alternative markieren
- Auswahl lösen
- Projekt neu öffnen
- Auswahl bleibt erhalten
- Auswahl bleibt auch nach **Mehr Treffer** erhalten

### B6 – Review-Import und Katalogverknüpfung

- genau einen neuen Kandidaten importieren
- neues Asset startet auf `review`
- ungewählte Kandidaten bleiben unimportiert
- Projekt speichert Katalog-Asset-ID
- Unsplash-Import benötigt aktuellen Sitzung-Key
- keine Provider-Keys in Projektdateien

Zusätzlich vorhandenen Katalogtreffer prüfen:

- kein zweites Asset erzeugen
- vorhandene Asset-ID verknüpfen
- Oberfläche zeigt Kandidaten als importiert
- bestehender Katalogstatus ändert sich nicht automatisch

### B7 – Provider-Key-Härtung

- gültiger neuer Key wird erst nach erfolgreicher Anfrage genau dieses Providers gemerkt
- falscher Key wird nach fehlgeschlagener Provideranfrage nicht gemerkt
- keyloser Erfolg bestätigt keinen fremden Key
- Pixabay-Cachetreffer validiert keinen neu eingegebenen Pixabay-Key
- noch nicht bestätigter Key bleibt nur im sichtbaren Passwortfeld der laufenden Seite
- **Sitzungs-Keys löschen** leert gemerkte und sichtbare Werte
- Seitenreload entfernt alle Sitzungsschlüssel

### B8 – langes Skript / Performance / Kostenkontrolle

Ein mehrminütiges Skript verwenden.

Prüfen:

- Auto-Modus verdichtet bei Bedarf auf höchstens 120 visuelle Einheiten
- vollständiges Originalskript bleibt unverändert
- Projekte mit mehr als 20 Szenen rendern Kandidaten lazy erst beim Öffnen
- beim Zuklappen werden schwere Medienkarten aus dem DOM entfernt
- Fortschritt bleibt korrekt
- Stoppen beendet nach laufender Szene
- Fortsetzen setzt bei offenen Szenen weiter
- Providerfehler löschen fertige Szenen nicht
- lokale Spiegelung aktualisiert nach Suche/Auswahl/Import nur Root-Dateien + betroffene Szene

Batchgrößen real prüfen:

| Modus | erwartetes Maximum pro Sammelbatch |
|---|---:|
| Schnell | 20 Szenen |
| Tief | 10 Szenen |
| Maximal | 6 Szenen |

Die Oberfläche soll ungefähr **80 theoretische Provider-Suchtasks pro Batch** nicht überschreiten. Tatsächliche Requests dürfen wegen Early-Stop niedriger sein.

### B9 – manuelle Zusatzrecherche

Unter **Weitere Web-Recherche** prüfen:

- YouTube
- Google Bilder
- Google Videos
- Google News
- Wikipedia

Alle Links müssen nur neue Tabs öffnen. Kein Klick darf automatisch importieren, einen Reviewstatus ändern oder eine Nutzungsfreigabe behaupten.

### B10 – Projektordner

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

`00-PROJEKT.json` muss Suchseite, Kandidaten, Kontext, Auswahl und Importverknüpfungen enthalten. Danach `vault:build` erneut ausführen; Projekt muss erhalten bleiben.

## Test C – universelle Themenrecherche

1. `Conor McGregor` als **Sport / Kampf / Athletik**
2. zweite Rechercheart, z. B. `RCD` oder `Tesla Model 3`
3. eine Recherche mit Skriptbezug

Erwartung:

```text
multipleResearchTypesVerified: true
scriptSpecificTopicResearch: true
```

## Test D – fünf Quellen

### Pexels
- Foto + Video
- Sitzung-Key
- Seite 2 neue Treffer

### Pixabay
- Foto + Video
- Sitzung-Key
- 24h-Cache derselben Seite
- Seite 2 eigener Cachekontext

### Unsplash
- Foto
- Creator/Attribution
- Import-Downloadmeldung
- Seite 2

### Openverse
- keylos
- nur unterstützte offene Lizenztypen
- Seite 2

### Wikimedia Commons
- keylos
- Lizenz/Attribution
- lückenlose Pagination

Für alle: nur bewusst ausgewählte Treffer importieren; neue externe Importe starten auf `review`.

## Test E – Provider-Keys über alle Suchbereiche

Für Script Visual Finder, Themenrecherche und Arsenal Builder:

- Key nur in laufender Seite nutzbar
- **Sitzungs-Keys löschen** entfernt ihn
- Reload entfernt ihn
- keine Keys in `localStorage`, `sessionStorage`, Projekt-, Such- oder Katalogdateien
- ungültiger neuer Key bleibt nicht gemerkt

## Test F – ALLES-GEFUNDEN

- Gesamtindex / CSV / Manifest
- 01–04 Kanalordner
- `05-THEMENRECHERCHEN`
- `06-SKRIPT-PROJEKTE`
- `90-GEFUNDENE-KANDIDATEN`
- lokale Kopien und `.url`-Links
- Historie, Suchseiten und Auswahl bleiben nach erneutem Build erhalten

## Test G – Ausbau 720 / Review-first

- 160 / 160 / 160 / 240 = 720
- Review-Aufgaben vor unnötiger Nachsuche
- Video-/Fotolücken
- globale nächste Aufgaben
- Batch/Fallbacks
- technischer Fit verändert keinen Status

## Test H – bestehender Skript-Planer

- echte Shotlist
- Kanal-Sammlungen
- vorhandene Assets
- JSON/CSV/Markdown
- CLI zusätzlich SRT/Skriptkopie

## Test I – eigene Datei

- Inbox-Import
- Rechte bestätigen
- Startstatus `review`
- Katalog und ALLES-GEFUNDEN prüfen

## Test J – zwölf Starterassets / Review

Alle zwölf Starterassets vollständig entscheiden; mindestens ein Asset freigeben. Personen/Marken, Quelle/Lizenz, Kontext und beim Wikimedia-Starter CC BY-SA 4.0 prüfen.

## Test K – Medienpaket und reale Nutzung

1. nur freigegebene Assets
2. verifiziertes Medienpaket
3. SHA-256, Manifest, Quelle, Lizenz, Attribution
4. ein Asset real einsetzen
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

Insbesondere erforderlich:

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

Erst nach allen technischen und manuellen Realtests darf PR #3 aus Draft genommen und nach `main` gemergt werden. Ein gefundener Medienkandidat ist niemals automatisch eine Identitäts-, Lizenz- oder Nutzungsfreigabe.
