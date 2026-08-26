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

Das vollständige eingegebene Skript bleibt unverändert im Projekt gespeichert. Auch Nummerierungs- und Aufzählungspräfixe wie `1.`, `2.` oder `-` bleiben im jeweiligen Szenen-Originaltext erhalten.

Sie werden lediglich bei der visuellen Segmentierungslogik so behandelt, dass daraus keine leeren oder bedeutungslosen Extra-Szenen entstehen.

Lange Sätze dürfen in mehrere visuelle Einheiten aufgeteilt werden. Jede Einheit verweist weiterhin auf ihren tatsächlichen Originaltext; der Hub erzeugt keinen Ersatztext.

### Lange Skripte bis ungefähr zehn Minuten

Im **Auto-Modus** darf ein langes Skript zunächst mehr als 120 einzelne kurze Satzsegmente erzeugen. Statt das Projekt deshalb sofort abzulehnen, verdichtet der Finder nur in diesem Fall benachbarte kurze visuelle Einheiten, bis höchstens 120 Szenen übrig bleiben.

Dadurch gilt:

- das vollständige gespeicherte Skript bleibt unverändert
- die Reihenfolge bleibt erhalten
- nur die visuelle Gruppierung wird gröber
- normale kürzere Skripte werden nicht künstlich zusammengelegt
- Satzweise und Absatzweise bleiben bewusste manuelle Segmentierungsmodi

## Visuelle Analyse

Pro Einheit werden lokal erzeugt:

- Originaltext der visuellen Einheit
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

Die Query-Engine hängt nicht nur mehrere ähnliche Zusätze an denselben langen Suchbegriff. Sie erzeugt bewusst verschiedene Suchachsen, zum Beispiel:

1. konkrete Person/Firma/Entität + wichtigste Motive
2. zwei konkrete Entitäten zusammen, wenn die Szene eine Beziehung oder ein Ereignis beschreibt
3. Motiv/Handlung + passende B-Roll-Richtung
4. Kontext-/Umgebungsaufnahme
5. Detail-/Close-up- oder symbolischer Fallback

Häufige deutsche Visualbegriffe werden zusätzlich providerfreundlich übersetzt, beispielsweise `Roboter → robot`, `Fabrik → factory`, `Alltag → daily life`, `Rechenzentrum → data center`, `Börse → stock market` und `Krankenhaus → hospital`.

Konkrete Namen, Marken, Orte, Events und Jahreszahlen bleiben in den Suchrichtungen erhalten, soweit sie erkannt werden.

## Kontext zwischen aufeinanderfolgenden Szenen

Kurze Folgesätze enthalten häufig keinen vollständigen Namen mehr:

```text
OpenAI entwickelt humanoide Roboter.
Sie sollen später in Fabriken arbeiten.
Dort übernehmen sie die Montage.
```

Rückbezugssätze dürfen für die **Visualsuche** den aktiven Kontext aus der unmittelbar vorherigen Szene übernehmen. Wenn diese Szene selbst eindeutig auf ihren Vorgänger verwiesen hat, darf der relevante Hauptkontext entlang dieser Rückbezugskette weitergetragen werden.

Das gilt für eindeutige Rückbezüge am Satzanfang, zum Beispiel:

- er / sie / es
- diese / dieser / dieses
- dort
- dabei / dadurch / damit
- dann
- anschließend
- später

Wichtig:

- ein neuer expliziter Szenenbezug ohne solchen Rückbezug setzt den aktiven Kontext neu
- der Originaltext wird nicht verändert
- übernommener Kontext wird getrennt als `contextInherited`, `contextEntities` und `contextConcepts` gespeichert
- die Weboberfläche zeigt **Kontext übernommen: ...** sichtbar an

## Provider

Es werden die bestehenden Adapter wiederverwendet:

| Provider | Bilder | Videos | Key |
|---|---:|---:|---:|
| Pexels | ja | ja | ja |
| Pixabay | ja | ja | ja |
| Unsplash | ja | nein | ja |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pixabay verwendet weiterhin den bestehenden 24-Stunden-Cache.

## Medienmix

Bei **Gemischt** versucht der Finder pro Szene bewusst sowohl Video-B-Roll als auch Bildmaterial zu sammeln, sofern mindestens eine Videoquelle verfügbar ist.

- Pexels und Pixabay werden für Video-B-Roll genutzt.
- Unsplash, Openverse und Wikimedia Commons liefern Bildkandidaten.
- Die Szene wird nicht nur wegen einer hohen Gesamttrefferzahl beendet, solange der gewünschte Mix technisch noch erreichbar, aber noch nicht vorhanden ist.
- Die Oberfläche zeigt pro Szene Video- und Bildanzahl sowie **Mix erfüllt** oder **Mix noch unvollständig**.
- Beim Kandidatenlimit bleiben Hauptvisual, Alternativen und nach Möglichkeit beide Medientypen erhalten.

Wenn keine Videoquelle verfügbar ist, blockiert die fehlende Videoseite die Recherche nicht.

## Recherche pro Szene

