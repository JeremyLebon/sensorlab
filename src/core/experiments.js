/* core/experiments.js — experimenten-engine: "Instellen" zet de simulator in een gekende toestand
   De experimenten zelf staan per sensor (sensors/<id>/experiments.js). */
import {$,toast} from './util.js';
import {S,EGO,F,BASE,WORLDSTART} from './state.js';
import {TDX} from './world.js';
import {applyObjMode} from './scene.js';
import {updateFog} from './weather.js';
import {setDriving,syncControls,markExp} from './ui.js';
import {setLayout} from './layout.js';
import {SENSORS} from './sensors.js';
// alle experimenten van alle sensoren; set = {wereld/voertuig…, drive, view, layout, <sensor-id>:{…}}
export const EXPS=SENSORS.flatMap(s=>s.experiments);
export function applyState(over){
  const ns=JSON.parse(JSON.stringify(BASE));
  const w=WORLDSTART[over.world||'street'];ns.ped={...w.ped};ns.dog={...w.dog};ns.speed=w.speed;
  for(const k in over){if(!['drive','view','layout'].includes(k)&&!SENSORS.some(s=>s.id===k))ns[k]=over[k];}
  for(const k in ns)S[k]=(k==='ped'||k==='dog')?Object.assign({},ns[k]):ns[k];
  for(const s of SENSORS)s.reset(over[s.id]||{});
  TDX.clear();S.vy=0;EGO.yaw=0;EGO.vyRate=0;EGO.target=0;setDriving(!!over.drive);
  F.worldDirty=true;F.dirty=true;applyObjMode();updateFog();syncControls();
  if(over.layout)setLayout(over.layout);
  F.pendingCam=over.view||'free';   // camera pas in het volgende frame, na het herbouwen van de wereld
}
const expHtml=(e,i)=>'<div class="exp" id="exp'+i+'"><div class="nr">EXPERIMENT '+(i+1)+'</div><h3>'+e.t+'</h3><p>'+e.u+'</p><p class="q">'+e.q+'</p><button class="act" data-i="'+i+'">Instellen</button><details><summary>Toon antwoord</summary><p>'+e.a+'</p></details></div>';
export function buildExps(){let n=0,h='';
  for(const s of SENSORS){if(SENSORS.length>1)h+='<h2 class="exph">'+s.label+'</h2>';for(const e of s.experiments)h+=expHtml(e,n++);}
  $('exps').innerHTML=h;
  $('exps').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.i;applyState(EXPS[i].set);markExp(i);toast('Experiment '+(i+1)+' ingesteld');}));}
