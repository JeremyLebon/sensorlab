/* core/loop.js — hoofdlus en opstart */
import {$} from './util.js';
import {S,EGO,F} from './state.js';
import {W,TDX,buildWorld} from './world.js';
import {renderer,scene,camera,controls,veh,buildWorldMeshes,themeColors} from './scene.js';
import {updateRain,updateDust,updateFog} from './weather.js';
import {view,setView,followCams,camSync,camSyncX} from './camera.js';
import {resize} from './layout.js';
import {buildControls,syncControls,setLayout} from './ui.js';
import {applyState,buildExps} from './experiments.js';
import {pcvView,setPcvView} from '../sensors/lidar/pcview.js';
import lidar from '../sensors/lidar/index.js';

export const SENSORS=[lidar];

let last=performance.now();
function frame(now){
  const dt=Math.min(0.1,(now-last)/1000);last=now;
  camSync();
  // eigen wagen: rijstrookwissel met kritisch gedempte laterale beweging
  if(Math.abs(EGO.target-S.vy)>0.005||Math.abs(EGO.vyRate)>0.005){
    if(F.driving){const k=1.1,c=2.1;EGO.vyRate+=(k*(EGO.target-S.vy)-c*EGO.vyRate)*dt;EGO.vyRate=Math.max(-1.6,Math.min(1.6,EGO.vyRate));S.vy+=EGO.vyRate*dt;
      EGO.yaw=Math.atan2(EGO.vyRate,Math.max(S.speed,2));}
    else{S.vy=EGO.target;EGO.vyRate=0;EGO.yaw=0;F.dirty=true;}}
  else if(EGO.yaw!==0){EGO.yaw=0;S.vy=EGO.target;EGO.vyRate=0;}
  // rijden + rijdend verkeer
  if(F.driving){S.vx+=S.speed*dt;
    if(W.dynamic)for(const o of W.objs)if(o.v){o.dx+=o.v*dt;const x=(o.hx??0)+o.dx;if(x-S.vx>380)o.dx-=600;else if(x-S.vx<-220)o.dx+=600;TDX.set(o.uid,o.dx);if(o.group)o.group.position.x=o.dx;}
    if(S.vx>W.end){S.vx=W.start;TDX.clear();F.worldDirty=true;const sh=W.end-W.start;camera.position.x-=sh;controls.target.x-=sh;camSyncX();}}
  if(F.worldDirty){buildWorld();buildWorldMeshes();F.worldDirty=false;F.dirty=true;}
  if(F.pendingCam){setView(F.pendingCam);setPcvView(pcvView);F.pendingCam=null;camSync();}
  veh.position.set(S.vx,0,-S.vy);veh.rotation.y=EGO.yaw;
  for(const s of SENSORS)s.update3d();
  const force=F.dirty;F.dirty=false;
  for(const s of SENSORS)s.step(dt,now,force);
  followCams();if(view!=='sensor')controls.update();
  for(const s of SENSORS)s.animate(dt);
  updateRain(dt);updateDust(dt);
  const l=$('viewsBox').dataset.l;
  if(l!=='pcv')renderer.render(scene,camera);
  for(const s of SENSORS)s.render(l);
  requestAnimationFrame(frame);
}

export function start(){
  new ResizeObserver(resize).observe($('viewsBox'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{themeColors();updateFog();});
  buildControls();buildExps();syncControls();
  buildWorld();buildWorldMeshes();F.worldDirty=false;resize();setView('free');setPcvView('3d');
  if(innerWidth<860)setLayout('world');
  requestAnimationFrame(frame);
  // testhaak (tests/smoke.mjs)
  window.__sim={EGO,S,applyState,EXPS:lidar.experiments,stat:lidar.stats,setLayout,W:()=>W,bench:lidar.bench};
}
