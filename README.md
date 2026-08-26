# Visual Asset Hub

Visual Asset Hub ist eine lokale Medienbibliothek und Rechercheoberfläche für **B-Rolls, Bilder, Animationen, Grafiken, Overlays, Screen-Recordings, Icons und Mockups**. Sie ist für Reels, Shorts, YouTube, Webseiten, Präsentationen und weitere Content-Projekte ausgelegt.

Aktueller Beta-Stand: **`0.4.0-beta.7`**.

## Skript rein → Visuals raus

Der Hauptarbeitsbereich **Skript → Visuals** ist für fertige Sprechertexte gedacht. Die Anwendung schreibt, verbessert oder erweitert das Skript **nicht**. Der Nutzer liefert den fertigen Text; Visual Asset Hub kümmert sich ausschließlich um die visuelle Recherche.

```text
fertiges Skript
→ visuelle Einheiten / Szenen
→ visuelle Absicht pro Szene
→ mehrere unterschiedliche Suchrichtungen
→ Bilder und B-Rolls aus den vorhandenen Quellen
→ mehrere Kandidaten pro Szene
→ Hauptvisual / Alternativen auswählen
→ bewusst als Review importieren
→ Shotlist und lokales Projektarchiv
```

Unterstützt werden kurze Reels ebenso wie längere Skripte bis **40.000 Zeichen** und maximal **120 visuelle Einheiten**. Auto kann sehr viele kurze Satzsegmente kontrolliert auf höchstens 120 visuelle Einheiten verdichten, ohne das vollständige gespeicherte Originalskript zu verändern.

### Pro Szene

Jede visuelle Einheit enthält unter anderem:

- exakten Originaltext
- Zeitbereich
- visuelle Absicht
- erkannte Entitäten und Konzepte
- 3–5 unterschiedliche Suchrichtungen
- bevorzugten Medientyp
- reale Kandidaten aus den vorhandenen Medienquellen
- technischen Fit
- Quellseite und Creator, soweit vorhanden
- Hauptvisual und Alternativen
- Importstatus

Bei Rückbezugssätzen wie `Sie ...`, `Dort ...`, `Dabei ...` oder `Später ...` kann der Finder den relevanten Kontext aus der unmittelbar vorherigen aktiven Szenenkette ausschließlich für die Visualsuche übernehmen. Auch bei nummerierten Zeilen wie `2. Sie ...` funktioniert das; die Nummerierung und der Originaltext bleiben sichtbar unverändert.

Direkte Treffer können konkret sein, etwa eine Person, ein Produkt, ein Ort oder ein technisches Gerät. Bei abstrakten Aussagen kann der Hub stattdessen **symbolische / kontextuelle B-Rolls** vorschlagen und kennzeichnet diesen Fall.

### Viele Visuals pro Szene

Die Recherche behält je nach Modus mehr eindeutige Kandidaten für die spätere Auswahl:

- **Schnell:** bis 12 Kandidaten
- **Tief:** bis 20 Kandidaten
- **Maximal:** bis 30 Kandidaten

**Mehr Treffer** lädt echte Folgeseiten – Seite 2, Seite 3 usw. – bis maximal Seite 100. Hauptvisual und Alternativen bleiben dabei geschützt.

Bei **Gemischt** versucht der Finder pro Szene bewusst Video-B-Roll **und** Bildmaterial zu sammeln, sofern eine Videoquelle verfügbar ist. `beta:verify` zählt den Mix erst als erfüllt, wenn dieselbe konkrete Szene mindestens ein Video und ein Bild enthält.

### Lange Skripte und Kostenkontrolle

Die Sammelrecherche wird nach Rechercheintensität gedrosselt und bleibt bei ungefähr höchstens **80 theoretischen Provider-Suchtasks pro Batch**:

| Recherche | max. Szenen pro Sammelbatch |
|---|---:|
| Schnell | 20 |
| Tief | 10 |
| Maximal | 6 |

Tatsächliche Requests können niedriger sein, weil jede Szene früher stoppt, sobald Kandidatenziel, Providerbreite und Medienmix erreicht sind.

Bei Projekten mit mehr als 20 Szenen werden schwere Bild-/Videokarten lazy erst beim Öffnen der jeweiligen Kandidatenansicht erzeugt. Suche, Auswahl und Import aktualisieren in `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE` nur die Projektroot-Dateien und den tatsächlich geänderten Szenenordner.

