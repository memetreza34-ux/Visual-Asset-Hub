# Script Visual Finder

Stand: `0.4.0-beta.7`

## Zweck

**Skript rein → Visuals raus.**

Der Nutzer liefert ein fertiges Skript. Visual Asset Hub schreibt, verbessert, ergänzt oder ersetzt diesen Text nicht. Die Funktion dient ausschließlich dazu, für den vorhandenen Text geeignete Bilder und B-Rolls zu recherchieren und für den Schnitt zu organisieren.

## Workflow

```text
fertiges Skript
→ visuelle Einheiten
→ visuelle Absicht
→ mehrere unterschiedliche Suchrichtungen
→ Providerrecherche
→ Kandidaten pro Szene
→ Hauptvisual / Alternativen
→ Review-Import
→ lokale Shotlist / Projektablage
```

## Eingabe

Pflicht:

- fertiges Skript

Optional beziehungsweise vorbelegt:

- Projekttitel
- Zuordnung: Auto, Allgemein, Finanzen, KI, Elektrotechnik, Kampfsport
- Szenenmodus: Auto, Satzweise, Absatzweise
- Format: vertikal oder horizontal
- Medienpräferenz: gemischt, Video, Bild
- Rechercheumfang: Schnell, Tief, Maximal
- Treffer je Provider-Suche
- Pexels-/Pixabay-/Unsplash-Sitzungskeys

## Grenzen

- maximal 40.000 Skriptzeichen
- maximal 120 visuelle Einheiten im erzeugten Projekt
- maximal 100 Suchseiten pro Szene
- keine automatische Skripterstellung
- keine automatische Inhaltsfreigabe
- keine automatische Rechtefreigabe
- keine automatische Auswahl eines Hauptvisuals

## Originaltext und Segmentierung

Das vollständige eingegebene Skript bleibt unverändert im Projekt gespeichert. Nummerierungs- und Aufzählungspräfixe wie `1.`, `2.` oder `-` bleiben auch im jeweiligen Szenen-Originaltext erhalten.

Für Segmentierung und Rückbezugs-Erkennung dürfen diese Präfixe intern ignoriert werden, damit beispielsweise `2. Sie arbeiten später in Fabriken.` den Kontext aus Szene 1 übernehmen kann. Der sichtbare Originalsatz bleibt trotzdem exakt erhalten.

Lange Sätze dürfen in mehrere visuelle Einheiten aufgeteilt werden. Jede Einheit verweist weiterhin auf ihren tatsächlichen Originaltext; der Hub erzeugt keinen Ersatztext.

### Lange Skripte bis ungefähr zehn Minuten

Im **Auto-Modus** darf ein langes Skript zunächst mehr als 120 einzelne kurze Satzsegmente erzeugen. Statt das Projekt deshalb sofort abzulehnen, verdichtet der Finder benachbarte kurze visuelle Einheiten, bis höchstens 120 Szenen übrig bleiben.

Dadurch gilt:

- das vollständige gespeicherte Skript bleibt unverändert
- die Reihenfolge bleibt erhalten
- nur die visuelle Gruppierung wird gröber
- normale kürzere Skripte werden nicht künstlich zusammengelegt
- Satzweise und Absatzweise bleiben bewusste manuelle Segmentierungsmodi

## Visuelle Analyse

Pro Einheit werden lokal erzeugt:

- Originaltext
- geschätzter Zeitbereich
- visuelle Absicht
- Entitäten
- Konzepte
- visuelle Kategorie
- bevorzugter Medientyp
- 3–5 unterschiedliche Queries
- Kennzeichnung symbolischer / kontextueller B-Roll
- falls nötig transparenter Kontext aus der vorherigen aktiven Szenenkette

Unterstützte interne Visualrichtungen umfassen unter anderem Person, Produkt, Ort, Event, Technik, Finanzen, Historie, Prozess, Action und abstrakte Konzepte.

## Unterschiedliche Suchrichtungen

