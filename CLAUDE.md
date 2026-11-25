# CLAUDE.md — sensorlab

Sensorsimulator voor het vak Autonome mobiliteit en AI (VIVES, start voorjaar 2027). Eigenaar: Nobel (GitHub JeremyLebon). Taal van UI, commentaar en commits: **Nederlands** (Vlaams), decimale komma in de UI.

## Harde randvoorwaarden

- **Eén zelfstandige HTML** als eindproduct (`dist/sensorlab.html`). Toledo (Blackboard Ultra) en `file://` laden niets extern: geen CDN, geen fonts, geen aparte worker- of JSON-bestanden. Alles wordt in de build inline gezet. De rooktest faalt bij elke externe request.
- **Puntenwolk synchroon met de 3D-wereld.** Elke vertraging valt studenten meteen op. Rekenbudget ±14 ms per frame (zie `sweepStep`).
- **Schuifbalken altijd zichtbaar** (overlayscrollbars van Windows/macOS en het Toledo-venster verbergen ze). CSS staat in `core/style.css`. Niet verwijderen.
- **3D-weergave met een mooie personenwagen**, geen 2D-schema's. Het puntenwolkvenster blijft een aparte renderer.
- **Cursusmateriaal**: elke opdracht in een experiment gebruikt enkel wat vooraf uitgelegd is.

## Architectuur: stand van zaken (stap 1)

De oorspronkelijke `lidar3d.html` (±1000 regels, één ES-module) is **zonder gedragswijziging** opgesplitst in bestanden per map. `build.mjs` voegt ze samen in de volgorde van `src/order.json` tot één module. Alle bestanden delen dus **één scope**: globale `let`/`const`/functies zoals `S`, `W`, `PB`, `ptsGeo`, `driving` en `dirty` zijn overal zichtbaar.

Gevolgen:
- De volgorde in `order.json` doet ertoe voor **top-level code die bij het laden draait** (bv. `scene.add(...)` in `pointcloud.js` heeft `scene` uit `core/scene.js` nodig). Functies zelf worden pas in `core/loop.js` aangeroepen, dus verwijzingen binnen functies mogen naar latere bestanden gaan.
- Een bestand apart importeren werkt niet. Altijd via `npm run build`.
- Een nieuwe wereld: `src/worlds/x.js` met `WORLDS.x={build(h),isMark(x,y),marks(dashes,solids)}`, toevoegen aan `order.json`, aan de keuzelijst in `core/ui.js` (`CTRL.env`) en aan `WORLDSTART` in `core/state.js`.

Wereldcoördinaten: x vooruit, y links, z omhoog (zoals ROS). Three.js gebruikt y omhoog: altijd via `V(x,y,z)`. Het puntenwolkvenster werkt in het voertuigframe (base_link).

## Volgende stap (stap 2): echte modules + sensor-interface

Doel: `S` opsplitsen in een gedeelde wereld-/voertuigtoestand en een toestand per sensor, en elke sensor laten voldoen aan:

```js
export default {
  id: 'lidar', label: 'Lidar',
  params: [...],                 // UI-schema (nu CTRL.sensor)
  mount(vehicle, scene) {},      // 3D-model van de sensor (nu mount3d.js)
  step(world, pose, dt) {},      // meten (nu fullScan/sweepStep)
  views: [...],                  // eigen vensters (nu pcview.js)
  metrics(world) {},             // tabel + HUD (nu metrics.js)
  experiments: [...]             // nu EXPS
}
```

Aanpak: eerst de gedeelde toestand in een object (`ctx`) stoppen, dan bestand per bestand `import`/`export` invoeren, met de rooktest groen na elke stap. Mutabele bindingen (`W`, `ptsGeo`, `BINS`, `driving`, `dirty`) kunnen niet als `let` geëxporteerd en elders herschreven worden: die gaan in `ctx`.

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
- Stap 2 (modules), daarna worker, daarna radar als eerste nieuwe sensor (sensorfusie: radar door stof en mist).
- Eventueel: GitHub Pages als alternatief voor uploaden in Toledo; `/points` publiceren via rosbridge; koppeling met het CR0451-labo.
- Bekend klein lay-outpunt: bij smalle 3D-weergave overlapt de knoppenbalk "Camera / Persoon / Hond" de rijknoppen.
