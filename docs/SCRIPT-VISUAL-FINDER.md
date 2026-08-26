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

Im **Auto-Modus** darf ein langes Skript zunächst mehr als 120 einzelne kurze Satzsegmente erzeugen. Statt das Projekt deshalb sofort abzulehnen, verdichtet der Finder nur in diesem Fall die jeweils kürzesten benachbarten visuellen Einheiten, bis höchstens 120 Szenen übrig bleiben.

Dadurch gilt:

- das vollständige gespeicherte Skript bleibt unverändert
- die Reihenfolge bleibt erhalten
- nur die visuelle Gruppierung wird gröber
- normale kürzere Skripte werden nicht künstlich zusammengelegt
- Satzweise und Absatzweise bleiben bewusste manuelle Segmentierungsmodi

So können auch längere Sprechertexte mit sehr vielen kurzen Sätzen verarbeitet werden, ohne die Web-App mit hunderten Szenenkarten zu überladen.

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

Häufige deutsche Visualbegriffe werden zusätzlich providerfreundlich übersetzt, zum Beispiel:

- Roboter → `robot`
- Fabrik → `factory`
- Alltag → `daily life`
- Rechenzentrum → `data center`
- Börse → `stock market`
- Krankenhaus → `hospital`

Konkrete Namen, Marken, Orte, Events und Jahreszahlen bleiben in den Suchrichtungen erhalten, soweit sie erkannt werden.

Beispiel:

```text
Conor McGregor besiegte José Aldo 2015 in der Arena.
```

kann unterschiedliche Suchrichtungen erzeugen, die Person, Gegner, Kampf/Action und Arena-/Kontextmaterial abdecken, statt fünf fast identische Queries zu erzeugen.

## Kontext zwischen aufeinanderfolgenden Szenen

Kurze Folgesätze enthalten häufig keinen vollständigen Namen mehr:

```text
OpenAI entwickelt humanoide Roboter.
Sie sollen später in Fabriken arbeiten.
Dort übernehmen sie die Montage.
```

Rückbezugssätze dürfen für die **Visualsuche** den aktiven Kontext aus der unmittelbar vorherigen Szene übernehmen. Wenn diese vorherige Szene selbst eindeutig auf ihren Vorgänger verwiesen hat, darf der relevante Hauptkontext entlang dieser Rückbezugskette weitergetragen werden.

Das gilt für eindeutige Rückbezüge am Satzanfang, zum Beispiel:

- er / sie / es
- diese / dieser / dieses
- dort
- dabei / dadurch / damit
- dann
- anschließend
- später

Dadurch können auch der zweite und dritte Satz weiterhin Queries mit `OpenAI`, `Roboter` und dem aktuellen Motiv erzeugen, obwohl der konkrete Name nicht in jedem Satz wiederholt wird.

Wichtig:

- die Vererbung startet nur bei einem eindeutigen sprachlichen Rückbezug
- ein neuer expliziter Szenenbezug ohne solchen Rückbezug setzt den aktiven Kontext neu
- der Originaltext wird nicht verändert
- übernommener Kontext wird getrennt als `contextInherited`, `contextEntities` und `contextConcepts` gespeichert
- die Weboberfläche zeigt **Kontext übernommen: ...** sichtbar an

So bleibt nachvollziehbar, was tatsächlich im Skript stand und was ausschließlich als Recherchehilfe ergänzt wurde.

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

- Pexels und Pixabay werden im Gemischt-Modus für Video-B-Roll genutzt.
- Unsplash, Openverse und Wikimedia Commons liefern Bildkandidaten.
- Die Szene wird nicht nur wegen einer hohen Gesamttrefferzahl beendet, solange der gewünschte Mix technisch noch erreichbar, aber noch nicht vorhanden ist.
- Die Oberfläche zeigt pro Szene sichtbar an, wie viele Videos und Bilder vorhanden sind und ob der Mix erfüllt ist.
- Beim Kandidatenlimit bleiben ausgewählte Hauptvisuals und Alternativen geschützt; bei Gemischt werden außerdem Kandidaten beider Medientypen bewahrt.

Wenn keine Videoquelle verfügbar ist, blockiert die fehlende Videoseite die Recherche nicht.

## Recherche pro Szene

Die Suche feuert nicht blind jede Query gegen jede Quelle ab.

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
- fehlen Provider-Keys, passt sich die notwendige Providerzahl automatisch an die tatsächlich verfügbaren Quellen an
- maximal 12 Suchtasks pro Szene und Suchseite

Sobald Kandidatenziel, Providerbreite und gegebenenfalls Medienmix erreicht sind, endet der Suchlauf für diese Szene.

## Mehr Treffer / Pagination

**Mehr Treffer** wiederholt nicht einfach Seite 1.

Eine Szene führt einen eigenen `searchRound`:

```text
Erste Suche  → Seite 1
Mehr Treffer → Seite 2
Mehr Treffer → Seite 3
...
```

Die Seitenzahl wird nur nach mindestens einer erfolgreichen Providerabfrage fortgeschrieben. Schlägt eine komplette Runde fehl, bleibt die vorherige Suchseite erhalten und kann sauber erneut versucht werden.

Die Provider erhalten die tatsächliche Seitennummer:

