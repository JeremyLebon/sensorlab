/* core/layout.js — alle renderers (hoofdscene + vensters van de sensoren) op de grootte van hun venster houden */
import {stage,renderer,camera} from './scene.js';
import {SENSORS} from './sensors.js';
export function resize(){
  const list=[{stage,renderer,camera},...SENSORS.flatMap(s=>s.views||[])];
  for(const v of list){const b=v.stage.getBoundingClientRect();if(b.width<2)continue;v.renderer.setSize(b.width,b.height,false);v.camera.aspect=b.width/Math.max(1,b.height);v.camera.updateProjectionMatrix();}}
