# CLAUDE.md — sensorlab

Sensorsimulator voor het vak Autonome mobiliteit en AI (VIVES, start voorjaar 2027). Eigenaar: Nobel (GitHub JeremyLebon). Taal van UI, commentaar en commits: **Nederlands** (Vlaams), decimale komma in de UI.

## Harde randvoorwaarden

- **Eén zelfstandige HTML** als eindproduct (`dist/sensorlab.html`). Toledo (Blackboard Ultra) en `file://` laden niets extern: geen CDN, geen fonts, geen aparte worker- of JSON-bestanden. Alles wordt in de build inline gezet. De rooktest faalt bij elke externe request.
- **Puntenwolk synchroon met de 3D-wereld.** Elke vertraging valt studenten meteen op. Rekenbudget ±14 ms per frame (zie `sweepStep`).
- **Schuifbalken altijd zichtbaar** (overlayscrollbars van Windows/macOS en het Toledo-venster verbergen ze). CSS staat in `core/style.css`. Niet verwijderen.
- **3D-weergave met een mooie personenwagen**, geen 2D-schema's. Het puntenwolkvenster blijft een aparte renderer.
- **Cursusmateriaal**: elke opdracht in een experiment gebruikt enkel wat vooraf uitgelegd is.

## Architectuur (stap 2: ES-modules + sensor-interface)

Echte ES-modules met `import`/`export`. Startpunt `src/main.js` → `core/loop.js` (`start()`). `build.mjs` bundelt met esbuild:
offline als IIFE met three inline, en een CDN-versie (ESM, three extern via een importmap).

**Regels voor gedeelde toestand**
- Een geëxporteerde `let` (bv. `W` in `core/world.js`, `ptsGeo` in `pointcloud.js`, `PB`/`STAT`/`effHz` in `scan.js`, `view` in `camera.js`, `pcvView` in `pcview.js`) wordt **enkel in zijn eigen module toegewezen**. Importeurs lezen hem live. Moet een andere module iets wijzigen, dan via een functie (bv. `resizePoints`, `camSync`).
- Vlaggen die meerdere modules schrijven staan in `F` (`core/state.js`): `F.dirty` (volledige scan nodig), `F.worldDirty` (wereld herbouwen), `F.pendingCam` (cameraweergave toepassen in het volgende frame), `F.driving`.
- Hooks zonder circulaire afhankelijkheid: `onPrims` (world → lidar-hoekvakken), `pointUsers`/`pointMats` (pointcloud → puntenwolkvenster).
- Circulaire imports bestaan (bv. `scan` ↔ `pointcloud`, `ui` ↔ `experiments`). Ze werken zolang **top-level code** enkel modules gebruikt die al geëvalueerd zijn. Gebruik over de grens heen enkel binnen functies. Na elke wijziging: `npm test`, want een TDZ-fout verschijnt pas in de browser.
- `npm run lint` (eslint, `no-undef`) vangt vergeten imports, ook in event-handlers die de rooktest niet raakt.

**Sensoren en toestand (stap 2b)**
- `S` (`core/state.js`) bevat enkel wereld, weer en voertuig. Elke sensor heeft een eigen toestand in `sensors/<id>/state.js` (lidar: `L`, met `LBASE` als standaard).
- Register: `core/sensors.js` (`SENSORS`, `SMAP`). **Een sensor-module importeert nooit** `core/ui`, `camera`, `layout`, `experiments`, `loop` of `sensors` (anders een cyclus bij het laden). Core spreekt de sensor enkel via de interface aan.
- UI: de sleutels in `params` staan zonder prefix. `core/ui.js` zet er `<id>.` voor (bv. `lidar.err.yaw`); `getK`/`setK` routeren dat naar `sensor.state`.
- Experimenten: `set:{world, ped, speed, rain, objects, …, drive, view, layout, lidar:{preset, color, err, …}}`. `applyState` zet `S` terug op `BASE` en roept daarna `sensor.reset(set[id]||{})` op.
- Let op bij het hernoemen: een lokale variabele met dezelfde naam als een import (bv. `L` = aantal lagen tegenover `L` = lidartoestand) geeft een TDZ-fout. Daarom staat `no-shadow` in eslint.

**Sensor-interface** (`sensors/lidar/index.js`). `core/loop.js` roept per frame `update3d()` → `step(dt, now, force)` → `animate(dt)` → `render(layout)` op:

```js
export default {
  id: 'lidar', label: 'Lidar',
  state,                     // eigen toestand (UI-sleutels "<id>.<key>")
  params, presets, experiments,
  views: [{stage, renderer, camera}],   // eigen vensters; core/layout.js past de grootte aan
  onChange(key) {}, disabled(key) {},   // UI-logica (presets, minimale montagehoogte, uitgeschakelde velden)
  reset(set) {},             // experiment instellen
  eye() {},                  // {x, h}: camerastandpunt "Vanuit sensor"
  init() {}, resetView() {},
  update3d() {}, step(dt, now, force) {}, animate(dt) {}, render(layout) {},
  stats(), bench()
}
```

