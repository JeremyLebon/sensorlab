// build.mjs — voegt src/ samen tot zelfstandige HTML-bestanden
//   dist/sensorlab.html      offline, alles inline (three gebundeld) → Toledo-upload / GitHub Pages
//   dist/sensorlab-cdn.html  three via importmap (jsDelivr) + Google Fonts → claude.ai-artifact
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {build} from 'esbuild';

const rd = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const pkg = JSON.parse(rd('./package.json'));
const stamp = `sensorlab ${pkg.version} · build ${new Date().toISOString().slice(0, 10)}`;
mkdirSync(new URL('./dist/', import.meta.url), {recursive: true});
const common = {entryPoints: ['src/main.js'], bundle: true, write: false, legalComments: 'none', target: 'es2020', banner: {js: `/* ${stamp} */`}};

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

// 1. offline: alles (ook three) gebundeld tot één IIFE
const res = await build({...common, format: 'iife', minify: true, alias: {'three/addons': './node_modules/three/examples/jsm'}});
const offline = fill(shell, {
  '<!--@FONTS-->': `<!-- ${stamp} · offline-versie: geen externe bestanden -->`,
  '/*@CSS*/': cssText, '<!--@IMPORTMAP-->': '',
  '<!--@SCRIPT-->': `<script>\n${safe(res.outputFiles[0].text)}</script>`
});
writeFileSync(new URL('./dist/sensorlab.html', import.meta.url), offline);

// 2. CDN-versie voor het artifact: eigen code gebundeld, three extern via de importmap
const resCdn = await build({...common, format: 'esm', minify: false, external: ['three', 'three/addons/*']});
const cdn = fill(shell, {
  '<!--@FONTS-->': fonts, '/*@CSS*/': cssText, '<!--@IMPORTMAP-->': importmap,
  '<!--@SCRIPT-->': `<script type="module">\n${safe(resCdn.outputFiles[0].text)}</script>`
});
writeFileSync(new URL('./dist/sensorlab-cdn.html', import.meta.url), cdn);

const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + ' kB';
console.log(`dist/sensorlab.html      ${kb(offline)}\ndist/sensorlab-cdn.html  ${kb(cdn)}`);
