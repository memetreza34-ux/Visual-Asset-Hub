# Kanal-Arsenal

Visual Asset Hub besitzt vier spezialisierte Kanalbibliotheken:

| Kanal | Sammlungen | vorbereitete Suchbegriffe | empfohlene Zielgröße |
|---|---:|---:|---:|
| Finanzen | 20 | 60 | 160 freigegebene Assets |
| Künstliche Intelligenz | 20 | 60 | 160 freigegebene Assets |
| Elektrotechnik | 20 | 60 | 160 freigegebene Assets |
| Kampfsport | 30 | 90 | 240 freigegebene Assets |
| **Gesamt** | **90** | **270** | **720 freigegebene Assets** |

Pro Sammlung sind vier Grundvarianten geplant:

1. vertikales B-Roll-Video für Reels, Shorts und TikTok
2. horizontales B-Roll-Video für YouTube und Webseiten
3. vertikales Foto für Social Media
4. horizontales Foto für YouTube, Webseiten und Präsentationen

Der vollständige Plan erzeugt **360 Suchaufträge** und kann bis zu **5.850 Kandidaten** abrufen. Kandidaten sind noch keine freigegebenen Assets. Nur visuell ausgewählte Treffer werden als `review` importiert.

## Intelligenter Ausbau

Die Weboberfläche bewertet jede Sammlung getrennt nach:

- vorhandenen Kandidaten
- offenen Reviews
- eingeschränkten Assets
- tatsächlich freigegebenen Assets
- Fortschritt bis zum Ziel von acht Freigaben

Unter **Als Nächstes ausbauen** erscheinen automatisch die acht schwächsten Sammlungen. Ein Klick stellt den Arsenal Builder auf den richtigen Kanal, die richtige Sammlung und vertikales Video ein.

Sortierungen:

- größte Lücken zuerst
- meiste Freigaben
- meiste offene Reviews
- alphabetisch

Mit **Nur unvollständige Sammlungen** werden bereits vollständig abgedeckte Sammlungen ausgeblendet.

## Drei Quellen für das Arsenal

### Pexels

Der Arsenal Builder durchsucht Pexels lokal und importiert nur markierte Treffer als `review`.

### Eigene Medien

Eigene Videos, Bilder oder Grafiken können nach `inbox` kopiert und im Browser einer Sammlung zugeordnet werden. Der Import verlangt eine ausdrückliche Rechtebestätigung.

### Bereits freigegebene Pakete

Freigegebene Favoriten können als Schnittpaket unter `exports/media-packs` ausgegeben werden. Diese Pakete verändern den Katalog nicht, sondern stellen projektfertige Kopien mit Manifest und Attribution bereit.

## Starterpaket

Im Repository liegen sechs Grundassets. Beim ersten Windows-Start ergänzt `npm run starter:import` fünf weitere bereits bekannte Pexels-Treffer ohne neue API-Anfrage:

- ein Finanzvideo mit Taschenrechner
- vier KI-/Technologievideos zu Smartphone, bionischem Arm, Labor und Robotik

Danach enthält die lokale Testbibliothek elf reale Assets. Der Import ist idempotent, erkennt vorhandene IDs und Quellen und setzt alle neuen Treffer ausschließlich auf `review`.

## Kanaldateien

- `catalog/channels/finance.json`
- `catalog/channels/ai.json`
- `catalog/channels/electro.json`
- `catalog/channels/combat-sports.json`
- `catalog/channels/index.json`

Jede Sammlung enthält:

- eindeutige ID
- deutschen Namen
- mehrere englische Pexels-Suchbegriffe
- feste Tags
- spezialisierte Hauptkategorie
- optionale Review- und Rechtehinweise

## Suchplan erzeugen

Alle Kanäle:

```bash
npm run arsenal:plan
```

Nur einen Kanal:

```bash
npm run arsenal:plan -- --channel combat-sports
```

Nur fünf Sammlungen eines Kanals:

```bash
npm run arsenal:plan -- --channel electro --max-collections 5
```

Ausgaben:

- `reports/arsenal-plan.json`
- `reports/arsenal-plan.csv`

## Pexels in sicheren Batches durchsuchen

Dry-Run ohne API-Aufruf:

```bash
npm run arsenal:search -- --max-jobs 20
```

Echten Batch starten:

```bash
npm run arsenal:search -- --execute true --max-jobs 20
```

Ergebnisse werden unter `.local-storage/arsenal-search/` nach Kanal und Sammlung abgelegt. Der Standard von 20 Aufträgen verhindert, dass das kostenlose API-Kontingent unnötig schnell verbraucht wird.

## Ausgewählte Treffer importieren

```bash
npm run arsenal:import -- \
  --input .local-storage/arsenal-search/electro/circuit-breakers-rcd/electro-circuit-breakers-rcd-video-vertical.json \
  --ids 12345,67890
```

Der Import übernimmt automatisch:

- Kanal-Tag
- Sammlungs-Tag
- spezialisierte Hauptkategorie
- Suchbegriff
- Tags
- Ausrichtung
- Review-Status

Kein Treffer wird automatisch freigegeben.

## Rechte-Regeln für Kampfsport

Für UFC-, MMA-, Box- und Kickbox-Content werden grundsätzlich generische Stockaufnahmen verwendet.

Nicht automatisch freigeben:

- UFC- oder Veranstalterlogos
- TV- und Pay-per-View-Broadcastmaterial
- originale Kampfausschnitte ohne nachgewiesene Lizenz
- geschützte Gürtel- und Eventdesigns
- Pressekonferenzen mit sichtbaren Marken ohne Prüfung
- grafische Verletzungen
- gefährliche Weight-Cut-Darstellungen

Geeignete neutrale Motive:

- Training im Gym
- Boxsack und Pratzen
- Schattenboxen
- generischer Ring oder Käfig
- Bandagen und Handschuhe
- Konditions- und Krafttraining
- Regeneration
- generischer Walkout oder Staredown

## Qualitätsziel

Eine Sammlung gilt als grundlegend abgedeckt, wenn sie mindestens enthält:

- zwei freigegebene vertikale Videos
- zwei freigegebene horizontale Videos oder Bilder
- mindestens vier unterschiedliche Motive oder Perspektiven
- dokumentierte Quelle und Lizenz
- keine ungeprüften Marken- oder Personenrisiken

Die empfohlene Vollabdeckung liegt bei acht freigegebenen Assets pro Sammlung.
