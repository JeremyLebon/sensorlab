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
for (const p of ['vlp16', 'os64', 'hr128']) {
  await page.evaluate(p => window.__sim.applyState({preset: p}), p);
  await settle();
  const ms = await page.evaluate(() => { let t = 0; for (let i = 0; i < 3; i++) t += window.__sim.bench(); return t / 3; });
  console.log(`  info volledige scan ${p}: ${ms.toFixed(0)} ms`);
}
ok(errors.length === 0, 'geen fouten in de console' + (errors.length ? ':\n    ' + errors.slice(0, 5).join('\n    ') : ''));
await browser.close();
console.log(fail ? `\n${fail} test(s) mislukt` : '\nalle tests geslaagd');
process.exit(fail ? 1 : 0);
