# Asset-Workflow

## 1. Eingang

Neue Dateien landen zuerst in `inbox/`. In dieser Stufe gelten sie noch nicht als freigegeben.

Prüfen:

- Datei lässt sich öffnen
- Quelle ist bekannt
- Nutzungserlaubnis ist dokumentierbar
- technische Qualität reicht grundsätzlich aus
- Datei enthält keine unerwünschten personenbezogenen Daten

## 2. Dublettenprüfung

Nach Möglichkeit SHA-256 berechnen und mit vorhandenen Assets vergleichen. Zusätzlich visuell prüfen, weil neu exportierte Varianten unterschiedliche Hashes besitzen können.

## 3. Benennung

Datei nach `docs/NAMING.md` umbenennen. Die nächste freie Sequenz wird innerhalb derselben logischen Gruppe vergeben.

## 4. Metadaten erfassen

Mindestens erfassen:

- Titel und Beschreibung
- Asset-Typ
- Hauptkategorie
- Motiv und Handlung
- mindestens zwei Tags
- Ausrichtung
- Kameraeinstellung und Bewegung
- Qualitätsbewertung
- Speicherort
- Quelle, Lizenz und erlaubte Nutzungsbereiche

## 5. Vorschau erzeugen

Für große Videos und Bilder wird eine leichte Vorschau in `previews/` abgelegt. Die Vorschau darf nicht die einzige Kopie des Originals sein.

Empfehlungen:

- Video: kurze MP4- oder WebM-Vorschau
- Bild: WebP oder JPEG mit reduzierter Breite
- transparente Assets: PNG oder WebP mit Alpha
- Dateiname der Vorschau basiert auf der Asset-ID

## 6. Status vergeben

- `inbox`: noch nicht geprüft
- `review`: Metadaten vorhanden, Freigabe offen
- `approved`: technisch und rechtlich freigegeben
- `restricted`: nur eingeschränkt nutzbar
- `archived`: nicht mehr aktiv, aber nachvollziehbar aufbewahrt

Ein Asset darf nur `approved` sein, wenn der Lizenzstatus nicht `unknown` ist und mindestens ein erlaubter Nutzungsbereich dokumentiert wurde.

## 7. Verschieben

Nach Freigabe wird das Original nach diesem Prinzip einsortiert:

```text
assets/{type}/{category}/{filename}
```

Beispiel:

```text
assets/video/technology-ai/brl-technology-ai-smartphone-scrolling-cu-vertical-0001.mp4
```

## 8. Katalog prüfen

```bash
npm run validate
npm run index
npm test
```

Erst nach erfolgreicher Prüfung werden Änderungen übernommen.

## 9. Nutzung in Content-Projekten

Content-Projekte kopieren das Asset nicht unkontrolliert, sondern referenzieren möglichst die stabile Asset-ID. So bleibt nachvollziehbar, welches Original verwendet wurde.

Beispiel:

```json
{
  "assetId": "VAH-A1B2C3D4",
  "usage": "Reel Szene 4",
  "project": "KI-Kanal"
}
```

## 10. Archivierung

Assets werden archiviert, wenn:

- Lizenz abgelaufen ist
- Qualität nicht mehr genügt
- eine bessere Version vorhanden ist
- Quelle oder Rechte nicht mehr nachvollziehbar sind
- das Asset aus Datenschutzgründen nicht weiter genutzt werden darf

Archivierte Assets bleiben im Katalog, damit frühere Produktionen nachvollziehbar bleiben.