### Projektordner

```text
ALLES-GEFUNDEN/
└── 06-SKRIPT-PROJEKTE/
    └── <Projektname>-<Projekt-ID>/
        ├── 00-SKRIPT.txt
        ├── 00-PROJEKT.json
        ├── 00-SZENENPLAN.md
        ├── 00-SHOTLIST.json
        ├── 00-SHOTLIST.csv
        ├── 001-SCENE-001/
        ├── 002-SCENE-002/
        └── ...
```

Pro Szene gibt es zusätzlich **Weitere Web-Recherche** mit manuellen Discovery-Links zu YouTube, Google Bilder/Videos/News und Wikipedia. Diese Links importieren nichts und sind keine Rechte- oder Nutzungsfreigabe.

## Vier spezialisierte Kanalbibliotheken

| Kanal | Sammlungen | Suchbegriffe | Ausbauziel |
|---|---:|---:|---:|
| Finanzen | 20 | 60 | 160 freigegebene Assets |
| Künstliche Intelligenz | 20 | 60 | 160 freigegebene Assets |
| Elektrotechnik | 20 | 60 | 160 freigegebene Assets |
| Kampfsport | 30 | 90 | 240 freigegebene Assets |
| **Gesamt** | **90** | **270** | **720 freigegebene Assets** |

Der Script Visual Finder besitzt zusätzlich einen neutralen **Allgemein**-Projektmodus, der nicht in die 720 Ausbauziele eingerechnet wird.

## Fünf Medienquellen

| Quelle | Bilder | Videos | Key |
|---|---:|---:|---:|
| Pexels | ja | ja | erforderlich |
| Pixabay | ja | ja | erforderlich |
| Unsplash | ja | nein | erforderlich |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pexels-, Pixabay- und Unsplash-Keys werden nur im Arbeitsspeicher der geöffneten Browserseite gehalten. Ein neu eingegebener Key wird erst nach einer erfolgreichen Anfrage **genau dieses Providers** als Sitzung-Key gemerkt. Ein keyloser Provider oder ein reiner Pixabay-Cachetreffer kann keinen neu eingegebenen fremden Key validieren.

Openverse und Wikimedia werden konservativ auf unterstützte offene Lizenzen begrenzt: Public Domain, CC0, CC BY und CC BY-SA. Attribution und Lizenzinformationen bleiben dokumentiert.

## Universelle Themenrecherche

Der separate Arbeitsbereich **Thema recherchieren** bleibt für Recherche ohne fertigen Szenentext erhalten. Er unterstützt unter anderem Person, Firma/Marke, Produkt, Event, Ort, Technik, Sport/Kampf, Historie und allgemeine Konzepte.

Rechercheumfang:

- **Schnell**: bis zu 6 Motivbereiche
- **Tief**: bis zu 8 Motivbereiche
- **Maximal**: bis zu 12 Motivbereiche / höchstens 60 sequenzielle Provider-Suchen bei fünf Quellen

Jeder Import beginnt auf `review`.

## ALLES-GEFUNDEN

```text
ALLES-GEFUNDEN/
├── 00-GESAMTINDEX.md
├── 00-GESAMTINDEX.csv
├── 00-MANIFEST.json
├── 01-Finanzen/
├── 02-KI/
├── 03-Elektrotechnik/
├── 04-Kampfsport/
├── 05-THEMENRECHERCHEN/
├── 06-SKRIPT-PROJEKTE/
├── 90-GEFUNDENE-KANDIDATEN/
└── 99-Sonstiges/
```

Katalogassets, normale Suchkandidaten, Themenrecherchen und Script-Visual-Projekte bleiben getrennt. Skriptprojekte und historische Suchfunde werden beim Vault-Neuaufbau erhalten.

## Ausbau 720

**Ausbau 720** zeigt Kandidaten, Reviews, Freigaben, Video-/Fotolücken und priorisierte Aufgaben. Der Hub arbeitet **review-first**: vorhandene Review-Kandidaten werden vor unnötiger neuer API-Suche priorisiert.

Grundsätzliche Fallbacks:

- Video: Pexels → Pixabay
- Foto: Unsplash → Openverse → Wikimedia Commons → Pexels → Pixabay

## Bestehender Skript-Planer

Der ältere Bereich **Skript planen** bleibt getrennt:

