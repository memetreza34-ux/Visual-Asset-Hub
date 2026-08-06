# Reel- und Skript-Planer

Der Skript-Planer ordnet einen deutschen Sprechtext automatisch den 90 Kanal-Sammlungen und dem vorhandenen Asset-Katalog zu.

## Datenschutz

- Der eingegebene Text bleibt im Browser.
- Es wird keine externe KI-API aufgerufen.
- Der Text wird nicht an Pexels gesendet.
- Der Text wird nicht automatisch gespeichert.
- Erst ein bewusst ausgelöster Export erzeugt eine lokale Datei.

## Unterstützte Kanäle

- Finanzen
- Künstliche Intelligenz
- Elektrotechnik
- Kampfsport

Das Lexikon enthält deutsche und englische Fachbegriffe, Synonyme und umgangssprachliche Varianten. Beispiele:

- `ETF`, `Aktienkurs`, `Inflation`, `Gehalt`, `Schulden`
- `Chatbot`, `Roboter`, `Automatisierung`, `neuronales Netz`
- `RCD`, `FI-Schalter`, `Schütz`, `SPS`, `Isolationsmessung`
- `Boxsack`, `Sparring`, `Takedown`, `Staredown`, `Knockout`

## Browser-Ablauf

1. Visual Asset Hub lokal starten.
2. Navigation **Skript planen** öffnen.
3. Kanal auswählen.
4. Reel/Short, YouTube oder Präsentation auswählen.
5. Zieldauer eintragen.
6. Sprechtext einfügen.
7. Optional **Nur freigegebene Assets** aktivieren.
8. **Shotlist erstellen** drücken.

Der Planer erstellt:

- automatische Szenenaufteilung
- Start-, Ende- und Dauerwerte
- empfohlenen Medientyp
- bis zu drei passende Sammlungen
- bis zu drei passende Assets pro Szene
- Status- und Lizenzwarnungen
- Pexels-Suchbegriff für fehlende Motive
- Bibliotheks- und Freigabeabdeckung in Prozent

## Direkte Aktionen

### In Bibliothek öffnen

Filtert die Hauptbibliothek auf die Asset-ID.

### Favorit

Übernimmt den Vorschlag in die vorhandene Projektauswahl. Freigegebene Favoriten können anschließend als verifiziertes Medienpaket ausgegeben werden.

### Motiv suchen

Stellt den Pexels Arsenal Builder automatisch auf den erkannten Kanal und die passende Sammlung ein.

## Browser-Exporte

- JSON für Automatisierung und Weiterverarbeitung
- CSV für Tabellen und Produktionsplanung
- Markdown als lesbare Shotlist

## Kommandozeilen-Export

Ein Skript aus einer Textdatei planen:

```bash
npm run script:plan -- \
  --channel finance \
  --file ./mein-finanz-reel.txt \
  --duration 45 \
  --orientation vertical
```

Nur freigegebene Assets verwenden:

```bash
npm run script:plan -- \
  --channel electro \
  --file ./rcd-reel.txt \
  --duration 35 \
  --approved-only true
```

Ausgabeordner:

```text
reports/shot-plans/<projekt>-<zeitstempel>/
├── shotlist.json
├── shotlist.csv
├── shotlist.md
├── shotlist.srt
└── script.txt
```

Die SRT-Datei enthält neben den Zeitbereichen den Sprechtext und die primäre Asset-ID oder den empfohlenen Pexels-Suchbegriff. Sie ist als sichtbare Marker-/Referenzspur für Schnittprogramme gedacht, nicht als fertige Untertiteldatei für die Veröffentlichung.

## Matching-Regeln

Die Bewertung berücksichtigt:

1. direkte Fachbegriffe und Synonyme
2. Kanal- und Sammlungs-Tags
3. Titel, Beschreibung und Suchaliasse
4. gewünschte Ausrichtung
5. Asset-Status
6. Qualitätsbewertung
7. vorhandene Freigabe

Ein Review-Asset kann vorgeschlagen werden, erhält aber eine deutliche Warnung. Im Modus **Nur freigegebene Assets** wird es vollständig ausgeschlossen.

## Grenzen

- Der Planer versteht Motive und Fachbegriffe, aber keine vollständige menschliche Dramaturgie.
- Vorschläge ersetzen keine Sichtprüfung.
- Eine Asset-Freigabe ersetzt keine Prüfung des konkreten Veröffentlichungskontexts.
- Originale UFC-, Broadcast- oder Eventausschnitte bleiben ohne belegte Rechte ausgeschlossen.

## Realtest-Beispiele

### Finanzen

```text
Viele Menschen sparen jeden Monat, investieren ihr Geld aber nie.
Durch Inflation verliert Bargeld langfristig an Kaufkraft.
Ein ETF-Sparplan kann das Risiko breit verteilen.
```

Erwartete Sammlungen: Budget & Sparen, Inflation & Lebenshaltungskosten, Aktien & Investieren.

### KI

```text
Chatbots beantworten Kundenfragen.
Automatisierungen übernehmen wiederkehrende Aufgaben.
Entwickler arbeiten mit KI-Assistenten und Code.
```

Erwartete Sammlungen: Chatbots & Assistenten, Automatisierung & Workflows, Coding & Entwicklung.

### Elektrotechnik

```text
Vor der Arbeit wird die Anlage sicher freigeschaltet.
Danach prüft die Elektrofachkraft die Spannungsfreiheit.
RCD und Leitungsschutzschalter haben unterschiedliche Schutzaufgaben.
```

Erwartete Sammlungen: Arbeitssicherheit & PSA, Prüfen & Messen, LS/RCD & Schutzgeräte.

### Kampfsport

```text
Am Boxsack trainiert der Boxer Kombinationen.
Im Sparring verbessert er Timing und Distanz.
Regeneration entscheidet über die langfristige Leistung.
```

Erwartete Sammlungen: Boxsack, Sparring, Mobilität & Regeneration.
