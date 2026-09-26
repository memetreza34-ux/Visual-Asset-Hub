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

```text
1. OpenAI entwickelt humanoide Roboter.
2. Sie sollen später in Fabriken arbeiten.
3. Dort übernehmen sie die Montage.
```

Prüfen:

- Szene 2 und 3 zeigen **Kontext übernommen**
- `OpenAI` bleibt in relevanten Suchqueries erhalten
- Nummerierungen bleiben im Originaltext
- ein neuer expliziter Akteur setzt den Kontext neu
- Kontextfelder stehen getrennt in der Projektdatei
- Originaltext wird niemals umgeschrieben

### B3 – echte Medienrecherche

Mindestens zwei Szenen im Modus **Gemischt** real recherchieren.

- Bilder sichtbar, Videos direkt abspielbar
- technischer Fit, Quelle und Creator sichtbar
- mindestens eine einzelne Szene erreicht **Mix erfüllt** mit Video + Bild
- keine automatische Auswahl/Freigabe
- Dubletten werden reduziert

Rechercheumfang:

- **Schnell:** nach Möglichkeit 1 Quelle, max. 4 Suchtasks/Seite, bis 12 Kandidaten behalten
- **Tief:** nach Möglichkeit 3 Quellen, max. 8 Suchtasks/Seite, bis 20 Kandidaten behalten
- **Maximal:** nach Möglichkeit alle 5 verfügbaren Quellen, max. 12 Suchtasks/Seite, bis 30 Kandidaten behalten
- fehlen Keys, passt sich die Quellenbreite an die verfügbaren Provider an

### B4 – Mehr Treffer / Suchseiten

1. erste Suche = Seite 1
2. **Mehr Treffer** = Seite 2
3. danach Seite 3 möglich
4. zusätzliche Treffer werden ergänzt
5. Hauptvisual/Alternativen bleiben erhalten
6. `searchRound` bleibt nach Neuladen erhalten
7. komplett fehlgeschlagene Zusatzrunde erhöht die Seite nicht
8. Pixabay besitzt seitenspezifischen Cache
9. Wikimedia-Seiten sind lückenlos
10. Seite 100 blockiert weiteres Nachladen
11. zusätzliche Seiten können die Auswahl bis zur 12/20/30-Grenze des gewählten Modus erhöhen

### B5 – Auswahl

- Hauptvisual markieren
- Alternative markieren
- Auswahl lösen
- Projekt neu öffnen
- Auswahl bleibt erhalten

### B6 – Review-Import und Katalogverknüpfung

- genau einen neuen Kandidaten importieren
- neues Asset startet auf `review`
- ungewählte Kandidaten bleiben unimportiert
- Projekt speichert Katalog-Asset-ID
- Unsplash-Import benötigt aktuellen Sitzung-Key
- keine Provider-Keys in Projektdateien
- vorhandenen Katalogtreffer ohne Duplikat verknüpfen
- bestehender Katalogstatus bleibt unverändert

### B7 – Provider-Key-Härtung

- gültiger Key wird erst nach erfolgreicher Anfrage genau dieses Providers gemerkt
- falscher Key wird nicht gemerkt
- keyloser Erfolg bestätigt keinen fremden Key
- Pixabay-Cachetreffer validiert keinen neuen Key
- **Sitzungs-Keys löschen** leert alle sichtbaren/gemerkten Werte
- Reload entfernt Sitzungsschlüssel

### B8 – langes Skript / Performance / Kostenkontrolle

- Auto verdichtet bei Bedarf auf höchstens 120 Einheiten
- Originalskript bleibt vollständig erhalten
- bei >20 Szenen Lazy-Rendering der Kandidaten
- Fortschritt, Stoppen und Fortsetzen funktionieren
- Providerfehler löschen fertige Szenen nicht
- Spiegelung aktualisiert nur Root-Dateien + betroffene Szene

Batchgrößen:

| Modus | max. Szenen pro Sammelbatch |
|---|---:|
| Schnell | 20 |
| Tief | 10 |
| Maximal | 6 |

Die Oberfläche soll ungefähr **80 theoretische Provider-Suchtasks pro Batch** nicht überschreiten. Tatsächliche Requests dürfen wegen Early-Stop niedriger sein.

### B9 – manuelle Zusatzrecherche

Unter **Weitere Web-Recherche** YouTube, Google Bilder/Videos/News und Wikipedia prüfen. Kein Link darf automatisch importieren oder eine Rechtefreigabe behaupten.

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

Projektdatei muss Suchseite, Kandidaten, Kontext, Auswahl und Importverknüpfungen enthalten. `vault:build` darf das Projekt nicht löschen.

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

- Pexels: Foto + Video + Seite 2
- Pixabay: Foto + Video + 24h-Cache + Seite 2
- Unsplash: Foto + Attribution + Seite 2
- Openverse: keylos + unterstützte offene Lizenzen + Seite 2
- Wikimedia: keylos + Lizenz/Attribution + lückenlose Pagination

Neue externe Importe starten immer auf `review`.

## Test E – Provider-Keys über alle Suchbereiche

- nur in laufender Seite nutzbar
- löschen / Reload entfernt Keys
- keine Keys in `localStorage`, `sessionStorage`, Projekt-, Such- oder Katalogdateien
- ungültiger neuer Key bleibt nicht gemerkt

## Test F – ALLES-GEFUNDEN

- Gesamtindex / CSV / Manifest
- 01–04 Kanalordner
- `05-THEMENRECHERCHEN`
- `06-SKRIPT-PROJEKTE`
- `90-GEFUNDENE-KANDIDATEN`
- lokale Kopien / `.url`-Links
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
- JSON/CSV/Markdown/SRT

## Test I – eigene Datei

- Inbox-Import
- Rechte bestätigen
- Startstatus `review`

## Test J – zwölf Starterassets / Review

Alle zwölf Starterassets vollständig entscheiden; mindestens ein Asset freigeben. Personen/Marken, Quelle/Lizenz, Kontext und beim Wikimedia-Starter CC BY-SA 4.0 prüfen.

## Test K – Medienpaket und reale Nutzung

- nur freigegebene Assets
- verifiziertes Medienpaket
- SHA-256, Manifest, Quelle, Lizenz, Attribution
- reale Nutzung dokumentieren

## Test L – Backup und Abschluss

Später:

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