Die Query-Engine hängt nicht nur ähnliche Zusätze an denselben langen Suchbegriff. Sie erzeugt verschiedene Suchachsen, zum Beispiel:

1. konkrete Person/Firma/Entität + wichtigste Motive
2. zwei konkrete Entitäten zusammen, wenn eine Beziehung oder ein Ereignis beschrieben wird
3. Motiv/Handlung + passende B-Roll-Richtung
4. Kontext-/Umgebungsaufnahme
5. Detail-/Close-up- oder symbolischer Fallback

Häufige deutsche Visualbegriffe werden providerfreundlich übersetzt, beispielsweise `Roboter → robot`, `Fabrik → factory`, `Alltag → daily life`, `Rechenzentrum → data center`, `Börse → stock market` und `Krankenhaus → hospital`.

Konkrete Namen, Marken, Orte, Events und Jahreszahlen bleiben in den Suchrichtungen erhalten, soweit sie erkannt werden.

## Kontext zwischen aufeinanderfolgenden Szenen

Kurze Folgesätze enthalten häufig keinen vollständigen Namen mehr:

```text
OpenAI entwickelt humanoide Roboter.
Sie sollen später in Fabriken arbeiten.
Dort übernehmen sie die Montage.
```

Rückbezugssätze dürfen für die **Visualsuche** den aktiven Kontext aus der unmittelbar vorherigen Szene übernehmen. Wenn diese Szene selbst eindeutig auf ihren Vorgänger verwiesen hat, kann der relevante Hauptkontext entlang dieser Rückbezugskette weitergetragen werden.

Das gilt zum Beispiel für Satzanfänge wie:

- er / sie / es
- diese / dieser / dieses
- dort
- dabei / dadurch / damit
- dann
- anschließend
- später

Wichtig:

- ein neuer expliziter Szenenbezug ohne Rückbezug setzt den aktiven Kontext neu
- Nummerierungs-/Listenpräfixe werden nur für die Rückbezugs-Erkennung entfernt
- der Originaltext wird niemals verändert
- übernommener Kontext wird getrennt als `contextInherited`, `contextEntities` und `contextConcepts` gespeichert
- die Weboberfläche zeigt **Kontext übernommen: ...** sichtbar an

## Provider

| Provider | Bilder | Videos | Key |
|---|---:|---:|---:|
| Pexels | ja | ja | ja |
| Pixabay | ja | ja | ja |
| Unsplash | ja | nein | ja |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pixabay verwendet weiterhin den bestehenden 24-Stunden-Cache.

## Medienmix

Bei **Gemischt** versucht der Finder pro Szene sowohl Video-B-Roll als auch Bildmaterial zu sammeln, sofern mindestens eine Videoquelle verfügbar ist.

- Pexels und Pixabay werden für Video-B-Roll genutzt.
- Unsplash, Openverse und Wikimedia Commons liefern Bildkandidaten.
- Die Szene endet nicht nur wegen einer hohen Gesamttrefferzahl, solange der gewünschte Mix technisch erreichbar, aber noch nicht vorhanden ist.
- Die Oberfläche zeigt Video- und Bildanzahl sowie **Mix erfüllt** oder **Mix noch unvollständig**.
- Hauptvisual, Alternativen und nach Möglichkeit beide Medientypen bleiben beim Kandidatenlimit geschützt.

Wenn keine Videoquelle verfügbar ist, blockiert die fehlende Videoseite die Recherche nicht.

## Recherche pro Szene

### Schnell

- Ziel: ungefähr 4 eindeutige Kandidaten
- mindestens 1 erfolgreiche verfügbare Quelle
- maximal 4 Suchtasks pro Szene und Suchseite
- bis zu **12 eindeutige Kandidaten** werden pro Szene für die Auswahl behalten

### Tief

- Ziel: ungefähr 6 Kandidaten
- nach Möglichkeit mindestens 3 unterschiedliche verfügbare Quellen
- maximal 8 Suchtasks pro Szene und Suchseite
- bis zu **20 eindeutige Kandidaten** werden pro Szene behalten

### Maximal

