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

**Sensor-interface** (`sensors/lidar/index.js`). `core/loop.js` overloopt `SENSORS` en roept per frame `update3d()` → `step(dt, now, force)` → `animate(dt)` → `render(layout)` aan:

```js
export default {
  id: 'lidar', label: 'Lidar',
  params,              // UI-schema tabblad Sensor (controls.js)
  presets, experiments,
  update3d() {},       // sensor op de wagen + voertuigframe van het eigen venster
  step(dt, now, force) {},   // meten; force = volledige scan na een wijziging
  animate(dt) {},      // stralen-sweep, camerabesturing eigen venster
  render(layout) {},   // eigen venster(s) tekenen
  stats(), bench()
}
```

**Nog niet gescheiden (stap 2b)**
- De lidar-parameters staan nog in de gedeelde `S` (`type … deskew`, `color`, `psize`, `beams`). Plan: per sensor een eigen toestand `sensor.state`, `getK`/`setK` in `core/ui.js` laten routeren via een prefix (bv. `lidar.layers`), en `applyState` laat experimenten `set:{world:…, lidar:{…}}` geven.
- `core/camera.js`, `core/layout.js`, `core/ui.js` en `core/experiments.js` importeren nog rechtstreeks uit `sensors/lidar` (puntenwolkvenster, presets, montageplaats). Bij een tweede sensor: de views en de layoutknoppen generiek maken.

Een nieuwe wereld: `src/worlds/x.js` met `export default {label, build(h){… return W}, isMark(x,y), marks(dashes,solids,W)}`. Toevoegen aan `WORLDS` in `core/world.js`, aan de keuzelijst in `core/ui.js` (`CTRL.env`) en aan `WORLDSTART` in `core/state.js`.

Een nieuwe sensor: map `src/sensors/<id>/` met een `index.js` volgens de interface, en toevoegen aan `SENSORS` in `core/loop.js`.

Wereldcoördinaten: x vooruit, y links, z omhoog (zoals ROS). Three.js gebruikt y omhoog: altijd via `V(x,y,z)`. Het puntenwolkvenster werkt in het voertuigframe (base_link).

## Prestaties: volgorde

1. **Web worker** voor de raycast (½ dag, 3–6×). In de offline build inline als Blob-URL.
2. **GPU-lidar**: de scène vanuit de sensor renderen naar diepte-/ID-texturen (1–2 dagen, 10–100×). Nadeel: enkel het eerste raakpunt. Glas, meerdere echo's en stof vragen een extra pass of een statistische benadering. Herbruikbaar voor de camerasensor.
3. **WebAssembly: niet doen** (1,5–3× op één kern, extra toolchain).

Rekentijd per volledige scan (headless Chrome, swiftshader): 16 lagen ±20 ms, 64 lagen ±40 ms, 128 lagen ±100–170 ms. `npm test` drukt dit af.

## Model (didactisch vereenvoudigd)

- Objecten zijn verticale prisma's (box, cyl, wall met z0..z1). Botsvormen staan los van de visuele modellen (`vis:false`). Raycast analytisch in 2D met hoogtecontrole. Hoekvakken van 0,5° en culling op bereik.
- Signaal `ρ·T·exp(-2αR)/R²` tegen drempel `0,1/Rmax²`. Grond Lambertiaans `ρ·sin(el)`, markering retroreflecterend, glas 85 % transmissie, dunne draad geschaald met de vlekbedekking, regen/mist/stof als deeltjesecho's met extinctie.
- Roterend + rijden: per frame enkel de doorlopen sector. Zonder deskew geplot vanuit de pose bij het begin van de omwenteling.

## Open punten

- Experimenten nalezen (Nobel).
- Stap 2b (toestand per sensor), daarna worker, daarna radar als eerste nieuwe sensor (sensorfusie: radar door stof en mist).
- Eventueel: GitHub Pages als alternatief voor uploaden in Toledo; `/points` publiceren via rosbridge; koppeling met het CR0451-labo.
- Bekend klein lay-outpunt: bij smalle 3D-weergave overlapt de knoppenbalk "Camera / Persoon / Hond" de rijknoppen.
