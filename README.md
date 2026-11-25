# sensorlab

Sensorsimulator in de browser voor het vak **Autonome mobiliteit en AI** (VIVES, Autotechnologie).
Studenten ervaren hier de mogelijkheden en beperkingen van autosensoren in een 3D-wereld, vóór of naast het labo met de echte sensoren (ifm CR0451-display).

Sensoren in dezelfde 3D-wereld (straat, snelweg, erf en akker), met rijden en van rijstrook wisselen:

- **Lidar**: apart puntenwolkvenster, 1–128 lagen, kalibratiefouten, echokeuze, weer, web workers. 15 experimenten.
- **Radar 77 GHz**: radarbeeld met Doppler, RCS, hoek-/afstands-/snelheidsresolutie, stilstandfilter (ACC), spookdoelen via de vangrail, vuile radarkap. 7 experimenten.

Ultrasoon, camera, GNSS en IMU volgen als modules in dezelfde wereld. Elk venster (3D-wereld, puntenwolk, radarbeeld) kan je bovenaan aan- of uitzetten.

## Gebruik

| Bestand | Waarvoor |
|---|---|
| `dist/sensorlab.html` | **Offline, alles inline** (±580 kB). Uploaden in Toledo (Inhoudsverzameling) of dubbelklikken. Laadt niets extern. |
| `dist/sensorlab-cdn.html` | Kleine versie die three.js van jsDelivr laadt. Bedoeld voor het claude.ai-artifact. |

## Ontwikkelen

```bash
npm install
npm run build     # src/ → dist/
npm run lint      # eslint: vergeten imports / niet-gedeclareerde namen
npm test          # lint + build + headless rooktest (Chrome nodig, pad via CHROME=...)
```

## Structuur

```
src/
  index.html            HTML-skelet (placeholders voor CSS, fonts, script)
  main.js               startpunt (ES-modules)
  core/                 gedeeld: toestand, wereld, wagen, 3D-scene, weer, camera, UI, experimenten-engine, lus
  worlds/               street.js, highway.js, farm.js — objecten + wegmarkering per wereld
  sensors/
    lidar/              index.js (sensor-interface), presets, model, scan, puntenwolk, puntenwolkvenster, 3D-montage, UI, meetwaarden, experimenten
    radar/              index.js, model (RCS/R⁴, resolutie, Doppler, multipath), rcs-tabel, venster, meetwaarden, experimenten
    ultrasonic/ camera/ gnss/ imu/   gepland
  workers/              gepland: raycast-worker
build.mjs               esbuild → dist/
tests/smoke.mjs         headless test: werelden, experimenten, worker = main thread, radaruitspraken, geen consolefouten
tests/probe-radar.mjs   ontwikkelhulp: wat zien radar en lidar in een scenario
```

Architectuur, beslissingen en valkuilen staan in [CLAUDE.md](CLAUDE.md).