- Ziel: ungefähr 8 Kandidaten
- nach Möglichkeit alle 5 verfügbaren Quellen mindestens einmal berücksichtigen
- fehlen Provider-Keys, passt sich die notwendige Providerzahl an die tatsächlich verfügbaren Quellen an
- maximal 12 Suchtasks pro Szene und Suchseite
- bis zu **30 eindeutige Kandidaten** werden pro Szene behalten

Das Kandidatenziel bestimmt, wann eine erste Suchrunde frühzeitig beendet werden darf. Die höhere Aufbewahrungsgrenze sorgt dafür, dass zusätzliche Suchseiten tatsächlich mehr Auswahl liefern können.

## Langprojekt-Performance und Kostenkontrolle

5–10-Minuten-Skripte werden gegen Browser-, Provider- und Datei-I/O-Überlast geschützt.

### Kontrollierte Sammelrecherche

Die Sammelrecherche verwendet ein theoretisches Batchbudget von höchstens ungefähr **80 Provider-Suchtasks**. Daraus ergibt sich je Recherchemodus automatisch eine andere maximale Szenenzahl pro Klick:

| Recherche | max. Tasks/Szene | max. Szenen/Batch |
|---|---:|---:|
| Schnell | 4 | 20 |
| Tief | 8 | 10 |
| Maximal | 12 | 6 |

Zusätzlich gilt:

- pro Batch niemals mehr als 20 Szenen
- Stoppen wirkt nach der aktuell laufenden Szene
- danach kann mit dem nächsten offenen Batch fortgesetzt werden
- bereits fertige Szenen bleiben gespeichert
- die Oberfläche zeigt den theoretischen maximalen Erstlauf sowie das Batchbudget an
- tatsächliche Requests können deutlich niedriger sein, weil jede Szene früher stoppt, sobald Kandidatenziel, Providerbreite und Medienmix erreicht sind

Damit führt ein langes Skript im Maximal-Modus nicht versehentlich hunderte API-Anfragen in einem einzigen Klick aus.

### Lazy-Kandidatenansicht

- Projekte bis 20 Szenen zeigen vorhandene Kandidaten direkt geöffnet
- bei mehr als 20 Szenen werden Bild-/Video-Karten erst erzeugt, wenn der Nutzer die Kandidatenansicht der jeweiligen Szene öffnet
- beim Zuklappen werden die schweren DOM-Karten wieder entfernt
- Kandidatendaten, Auswahl und Importstatus bleiben im Projekt gespeichert

### Inkrementelle lokale Projektspiegelung

`ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE` wird nach der Projekterstellung nicht bei jeder Szenenänderung komplett neu aufgebaut.

Bei Suche, Auswahl oder Import werden aktualisiert:

- die Projekt-/Shotlist-Dateien im Projektroot
- nur der tatsächlich geänderte Szenenordner

Der komplette Projektordner wird nur beim erstmaligen Erstellen vollständig aufgebaut.

## Mehr Treffer / Pagination

**Mehr Treffer** wiederholt nicht Seite 1.

```text
Erste Suche  → Seite 1
Mehr Treffer → Seite 2
Mehr Treffer → Seite 3
...
```

Die Seitenzahl wird nur nach mindestens einer erfolgreichen Providerabfrage fortgeschrieben. Schlägt eine komplette Runde fehl, bleibt die vorherige Suchseite erhalten.

Alle fünf Provider erhalten die tatsächliche Seitennummer. Wikimedia Commons berechnet `gsroffset` passend zu `perPage`, damit zwischen den Seiten keine Treffer übersprungen werden.

Nach Seite 100 wird weiteres Nachladen blockiert.

## Weitere Web-Recherche

Pro Szene steht zusätzlich **Weitere Web-Recherche** zur Verfügung. Aus bis zu drei aktuellen Szene-Queries werden manuelle Suchlinks erzeugt zu:

- YouTube
- Google Bilder
- Google Videos
- Google News
- Wikipedia

