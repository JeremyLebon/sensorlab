/* core/ui.js — tabblad Omgeving, bedieningselementen, rijden, rijstrook, plaatsen van persoon/hond */
import * as THREE from 'three';
import {$,nl,toast} from './util.js';
import {S,EGO,F,WORLDSTART} from './state.js';
import {CARL} from './vehicle.js';
import {W,TDX} from './world.js';
import {renderer,camera,ground,applyObjMode,themeColors} from './scene.js';
import {updateFog} from './weather.js';
import {view,setView} from './camera.js';
import {SENSORS,SMAP} from './sensors.js';
const CTRL={env:[]};   // tabblad Sensor komt uit sensor.params (sleutels met prefix "<id>.")
CTRL.env=[
  {g:'Wereld',items:[
   {k:'world',t:'sel',label:'Omgeving',opts:[['street','Straat'],['highway','Snelweg'],['farm','Erf en akker']]},
   {k:'speed',label:'Rijsnelheid',min:1,max:40,step:1,fmt:v=>v+' m/s ('+Math.round(v*3.6)+' km/h)'}]},
  {g:'Weer en ondergrond',items:[
   {k:'rain',label:'Regen',min:0,max:1,step:0.05,fmt:v=>v==0?'droog':v<0.35?'lichte regen':v<0.7?'matige regen':'stortbui'},
   {k:'fog',label:'Mist',min:0,max:1,step:0.05,fmt:v=>v==0?'geen':v<0.35?'nevel':v<0.7?'mist':'dichte mist'},
   {k:'dust',t:'chk',label:'Stofwolk vóór het voertuig'},
   {k:'dustD',label:'Stofdichtheid',min:0.1,max:1,step:0.05,d:2},
   {k:'wet',t:'chk',label:'Nat wegdek (spiegelend)'},
   {k:'interf',t:'chk',label:'Storing door andere lidar'}]},
  {g:'Weergave',items:[
   {k:'objects',t:'sel',label:'Objecten',opts:[['full','Volledig'],['ghost','Doorschijnend'],['hidden','Verborgen (enkel punten)']]}]}
 ];
// sleutel "lidar.err.yaw" → sensortoestand lidar.state.err.yaw; zonder sensorprefix → S
function root(k){const p=k.split('.'),s=SMAP[p[0]];return s?[s.state,p.slice(1)]:[S,p];}
const getK=k=>{const [o,p]=root(k);return p.reduce((a,q)=>a[q],o);};
function setK(k,v){let [o,p]=root(k);for(let i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=v;}
const ctrlEls={};
function fmtV(it,v){if(it.fmt)return it.fmt(v);return(v>0&&(it.sk||it.k).startsWith('err.')?'+':'')+nl(v,it.d??2)+(it.u||'');}
function makeSection(G,parent){
  const sec=document.createElement('section');sec.innerHTML='<h2>'+G.g+'</h2>'+(G.note?'<p class="hint">'+G.note+'</p>':'');
  for(const it of G.items){let el;
    if(it.t==='chk'){el=document.createElement('label');el.className='chk';el.innerHTML='<input type="checkbox"> '+it.label;const inp=el.querySelector('input');
      inp.addEventListener('change',()=>{setK(it.k,inp.checked);onChange(it.k);});ctrlEls[it.k]={it,inp,el};}
    else if(it.t==='sel'){el=document.createElement('div');el.className='grid2';el.innerHTML='<label>'+it.label+'</label><select>'+it.opts.map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join('')+'</select>';
      const inp=el.querySelector('select');inp.addEventListener('change',()=>{setK(it.k,it.num?Number(inp.value):inp.value);onChange(it.k);});ctrlEls[it.k]={it,inp,el};}
    else{el=document.createElement('label');el.className='slider';el.innerHTML='<span>'+it.label+'</span><output></output><input type="range" min="'+it.min+'" max="'+it.max+'" step="'+it.step+'">';
      const inp=el.querySelector('input'),out=el.querySelector('output');
      inp.addEventListener('input',()=>{setK(it.k,Number(inp.value));out.textContent=fmtV(it,Number(inp.value));onChange(it.k);});ctrlEls[it.k]={it,inp,out,el};}
    sec.appendChild(el);}
  parent.appendChild(sec);
}
// tabblad Sensor: per sensor een eigen blok; bij meer dan één sensor een keuzeknop bovenaan
export function showSensorTab(id){
  document.querySelectorAll('#pane-sensor [data-sensor]').forEach(d=>d.hidden=d.dataset.sensor!==id);
  document.querySelectorAll('#sensorSel button').forEach(b=>b.classList.toggle('on',b.dataset.s===id));
}
export function buildControls(){
  const ps=$('pane-sensor');ps.innerHTML='';
  if(SENSORS.length>1){const sel=document.createElement('section');sel.innerHTML='<div class="seg" id="sensorSel">'+SENSORS.map(s=>'<button data-s="'+s.id+'">'+s.label+'</button>').join('')+'</div>';ps.appendChild(sel);
    sel.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>showSensorTab(b.dataset.s)));}
  for(const s of SENSORS){const wrap=document.createElement('div');wrap.dataset.sensor=s.id;ps.appendChild(wrap);
    for(const G of s.params)makeSection({...G,items:G.items.map(it=>({...it,k:s.id+'.'+it.k,sk:it.k}))},wrap);}
  showSensorTab(SENSORS[0].id);
  const pe=$('pane-env');pe.innerHTML='';for(const G of CTRL.env)makeSection(G,pe);
}
export function syncControls(){for(const k in ctrlEls){const c=ctrlEls[k],v=getK(k);
  if(c.it.t==='chk')c.inp.checked=!!v;else{c.inp.value=v;if(c.out)c.out.textContent=fmtV(c.it,v);}
  const p=k.split('.'),s=SMAP[p[0]],dis=s?!!(s.disabled&&s.disabled(p.slice(1).join('.'))):(k==='dustD'&&!S.dust);
  c.inp.disabled=dis;c.el.classList.toggle('dis',dis);}}
