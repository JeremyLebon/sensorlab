/* sensors/lidar/index.js — de lidar achter de sensor-interface
   core/loop.js roept per frame update3d → step → animate → render op; core/ui.js gebruikt params/state/onChange/disabled;
   core/experiments.js gebruikt reset; core/camera.js gebruikt eye; core/layout.js gebruikt views.
   Deze module importeert GEEN core/ui, camera, layout, experiments of loop (zie core/sensors.js). */
import {toast,nl} from '../../core/util.js';
import {S,EGO,F} from '../../core/state.js';
import {carTop} from '../../core/vehicle.js';
import {L,LBASE} from './state.js';
import params from './controls.js';
import EXPS from './experiments.js';
import {PRESETS,SENSORKEYS} from './presets.js';
import {mountX} from './model.js';
import {fullScan,sweepStep,moveDynamicPoints,computeStats,updateRate,STAT} from './scan.js';
import {updateBeams} from './pointcloud.js';
import {updateSensorMesh} from './mount3d.js';
import {metrics} from './metrics.js';
import {pcvStage,pcvR,pcvScene,pcvCam,pcvCtl,pcvWorld,pcvEgo,pcvSensor,YAX,pcvView,setPcvView} from './pcview.js';

let scanAcc=0,liveAcc=0,lastMetrics=0;
// minimale montagehoogte boven de carrosserie
function fixMount(){const min=L.mount==='front'?0.1:carTop(mountX())+0.08;if(L.mountH<min){L.mountH=+min.toFixed(2);toast('Op deze plaats: montagehoogte minstens '+nl(L.mountH,2)+' m');}}

export default {
  id:'lidar',label:'Lidar',
  state:L,                     // eigen toestand; UI-sleutels "lidar.<key>"
  params,                      // UI-schema (tabblad Sensor)
  presets:PRESETS,
  experiments:EXPS,
  views:[{stage:pcvStage,renderer:pcvR,camera:pcvCam}],
  // UI: na wijziging van een eigen sleutel (zonder prefix)
  onChange(k){
    if(k==='preset'&&L.preset!=='custom')Object.assign(L,PRESETS[L.preset]);
    else if(SENSORKEYS.includes(k)){L.preset='custom';if(k==='type'&&L.type==='static'&&L.hfov>180)L.hfov=120;}
    if(['mount','mountH','preset'].includes(k))fixMount();
  },
  disabled(k){return (k==='vfov'&&L.layers===1)||(k==='deskew'&&L.type!=='rot');},
  // experiment: standaard VLP-16; weergavekeuzes (kleur, puntgrootte, live) blijven behouden tenzij opgegeven
  reset(o){
    const ns=JSON.parse(JSON.stringify(LBASE));Object.assign(ns,{color:L.color,psize:L.psize,live:L.live});
    const pr=o.preset||'vlp16';Object.assign(ns,PRESETS[pr]);ns.preset=pr;
    for(const k in o){if(k==='err')Object.assign(ns.err,o.err);else ns[k]=o[k];}
    for(const k in ns)L[k]=k==='err'?Object.assign({},ns.err):ns[k];
  },
  eye(){return {x:mountX(),h:L.mountH};},   // camerastandpunt "Vanuit sensor"
  init(){setPcvView('3d');},
  resetView(){setPcvView(pcvView);},
  // 3D-model op de wagen en het voertuigframe van het puntenwolkvenster bijwerken
  update3d(){
    pcvEgo.position.set(0,0,0);pcvWorld.rotation.y=-EGO.yaw;pcvWorld.position.set(-S.vx,0,S.vy).applyAxisAngle(YAX,-EGO.yaw);
    pcvSensor.position.set(mountX(),L.mountH,0);updateSensorMesh();
  },
  // meten: force = instelling of wereld gewijzigd → volledige scan
  step(dt,now,force){
    scanAcc+=dt;liveAcc+=dt;
    if(force){fullScan(F.driving?S.speed:0);scanAcc=0;liveAcc=0;}
    else if(F.driving){moveDynamicPoints(dt);if(L.type==='rot')sweepStep(dt);else if(scanAcc>=1/L.freq){fullScan(0);scanAcc=0;}updateRate(dt);}
    else if(L.live&&liveAcc>0.3){fullScan(0);liveAcc=0;}
    if(force||((F.driving||L.live)&&now-lastMetrics>250)){computeStats();metrics();lastMetrics=now;}
  },
  animate(dt){
    if(pcvView==='drv'){pcvCam.position.set(-0.6,1.25,0);pcvCam.lookAt(30,0.6,0);}else pcvCtl.update();
    updateBeams(dt);
  },
  render(layout){if(layout!=='world')pcvR.render(pcvScene,pcvCam);},
  stats:()=>STAT,
  bench(){const t=performance.now();fullScan(0);computeStats();return performance.now()-t;}
};