### Schnell

- Ziel: ungefähr 4 eindeutige Kandidaten
- mindestens 1 erfolgreiche verfügbare Quelle
- maximal 4 Suchtasks pro Szene und Suchseite

### Tief

- Ziel: ungefähr 6 Kandidaten
- nach Möglichkeit mindestens 3 unterschiedliche verfügbare Quellen
- maximal 8 Suchtasks pro Szene und Suchseite

### Maximal

- Ziel: ungefähr 8 Kandidaten
- nach Möglichkeit alle 5 verfügbaren Quellen mindestens einmal berücksichtigen
- fehlen Provider-Keys, passt sich die notwendige Providerzahl an die tatsächlich verfügbaren Quellen an
- maximal 12 Suchtasks pro Szene und Suchseite

Sobald Kandidatenziel, Providerbreite und gegebenenfalls Medienmix erreicht sind, endet der Suchlauf für diese Szene.

## Langprojekt-Performance

5–10-Minuten-Skripte werden zusätzlich gegen Browser-, Provider- und Datei-I/O-Überlast geschützt.

### Kontrollierte Sammelrecherche

- bis einschließlich 40 Szenen kann der Sammelbutton alle offenen Szenen sequenziell abarbeiten
- bei mehr als 40 Szenen werden pro Klick höchstens **20 offene Szenen** recherchiert
- danach zeigt der Button automatisch die nächste offene Batchgröße an
- Stoppen wirkt weiterhin nach der aktuell laufenden Szene
- bereits fertige Szenen bleiben gespeichert
- die Oberfläche zeigt vor dem Lauf den theoretischen maximalen Erstlauf in Provider-Suchtasks
- dieser Wert ist nur ein Maximum; jede Szene stoppt früher, sobald ihre Suchziele erfüllt sind

### Lazy-Kandidatenansicht

- Projekte bis 20 Szenen zeigen vorhandene Kandidaten direkt geöffnet
- bei mehr als 20 Szenen werden Bild-/Video-Karten erst erzeugt, wenn der Nutzer die Kandidatenansicht der jeweiligen Szene öffnet
- beim Zuklappen werden die schweren DOM-Karten wieder entfernt
- Kandidatendaten, Auswahl und Importstatus bleiben selbstverständlich im Projekt gespeichert

Dadurch müssen bei langen Projekten nicht tausende Bild- und Videoelemente gleichzeitig im Browser existieren.

### Inkrementelle lokale Projektspiegelung

`ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE` wird nach der Projekterstellung nicht bei jeder Szenenänderung komplett neu aufgebaut.

Bei Suche, Auswahl oder Import werden aktualisiert:

- die Projekt-/Shotlist-Dateien im Projektroot
- **nur der tatsächlich geänderte Szenenordner**

Der komplette Projektordner wird nur beim erstmaligen Erstellen vollständig aufgebaut. Das reduziert Datei-I/O bei langen Projekten erheblich.

## Mehr Treffer / Pagination

**Mehr Treffer** wiederholt nicht einfach Seite 1.

```text
Erste Suche  → Seite 1
Mehr Treffer → Seite 2
Mehr Treffer → Seite 3
...
```

Die Seitenzahl wird nur nach mindestens einer erfolgreichen Providerabfrage fortgeschrieben. Schlägt eine komplette Runde fehl, bleibt die vorherige Suchseite erhalten.

Die Provider erhalten die tatsächliche Seitennummer. Wikimedia Commons berechnet `gsroffset` passend zu `perPage`, damit zwischen den Seiten keine Treffer übersprungen werden.

Nach Seite 100 wird weiteres Nachladen in der Weboberfläche blockiert.

## Weitere Web-Recherche

Pro Szene steht zusätzlich **Weitere Web-Recherche** zur Verfügung. Aus bis zu drei aktuellen Szene-Queries werden manuelle Suchlinks zu folgenden Diensten erzeugt:

- YouTube
- Google Bilder
- Google Videos
- Google News
- Wikipedia

Diese Links importieren **nichts** und setzen keinen Rechte- oder Reviewstatus. Sie sind ausschließlich Discovery-Hilfen für sehr konkrete Personen, Events, historische Motive oder seltenes Material.

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

Ein reiner Pixabay-Cachetreffer zählt ebenfalls nicht als Keyvalidierung. Noch nicht validierte Keys bleiben sichtbar im Passwortfeld und damit nur im Arbeitsspeicher der aktuellen Seite, damit sie bei langen Projekten nicht verloren gehen. Nach erfolgreicher Providerprüfung wird der Key aus dem Feld entfernt und nur flüchtig im RAM gehalten.

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

`scriptVisualMixedMediaFound` wird erst wahr, wenn **mindestens eine konkrete Szene sowohl Video- als auch Bildkandidaten** enthält.

Die manuelle Release-Checkliste prüft zusätzlich Pagination, Auswahlpersistenz, lange Projekte, Review-Import und die übrigen Browserabläufe.

Diese Kriterien können erst durch den späteren echten lokalen Browser-/API-Test erfüllt werden.
