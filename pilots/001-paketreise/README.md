# Pilot 001 — Paketreise

## Thema

**Titel:** Was passiert mit deinem Paket nach dem Klick auf Bestellen?  
**Cover-Text:** `SO REIST DEIN PAKET`  
**Ziel:** maximal ca. 2 Minuten  
**Format:** 16:9  
**Bilddichte:** `maxWordsPerBeat = 10`

## Warum dieses Thema?

Der Pilot testet die aktuelle AI-first-Pipeline mit einer sinnvollen Mischung aus:

- individuellen KI-Bildern für digitale Auftragsverarbeitung, Lagerlogik, Verpackung, Scanner-Entscheidungen und Zustellablauf
- echten Bewegungs-B-Rolls für Fließband, Lastwagen, Zustellfahrzeug und Verkehr
- keinem Bedarf an historischen Spezialarchiven oder markenspezifischen Originalbelegen

## Produktionsziel

```text
script.txt
→ visual:plan
→ pilot-readiness
→ Flow Production V3
→ 3 Cover A/B/C
→ STOP + Nutzerauswahl
→ gewähltes Cover als Referenz
→ Bild 02–NN
→ real:integrate
→ flow:import
→ video:manifest
```

## Cover-Richtung

Alle drei Cover müssen dieselbe Kernidee zeigen: **ein einzelnes Paket auf seiner unsichtbaren Reise durch Sortierung und Zustellung**.

Beibehalten:

- gleiche dokumentarisch-realistische Bildwelt
- gleiche Grundfarbfamilie
- glaubwürdiges Lager-/Logistikumfeld
- ein dominantes Paket als Hauptmotiv
- exakter Text `SO REIST DEIN PAKET`

Variieren:

- Kameraabstand
- Position des Pakets
- Anteil von Sortieranlage / Zustellfahrzeug im Hintergrund
- Negativraum für den Cover-Text

Keine drei völlig unterschiedlichen Art Directions.

## Automatischer Testlauf

Der Branch `pilot/001-paketreise` besitzt einen eigenen Push-Workflow. Er erzeugt:

- `visual-plan.json`
- `scene-cards.json`
- `ai-generation-queue.json`
- `real-material-queue.json`
- `flow/google-flow-master-prompt.txt`
- `flow/flow-production-plan.json`
- `flow/flow-generation-queue.json`
- `flow/pilot-readiness.json`
- nach Möglichkeit echte Pexels-B-Rolls + `remotion-real-media.json`
- `pilot-run-summary.json`

Erst wenn das Pilot-Gate grün ist, gehen wir in Google Flow.
