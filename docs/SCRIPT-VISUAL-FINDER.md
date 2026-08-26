# Script Visual Finder

Stand: `0.4.0-beta.7`

## Zweck

**Skript rein → Visuals raus.** Der Nutzer liefert ein fertiges Skript. Der Hub schreibt oder verbessert diesen Text nicht, sondern recherchiert passende Bilder und B-Rolls.

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
→ Freigabe
→ verifiziertes Schnittpaket
→ Shotlist / Projektablage
```

## Grenzen und Segmentierung

- maximal 40.000 Skriptzeichen
- maximal 120 visuelle Einheiten
- Auto, Satzweise, Absatzweise
- Auto verdichtet bei sehr vielen kurzen Einheiten kontrolliert auf höchstens 120 Szenen
- vollständiges Originalskript bleibt unverändert
- Nummerierungs-/Listenpräfixe bleiben im Originaltext
- Präfixe dürfen nur für Segmentierungs-/Rückbezugslogik intern ignoriert werden
- maximal 100 Suchseiten pro Szene

## Visuelle Analyse

Pro Szene entstehen Originaltext, Zeitbereich, visuelle Absicht, Entitäten, Konzepte, Kategorie, bevorzugter Medientyp, 3–5 unterschiedliche Queries und gegebenenfalls eine Kennzeichnung als symbolische B-Roll.

Die Query-Engine nutzt mehrere Suchachsen statt nur denselben Grundbegriff mit verschiedenen Anhängen. Häufige deutsche Begriffe werden providerfreundlich übersetzt, konkrete Namen, Marken, Orte, Events und Jahreszahlen bleiben nach Möglichkeit erhalten.

## Szenenkontext

Rückbezugssätze wie `Sie ...`, `Dort ...`, `Dabei ...`, `Dadurch ...`, `Anschließend ...` oder `Später ...` dürfen für die Visualsuche relevanten Kontext aus der unmittelbar vorherigen aktiven Szenenkette übernehmen.

Beispiel:

```text
1. OpenAI entwickelt humanoide Roboter.
2. Sie sollen später in Fabriken arbeiten.
3. Dort übernehmen sie die Montage.
```

`2.`/`3.` bleiben im Originaltext sichtbar. Nur für die Rückbezugs-Erkennung werden Listenpräfixe ignoriert. Übernommener Kontext wird getrennt gespeichert und in der UI als **Kontext übernommen: ...** angezeigt. Ein neuer expliziter Bezug ohne Rückbezug setzt den Kontext neu.

## Provider

| Provider | Bilder | Videos | Key |
|---|---:|---:|---:|
| Pexels | ja | ja | ja |
| Pixabay | ja | ja | ja |
| Unsplash | ja | nein | ja |
| Openverse | ja | nein | nein |
| Wikimedia Commons | ja | nein | nein |

Pixabay verwendet den 24-Stunden-Cache.

## Medienmix

Bei **Gemischt** versucht der Finder pro Szene Video-B-Roll und Bildmaterial zu sammeln, sofern eine Videoquelle verfügbar ist. Die Oberfläche zeigt Video-/Bildanzahl sowie **Mix erfüllt** oder **Mix noch unvollständig**.

## Rechercheumfang und Kandidatenmenge

| Modus | Ziel | Quellenbreite | max. Tasks pro Szene/Seite | max. behaltene Kandidaten |
|---|---:|---:|---:|---:|
| Schnell | ca. 4 | 1 | 4 | 12 |
| Tief | ca. 6 | 3 | 8 | 20 |
| Maximal | ca. 8 | bis 5 | 12 | 30 |

Fehlen Provider-Keys, passt sich die erforderliche Quellenzahl an die tatsächlich verfügbaren Provider an. Das kleinere Ziel steuert den Early-Stop einer Suchrunde; die höhere Kandidatengrenze erlaubt nach weiteren Seiten deutlich mehr Auswahl.

## Langprojekt-Performance und Kostenkontrolle

Die Sammelrecherche verwendet ungefähr höchstens **80 theoretische Provider-Suchtasks pro Batch**:

| Modus | max. Szenen pro Sammelbatch |
|---|---:|
| Schnell | 20 |
| Tief | 10 |
| Maximal | 6 |

Tatsächliche Requests können niedriger sein, weil jede Szene früher stoppt, sobald ihre Ziele erfüllt sind.

Bei mehr als 20 Szenen werden Kandidatenkarten lazy erst beim Öffnen erzeugt und beim Zuklappen wieder aus dem DOM entfernt. Nach der initialen Projekterstellung aktualisiert die lokale Spiegelung nur Root-Dateien plus den betroffenen Szenenordner.

## Mehr Treffer / Pagination

**Mehr Treffer** lädt echte Folgeseiten: Seite 1 → 2 → 3 usw. Eine vollständig fehlgeschlagene Runde erhöht `searchRound` nicht. Alle fünf Provider erhalten die Seitennummer. Wikimedia verwendet einen zu `perPage` passenden `gsroffset`, damit keine Treffer ausgelassen werden. Maximal Seite 100.

## Weitere Web-Recherche

Pro Szene gibt es manuelle Discovery-Links zu YouTube, Google Bilder, Google Videos, Google News und Wikipedia. Sie importieren nichts und sind keine Rechte- oder Nutzungsfreigabe.

## Kandidaten / Auswahl / Dubletten

Die UI zeigt Bild oder Video-Player, Titel, Provider, Medientyp, technischen Fit, Query, Suchseite, Creator und Quelle. Der Nutzer bestimmt Hauptvisual und Alternativen selbst.

Dubletten werden über Provider-ID sowie kanonisierte Quell-, Original- und Medien-URLs reduziert. Wiederverwendung aus anderen Szenen wird niedriger priorisiert, aber nicht grundsätzlich verboten.

## Import

Ein neuer externer Import beginnt immer auf `review`. Existiert dieselbe Quelle bereits im Katalog, wird die bestehende Asset-ID mit der Szene verknüpft statt ein Duplikat anzulegen. Der bestehende Status ändert sich dadurch nicht.

## Schnittpaket aus Auswahl

Der Projektkopf besitzt zusätzlich **Schnittpaket aus Auswahl**.

Die Funktion verwendet ausschließlich die bereits vorhandene, verifizierte `/api/media-pack`-Pipeline:

- berücksichtigt nur Kandidaten, die im Szenenboard als Hauptvisual oder Alternative markiert sind
- Kandidat muss bereits mit einer Katalog-Asset-ID verknüpft sein
- nur Katalogstatus `approved` wird in ein Paket übernommen
- `review`, eingeschränkte, archivierte oder noch nicht importierte Auswahl wird übersprungen und sichtbar gemeldet
- keine automatische Freigabe und keine Statusänderung
- maximal 20 Asset-IDs pro bestehendem Media-Pack-Aufruf
- größere Script-Auswahlen werden automatisch in mehrere nummerierte Pakete geteilt
- bestehende Media-Pack-Regeln bleiben erhalten: SHA-256, Manifest, Attribution, Download-/Größen- und Sicherheitsprüfungen
- lokales Verwaltungstoken bleibt nur im Arbeitsspeicher des zusätzlichen Browsermoduls

Damit führt der Workflow von der visuellen Recherche bis zu einem tatsächlich verifizierten Schnittpaket, ohne den Review-Schritt zu umgehen.

## Lokale Persistenz

Arbeitsdaten: `.local-storage/script-visual-projects/`

Spiegelung: `ALLES-GEFUNDEN/06-SKRIPT-PROJEKTE/`

Pro Projekt entstehen Skript, Projekt-JSON, Szenenplan, Shotlist JSON/CSV und einzelne Szenenordner. `searchRound`, Kandidaten, Kontext, Auswahl und Importverknüpfungen bleiben erhalten. `vault:build` bewahrt die Projekte.

## API-Sicherheit

`/script-visual-api/` ist Loopback-only, Same-Origin-geschützt, tokenisiert und nutzt die gemeinsame Schreibsperre. Provider-Keys werden nicht persistent gespeichert. Ein neuer Key wird erst nach erfolgreicher Anfrage genau dieses Providers als Sitzung-Key gemerkt; keylose Provider und reine Pixabay-Cachetreffer können keinen neuen fremden Key validieren.

Das Schnittpaket nutzt die bestehende lokale `/api/media-pack`-Route. Auch dafür wird kein Token persistent gespeichert.

## Rechte

Ein Suchtreffer ist keine Veröffentlichungserlaubnis. Vor Freigabe Urheber/Lizenz, Attribution, Personen, Marken/Logos, Events, Broadcastmaterial und Kontext prüfen. Symbolische B-Rolls dürfen nicht als Beweis für ein konkretes Ereignis dargestellt werden.

## Beta-Abnahme

```text
scriptVisualProjectGenerated: true
scriptVisualMultipleScenesSearched: true
scriptVisualMixedMediaFound: true
scriptVisualReviewImported: true
```

`scriptVisualMixedMediaFound` wird erst wahr, wenn mindestens eine konkrete Szene Video **und** Bild enthält. Zusätzlich muss im späteren Realtest geprüft werden, dass **Schnittpaket aus Auswahl** ausschließlich bereits freigegebene Script-Visual-Assets exportiert und Review-/nicht importierte Auswahl korrekt blockiert oder überspringt. Die restlichen Kriterien werden erst beim späteren echten lokalen Browser-/API-Test abgenommen.
