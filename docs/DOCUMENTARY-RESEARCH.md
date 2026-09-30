# Documentary Research Workflow

Ziel: faceless YouTube-Dokumentationen/Listicles mit echten, relevanten Visuals statt generischer Stock-B-Roll oder langen Dashboard-Szenen.

## Grundregel

Das Material wird in Phase 1 recherchiert. Das Skript wird so geschrieben, dass klar ist, was tatsächlich gezeigt werden kann. Phase 3 sucht nicht erneut kreativ nach beliebigen Visuals.

Priorität:

1. exaktes Original-/Ereignismaterial
2. Archivmaterial
3. Originaldokumente, Screenshots, Karten und Presse-/Behördenmaterial
4. sehr spezifische B-Roll
5. erklärende Grafik/Animation
6. generischer Stock nur als letzter Fallback

## Kostenlose Quellen

### Wikimedia Commons

Provider: `wikimedia`

- Bilder und Videos
- kein API-Key
- Lizenzinformationen werden pro Datei übernommen
- Public Domain/CC0 kann direkt freigegeben werden
- CC BY/BY-SA braucht Attribution
- unklare/restriktive Rechte bleiben im Review

### Internet Archive

Provider: `internet-archive`

- historische Videos, Filme, Bilder und Sammlungen
- kein API-Key
- jedes Item kann andere Rechte haben
- nur klar als Public Domain oder passend lizenziertes Material wird automatisch als nutzbar vorgeschlagen
- fehlende/unklare Rechte bleiben `review/internal-only`

### Openverse

Provider: `openverse`

- offene Bilder
- kein API-Key für die aktuelle Basissuche
- Lizenzbedingungen bleiben erhalten

### Pexels / Pixabay

Nur Fallback-B-Roll. Sie sollen die Bildwelt einer Story-Doku nicht bestimmen.

- Pexels: optional `PEXELS_API_KEY`
- Pixabay: optional `PIXABAY_API_KEY`

## Doku-Recherche über mehrere Quellen

```bash
npm run documentary:research -- "Concorde crash Air France 4590" --type video
npm run documentary:research -- "Theranos Elizabeth Holmes" --type image
```

Standard:

- Video: Wikimedia Commons + Internet Archive
- Bild: Wikimedia Commons + Internet Archive + Openverse
- Stock ist ausgeschaltet

Stock nur explizit ergänzen:

```bash
npm run documentary:research -- "warehouse accident" --type video --include-stock true
```

Der erzeugte Score ist nur ein Recherche-Score. Er beweist nicht, dass ein Asset exakt das behauptete Ereignis zeigt. Ein konkreter Ereignis-Match muss in Phase 1 geprüft werden.

## Einzelne Quelle

```bash
npm run source:search -- "Apollo 11" --provider wikimedia --type image
npm run source:search -- "historic factory accident" --provider internet-archive --type video
npm run source:grab -- "Apollo 11" --provider wikimedia --type image --pick 1
```

Downloads landen weiterhin in der normalen Inbox und durchlaufen Review, Medienanalyse und Rechteprüfung.

## YouTube-Referenzvideos analysieren

Referenzvideos dienen zur Analyse von Struktur, Kapiteln, Timing und Sprechertext. Sie werden nicht automatisch als Produktionsmaterial übernommen.

Kostenlos mit `yt-dlp`:

```bash
npm run reference:inspect -- "https://youtu.be/VIDEO_ID"
```

Der Befehl:

- lädt kein Referenzvideo herunter
- liest Metadaten, Dauer, Kanal, Kapitel und Thumbnail-URL
- speichert verfügbare Untertitel/Auto-Captions für Struktur-/Timinganalyse
- markiert `mediaDownloaded: false` und `autoReuseAllowed: false`

Lokale Installation von `yt-dlp`, falls nötig:

```bash
brew install yt-dlp
```

oder

```bash
pipx install yt-dlp
```

Kein API-Key nötig.

## Produktionsphasen

### Phase 1 – Story + Material + Skript

Für jeden Fall/Abschnitt:

- Faktenquellen sammeln
- originales/archiviertes Material suchen
- prüfen, was wirklich das konkrete Ereignis zeigt
- Rechte prüfen
- Visual-Coverage sicherstellen
- erst dann Sprechertext und Visual-Beats finalisieren

Ein guter Sprecherabschnitt darf mehrere Visuals besitzen. Ziel sind meist 4–7 Sekunden pro normalem Visual und 1,5–4 Sekunden für kurze Inserts.

### Phase 2 – Nutzer-Voiceover

Nur die finale vom Nutzer gelieferte MP3/WAV/M4A/AAC/FLAC wird als Master-Audio akzeptiert. Die Pipeline erzeugt oder ersetzt keine Stimme.

### Phase 3 – Timing + Assembly

- echte Voiceover-Datei analysieren
- Satz-/Beat-Zeiten bestimmen
- nur Phase-1-Visuals einsetzen
- Originalclips trimmen
- vertikale Clips bei Bedarf mit 16:9 Blur-/Background-Fill darstellen
- Zoom/Pan/Crop/Highlights ergänzen

Keine neue planlose B-Roll-Suche.

### Phase 4 – Remotion

Remotion ist Schnitt-/Motion-Schicht:

- Sequencing
- Zoom/Pan
- leichte Übergänge
- Blur Sidefill
- Karten/Grafiken
- Text nur dort, wo er die Story unterstützt
- SFX-Timing
- finaler MP4-Render

Remotion soll nicht jede Szene in eine schwarze Dashboard-Karte verwandeln.

## Rechte-Gate

`restricted` und `unknown` bleiben im Review. Sie dürfen nicht automatisch als für YouTube freigegeben gelten.

YouTube oder andere fremde Plattformen werden nicht als automatische Clip-Quelle behandelt, nur weil ein Download technisch möglich wäre. Wiederverwendung braucht eine passende Rechtsgrundlage oder ausdrückliche Erlaubnis.