- Pexels: echte API-Seite
- Pixabay: echte API-Seite und seitenspezifischer 24h-Cache
- Unsplash: echte API-Seite
- Openverse: echte API-Seite
- Wikimedia Commons: `gsroffset` wird passend zu `perPage` berechnet, damit zwischen den Seiten keine Treffer übersprungen werden

Die Weboberfläche zeigt die aktuelle Suchseite und deaktiviert weitere Seiten nach Seite 100.

## Weitere Web-Recherche

Pro Szene steht zusätzlich **Weitere Web-Recherche** zur Verfügung. Sie erzeugt aus bis zu drei der aktuellen Szene-Queries manuelle Suchlinks zu:

- YouTube
- Google Bilder
- Google Videos
- Google News
- Wikipedia

Diese Links importieren **nichts** und setzen keinen Rechte- oder Reviewstatus. Sie dienen nur dazu, bei sehr konkreten Personen, Events, historischen Motiven oder seltenem Material weitere Fundstellen zu recherchieren.

Sichtbarkeit auf YouTube, Google, Wikipedia oder einer anderen Website ist keine Nutzungsfreigabe.

## Lange Skripte und Suchablauf

Der Browser recherchiert Szene für Szene sequenziell.

Dadurch:

- keine unkontrollierte gleichzeitige Request-Explosion
- Fortschritt sichtbar
- Recherche stoppbar
- später fortsetzbar
- fertige Szenen bleiben gespeichert
- einzelne Providerfehler zerstören kein komplettes Projekt
- zusätzliche Treffer können gezielt nur für einzelne Szenen nachgeladen werden
- kontextabhängige Folgesätze behalten ihren aktiven Bezug für die Recherche

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

Dubletten werden nicht nur über die Provider-ID erkannt. Der Finder berücksichtigt zusätzlich kanonisierte Quellseiten, Original-Medien-URLs und direkte Medienreferenzen. Dadurch können gleiche Aufnahmen auch dann erkannt werden, wenn sie über unterschiedliche Suchläufe erneut auftauchen.

Bereits in anderen Szenen vorkommende Kandidaten werden niedriger priorisiert, aber nicht vollständig verboten.

## Import

Ein Kandidat wird nur nach ausdrücklichem Klick importiert.

Der Import verwendet die vorhandene Arsenal-Importpipeline und setzt ein neu angelegtes Asset auf:

```text
review
```

Importierte Katalog-Asset-IDs werden im Script-Visual-Projekt am Kandidaten gespeichert.

Falls dieselbe Quelle beziehungsweise Medienreferenz bereits im Katalog vorhanden ist, legt der Finder kein unnötiges Duplikat an. Stattdessen wird der Skriptkandidat mit der bestehenden Katalog-Asset-ID verknüpft und in der Oberfläche als bereits importiert behandelt.

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

`searchRound`, Kandidaten, Auswahl, Kontextfelder und Importverknüpfungen werden im Projekt persistiert. `vault:build` bewahrt diese Projekte.

## API-Sicherheit

Die API liegt unter:

```text
/script-visual-api/
```

Sie ist Teil derselben lokalen Schutzarchitektur:

- Loopback-only
- Same-Origin für Schreibaktionen
- `X-VAH-Token`
- gemeinsame Server-Schreibsperre
- begrenzte Requestgröße

Provider-Keys werden nicht in Projekten oder Suchmetadaten gespeichert. Ein neu eingegebener Pexels-, Pixabay- oder Unsplash-Key wird im Browser erst für die laufende Sitzung gemerkt, wenn genau dieser Provider erfolgreich angesprochen wurde. Ein erfolgreicher keyloser Provider kann dadurch keinen fehlerhaften Key eines anderen Providers versehentlich bestätigen.

Ein reiner Pixabay-Cachetreffer gilt ebenfalls nicht als Prüfung eines neu eingegebenen Pixabay-Keys, weil bei diesem Treffer keine echte Anfrage mit dem neuen Schlüssel stattgefunden hat.

Noch nicht validierte Keys bleiben bis zur Bestätigung sichtbar im jeweiligen Passwortfeld und damit nur im Arbeitsspeicher der laufenden Seite. Dadurch geht ein gültiger Key bei langen Projekten nicht verloren, wenn die erste Szene den Provider noch nicht verwendet oder nur einen Cachetreffer erhält. Erst wenn der Server genau diesen Provider erfolgreich mit dem eingegebenen Key geprüft hat, wird der Wert aus dem sichtbaren Feld entfernt und im flüchtigen Sitzungsspeicher der Seite gehalten.

**Sitzungs-Keys löschen** entfernt sowohl die gemerkten als auch die noch sichtbaren Keywerte.

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

Symbolische B-Rolls dürfen nicht als Beleg dafür dargestellt werden, dass sie das im Skript genannte konkrete Ereignis zeigen.

## Beta-Abnahme

`beta:verify` verlangt für beta.7 zusätzlich:

```text
scriptVisualProjectGenerated: true
scriptVisualMultipleScenesSearched: true
scriptVisualMixedMediaFound: true
scriptVisualReviewImported: true
```

Die manuelle Release-Checkliste prüft zusätzlich eine echte Szene mit Video + Bild, Folgeseiten, Auswahlpersistenz und die weiteren Browserabläufe.

Diese Kriterien können erst durch den späteren echten lokalen Browser-/API-Test erfüllt werden.
