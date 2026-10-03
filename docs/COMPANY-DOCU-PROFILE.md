# Company Documentary Profile

Dieses Profil definiert die inhaltliche Richtung für Firmen-/Wirtschaftsdokus im Visual Asset Hub.

## Kern des Kanals

Der Kanal behandelt **konkrete Unternehmen, Marken, Geschäftsmodelle, wirtschaftliche Konflikte und Firmenprozesse**.

Bevorzugte Themen:

- Aufstieg und Absturz von Firmen
- Warum eine Marke Marktanteile verliert oder gewinnt
- Geschäftsmodelle hinter bekannten Marken
- Firmenkriege und Konkurrenz
- Fehlentscheidungen, Strategiewechsel und gescheiterte Produkte
- Übernahmen, Milliardeninvestitionen und Kostensenkungsprogramme
- Fabriken, Lieferketten und Produktionsentscheidungen
- Wie ein Unternehmen tatsächlich Geld verdient

Nicht als Kernformat gedacht:

- beliebige Alltagserklärungen ohne klaren Firmen-/Wirtschaftsbezug
- Themen nur deshalb, weil sich leicht KI-Bilder erzeugen lassen
- generische Wissenslisten ohne Story, Konflikt oder wirtschaftliche Konsequenz

## Editorial Gate

Ein Thema ist stark, wenn mindestens zwei dieser Punkte vorhanden sind:

1. bekannte Firma oder Marke
2. klarer Konflikt / Wendepunkt
3. belastbare Kennzahlen
4. echte Konkurrenz oder Marktverschiebung
5. konkrete Management-/Produktentscheidung
6. sichtbarer Geschäftsprozess
7. Konsequenz für Kunden, Mitarbeiter, Anleger oder Markt

## Visual Gate: Real first, AI second

Bei Firmen-Dokus gilt **nicht** pauschal „Generate first, search second“.

### Reales Material ist Pflicht oder erste Wahl bei

- echten Firmen und Logos
- konkreten Produkten oder Fahrzeugmodellen
- Vorständen und realen Personen
- echten Werken, Standorten und Händlern
- Originaldokumenten, Webseiten und Geschäftsberichten
- aktuellen oder historischen Ereignissen
- exakten Zahlen, Tabellen und Charts

Ein generisches KI-Auto darf beispielsweise **nicht** als Mercedes-Modell ausgegeben werden.

### KI ist sinnvoll bei

- abstrakten Zusammenhängen
- symbolischen Übergängen
- neutralen Rekonstruktionen
- generischen Markt-/Wettbewerbssituationen
- Prozessbildern, die keinen konkreten Beleg vortäuschen

## Harte Final-Video-Regel

Im finalen Video sind als **Primärvisual ausschließlich** erlaubt:

- echte Bilder
- echte B-Roll / echtes Videomaterial
- akzeptierte KI-Bilder

Nicht erlaubt sind:

- `REAL SOURCE ASSET`-Karten
- Slot-/Bildnummer-Karten
- Produktionsnotizen
- Debug-Frames
- Missing-Asset-Platzhalter
- Texttafeln, die nur erklären, welches Material dort später hin soll
- technische Vollbildkarten aus dem Produktionsplan

Wenn ein echtes Bild oder B-Roll fehlt, wird **nicht** mit einer Platzhalterkarte weitergerendert. Der Render muss stoppen, bis ein passendes visuelles Asset vorhanden ist.

### Zahlen und Charts

Kennzahlen dürfen gezeigt werden, aber nicht als sterile technische Produktionskarte. Wenn eine Zahl wichtig ist:

- Primärvisual bleibt ein passendes echtes Bild, echte B-Roll oder ein akzeptiertes KI-Bild.
- Die verifizierte Zahl wird als kurze, saubere Overlay-Grafik darübergelegt.
- Keine internen Quellenhinweise, Slotnummern oder Produktionskommentare im sichtbaren Bild.

Beispiel:

```text
Mercedes-Werk / Fahrzeug-B-Roll
+
kurzes Overlay: „China 2025: -19 %“
```

Nicht:

```text
schwarze Karte
REAL SOURCE ASSET / B-ROLL
BILD 06 — CHINA...
```

## Cover

1. immer drei Cover A/B/C
2. gleicher exakter Covertext
3. gleiche Kernidee / Bildwelt
4. Nutzer wählt einen Gewinner
5. bei konkreter Marke oder Produkt muss eine echte Referenz als Ingredient/Source dienen
6. das gewählte Cover wird weiche Stilreferenz, aber Folgebilder bleiben individuell

## Tonalität

Starke Titel sind erlaubt, aber die Aussage muss durch Fakten gedeckt sein. Bei einer Firma, die unter Druck steht, aber weiterhin profitabel und relevant ist, wird nicht ohne Beleg „Firmenkollaps“ oder „pleite“ behauptet.

Maschinenlesbare Version: `profiles/company-documentary.json`.
