# sensorlab

Sensorsimulator in de browser voor het vak **Autonome mobiliteit en AI** (VIVES, Autotechnologie).
Studenten ervaren hier de mogelijkheden en beperkingen van autosensoren in een 3D-wereld, vóór of naast het labo met de echte sensoren (ifm CR0451-display).

Momenteel zit enkel de **lidar** in de simulator: drie werelden (straat, snelweg, erf en akker), rijden en van rijstrook wisselen, een apart puntenwolkvenster, kalibratiefouten, weer en 15 experimenten. Radar, ultrasoon, camera, GNSS en IMU volgen later als modules in dezelfde wereld.

## Gebruik

| Bestand | Waarvoor |
|---|---|
| `dist/sensorlab.html` | **Offline, alles inline** (±580 kB). Uploaden in Toledo (Inhoudsverzameling) of dubbelklikken. Laadt niets extern. |
| `dist/sensorlab-cdn.html` | Kleine versie die three.js van jsDelivr laadt. Bedoeld voor het claude.ai-artifact. |

## Ontwikkelen

```bash
npm install
npm run build     # src/ → dist/
npm test          # build + headless rooktest (Chrome nodig, pad via CHROME=...)
```

## Structuur

```
src/
  index.html            HTML-skelet (placeholders voor CSS, fonts, script)
  order.json            volgorde waarin de bronbestanden samengevoegd worden
  core/                 gedeeld: toestand, wereld, wagen, 3D-scene, weer, camera, UI, experimenten-engine, lus
  worlds/               street.js, highway.js, farm.js — objecten + wegmarkering per wereld
  sensors/
    lidar/              presets, model, scan, puntenwolk, puntenwolkvenster, 3D-montage, UI, meetwaarden, experimenten
    radar/ ultrasonic/ camera/ gnss/ imu/   gepland
  workers/              gepland: raycast-worker
build.mjs               esbuild → dist/
tests/smoke.mjs         headless test: elke wereld en elk experiment levert punten, geen consolefouten
```

Architectuur, beslissingen en valkuilen staan in [CLAUDE.md](CLAUDE.md).
