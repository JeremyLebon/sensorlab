/* core/camera.js — camerastandpunten van de 3D-wereld; volgt de wagen tijdens het rijden */
import {S,EGO} from './state.js';
import {camera,controls} from './scene.js';
import {SENSORS} from './sensors.js';
export let view='free';
export function setView(v){view=v;document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  const x=S.vx,z=-S.vy;controls.enabled=v!=='sensor';
  if(v==='free'){camera.position.set(x-13,8,z+11);controls.target.set(x+8,0.6,z);}
  if(v==='chase'){camera.position.set(x-11,4.2,z+0.01);controls.target.set(x+12,1,z);}
  if(v==='top'){camera.position.set(x+9,50,z+0.01);controls.target.set(x+9,0,z);}
  camera.fov=v==='sensor'?75:50;camera.updateProjectionMatrix();controls.update();}
let lastVx=0,lastVy=0;
export function camSync(){lastVx=S.vx;lastVy=S.vy;}   // begin van elk frame en na een sprong
export function camSyncX(){lastVx=S.vx;}
export function followCams(){
  const d=S.vx-lastVx,dz=-(S.vy-lastVy);
  if(view==='sensor'){const e=SENSORS[0].eye(),mx=e.x+0.12,c=Math.cos(EGO.yaw),s2=Math.sin(EGO.yaw);camera.position.set(S.vx+mx*c,e.h+0.05,-(S.vy+mx*s2));camera.lookAt(S.vx+mx*c+20*c,e.h-1.0,-(S.vy+mx*s2+20*s2));}
  else if(d!==0||dz!==0){camera.position.x+=d;controls.target.x+=d;camera.position.z+=dz;controls.target.z+=dz;}
}
