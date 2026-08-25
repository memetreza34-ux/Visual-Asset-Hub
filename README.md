# Visual Asset Hub

Visual Asset Hub ist eine lokale Medienbibliothek und Rechercheoberfläche für **B-Rolls, Bilder, Animationen, Grafiken, Overlays, Screen-Recordings, Icons und Mockups**. Sie ist für Reels, Shorts, YouTube, Webseiten, Präsentationen und weitere Content-Projekte ausgelegt.

Aktueller Beta-Stand: **`0.4.0-beta.7`**.

## Skript rein → Visuals raus

Der neue Hauptarbeitsbereich **Skript → Visuals** ist für fertige Sprechertexte gedacht. Die Anwendung schreibt, verbessert oder erweitert das Skript **nicht**. Der Nutzer liefert den fertigen Text; Visual Asset Hub kümmert sich ausschließlich um die visuelle Recherche.

Ablauf:

```text
fertiges Skript
→ visuelle Einheiten / Szenen
→ visuelle Absicht pro Szene
→ mehrere Suchqueries
→ Bilder und B-Rolls aus den vorhandenen Quellen
→ mehrere Kandidaten pro Szene
→ Hauptvisual / Alternativen auswählen
→ bewusst als Review importieren
→ Shotlist und lokales Projektarchiv
```

Unterstützt werden kurze Reels ebenso wie längere Skripte bis **40.000 Zeichen** und maximal **120 visuelle Einheiten**. Die Szenen können automatisch, satzweise oder absatzweise gebildet werden. Lange Sätze können in mehrere visuelle Einheiten geteilt werden, während der vollständige eingegebene Originaltext unverändert im Projekt erhalten bleibt.

Auch Nummerierungen und Aufzählungszeichen wie `1.`, `2.` oder `-` bleiben im Szenen-Originaltext erhalten. Sie werden lediglich so interpretiert, dass daraus keine bedeutungslosen Extra-Szenen entstehen.

### Pro Szene

Jede visuelle Einheit enthält unter anderem:

- exakten Originaltext der Einheit
- Zeitbereich
- visuelle Absicht
- erkannte Entitäten und Konzepte
- 3 bis 5 dynamische Suchqueries
- bevorzugten Medientyp
- reale Kandidaten aus den vorhandenen Medienquellen
- technischen Fit
- Quellseite und Creator, soweit vorhanden
- aktuelle Suchseite
- Hauptvisual und Alternativen
- Importstatus

Direkte Treffer können konkret sein, etwa eine Person, ein Produkt, ein Ort oder ein technisches Gerät. Bei abstrakten Aussagen kann der Hub stattdessen **symbolische / kontextuelle B-Rolls** vorschlagen und kennzeichnet diesen Fall.

### Videos + Bilder

Bei der Einstellung **Gemischt** versucht der Finder pro Szene bewusst sowohl Video-B-Rolls als auch Bilder bereitzustellen, sofern eine Videoquelle verfügbar ist.

- Pexels und Pixabay liefern Video-B-Rolls.
- Unsplash, Openverse und Wikimedia Commons liefern Bildmaterial.
- Die Oberfläche zeigt pro Szene die Anzahl der Videos und Bilder sowie **Mix erfüllt** oder **Mix noch unvollständig**.
- Ausgewählte Hauptvisuals und Alternativen bleiben beim Nachladen weiterer Treffer geschützt.
- Wenn technisch möglich, werden beim Kandidatenlimit Treffer beider Medientypen erhalten.

### Rechercheumfang pro Szene

Die Suchlogik arbeitet begrenzt und stoppt nicht nur nach Trefferzahl, sondern berücksichtigt Providerbreite und bei **Gemischt** den Medienmix.

- **Schnell:** ungefähr 4 Kandidaten, mindestens 1 erfolgreiche verfügbare Quelle, maximal 4 Suchtasks pro Suchseite.
- **Tief:** ungefähr 6 Kandidaten, nach Möglichkeit mindestens 3 unterschiedliche verfügbare Quellen, maximal 8 Suchtasks pro Suchseite.
- **Maximal:** ungefähr 8 Kandidaten, nach Möglichkeit alle 5 verfügbaren Quellen mindestens einmal, maximal 12 Suchtasks pro Suchseite.

Fehlen Pexels-, Pixabay- oder Unsplash-Keys, passt sich die notwendige Providerzahl automatisch an die tatsächlich verfügbaren Quellen an.

### Mehr Treffer

**Mehr Treffer** lädt nicht erneut dieselbe erste Ergebnisseite.

