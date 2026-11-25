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

**Sensor-interface** (`sensors/lidar/index.js`). `core/loop.js` roept per frame `update3d()` → `step(dt, now, force)` → `animate(dt)` → `render(vis)` op:

```js
export default {
  id: 'lidar', label: 'Lidar',
  state,                     // eigen toestand (UI-sleutels "<id>.<key>")
  params, presets, experiments,
  views: [{id, label, stage, renderer, camera}],   // eigen vensters; core/layout.js toont ze en past de grootte aan
  onChange(key) {}, disabled(key) {},   // UI-logica (presets, minimale montagehoogte, uitgeschakelde velden)
  reset(set) {},             // experiment instellen
  eye() {},                  // {x, h}: camerastandpunt "Vanuit sensor"
  init() {}, resetView() {},
  update3d() {}, step(dt, now, force) {}, animate(dt) {}, render(vis) {},
  stats(), bench()
}
```

**Vensters, layout en panelen**
- Elke sensor maakt zijn eigen venster aan (een `section.stage.sview` met `data-pane="<view-id>"` in `#viewsBox`) en levert het in `views:[{id, label, stage, renderer, camera}]`.
- `core/layout.js`: `VIS` = set van zichtbare vensters. De knoppen bovenaan zijn schakelaars (minstens één venster blijft zichtbaar). `setLayout([...])` wordt ook door experimenten gebruikt (`set.layout`). `render(vis)` krijgt die set.
- `core/panels.js` maakt per sensor `#meas-<id>` (tabblad Meting) en `#hud-<id>` (HUD-regel); de sensor vult ze in `init()` en `metrics()`.
- Het tabblad Sensor heeft een keuzeknop per sensor. De experimenten zijn per sensor gegroepeerd, de nummering loopt door (lidar 1–15, radar 16–22).

**Radar** (`src/sensors/radar/`, 77 GHz FMCW, didactisch)
- `model.js`: dieptebuffer in vakjes van 0,1°. Afscherming is evenredig met het deel van de verticale bundel dat een object bedekt (stoeprand nauwelijks, gevel volledig, auto op afstand gedeeltelijk). Glas, gewas en een haag hebben een doorlaatbaarheid `T`.
- Signaal `σ·T·exp(−2αR)·kap/R⁴` tegen de drempel `10 m²/Rmax⁴`. Regen: α = 0,0012·regen per meter. Vuile radarkap: tot −15 dB. Mist en stof: geen invloed.
- Compacte objecten: per object stukken van één hoekresolutie breed (dichtste punt, energie opgeteld). Uitgestrekte objecten (muren, vangrail): per vakje, met `rcs` per meter.
- **Resolutie:** de sterkste eerst. Een terugkaatsing smelt samen met een detectie als hoek, afstand én radiale snelheid binnen de resolutie liggen. Er is geen vast celraster meer: dat gaf dubbele detecties op celgrenzen.
- **Doppler:** `vr = (v_obj − v_eigen)·u`. Stilstaand als `|vr + v_eigen·u| < 0,5 m/s`, met een optioneel ACC-filter.
- **Multipath:** spiegelbeeld via de dichtste spiegelende wand aan elke zijde (lange segmenten evenwijdig met x van objecten met `mirror`). Het signaal is 0,25 × (R/R_spook)⁴.
- `rcs.js`: RCS per object **op naam**, zodat de wereldbestanden sensor-onafhankelijk blijven. Voor een nieuw object in een wereld: hier een regel toevoegen, anders geldt de standaard `ρ·2 m²`.
- De radar rekent op de main thread (goedkoop: <5 ms), aan `freq` Hz tijdens het rijden.
- **Experimentantwoorden:** gecontroleerd met `node tests/probe-radar.mjs '<set>' [vx] [seconden rijden]`. De kernuitspraken staan als test in `tests/smoke.mjs`. Wijzig je het radarmodel, controleer dan de antwoorden opnieuw.

Een nieuwe wereld: `src/worlds/x.js` met `export default {label, build(h){… return W}, isMark(x,y), marks(dashes,solids,W)}`. Toevoegen aan `WORLDS` in `core/world.js`, aan de keuzelijst in `core/ui.js` (`CTRL.env`) en aan `WORLDSTART` in `core/state.js`.

Een nieuwe sensor: map `src/sensors/<id>/` met een `index.js` volgens de interface (zie lidar en radar), en toevoegen aan `SENSORS` in `core/sensors.js`.

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
- Radar-experimenten nalezen (Nobel). Volgende sensoren: ultrasoon, camera (hergebruikt de GPU-rendering), GNSS, IMU.
- Eventueel: GitHub Pages als alternatief voor uploaden in Toledo; `/points` publiceren via rosbridge; koppeling met het CR0451-labo.

