// tests/probe-radar.mjs — ontwikkelhulp: toont per scenario wat radar en lidar zien (geen test, wel controle van experimentantwoorden)
// gebruik: node tests/probe-radar.mjs '<json set>' [vx] [rijden-seconden]
import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const [set = '{}', vx, driveS] = process.argv.slice(2);
const b = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const p = await b.newPage({viewport: {width: 1400, height: 800}});
p.on('pageerror', e => console.log('FOUT', e.message));
await p.goto(pathToFileURL(resolve('dist/sensorlab.html')).href);
await p.waitForFunction(() => window.__sim && window.__sim.stat().n > 0);
const out = await p.evaluate(async ([set, vx, driveS]) => {
  const s = window.__sim; s.applyState(JSON.parse(set)); await new Promise(r => setTimeout(r, 500));
  if (vx) { s.S.vx = +vx; s.F.dirty = true; await new Promise(r => setTimeout(r, 500)); }
  if (driveS) await new Promise(r => setTimeout(r, +driveS * 1000));
  await s.SENSORS[0].whenIdle(); await new Promise(r => setTimeout(r, 300));
  const res = s.SENSORS[1].stats(), L = s.stat();
  const by = {};
  for (const d of res.dets) { const k = d.o.name + (d.src === 'ghost' ? ' [SPOOK]' : '') + (d.filtered ? ' [gefilterd]' : '');
    (by[k] = by[k] || []).push(`${d.t.toFixed(1)}m ${(d.azv * 180 / Math.PI).toFixed(1)}° vr=${d.vr.toFixed(1)} ${d.snr.toFixed(0)}dB${d.stat ? ' stil' : ''} (x=${d.vx.toFixed(1)},y=${d.vy.toFixed(1)})`); }
  const lid = {}; for (const [k, v] of L.cnt) if (v) lid[k] = v;
  return {egoX: s.S.vx.toFixed(1), radar: by, lidar: lid};
}, [set, vx, driveS]);
console.log('ego x =', out.egoX);
console.log('RADAR'); for (const [k, v] of Object.entries(out.radar)) console.log('  ' + k + ': ' + v.length + '  ' + v.slice(0, 4).join(' | '));
console.log('LIDAR punten'); console.log('  ' + Object.entries(out.lidar).map(([k, v]) => k + '=' + v).join(', '));
await b.close();