Pro Szene wird eine eigene Suchrunde gespeichert:

```text
Visuals suchen → Seite 1
Mehr Treffer   → Seite 2
Mehr Treffer   → Seite 3
...
```

Pexels, Pixabay, Unsplash, Openverse und Wikimedia erhalten die echte Seitennummer. Bei Wikimedia wird der Suchoffset passend zur gewählten Seitengröße berechnet, damit keine Treffer zwischen den Seiten übersprungen werden.

Eine komplett fehlgeschlagene Runde erhöht die Suchseite nicht. Maximal werden 100 Suchseiten pro Szene zugelassen.

### Lange Skripte

Die Web-App recherchiert lange Projekte bewusst **szeneweise und sequenziell**. Bereits abgeschlossene Szenen bleiben erhalten, auch wenn eine spätere Quellensuche fehlschlägt. Die Recherche kann gestoppt und später fortgesetzt werden.

Zusätzliche Treffer können gezielt pro Szene nachgeladen werden, ohne bereits ausgewählte Hauptvisuals oder Alternativen zu verlieren.

### Projektordner

Script-Visual-Projekte werden lokal gespeichert und nach `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE` gespiegelt:

```text
06-SKRIPT-PROJEKTE/
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

Die Projekte liegen zusätzlich in `.local-storage/script-visual-projects`, damit sie nach einem Browser-Neuladen wieder geöffnet und fortgesetzt werden können. Skripte und Projektdateien werden durch `.gitignore` nicht automatisch in Git eingecheckt.

Suchseite, Kandidaten, Auswahl und Importverknüpfungen werden im Projekt gespeichert.

### Import ohne unnötige Dubletten

Jeder bewusst importierte externe Treffer startet weiterhin auf `review`.

Falls dieselbe Quelle beziehungsweise Medienreferenz bereits als Katalogasset existiert, wird kein unnötiges zweites Asset erzeugt. Der Script Visual Finder verknüpft den Treffer stattdessen mit der vorhandenen Katalog-Asset-ID und behandelt ihn anschließend als bereits importiert.

## Vier spezialisierte Kanalbibliotheken

| Kanal | Sammlungen | Suchbegriffe | Ausbauziel |
|---|---:|---:|---:|
| Finanzen | 20 | 60 | 160 freigegebene Assets |
| Künstliche Intelligenz | 20 | 60 | 160 freigegebene Assets |
| Elektrotechnik | 20 | 60 | 160 freigegebene Assets |
| Kampfsport | 30 | 90 | 240 freigegebene Assets |
| **Gesamt** | **90** | **270** | **720 freigegebene Assets** |

Jede Sammlung ist für Video und Foto sowie Hoch- und Querformat vorbereitet. Diese vier Bibliotheken bleiben die wiederverwendbare Grundversorgung. Der Script Visual Finder besitzt zusätzlich einen neutralen **Allgemein**-Projektmodus, der nicht in die 720 Ausbauziele eingerechnet wird.

## Fünf Medienquellen

| Quelle | Bilder | Videos | Key |
|---|---:|---:|---:|
| Pexels | ja | ja | erforderlich |
| Pixabay | ja | ja | erforderlich |
| Unsplash | ja | nein | erforderlich |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pexels-, Pixabay- und Unsplash-Keys werden im Browser nur im Arbeitsspeicher der geöffneten Seite gehalten. Sie werden nicht in `localStorage`, `sessionStorage`, Katalog-, Projekt- oder Suchdateien gespeichert. **Sitzungs-Keys löschen** entfernt sie sofort.

Ein neu eingegebener Key wird erst für die Sitzung gemerkt, wenn genau der dazugehörige Provider erfolgreich mit diesem Key angesprochen wurde. Ein erfolgreicher Openverse-/Wikimedia-Lauf kann also keinen falschen Key eines anderen Providers bestätigen. Ein reiner Pixabay-Cachetreffer gilt ebenfalls nicht als Validierung eines neu eingegebenen Pixabay-Keys.

Openverse und Wikimedia werden konservativ auf unterstützte offene Lizenzen begrenzt: Public Domain, CC0, CC BY und CC BY-SA. Attribution und Lizenzinformationen bleiben dokumentiert.

Script Visual Finder, Themenrecherche und normaler Arsenal Builder verwenden dieselben bestehenden Provideradapter. Pixabay behält seinen 24-Stunden-Cache.

## Universelle Themenrecherche

Der separate Arbeitsbereich **Thema recherchieren** bleibt für Recherche ohne fertigen Szenentext erhalten. Eingaben können praktisch jedes visuelle Thema sein, zum Beispiel:

```text
Conor McGregor
NVIDIA
Tesla Model 3
Berlin
RCD Schutzschalter
Berliner Mauer
Inflation
Humanoide Roboter
```

Recherchearten:

- **Automatisch erkennen**
- **Person**
- **Firma / Marke / Organisation**
- **Produkt / Objekt**
- **Event / Veranstaltung**
- **Ort / Gebäude / Region**
- **Technik / Gerät / System**
- **Sport / Kampf / Athletik**
- **Historisches Thema**
- **Allgemeines Thema / Konzept**

Rechercheumfang:

- **Schnell**: bis zu 6 Motivbereiche
- **Tief**: bis zu 8 Motivbereiche
- **Maximal**: bis zu 12 Motivbereiche

Im Maximalmodus entstehen bei allen fünf verfügbaren Quellen höchstens **60 sequenzielle Provider-Suchen**.

Die Themenrecherche dedupliziert Treffer, zeigt Bilder und Videos direkt und importiert ausschließlich bewusst markierte Treffer. Jeder Import beginnt auf `review`.

## ALLES-GEFUNDEN

`ALLES-GEFUNDEN/` ist die zentrale lokale Arbeitsablage.

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

Katalogassets, normale Suchkandidaten, Themenrecherchen und Script-Visual-Projekte bleiben voneinander getrennt. Skriptprojekte und historische Suchfunde werden beim normalen Vault-Neuaufbau erhalten.

Pro externem Fund können verständliche INFO-, Quellen-, Medium- und Vorschau-Verknüpfungen entstehen. Lokale Katalogmedien können als echte Dateikopie gespiegelt werden.

## Ausbau 720

Der Bereich **Ausbau 720** zeigt je Kanal und Sammlung:

- Kandidaten
- offene Reviews
- freigegebene Assets
- Video- und Fotolücken
- größte Freigabelücken
- priorisierte Review- und Suchaufgaben

Der Hub arbeitet **review-first**. Wenn bereits genügend Review-Kandidaten vorhanden sind, wird zuerst die Review-Warteschlange empfohlen. Neue API-Suche erfolgt nur bei echter Suchlücke.

Für neue Lücken gilt grundsätzlich:

- Video: Pexels → Pixabay
- Foto: Unsplash → Openverse → Wikimedia Commons → Pexels → Pixabay

## Bestehender Reel- und Skript-Planer

Der bisherige **Skript planen**-Bereich bleibt erhalten. Er ordnet einen Sprechtext den 90 festen Kanal-Sammlungen und bereits vorhandenen Assets zu und kann JSON-, CSV-, Markdown- und SRT-Ausgaben erzeugen.

Er ist vom neuen Script Visual Finder getrennt:

- **Skript planen**: vorhandene Sammlungen und Bibliotheksassets zuordnen
- **Skript → Visuals**: dynamische Queries erzeugen und echte Bilder/B-Rolls pro Szene recherchieren

CLI-Beispiel des bestehenden Planers:

```bash
npm run script:plan -- \
  --channel electro \
  --file ./mein-reel.txt \
  --duration 45 \
  --orientation vertical
