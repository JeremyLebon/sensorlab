/* core/layout.js — welke vensters zichtbaar zijn (3D-wereld + vensters van de sensoren) en hun grootte
   VIS = set van venster-id's ('world', 'lidar', 'radar', …). Elk venster is een element met data-pane="<id>" in #viewsBox.
   De knoppen bovenaan zijn schakelaars: elk venster aan/uit, minstens één blijft zichtbaar. */
import {$} from './util.js';
import {stage,renderer,camera} from './scene.js';
import {SENSORS} from './sensors.js';
export const VIS=new Set(['world']);
const sensorViews=()=>SENSORS.flatMap(s=>s.views||[]);
export function buildLayoutButtons(){
  const seg=$('layoutSeg'),panes=[{id:'world',label:'3D-wereld'},...sensorViews()];
  seg.innerHTML=panes.map(p=>'<button data-p="'+p.id+'" title="Venster tonen/verbergen">'+p.label+'</button>').join('');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const n=new Set(VIS);
    if(n.has(b.dataset.p)){if(n.size>1)n.delete(b.dataset.p);}else n.add(b.dataset.p);setLayout([...n]);}));
}
// spec: lijst van id's, of 'world' / 'split' (wereld + eerste sensorvenster) / een venster-id
export function setLayout(spec){
  const first=(sensorViews()[0]||{}).id;
  const ids=Array.isArray(spec)?spec:spec==='split'?['world',first]:spec==='pcv'?[first]:[spec];
  VIS.clear();for(const i of ids)VIS.add(i);
  const box=$('viewsBox');let n=0;
  for(const el of box.querySelectorAll(':scope > [data-pane]')){const on=VIS.has(el.dataset.pane);el.hidden=!on;if(on)n++;}
  box.style.setProperty('--n',Math.max(1,n));
  document.querySelectorAll('#layoutSeg button').forEach(b=>b.classList.toggle('on',VIS.has(b.dataset.p)));
  requestAnimationFrame(resize);
}
export function resize(){
  const list=[{stage,renderer,camera},...sensorViews()];
  for(const v of list){const b=v.stage.getBoundingClientRect();if(b.width<2)continue;v.renderer.setSize(b.width,b.height,false);v.camera.aspect=b.width/Math.max(1,b.height);v.camera.updateProjectionMatrix();}}