- **Skript planen**: feste Kanal-Sammlungen und vorhandene Bibliotheksassets zuordnen
- **Skript → Visuals**: dynamische Queries erzeugen und echte Bilder/B-Rolls pro Szene recherchieren

## Arsenal Builder

Der normale Arsenal Builder bleibt für den systematischen Ausbau der 90 festen Sammlungen zuständig. Er bietet fünf Medienquellen, Batch-Suche, technischen Fit, Query-Kette, Fallbacks, Sammelimport und Dublettenschutz.

Der technische Fit ist nur eine Produktionsvorsortierung und keine Inhalts- oder Rechtefreigabe.

## Review und Rechte

Jeder **neue externe Import** beginnt auf `review` – auch aus **Skript → Visuals**. Bereits im Katalog vorhandene Treffer werden nur verknüpft; ihr vorhandener Status wird nicht automatisch verändert.

Vor Freigabe werden weiterhin mindestens geprüft:

1. sichtbarer Inhalt
2. Personen, Logos, Marken und sensible Elemente
3. Quelle, Lizenz und Nutzung
4. geplanter Einsatzkontext

Besonders bei realen Personen, Firmen, Produkten, Events, Sportveranstaltungen und Broadcastmaterial bedeutet ein gefundener Treffer nicht automatisch, dass er verwendet werden darf.

## Eigene Dateien

Eigene Medien können über die lokale Inbox importiert werden. Eine ausdrückliche Rechtebestätigung ist Pflicht. Der Import startet auf `review`.

## Medienpakete

Nur `approved`-Assets können in verifizierte Schnittpakete unter `exports/media-packs` ausgegeben werden. Enthalten sind Medien, Manifest, SHA-256-Prüfsummen, Quelle/Lizenz, Attribution und README.

## Starterbibliothek

`npm run starter:import` erzeugt idempotent eine Testbibliothek mit **12 Starterassets**: acht Pexels-Videos, drei eigene SVG-Grafiken und ein Wikimedia-Commons-Kampfsportfoto unter CC BY-SA 4.0. Alle beginnen auf `review`.

## Sicherheit und Kostenkontrolle

- lokale Verwaltungs-APIs nur Loopback
- Schreibaktionen mit Sitzungstoken und Same-Origin
- keine persistenten Provider-Keys im Browser
- Script-Visual-Projekte und Skripte bleiben lokal
- Openverse/Wikimedia benötigen keinen geheimen Key
- externe und Inbox-Importe starten auf `review`
- nicht freigegebene Assets werden aus Medienpaketen blockiert
- GitHub-Actions-Workflows im Beta-Branch nur manuell über `workflow_dispatch`
- vollständige Beta-Abnahme lokal ohne GitHub-hosted Runner möglich

## Realtest

Die Beta gilt erst als vollständig real getestet, wenn unter anderem:

- `npm run check` lokal grün ist
- ein echtes **Skript → Visuals**-Projekt erstellt wurde
- mindestens zwei Szenen real recherchiert wurden
- mindestens eine einzelne Szene Video + Bild enthält
- Pagination Seite 2/3 geprüft wurde
- Kontext-Vererbung und nummerierter Rückbezug geprüft wurden
- ein Script-Visual-Kandidat bewusst als `review` importiert wurde
- Langprojekt-Batching/Lazy-Rendering geprüft wurden
- alle zwölf Starterassets entschieden sind
- alle fünf Medienquellen technisch getestet wurden
- universelle Themenrecherche mit mindestens zwei Recherchearten geprüft wurde
- eigener Inbox-Import funktioniert
- mindestens ein Asset freigegeben ist
- ein verifiziertes Medienpaket erstellt wurde
- eine reale Nutzung dokumentiert wurde
- `realTestComplete: true` gemeldet wird

PR #3 bleibt bis dahin Draft und wird nicht in `main` gemergt.

## Dokumentation

- [`docs/SCRIPT-VISUAL-FINDER.md`](docs/SCRIPT-VISUAL-FINDER.md)
- [`ALLES-GEFUNDEN/README.md`](ALLES-GEFUNDEN/README.md)
- [`docs/REAL-TEST-QUICKSTART.md`](docs/REAL-TEST-QUICKSTART.md)
- [`docs/CHANNEL-ARSENAL.md`](docs/CHANNEL-ARSENAL.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`SECURITY.md`](SECURITY.md)
- [`CHANGELOG.md`](CHANGELOG.md)
