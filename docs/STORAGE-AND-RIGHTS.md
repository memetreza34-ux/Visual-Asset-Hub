# Speicherung und Nutzungsrechte

## Speicherstrategie

Visual Asset Hub unterstützt drei Speicherarten:

### Repository

Für kleine SVGs, Icons, Metadaten und sehr leichte Vorschauen.

```json
{
  "kind": "repository",
  "path": "assets/icon/technology-ai/ico-technology-ai-robot-static-not-applicable-square-0001.svg"
}
```

### Git LFS

Für ausgewählte größere Binärdateien, wenn Speicher- und Bandbreitenlimits bekannt und ausreichend sind.

```json
{
  "kind": "git-lfs",
  "path": "assets/video/business-work/brl-business-work-laptop-typing-cu-horizontal-0001.mp4"
}
```

### Externer Object Storage

Empfohlen für eine große Bibliothek. Geeignet sind beispielsweise S3-kompatibler Storage, Cloudflare R2 oder Supabase Storage. Im öffentlichen Katalog dürfen keine privaten, dauerhaft gültigen Download-Tokens stehen.

```json
{
  "kind": "external",
  "externalUrl": "https://media.example.com/assets/VAH-A1B2C3D4",
  "previewPath": "previews/VAH-A1B2C3D4.webp"
}
```

## Grundregeln

- Originale und Vorschauen getrennt speichern
- stabile Asset-ID als Verbindung verwenden
- keine temporären Signed URLs in Git speichern
- keine Zugangsdaten in JSON-Dateien eintragen
- Backups unabhängig vom Repository betreiben
- große Originaldateien nicht versehentlich direkt über normales Git committen

## Lizenzstatus

| Status | Bedeutung |
|---|---|
| `owned` | selbst erstellt oder vollständig im Besitz |
| `licensed` | konkrete Lizenz oder bezahltes Nutzungsrecht vorhanden |
| `public-domain` | nachweislich gemeinfrei |
| `cc0` | CC0-Freigabe nachvollziehbar |
| `cc-by` | Nutzung mit vorgeschriebener Namensnennung |
| `editorial-only` | nur redaktionelle Nutzung |
| `restricted` | besondere Einschränkungen |
| `unknown` | ungeklärt, keine Veröffentlichung |

## Freigaberegel

`approved` ist nur erlaubt, wenn:

- der Lizenzstatus nicht `unknown` ist
- die Quelle dokumentiert ist
- mindestens ein Nutzungsbereich erlaubt ist
- eine notwendige Attribution vollständig hinterlegt ist
- ein Ablaufdatum noch nicht überschritten ist

## Nutzungsbereiche

Rechte werden nicht pauschal angenommen. Mögliche Bereiche:

- `organic-social`
- `paid-ads`
- `youtube`
- `website`
- `app`
- `presentation`
- `client-work`
- `editorial`
- `internal-only`

Ein Asset, das nur `editorial` erlaubt, darf nicht automatisch in Werbung oder Kundenprojekten eingesetzt werden.

## Quellenbelege

Bei externen Assets möglichst speichern:

- ursprüngliche Plattform oder Urheber
- konkrete Quellseite
- Lizenzseite oder Kaufbeleg-Referenz
- Abruf- oder Kaufdatum
- notwendiger Attributionstext
- Ablaufdatum oder Projektbeschränkung

Vertrauliche Rechnungen und Lizenzdokumente gehören nicht in ein öffentliches Repository. Der Katalog kann stattdessen eine interne Beleg-ID enthalten.

## Personen und Marken

Bei erkennbaren Personen, privaten Räumen, Kennzeichen, Logos oder geschützten Produkten zusätzlich prüfen:

- Model Release
- Property Release
- Marken- und Werbenutzung
- redaktionelle Beschränkungen
- Datenschutz und Einwilligung

Die reine technische Verfügbarkeit einer Datei bedeutet keine rechtliche Freigabe.
