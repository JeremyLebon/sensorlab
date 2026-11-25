// build.mjs — voegt src/ samen tot zelfstandige HTML-bestanden
//   dist/sensorlab.html      offline, alles inline (three gebundeld) → Toledo-upload / GitHub Pages
//   dist/sensorlab-cdn.html  three via importmap (jsDelivr) + Google Fonts → claude.ai-artifact
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {build} from 'esbuild';

const rd = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const order = JSON.parse(rd('./src/order.json')).files;
const pkg = JSON.parse(rd('./package.json'));
const stamp = `sensorlab ${pkg.version} · build ${new Date().toISOString().slice(0, 10)}`;

const header = `import * as THREE from 'three';\nimport {OrbitControls} from 'three/addons/controls/OrbitControls.js';\n`;
const body = order.map(f => `\n/* ===================== ${f} ===================== */\n` + rd('./src/' + f)).join('');
const app = `/* ${stamp} */\n` + header + body;
mkdirSync(new URL('./build/', import.meta.url), {recursive: true});
mkdirSync(new URL('./dist/', import.meta.url), {recursive: true});
writeFileSync(new URL('./build/app.js', import.meta.url), app);

const shell = rd('./src/index.html');
const cssText = rd('./src/core/style.css');
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Semi+Condensed:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;
const importmap = `<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>`;
const fill = (s, map) => Object.entries(map).reduce((a, [k, v]) => a.split(k).join(v), s);
const safe = js => js.replace(/<\/script/gi, '<\\/script');

// 1. offline: three bundelen tot één IIFE
const res = await build({
  entryPoints: ['build/app.js'], bundle: true, format: 'iife', minify: true, write: false,
  alias: {'three/addons': './node_modules/three/examples/jsm'}, legalComments: 'none', target: 'es2020'
});
const offline = fill(shell, {
  '<!--@FONTS-->': `<!-- ${stamp} · offline-versie: geen externe bestanden -->`,
  '/*@CSS*/': cssText, '<!--@IMPORTMAP-->': '',
  '<!--@SCRIPT-->': `<script>\n${safe(res.outputFiles[0].text)}</script>`
});
writeFileSync(new URL('./dist/sensorlab.html', import.meta.url), offline);

// 2. CDN-versie voor het artifact
const cdn = fill(shell, {
  '<!--@FONTS-->': fonts, '/*@CSS*/': cssText, '<!--@IMPORTMAP-->': importmap,
  '<!--@SCRIPT-->': `<script type="module">\n${safe(app)}</script>`
});
writeFileSync(new URL('./dist/sensorlab-cdn.html', import.meta.url), cdn);

const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + ' kB';
console.log(`dist/sensorlab.html      ${kb(offline)}\ndist/sensorlab-cdn.html  ${kb(cdn)}`);
