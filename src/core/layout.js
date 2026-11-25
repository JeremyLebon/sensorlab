/* core/layout.js — beide renderers op de grootte van hun venster houden */
import {stage,renderer,camera} from './scene.js';
import {pcvStage,pcvR,pcvCam} from '../sensors/lidar/pcview.js';
export function resize(){for(const [r,st,c] of [[renderer,stage,camera],[pcvR,pcvStage,pcvCam]]){const b=st.getBoundingClientRect();if(b.width<2)continue;r.setSize(b.width,b.height,false);c.aspect=b.width/Math.max(1,b.height);c.updateProjectionMatrix();}}
