/* sensors/lidar/index.js — de lidar achter de sensor-interface
   Elke sensor levert dit object; core/loop.js roept per frame update3d → step → animate → render op.
   (De parameters staan nog in de gedeelde toestand S: opsplitsen per sensor is stap 2b, zie CLAUDE.md.) */
import {S,EGO,F} from '../../core/state.js';
import params from './controls.js';
import EXPS from './experiments.js';
import {PRESETS} from './presets.js';
import {mountX} from './model.js';
import {fullScan,sweepStep,moveDynamicPoints,computeStats,updateRate,STAT} from './scan.js';
import {updateBeams} from './pointcloud.js';
import {updateSensorMesh} from './mount3d.js';
import {metrics} from './metrics.js';
import {pcvR,pcvScene,pcvCam,pcvCtl,pcvWorld,pcvEgo,pcvSensor,YAX,pcvView} from './pcview.js';

let scanAcc=0,liveAcc=0,lastMetrics=0;

export default {
  id:'lidar',label:'Lidar',
  params,                      // UI-schema (tabblad Sensor)
  presets:PRESETS,
  experiments:EXPS,
  // 3D-model op de wagen en het voertuigframe van het puntenwolkvenster bijwerken
  update3d(){
    pcvEgo.position.set(0,0,0);pcvWorld.rotation.y=-EGO.yaw;pcvWorld.position.set(-S.vx,0,S.vy).applyAxisAngle(YAX,-EGO.yaw);
    pcvSensor.position.set(mountX(),S.mountH,0);updateSensorMesh();
  },
  // meten: force = instelling of wereld gewijzigd → volledige scan
  step(dt,now,force){
    scanAcc+=dt;liveAcc+=dt;
    if(force){fullScan(F.driving?S.speed:0);scanAcc=0;liveAcc=0;}
    else if(F.driving){moveDynamicPoints(dt);if(S.type==='rot')sweepStep(dt);else if(scanAcc>=1/S.freq){fullScan(0);scanAcc=0;}updateRate(dt);}
    else if(S.live&&liveAcc>0.3){fullScan(0);liveAcc=0;}
    if(force||((F.driving||S.live)&&now-lastMetrics>250)){computeStats();metrics();lastMetrics=now;}
  },
  animate(dt){if(pcvView!=='drv')pcvCtl.update();updateBeams(dt);},
  render(layout){if(layout!=='world')pcvR.render(pcvScene,pcvCam);},
  stats:()=>STAT,
  bench(){const t=performance.now();fullScan(0);computeStats();return performance.now()-t;}
};