**Nog lidar-specifiek bij een tweede sensor**
- `src/index.html`: het venster `#pcvStage` en de layoutknoppen ("Enkel puntenwolk") staan vast in de HTML. Die moeten per sensor gegenereerd worden.
- Meettabellen en HUD: `metrics.js` schrijft rechtstreeks in `#hud`, `#objtab` en `#metrics`. Een tweede sensor heeft een eigen sectie nodig, of de HUD combineert de sensoren.
- Ruis door een andere lidar (`S.interf`) staat in de omgeving: dat is bewust zo.

Een nieuwe wereld: `src/worlds/x.js` met `export default {label, build(h){… return W}, isMark(x,y), marks(dashes,solids,W)}`. Toevoegen aan `WORLDS` in `core/world.js`, aan de keuzelijst in `core/ui.js` (`CTRL.env`) en aan `WORLDSTART` in `core/state.js`.

Een nieuwe sensor: map `src/sensors/<id>/` met een `index.js` volgens de interface, en toevoegen aan `SENSORS` in `core/loop.js`.

Wereldcoördinaten: x vooruit, y links, z omhoog (zoals ROS). Three.js gebruikt y omhoog: altijd via `V(x,y,z)`. Het puntenwolkvenster werkt in het voertuigframe (base_link).

## Prestaties

**Web workers (af).**
- `sensors/lidar/rays.js` is de rekenkern: kolommen meten, als zuivere functie zonder three.js of DOM. Hij draait op de main thread én in `sensors/lidar/worker.js`.
- `build.mjs` bundelt de worker apart en biedt hem aan als tekst via de virtuele module `virtual:lidar-worker`. `scan.js` start hem als Blob-URL.
- Pool: `hardwareConcurrency − 1` workers, maximaal 6.
- **Fallback:** geen Worker beschikbaar, een fout bij het aanmaken of een `onerror` (bv. een CSP in Toledo die blob-workers verbiedt) → alles rekent op de main thread.
- Elke kolom heeft een eigen RNG-seed (`seed ^ i·φ`), dus het resultaat hangt niet af van de verdeling. De rooktest controleert straal per straal dat worker en main thread identiek zijn (`debugBuffer`).
- **Generaties:** `gen` stijgt bij een nieuwe buffer of een volledige scan. Resultaten van een oudere generatie worden genegeerd.
- Punten op rijdend verkeer worden bij aankomst verschoven met `v · vertraging`.
- De botsvormen gaan enkel mee naar een worker als ze veranderd zijn (`primVer`). In een dynamische wereld is dat elke scan.
- **Sweep tijdens het rijden:** met workers is het budget `0,9 · dt / rekentijd per kolom` per worker, met maximaal 2 opdrachten per worker in de wachtrij. Zonder workers blijft het ±14 ms per frame.
- **Metingen:** de tabellen komen pas na een volledige scan, als alle resultaten binnen zijn (`scanIdle`).
- Gemeten in de testomgeving (2 kernen, software-rendering, dus 1 worker): bij rijden met 128 lagen van 1 naar 6 van de 10 Hz. Met 16 lagen daalt de frametijd van 50 naar 33 ms. Op een gewone pc met 4–8 kernen is de winst groter.
- De doorlooptijd van één volledige scan in `npm test` is met een worker hoger, want het antwoord wacht op de volgende (trage) frame. De rekentijd per kolom is gelijk.

**Volgende stappen**
1. **GPU-lidar**: de scène vanuit de sensor renderen naar diepte-/ID-texturen (1–2 dagen, 10–100×). Nadeel: enkel het eerste raakpunt. Glas, meerdere echo's en stof vragen een extra pass of een statistische benadering. Herbruikbaar voor de camerasensor.
2. **WebAssembly: niet doen** (1,5–3× op één kern, extra toolchain).

Rekentijd op de main thread per volledige scan (headless Chrome, swiftshader): 16 lagen ±20 ms, 64 lagen ±30–40 ms, 128 lagen ±120–170 ms. `npm test` drukt dit af voor beide modi.

## Model (didactisch vereenvoudigd)

- Objecten zijn verticale prisma's (box, cyl, wall met z0..z1). Botsvormen staan los van de visuele modellen (`vis:false`). Raycast analytisch in 2D met hoogtecontrole. Hoekvakken van 0,5° en culling op bereik.
- Signaal `ρ·T·exp(-2αR)/R²` tegen drempel `0,1/Rmax²`. Grond Lambertiaans `ρ·sin(el)`, markering retroreflecterend, glas 85 % transmissie, dunne draad geschaald met de vlekbedekking, regen/mist/stof als deeltjesecho's met extinctie.
- Roterend + rijden: per frame enkel de doorlopen sector. Zonder deskew geplot vanuit de pose bij het begin van de omwenteling.

## Open punten

- Experimenten nalezen (Nobel).
- Radar als eerste nieuwe sensor (sensorfusie: radar door stof en mist).
- Eventueel: GitHub Pages als alternatief voor uploaden in Toledo; `/points` publiceren via rosbridge; koppeling met het CR0451-labo.
- Bekend klein lay-outpunt: bij smalle 3D-weergave overlapt de knoppenbalk "Camera / Persoon / Hond" de rijknoppen.
