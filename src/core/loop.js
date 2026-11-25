/* core/loop.js — resize, hoofdlus en opstart */
function resize(){for(const [r,st,c] of [[renderer,stage,camera],[pcvR,pcvStage,pcvCam]]){const b=st.getBoundingClientRect();if(b.width<2)continue;r.setSize(b.width,b.height,false);c.aspect=b.width/Math.max(1,b.height);c.updateProjectionMatrix();}}
new ResizeObserver(resize).observe($('viewsBox'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{themeColors();updateFog();});
let last=performance.now(),scanAcc=0,liveAcc=0,lastMetrics=0;
function frame(now){
  const dt=Math.min(0.1,(now-last)/1000);last=now;
  lastVx=S.vx;lastVy=S.vy;
  if(Math.abs(EGO.target-S.vy)>0.005||Math.abs(EGO.vyRate)>0.005){
    if(driving){const k=1.1,c=2.1;EGO.vyRate+=(k*(EGO.target-S.vy)-c*EGO.vyRate)*dt;EGO.vyRate=Math.max(-1.6,Math.min(1.6,EGO.vyRate));S.vy+=EGO.vyRate*dt;
      EGO.yaw=Math.atan2(EGO.vyRate,Math.max(S.speed,2));}
    else{S.vy=EGO.target;EGO.vyRate=0;EGO.yaw=0;dirty=true;}}
  else if(EGO.yaw!==0){EGO.yaw=0;S.vy=EGO.target;EGO.vyRate=0;}
  if(driving){S.vx+=S.speed*dt;
    if(W.dynamic)for(const o of W.objs)if(o.v){o.dx+=o.v*dt;const x=(o.hx??0)+o.dx;if(x-S.vx>380)o.dx-=600;else if(x-S.vx<-220)o.dx+=600;TDX.set(o.uid,o.dx);if(o.group)o.group.position.x=o.dx;}
    if(S.vx>W.end){S.vx=W.start;TDX.clear();worldDirty=true;const sh=W.end-W.start;camera.position.x-=sh;controls.target.x-=sh;lastVx=S.vx;}}
  if(worldDirty){buildWorld();buildWorldMeshes();worldDirty=false;dirty=true;}
  if(pendingCam){setView(view);setPcvView(pcvView);pendingCam=false;lastVx=S.vx;lastVy=S.vy;}
  veh.position.set(S.vx,0,-S.vy);veh.rotation.y=EGO.yaw;pcvEgo.position.set(0,0,0);pcvWorld.rotation.y=-EGO.yaw;pcvWorld.position.set(-S.vx,0,S.vy).applyAxisAngle(YAX,-EGO.yaw);pcvSensor.position.set(mountX(),S.mountH,0);updateSensorMesh();
  scanAcc+=dt;liveAcc+=dt;let force=false;
  if(dirty){fullScan(driving?S.speed:0);dirty=false;force=true;scanAcc=0;liveAcc=0;}
  else if(driving){moveDynamicPoints(dt);if(S.type==='rot')sweepStep(dt);else if(scanAcc>=1/S.freq){fullScan(0);scanAcc=0;}
    effT+=dt;if(effT>1){effHz=S.type==='rot'?sweepDone/360/effT:S.freq;sweepDone=0;effT=0;}}
  else if(S.live&&liveAcc>0.3){fullScan(0);liveAcc=0;}
  if(force||((driving||S.live)&&now-lastMetrics>250)){computeStats();metrics();lastMetrics=now;}
  followCams();if(view!=='sensor')controls.update();if(pcvView!=='drv')pcvCtl.update();
  updateBeams(dt);updateRain(dt);updateDust(dt);
  const l=$('viewsBox').dataset.l;
  if(l!=='pcv')renderer.render(scene,camera);
  if(l!=='world')pcvR.render(pcvScene,pcvCam);
  requestAnimationFrame(frame);
}
buildControls();buildExps();syncControls();
buildWorld();buildWorldMeshes();worldDirty=false;resize();setView('free');setPcvView('3d');
if(innerWidth<860)setLayout('world');
requestAnimationFrame(frame);
window.__sim={EGO,S,applyState,EXPS,stat:()=>STAT,setLayout,W:()=>W,bench:()=>{const t=performance.now();fullScan(0);computeStats();return performance.now()-t;}};