Diese Links importieren nichts und setzen keinen Rechte- oder Reviewstatus. Sie sind ausschließlich Discovery-Hilfen für konkrete Personen, Events, historische Motive oder seltenes Material.

## Kandidaten

Die Weboberfläche zeigt pro Treffer:

- Bild oder Video-Player
- Titel
- Provider
- Medientyp
- technischer Fit
- verwendete Query
- Suchseite
- Creator soweit vorhanden
- Quellseite
- Wiederverwendungshinweis

Der Nutzer kann einen Kandidaten als **Hauptvisual** oder **Alternative** markieren.

Dubletten werden über Provider-ID sowie kanonisierte Quell-, Original- und Medien-URLs reduziert. Bereits in anderen Szenen vorkommende Kandidaten werden niedriger priorisiert, aber nicht grundsätzlich verboten.

## Import

Ein Kandidat wird nur nach ausdrücklichem Klick importiert. Ein neu angelegtes externes Asset beginnt immer auf:

```text
review
```

Falls dieselbe Quelle beziehungsweise Medienreferenz bereits im Katalog vorhanden ist, legt der Finder kein unnötiges Duplikat an. Stattdessen wird der Skriptkandidat mit der bestehenden Katalog-Asset-ID verknüpft.

## Lokale Persistenz

Arbeitsdaten:

```text
.local-storage/script-visual-projects/
```

Menschenlesbare Spiegelung:

```text
ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE/
```

Pro Projekt:

```text
00-SKRIPT.txt
00-PROJEKT.json
00-SZENENPLAN.md
00-SHOTLIST.json
00-SHOTLIST.csv
001-SCENE-001/
002-SCENE-002/
...
```

`searchRound`, Kandidaten, Auswahl, Kontextfelder und Importverknüpfungen werden persistiert. `vault:build` bewahrt die Projekte.

## API-Sicherheit

Die API liegt unter `/script-visual-api/` und nutzt dieselbe lokale Schutzarchitektur:

- Loopback-only
- Same-Origin für Schreibaktionen
- `X-VAH-Token`
- gemeinsame Server-Schreibsperre
- begrenzte Requestgröße

Provider-Keys werden nicht in Projekten oder Suchmetadaten gespeichert.

Ein neu eingegebener Pexels-, Pixabay- oder Unsplash-Key wird erst dann als Sitzung-Key gemerkt, wenn genau dieser Provider erfolgreich damit angesprochen wurde. Ein keyloser Provider kann keinen fremden Key bestätigen.

Ein reiner Pixabay-Cachetreffer zählt nicht als Keyvalidierung. Noch nicht validierte Keys bleiben sichtbar im Passwortfeld und damit nur im Arbeitsspeicher der aktuellen Seite. Nach erfolgreicher Providerprüfung wird der Key aus dem Feld entfernt und nur flüchtig im RAM gehalten.

**Sitzungs-Keys löschen** entfernt sowohl gemerkte als auch noch sichtbare Keywerte.

## Rechte

Ein Suchtreffer ist keine Veröffentlichungserlaubnis.

Vor Freigabe weiterhin prüfen:

- Urheber / Lizenz
- Attribution
- Personen
- Marken / Logos
- Events / Veranstalter
- Broadcastmaterial
- Kontext

Symbolische B-Rolls dürfen nicht als Beleg dargestellt werden, dass sie das im Skript genannte konkrete Ereignis zeigen.

## Beta-Abnahme

`beta:verify` verlangt für beta.7 zusätzlich:

```text
scriptVisualProjectGenerated: true
scriptVisualMultipleScenesSearched: true
scriptVisualMixedMediaFound: true
scriptVisualReviewImported: true
```

`scriptVisualMixedMediaFound` wird erst wahr, wenn mindestens **eine konkrete Szene sowohl Video- als auch Bildkandidaten** enthält.

Die manuelle Release-Checkliste prüft zusätzlich Pagination, Auswahlpersistenz, lange Projekte, Review-Import und die übrigen Browserabläufe. Diese Kriterien können erst durch den späteren echten lokalen Browser-/API-Test erfüllt werden.
