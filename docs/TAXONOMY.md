# Kategorien und Tags

Die Hauptkategorie beschreibt den wichtigsten Einsatzzweck eines Assets. Zusätzliche Themen werden über `secondaryCategories`, `tags` und `searchAliases` abgebildet.

## Hauptkategorien

| Kategorie | Typische Inhalte |
|---|---|
| `people-lifestyle` | Alltag, Familie, Freunde, Routinen |
| `business-work` | Büro, Meetings, Handwerk, Arbeitssituationen |
| `technology-ai` | KI, Computer, Smartphones, Robotik, Daten |
| `money-finance` | Geld, Börse, Banken, Sparen, Investitionen |
| `education-learning` | Schule, Lernen, Bücher, Erklärgrafiken |
| `health-fitness` | Sport, Medizin, Ernährung, Regeneration |
| `food-drink` | Kochen, Zutaten, Getränke, Restaurants |
| `travel-places` | Städte, Länder, Sehenswürdigkeiten, Hotels |
| `nature-environment` | Wald, Wetter, Tiere, Nachhaltigkeit |
| `industry-trades` | Baustellen, Werkzeuge, Produktion, Elektrotechnik |
| `vehicles-transport` | Auto, Bahn, Flugzeug, Fahrrad, Logistik |
| `home-architecture` | Wohnungen, Häuser, Räume, Einrichtung |
| `social-media-creator` | Creator, Kameras, Likes, Plattformen |
| `objects-products` | Produkte, Verpackungen, einzelne Gegenstände |
| `news-events` | Presse, Veranstaltungen, aktuelle Ereignisse |
| `emotions-reactions` | Freude, Angst, Überraschung, Stress |
| `abstract-backgrounds` | Partikel, Texturen, Licht, abstrakte Flächen |
| `ui-apps` | Dashboards, App-Screens, Webseiten, Interaktionen |
| `science-engineering` | Physik, Chemie, Maschinen, technische Prozesse |
| `culture-entertainment` | Musik, Film, Gaming, Kunst, Freizeit |

## Tag-Regeln

Tags werden immer als englische, kleingeschriebene Slugs gespeichert:

```text
artificial-intelligence
smartphone
scrolling
blue-light
close-up
```

Regeln:

- mindestens zwei Tags pro Asset
- keine doppelten Tags
- keine Sätze
- keine Hashtags
- Singular bevorzugen
- Synonyme nicht als Haupttag duplizieren; dafür `searchAliases` verwenden
- nur sichtbare oder eindeutig nutzbare Eigenschaften taggen

## Such-Aliasse

`searchAliases` verbessern die Suche in Deutsch und Englisch, ohne die kontrollierte Tagliste zu verwässern.

Beispiel:

```json
{
  "tags": ["smartphone", "scrolling", "social-media"],
  "searchAliases": ["Handy", "am Handy scrollen", "phone scrolling"]
}
```

## Mehrere Themen

Ein Asset erhält nur eine Hauptkategorie. Weitere passende Bereiche werden als Sekundärkategorien gespeichert.

Beispiel: Eine Person prüft Aktienkurse auf dem Smartphone.

```json
{
  "category": "money-finance",
  "secondaryCategories": ["technology-ai", "people-lifestyle"]
}
```

## Qualitätsbewertung

- `1` – technisch schwach, nur intern
- `2` – eingeschränkt nutzbar
- `3` – solide Standardqualität
- `4` – hochwertig und vielseitig
- `5` – Hero-Asset, besonders stark

Die Bewertung beschreibt die technische und kreative Nutzbarkeit, nicht die Lizenz.
