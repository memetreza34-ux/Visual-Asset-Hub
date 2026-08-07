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

Die Grundmatrix besitzt **360 Format-Suchaufträge**. Kandidaten sind noch keine freigegebenen Assets. Nur visuell ausgewählte Treffer werden als `review` importiert.

## Intelligenter Ausbau

Der Bereich **Ausbau 720** bewertet jede Sammlung getrennt nach:

- vorhandenen Kandidaten
- offenen Reviews
- eingeschränkten Assets
- tatsächlich freigegebenen Assets
- Video- und Fotoabdeckung
- Fortschritt bis zum Ziel von acht Freigaben
- noch benötigten Suchkandidaten

Die Logik verhindert unnötige Massenimporte. Beispiel: Sind `0/8` Assets freigegeben, aber bereits acht passende Kandidaten im Review, wird **erst prüfen** empfohlen statt erneut zu suchen.

Der CLI-Bericht wird erzeugt mit:

```bash
npm run arsenal:expansion
```

Er schreibt:

- `reports/arsenal-expansion-plan.json`
- `reports/arsenal-expansion-plan.csv`

## Fünf externe Medienquellen

### Pexels

- Fotos und Videos
- API-Key erforderlich
- besonders für B-Rolls geeignet

### Pixabay

- Fotos und Videos
- API-Key erforderlich
- Suchergebnisse werden gemäß API-Regel 24 Stunden lokal zwischengespeichert

### Unsplash

- Fotos
- Access Key erforderlich
- Fotograf und Unsplash werden dokumentiert
- vorgeschriebenes Download-Ereignis wird beim tatsächlichen Import gemeldet

### Openverse

- Bilder
- kein geheimer Key erforderlich
- konservativer Filter: Public Domain, CC0, CC BY und CC BY-SA

### Wikimedia Commons

- Bilder
- kein geheimer Key erforderlich
- Lizenzmetadaten werden über `imageinfo/extmetadata` gelesen
- nur eindeutig unterstützte offene Lizenzen werden als Kandidaten angeboten

Pexels-, Pixabay- und Unsplash-Keys können in der Weboberfläche für die aktuelle Seite ausschließlich im Arbeitsspeicher gehalten und mit **Sitzungs-Keys löschen** sofort entfernt werden.

## Eigene Medien

Eigene Videos, Bilder oder Grafiken können lokal importiert und im Browser einer Sammlung zugeordnet werden. Der Import verlangt eine ausdrückliche Rechtebestätigung.

## Freigegebene Pakete

Freigegebene Favoriten können als Schnittpaket unter `exports/media-packs` ausgegeben werden. Diese Pakete verändern den Katalog nicht, sondern stellen projektfertige Kopien mit Manifest, SHA-256 und Attribution bereit.

## Starterpaket

Im Repository liegen sechs Grundassets. `npm run starter:import` ergänzt idempotent:

- ein Finanzvideo mit Taschenrechner
- vier KI-/Technologievideos zu Smartphone, bionischem Arm, Labor und Robotik
- ein Wikimedia-Commons-Foto für Boxtraining unter CC BY-SA 4.0

Danach enthält die lokale Testbibliothek **zwölf reale Assets**:

- acht Pexels-Videos
- drei eigene SVG-Grafiken
- ein Wikimedia-Commons-Foto

Der Import erkennt vorhandene IDs und Quellen und setzt alle neuen Treffer ausschließlich auf `review`. Durch das Kampfsportfoto sind nach dem Starterimport alle vier Kanäle im Realtest vertreten.

## Kanaldateien

- `catalog/channels/finance.json`
- `catalog/channels/ai.json`
- `catalog/channels/electro.json`
- `catalog/channels/combat-sports.json`
- `catalog/channels/index.json`

Jede Sammlung enthält:

- eindeutige ID
- deutschen Namen
- mehrere englische Suchbegriffe
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

## Priorisierte Batches im Browser

Im Bereich **Ausbau 720** kann pro Kanal **Top Suchlücken vorbereiten** gewählt werden. Der Builder übernimmt dann höchstens fünf konkrete Sammlungen.

Danach:

1. Quelle auswählen.
2. passendes Format wählen.
3. bei Pexels/Pixabay/Unsplash Key einmal für die Sitzung eingeben.
4. Batch starten.
5. Vorschauen und Quellen prüfen.
6. nur geeignete Treffer als `review` importieren.

Unsplash, Openverse und Wikimedia werden automatisch auf Fotoformate beschränkt.

## Ausgewählte Treffer importieren

Der Browser-Import übernimmt automatisch:

- Kanal-Tag
- Sammlungs-Tag
- spezialisierte Hauptkategorie
- Suchbegriff
- Tags
- Ausrichtung
- Quell- und Lizenzdaten
- Review-Status

Kein Treffer wird automatisch freigegeben.

## Rechte-Regeln für Kampfsport

Für UFC-, MMA-, Box- und Kickbox-Content werden grundsätzlich generische oder eindeutig offen lizenzierte Medien bevorzugt.

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

Bei CC BY oder CC BY-SA müssen Attribution und Lizenz dokumentiert bleiben. Bei CC BY-SA müssen zusätzlich die Share-Alike-Bedingungen bei Bearbeitungen berücksichtigt werden.

## Qualitätsziel

Eine Sammlung gilt als grundlegend abgedeckt, wenn sie mindestens enthält:

- vier freigegebene Assets insgesamt
- mindestens zwei freigegebene Videos
- mindestens zwei freigegebene Fotos
- dokumentierte Quelle und Lizenz
- keine ungeprüften Marken-, Personen- oder Rechte-Risiken

Die empfohlene Vollabdeckung liegt bei acht freigegebenen Assets pro Sammlung.
