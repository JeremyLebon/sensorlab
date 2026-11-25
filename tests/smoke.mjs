// tests/smoke.mjs — opent dist/sensorlab.html headless, controleert dat er geen fouten zijn,
// dat elke wereld en elk experiment punten oplevert, en meet de rekentijd per volledige scan.
// Chrome-pad via CHROME=... (standaard /usr/bin/google-chrome).
import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const exe = process.env.CHROME || '/usr/bin/google-chrome';
const browser = await chromium.launch({executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 1500, height: 900}});
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) errors.push('externe request: ' + u); });

await page.goto(pathToFileURL(resolve('dist/sensorlab.html')).href);
await page.waitForFunction(() => window.__sim && window.__sim.stat().n > 0, null, {timeout: 30000});

let fail = 0;
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FOUT ') + msg); if (!c) fail++; };
const settle = () => page.waitForTimeout(400);

for (const w of ['street', 'highway', 'farm']) {
  await page.evaluate(w => window.__sim.applyState({world: w}), w);
  await settle();
  const n = await page.evaluate(() => window.__sim.stat().n);
  ok(n > 1000, `wereld ${w}: ${n} punten`);
}
const nExp = await page.evaluate(() => window.__sim.EXPS.length);
for (let i = 0; i < nExp; i++) {
  await page.evaluate(i => window.__sim.applyState(window.__sim.EXPS[i].set), i);
  await settle();
  const n = await page.evaluate(() => window.__sim.stat().n);
  ok(n > 50, `experiment ${i + 1}: ${n} punten`);
}
// rijden: verkeer en voertuig moeten bewegen
await page.evaluate(() => window.__sim.applyState({world: 'highway', drive: true}));
await page.waitForTimeout(1500);
const vx = await page.evaluate(() => window.__sim.S.vx);
ok(vx > 5, `rijden: voertuig op x = ${vx.toFixed(1)} m`);
await page.evaluate(() => window.__sim.applyState({world: 'street'}));
await settle();
// worker en main thread moeten exact dezelfde puntenwolk geven (zelfde seed per kolom)
const nW = await page.evaluate(() => window.__sim.SENSORS[0].workerCount());
console.log(`  info workers: ${nW}`);
// vergelijking straal per straal (OID, oorzaak, eigen wagen) na een volledige scan
const snap = () => page.evaluate(async () => { const s = window.__sim.SENSORS[0];
  await new Promise(r => setTimeout(r, 300)); await s.whenIdle(); await new Promise(r => setTimeout(r, 300)); await s.whenIdle();
  const d = s.debugBuffer(); return {n: d.OID.filter((o, k) => o !== -2 && !d.BL[k]).length, key: d.OID.join(',') + '|' + d.SRC.join(',') + '|' + d.BL.join(',')}; });
for (const set of [{lidar: {preset: 'vlp16', live: false}}, {world: 'highway', rain: 0.6, lidar: {preset: 'os64', err: {yaw: 2}, live: false}}, {world: 'farm', dust: true, lidar: {preset: 'vlp16', echo: 'last', live: false}}]) {
  await page.evaluate(() => window.__sim.SENSORS[0].setWorkers(true));
  await page.evaluate(s => window.__sim.applyState(s), set);
  const a = await snap();
  await page.evaluate(() => window.__sim.SENSORS[0].setWorkers(false));
  const b = await snap();
  ok(a.key === b.key, `worker = main thread, straal per straal (${JSON.stringify(set)}): ${a.n} punten` + (a.key === b.key ? '' : `  ≠ ${b.n}`));
}
for (const wk of [false, true]) {
  await page.evaluate(w => window.__sim.SENSORS[0].setWorkers(w), wk);
  await page.evaluate(() => window.__sim.applyState({world: 'street'}));
  await settle();
  for (const p of ['vlp16', 'os64', 'hr128']) {
    await page.evaluate(p => window.__sim.applyState({lidar: {preset: p}}), p);
    await settle();
    const ms = await page.evaluate(async () => { let t = 0; for (let i = 0; i < 3; i++) t += await window.__sim.bench(); return t / 3; });
    const cm = await page.evaluate(() => window.__sim.SENSORS[0].debugColMs());
    console.log(`  info volledige scan ${p} (${wk ? 'worker' : 'main thread'}): ${ms.toFixed(0)} ms doorlooptijd · ${(wk ? cm.worker : cm.main).toFixed(3)} ms rekentijd per kolom`);
  }
}
ok(errors.length === 0, 'geen fouten in de console' + (errors.length ? ':\n    ' + errors.slice(0, 5).join('\n    ') : ''));
await browser.close();
console.log(fail ? `\n${fail} test(s) mislukt` : '\nalle tests geslaagd');
process.exit(fail ? 1 : 0);