function onChange(k){
  const p=k.split('.'),s=SMAP[p[0]];
  if(s&&s.onChange)s.onChange(p.slice(1).join('.'));
  if(k==='world'){const w=WORLDSTART[S.world];S.ped={...w.ped};S.dog={...w.dog};S.speed=w.speed;S.vx=0;S.vy=0;EGO.yaw=0;EGO.vyRate=0;EGO.target=0;TDX.clear();F.worldDirty=true;resetCams();}
  if(k==='objects')applyObjMode();
  if(k==='fog')updateFog();
  if(k==='wet')themeColors();
  markExp(null);syncControls();F.dirty=true;
}
export function markExp(i){document.querySelectorAll('.exp').forEach((e,k)=>e.classList.toggle('active',k===i));}
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tabs button').forEach(x=>x.setAttribute('aria-selected',x===b));
  document.querySelectorAll('.pane').forEach(p=>p.hidden=p.id!=='pane-'+b.dataset.tab);}));
document.querySelectorAll('#views button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
let mode='orbit';
document.querySelectorAll('#modes button').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;
  document.querySelectorAll('#modes button').forEach(x=>x.classList.toggle('on',x===b));if(mode!=='orbit')toast('Klik op de grond om te plaatsen');}));
export function setDriving(on){F.driving=on;$('driveBtn').classList.toggle('on',on);$('driveBtn').textContent=on?'❚❚ Stoppen':'▶ Rijden';F.dirty=true;}
$('driveBtn').addEventListener('click',()=>setDriving(!F.driving));
export function resetCams(){setView(view==='sensor'?'free':view);for(const s of SENSORS)if(s.resetView)s.resetView();}
function changeLane(dir){const ls=W.lanes||[0];let i=ls.reduce((b,y,k)=>Math.abs(y-EGO.target)<Math.abs(ls[b]-EGO.target)?k:b,0);const ni=i+dir;
  if(ni<0||ni>=ls.length){toast(ls.length<2?'Hier is maar één rijstrook':'Geen rijstrook meer aan die kant');return;}EGO.target=ls[ni];}
$('laneL').addEventListener('click',()=>changeLane(1));$('laneR').addEventListener('click',()=>changeLane(-1));
addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,select,textarea'))return;if(e.key==='ArrowLeft'){changeLane(1);e.preventDefault();}else if(e.key==='ArrowRight'){changeLane(-1);e.preventDefault();}});
$('resetBtn').addEventListener('click',()=>{S.vx=0;S.vy=0;EGO.yaw=0;EGO.vyRate=0;EGO.target=0;TDX.clear();F.worldDirty=true;F.dirty=true;resetCams();});
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let downXY=null;
renderer.domElement.addEventListener('pointerdown',e=>{downXY=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',e=>{if(mode==='orbit'||!downXY)return;if(Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1])>5)return;
  const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);
  const hit=ray.intersectObject(ground)[0];if(!hit)return;const x=hit.point.x,y=-hit.point.z;
  if(x>S.vx-CARL-0.4&&x<S.vx+0.5&&Math.abs(y-S.vy)<1.3){toast('Niet op de eigen wagen');return;}
  S[mode]={x:+x.toFixed(2),y:+y.toFixed(2)};F.worldDirty=true;F.dirty=true;markExp(null);});
