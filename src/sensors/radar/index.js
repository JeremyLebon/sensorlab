/* sensors/radar/index.js — de radar achter de sensor-interface (zie sensors/lidar/index.js en CLAUDE.md) */
import {mulberry32} from '../../core/util.js';
import {F} from '../../core/state.js';
import {R,RBASE} from './state.js';
import params from './controls.js';
import EXPS from './experiments.js';
import {PRESETS,SENSORKEYS,MOUNTS} from './presets.js';
import {detect} from './model.js';
import {radStage,radR,radScene,radCam,radCtl,radView,setRadView,updateFov,showDets} from './view.js';
import {metrics,initMeas} from './metrics.js';

let acc=0,lastMetrics=0,res=null,scanNo=0;
function scan(){res=detect(mulberry32(F.driving?(Math.random()*4294967296)>>>0:777+scanNo));showDets(res.dets);}

export default {
  id:'radar',label:'Radar',
  state:R,params,presets:PRESETS,experiments:EXPS,
  views:[{id:'radar',label:'Radarbeeld',stage:radStage,renderer:radR,camera:radCam}],
  onChange(k){
    if(k==='preset'&&R.preset!=='custom')Object.assign(R,PRESETS[R.preset]);
    else if(SENSORKEYS.includes(k))R.preset='custom';
    if(['preset','mount','rmax','hfov'].includes(k))setTimeout(()=>setRadView(radView),0);
  },
  disabled(){return false;},
  reset(o){const ns=JSON.parse(JSON.stringify(RBASE));Object.assign(ns,{color:R.color,vectors:R.vectors,show3d:R.show3d});
    const pr=o.preset||'mrr';Object.assign(ns,PRESETS[pr]);ns.preset=pr;Object.assign(ns,o);Object.assign(R,ns);},
  eye(){const m=MOUNTS[R.mount];return {x:m.x,h:R.mountH};},
  init(){initMeas();updateFov();setRadView('top');},
  resetView(){setRadView(radView);},
  update3d(){updateFov();},
  step(dt,now,force){acc+=dt;
    if(force||(F.driving&&acc>=1/R.freq)){acc=0;scanNo++;scan();}
    if(force||(F.driving&&now-lastMetrics>250)){metrics(res);lastMetrics=now;}},
  animate(){radCtl.update();},
  render(vis){if(vis.has('radar'))radR.render(radScene,radCam);},
  stats:()=>res,
  bench(){const t=performance.now();scan();return performance.now()-t;}
};
