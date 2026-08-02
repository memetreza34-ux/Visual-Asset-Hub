# Benennungsstandard

Jede Datei erhält einen verständlichen, stabilen und plattformunabhängigen Namen.

## Format

```text
{type-prefix}-{category}-{subject}-{action}-{shot}-{orientation}-{sequence}.{extension}
```

Beispiel:

```text
brl-technology-ai-smartphone-scrolling-cu-vertical-0001.mp4
```

## Regeln

- ausschließlich Kleinbuchstaben
- Wörter mit Bindestrichen trennen
- keine Leerzeichen, Umlaute oder Sonderzeichen
- keine generischen Namen wie `video1`, `final`, `neu` oder `bild-test`
- Sequenz immer vierstellig: `0001`, `0002`, `0003`
- Dateiendung bleibt unverändert
- Dateiname wird nach Freigabe nicht mehr geändert; die stabile Asset-ID bleibt zusätzlich erhalten

## Typ-Präfixe

| Typ | Präfix | Beispiel |
|---|---|---|
| B-Roll / Video | `brl` | `brl-business-work-laptop-typing-cu-horizontal-0001.mp4` |
| Bild | `img` | `img-money-finance-coins-stacking-cu-square-0001.jpg` |
| Animation | `ani` | `ani-science-engineering-electric-current-flow-ms-horizontal-0001.mp4` |
| Overlay | `ovl` | `ovl-social-media-creator-notification-pop-up-transparent-0001.webm` |
| Screen-Recording | `scr` | `scr-ui-apps-dashboard-navigation-screen-horizontal-0001.mp4` |
| Grafik | `gfx` | `gfx-education-learning-process-explaining-not-applicable-horizontal-0001.svg` |
| Icon | `ico` | `ico-technology-ai-robot-static-not-applicable-square-0001.svg` |
| Mockup | `mck` | `mck-objects-products-phone-showcase-cu-portrait-0001.png` |

## Pflichtbestandteile

### Kategorie

Nur eine Hauptkategorie aus `catalog/taxonomy.json` verwenden.

### Motiv

Das sichtbar wichtigste Objekt oder Thema:

```text
smartphone
worker
cash
train
solar-panel
brain
```

### Handlung

Die sichtbare Aktion oder Funktion:

```text
scrolling
typing
counting
running
charging
explaining
static
```

### Kameraeinstellung

Beispiele:

- `ecu` – extreme close-up
- `cu` – close-up
- `ms` – medium shot
- `ls` – long shot
- `top-down`
- `pov`
- `screen`
- `not-applicable`

### Ausrichtung

- `vertical`
- `horizontal`
- `square`
- `portrait`
- `landscape`
- `transparent`
- `mixed`

## Varianten

Varianten derselben Aufnahme bekommen unterschiedliche Sequenzen und dieselbe logische Beschreibung:

```text
brl-health-fitness-runner-running-ls-horizontal-0001.mp4
brl-health-fitness-runner-running-ls-horizontal-0002.mp4
brl-health-fitness-runner-running-cu-vertical-0003.mp4
```

## Verbotene Informationen im Dateinamen

Nicht in Dateinamen schreiben:

- Kundennamen
- private Namen
- Zugangsdaten
- interne Freigabelinks
- Lizenzschlüssel
- personenbezogene Informationen

Diese Angaben gehören, soweit überhaupt nötig, ausschließlich in kontrollierte Metadaten.