```

## Arsenal Builder

Der normale Arsenal Builder bleibt für den systematischen Ausbau der 90 festen Sammlungen zuständig. Er bietet:

- fünf Medienquellen
- Batch-Suche für bis zu fünf Sammlungen
- technischen Fit 0–100
- Suchbegriff-Kette
- manuelle Provider-Fallbacks
- Sammelimport markierter Treffer
- Dublettenschutz
- Review-first-Verknüpfung mit Ausbau 720

Der technische Fit ist nur eine Produktionsvorsortierung und keine Inhalts- oder Rechtefreigabe.

## Review und Rechte

Jeder externe Import beginnt auf `review` – auch jeder neue Import aus **Skript → Visuals**.

Vor Freigabe werden weiterhin mindestens geprüft:

1. sichtbarer Inhalt
2. Personen, Logos, Marken und sensible Elemente
3. Quelle, Lizenz und Nutzung
4. geplanter Einsatzkontext

Besonders bei realen Personen, Firmen, Produkten, Events, Sportveranstaltungen und Broadcastmaterial bedeutet ein gefundener Treffer **nicht automatisch**, dass er verwendet werden darf.

## Eigene Dateien

Eigene Videos, Bilder, Grafiken und weitere unterstützte Medien können über die lokale Inbox importiert werden. Eine ausdrückliche Rechtebestätigung ist Pflicht. Der Import startet auf `review`.

## Medienpakete

Nur `approved`-Assets können in verifizierte Schnittpakete unter `exports/media-packs` ausgegeben werden. Enthalten sind unter anderem:

- Medien
- `manifest.json`
- SHA-256-Prüfsummen
- Quelle und Lizenz
- `ATTRIBUTION.md`
- Paket-README

## Starterbibliothek

`npm run starter:import` erzeugt idempotent eine reale Testbibliothek mit **12 Starterassets**:

- 8 Pexels-Videos
- 3 eigene SVG-Grafiken
- 1 Wikimedia-Commons-Kampfsportfoto unter CC BY-SA 4.0

Alle beginnen auf `review`. Finanzen, KI, Elektrotechnik und Kampfsport sind vertreten.

## Schnellstart auf dem Mac

Der lokale Kompletttest wird erst zur finalen Abnahme ausgeführt:

```bash
cd ~/Downloads/Visual-Asset-Hub-clean
git pull --ff-only
npm run starter:import
npm run arsenal:expansion
npm run check
npm run serve
```

Danach:

```text
http://127.0.0.1:4173/web/
```

## Wichtige Befehle

```bash
npm run starter:import
npm run cleanup:local
npm run vault:build
npm run entity:plan -- "<Thema>"
npm run script:plan -- --channel finance --file ./mein-reel.txt --duration 45
npm run arsenal:validate
npm run arsenal:plan
npm run arsenal:expansion
npm run arsenal:report
npm run asset:review -- --id VAH-XXXXXXXX --decision approve --reviewer <name>
npm run usage:add -- --asset VAH-XXXXXXXX --project projekt-01 --platform tiktok
npm run attribution:export -- --project projekt-01
npm run media:pack -- --ids VAH-XXXXXXXX --name projekt-01
npm run backup
npm run beta:verify
npm run check
npm run serve
```

## Sicherheit und Kostenkontrolle

- lokale Verwaltungs-APIs binden nur an Loopback
- Schreibaktionen benötigen Sitzungstoken und Same-Origin
- API-Keys werden nicht persistent im Browser gespeichert
- Script-Visual-Projekte und Skripte bleiben lokal und werden nicht in Git eingecheckt
- Openverse und Wikimedia benötigen keinen geheimen Key
- externe und Inbox-Importe starten auf `review`
- nicht freigegebene Assets werden aus Medienpaketen blockiert
- GitHub-Actions-Workflows sind im Beta-Branch ausschließlich manuell über `workflow_dispatch` startbar
- keine automatischen Push-, Pull-Request- oder Schedule-Runs
- die vollständige Beta-Abnahme kann lokal ohne GitHub-hosted Runner erfolgen

## Realtest

Die Beta gilt erst als vollständig real getestet, wenn unter anderem:

- `npm run check` lokal grün ist
- mindestens ein echtes **Skript → Visuals**-Projekt erstellt wurde
- mindestens zwei Szenen daraus real recherchiert wurden
- im Script Visual Finder mindestens ein Video- und ein Bildkandidat gefunden wurden
- mindestens eine Szene den Gemischt-Medienmix praktisch geprüft hat
- **Mehr Treffer** bei mindestens einer Szene nachweislich eine weitere Suchseite lädt
- mindestens ein Kandidat daraus bewusst als `review` importiert oder korrekt mit einem bereits vorhandenen Katalogasset verknüpft wurde
- alle 12 Starterassets entschieden sind
- alle fünf Medienquellen technisch getestet wurden
- die universelle Themenrecherche mit mindestens zwei Recherchearten geprüft wurde
- eigener Inbox-Import funktioniert
- mindestens ein Asset freigegeben ist
- ein verifiziertes Medienpaket erstellt wurde
- eine reale Nutzung dokumentiert wurde
- `realTestComplete: true` gemeldet wird

Der Pull Request bleibt bis dahin Draft und wird nicht in `main` gemergt.

## Dokumentation

- [`docs/SCRIPT-VISUAL-FINDER.md`](docs/SCRIPT-VISUAL-FINDER.md)
- [`ALLES-GEFUNDEN/README.md`](ALLES-GEFUNDEN/README.md)
- [`docs/REAL-TEST-QUICKSTART.md`](docs/REAL-TEST-QUICKSTART.md)
- [`docs/CHANNEL-ARSENAL.md`](docs/CHANNEL-ARSENAL.md)
- [`docs/BETA-TEST.md`](docs/BETA-TEST.md)
- [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md)
- [`SECURITY.md`](SECURITY.md)
- [`CHANGELOG.md`](CHANGELOG.md)
