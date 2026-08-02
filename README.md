# Visual Asset Hub

Visual Asset Hub ist eine universelle Medienbibliothek für **B-Rolls, Bilder, Animationen, Overlays, Screen-Recordings und Grafiken**. Die Assets sind nicht an einen einzelnen Kanal oder Content-Typ gebunden, sondern können für Reels, Shorts, YouTube, Werbung, Webseiten, Apps, Präsentationen und Kundenprojekte wiederverwendet werden.

## Ziele

- Assets in Sekunden finden statt Ordner manuell zu durchsuchen
- einheitliche Namen, Kategorien und Tags verwenden
- Nutzungsrechte und Quellen nachvollziehbar speichern
- Dubletten vermeiden
- Hochformat, Querformat und Quadrat gezielt filtern
- Assets lokal, über Git LFS oder in externem Object Storage verwalten
- einen automatisch erzeugten Suchindex für eine Weboberfläche bereitstellen

## Grundstruktur

```text
assets/
  video/
  image/
  animation/
  overlay/
  screen-recording/
  graphic/
previews/
inbox/
archive/
catalog/
docs/
scripts/
web/
```

`inbox/` ist der Eingang für neue Dateien. Erst nach Benennung, Rechteprüfung und Katalogisierung werden Assets nach `assets/` übernommen.

## Dateinamen

```text
{type}-{category}-{subject}-{action}-{shot}-{orientation}-{sequence}.{ext}
```

Beispiele:

```text
brl-technology-smartphone-scrolling-cu-vertical-0001.mp4
img-finance-cash-growth-isometric-square-0001.png
ovl-social-media-notification-pop-up-transparent-0001.webm
```

Die vollständigen Regeln stehen in [`docs/NAMING.md`](docs/NAMING.md).

## Katalog

Alle durchsuchbaren Informationen liegen in [`catalog/assets.json`](catalog/assets.json). Jedes Asset besitzt unter anderem:

- stabile Asset-ID
- Titel und Beschreibung
- Typ und Hauptkategorie
- kontrollierte Tags
- Motiv, Handlung und Kameraeinstellung
- Ausrichtung, Auflösung und Dauer
- Speicherpfad oder externe Storage-URL
- Quelle, Lizenzstatus und erlaubte Einsatzzwecke
- Erstellungs- und Importdatum
- optionalen SHA-256-Hash zur Dublettenprüfung

Das Schema steht in [`catalog/schema.json`](catalog/schema.json).

## Befehle

```bash
npm run validate
npm run index
npm run check
```

- `validate`: prüft IDs, Kategorien, Pfade, Rechteangaben und Dubletten
- `index`: erzeugt `catalog/search-index.json` für die Websuche
- `check`: führt beide Prüfungen aus

## Rechte und Sicherheit

Nur Assets speichern, für die eine nachvollziehbare Nutzungserlaubnis besteht. Dateien mit unbekanntem Rechtezustand bleiben in `inbox/` und erhalten nicht den Status `approved`. Quellen, Lizenz und erlaubte Nutzungsbereiche werden pro Asset dokumentiert.

Keine Zugangsdaten, privaten Freigabelinks oder personenbezogenen Metadaten in den Katalog eintragen.

## Status

Das Repository wird als universeller Asset-Hub aufgebaut. Die erste Stufe umfasst Taxonomie, Metadatenschema, Validierung, Suchindex und eine statische Suchoberfläche. Automatische Vorschauerzeugung, KI-Tagging, Cloud-Storage-Synchronisierung und visuelle Ähnlichkeitssuche folgen als spätere Ausbaustufen.
