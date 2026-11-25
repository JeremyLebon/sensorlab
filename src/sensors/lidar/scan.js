/* sensors/lidar/scan.js — puntenbuffer en scanplanning (main thread of web workers)
   Puntenbuffer: één vak per straal (kolom × laag), in wereldcoördinaten.
   Roterend + rijden: elke frame wordt enkel de sector berekend die de sensor in die tijd doorlopen heeft
   (zoals een echte lidar live in RViz). Zo loopt de puntenwolk niet achter op de 3D-wereld.
   Workers: de kolommen worden verdeeld over een pool (rays.js = rekenkern). Resultaten komen een frame later
   binnen; resultaten van een oudere generatie (buffer gewijzigd of nieuwe volledige scan) worden genegeerd.
   Lukt een worker niet (bv. CSP in Toledo), dan rekent alles op de main thread.                        */
import {S,EGO,F} from '../../core/state.js';
import {L} from './state.js';
import {W,buildPrims,onPrims} from '../../core/world.js';
import {layerEls,effRange,mountX,buildBins} from './model.js';
import {allocOut,computeColumns} from './rays.js';
import {ptsGeo,resizePoints,colorSlot,setPointSize} from './pointcloud.js';
import workerSrc from 'virtual:lidar-worker';

export let PB=null,STAT={},effHz=0;
let sweepAz=-180,revVx=0,revVy=0,revYaw=0,sweepDone=0,effT=0;
let colMs=0.05,colMsW=0.05;          // gemeten rekentijd per kolom: main thread / worker
let gen=0,primVer=0,inflight=0,idleWaiters=[];
onPrims.push(()=>{primVer++;});

/* ---------- worker-pool ---------- */
let pool=null,useWorkers=true;
function getPool(){
  if(pool)return pool;
  pool=[];
  if(typeof Worker==='undefined'||!workerSrc)return pool;
  try{
    const url=URL.createObjectURL(new Blob([workerSrc],{type:'text/javascript'}));
    const n=Math.max(1,Math.min(6,(navigator.hardwareConcurrency||2)-1));
    for(let i=0;i<n;i++){const w=new Worker(url);w.busy=0;w.ver=-1;w.onmessage=onResult;w.onerror=onWorkerError;pool.push(w);}
  }catch{pool=[];}
  return pool;
}
function onWorkerError(e){   // bv. CSP verbiedt blob-workers → terug naar de main thread
  if(e&&e.preventDefault)e.preventDefault();
  for(const w of pool)w.terminate();pool=[];useWorkers=false;inflight=0;F.dirty=true;flushIdle();
}
const workersOn=()=>useWorkers&&getPool().length>0;
export function setWorkers(on){useWorkers=!!on;F.dirty=true;}
export function workerCount(){return workersOn()?pool.length:0;}
function flushIdle(){if(inflight===0){const a=idleWaiters;idleWaiters=[];for(const f of a)f();}}
export const scanIdle=()=>inflight===0;
export const whenIdle=()=>inflight===0?Promise.resolve():new Promise(r=>idleWaiters.push(r));

/* ---------- puntenbuffer ---------- */
function rcull(){return Math.min(effRange(3)*1.05+5,2000);}
function ensureBuffer(){
  const els=layerEls(),nL=els.length,nAz=Math.max(1,Math.round(L.hfov/L.hres)),N=nAz*nL,sig=nAz+'|'+nL+'|'+L.hfov;
  if(PB&&PB.sig===sig){PB.els=els;return;}
  gen++;
  PB={sig,els,L:nL,nAz,N,az0:L.hfov>=360?-180:-L.hfov/2,step:L.hfov/nAz,Z:new Float32Array(N),SG:new Float32Array(N),LY:new Uint8Array(N),SRC:new Uint8Array(N),OID:new Int16Array(N).fill(-2),BL:new Uint8Array(N)};
  resizePoints(N);
}
// resultaat van kolommen i0..i1 in de buffer zetten
function apply(job,out){
  const nL=job.nL,base=job.i0*nL,n=(job.i1-job.i0+1)*nL,pa=ptsGeo.attributes.position.array;
  pa.set(out.pos,base*3);PB.Z.set(out.Z,base);PB.SG.set(out.SG,base);PB.LY.set(out.LY,base);PB.SRC.set(out.SRC,base);PB.OID.set(out.OID,base);PB.BL.set(out.BL,base);
  // rijdend verkeer bewoog verder terwijl er gerekend werd: punten mee verschuiven
  const lag=(performance.now()-job.t0)/1000;
  if(W.dynamic&&lag>0){const objs=W.objs;for(let k=base;k<base+n;k++){const id=PB.OID[k];if(id>=0){const v=objs[id]&&objs[id].v;if(v)pa[k*3]+=v*lag;}}}
  for(let k=base;k<base+n;k++)if(PB.OID[k]!==-2)colorSlot(k);
  markPts();
}
function onResult(e){
  const {job,out,ms}=e.data,w=e.target;w.busy--;inflight--;
  const nc=job.i1-job.i0+1;if(nc>0)colMsW=0.8*colMsW+0.2*ms/nc;
  if(job.gen===gen&&PB&&job.nL===PB.L)apply(job,out);
  flushIdle();
}
// gedeelde voorbereiding per scan of sector: botsvormen, stofwolk, oorsprong voor de hoekvakken
function prepare(margin){
  if(W.dynamic)buildPrims();
  W.dustC={cx:S.vx+W.dust.dx,cy:W.dust.dy,r:W.dust.r};
  const mx=mountX(),bin={ox:S.vx+mx*Math.cos(EGO.yaw),oy:S.vy+mx*Math.sin(EGO.yaw),margin,rc:rcull()};
  if(!workersOn())buildBins(bin.ox,bin.oy,bin.margin,bin.rc);
  return bin;
}
function packPrims(){
  const P=W.prims,f=new Float64Array(P.length*8);
  P.forEach((p,i)=>{const o=i*8;f[o]=p.k;f[o+1]=p.o.idx;
    if(p.k===0){f[o+2]=p.x1;f[o+3]=p.y1;f[o+4]=p.x2;f[o+5]=p.y2;}else{f[o+2]=p.cx;f[o+3]=p.cy;f[o+4]=p.r;}
    f[o+6]=p.z0;f[o+7]=p.z1;});
  return {prims:f,objs:W.objs.map(o=>({idx:o.idx,rho:o.rho,glass:o.glass,thin:o.thin||0}))};
}
// kolommen i0..i1 laten meten, verdeeld over `parts` stukken
function dispatch(base,i0,i1,bin,parts){
  const t0=performance.now();
  if(!workersOn()){
    const job={...base,i0,i1,gen,t0},out=allocOut((i1-i0+1)*base.nL);
    computeColumns(job,out);apply(job,out);
    const nc=i1-i0+1;if(nc>0)colMs=0.8*colMs+0.2*(performance.now()-t0)/nc;
    return;
  }
  const cnt=i1-i0+1,np=Math.max(1,Math.min(parts,Math.ceil(cnt/8)));
  let packed=null;
  for(let p=0;p<np;p++){
    const a=i0+Math.floor(cnt*p/np),b=i0+Math.floor(cnt*(p+1)/np)-1;if(b<a)continue;
    const w=pool.reduce((m,x)=>x.busy<m.busy?x:m,pool[0]);
    const world={ground:W.ground,dustC:W.dustC};
    if(w.ver!==primVer){packed=packed||packPrims();Object.assign(world,packed);w.ver=primVer;}
    w.busy++;inflight++;
    w.postMessage({job:{...base,i0:a,i1:b,gen,t0},S:{rain:S.rain,fog:S.fog,dust:S.dust,dustD:S.dustD,wet:S.wet,interf:S.interf},L,world,bin});
  }
}
const jobBase=()=>({nL:PB.L,az0:PB.az0,step:PB.step,els:PB.els});

/* ---------- scans ---------- */
// volledige scan in één keer (stilstand, na een wijziging, of een statische flash-lidar)
export function fullScan(v){
  ensureBuffer();gen++;
  const seed=L.live||F.driving?(Math.random()*4294967296)>>>0:12345,bin=prepare(v/L.freq*1.5+1);
  const base={...jobBase(),ax:S.vx,ay:S.vy,ayaw:EGO.yaw,qx:S.vx,qy:S.vy,qyaw:EGO.yaw,v,shiftQ:L.deskew,seed};
  dispatch(base,0,PB.nAz-1,bin,workersOn()?pool.length:1);
  sweepAz=-180;revVx=S.vx;revVy=S.vy;revYaw=EGO.yaw;
}
// roterende lidar tijdens het rijden: enkel de sector die in dt doorlopen werd
export function sweepStep(dt){
  ensureBuffer();
  const wk=workersOn();
  if(wk&&inflight>=2*pool.length)return;        // wachtrij vol (2 opdrachten per worker): de sweep wacht (HUD toont lagere Hz)
  const bin=prepare(1),seed=(Math.random()*4294967296)>>>0;
  // rekenbudget: main thread ±14 ms per frame; workers rekenen de hele frametijd door (90 %)
  const maxCols=wk?Math.floor(pool.length*0.9*dt*1000/Math.max(colMsW,1e-4)):Math.floor(14/Math.max(colMs,1e-4));
  const adv=Math.min(360,360*L.freq*dt,Math.max(4,maxCols)*PB.step*1.0001);sweepDone+=adv;
  const a=sweepAz,b=a+adv,segs=b<=180?[[a,b]]:[[a,180],null,[-180,b-360]];
  for(const sg of segs){if(!sg){revVx=S.vx;revVy=S.vy;revYaw=EGO.yaw;continue;}
    const i0=Math.max(0,Math.floor((sg[0]-PB.az0)/PB.step-0.5)+1),i1=Math.min(PB.nAz-1,Math.floor((sg[1]-PB.az0)/PB.step-0.5));
    if(i1<i0)continue;
    const base=L.deskew?{...jobBase(),ax:S.vx,ay:S.vy,ayaw:EGO.yaw,qx:S.vx,qy:S.vy,qyaw:EGO.yaw,v:0,seed}
                       :{...jobBase(),ax:S.vx,ay:S.vy,ayaw:EGO.yaw,qx:revVx,qy:revVy,qyaw:revYaw,v:0,seed};
    dispatch(base,i0,i1,bin,wk?pool.length:1);}
  sweepAz=b>180?b-360:b;
}
// rijdend verkeer: punten op bewegende objecten schuiven mee tot ze opnieuw gemeten worden
export function moveDynamicPoints(dt){if(!PB||!W.dynamic)return;const vs=W.objs.map(o=>o.v||0),pa=ptsGeo.attributes.position.array,O=PB.OID;
  for(let k=0;k<PB.N;k++){const id=O[k];if(id>=0){const v=vs[id];if(v)pa[k*3]+=v*dt;}}ptsGeo.attributes.position.needsUpdate=true;}
function markPts(){ptsGeo.attributes.position.needsUpdate=true;ptsGeo.attributes.color.needsUpdate=true;
  setPointSize(0.07*L.psize*(L.layers<=2?1.6:1));}
// gemeten omwentelingen per seconde (HUD: "pc haalt X van Y Hz")
export function updateRate(dt){effT+=dt;if(effT>1){effHz=L.type==='rot'?sweepDone/360/effT:L.freq;sweepDone=0;effT=0;}}
export function computeStats(){
  const cnt=new Map();for(const o of W.objs)cnt.set(o.name,0);let n=0,blocked=0;
  for(let k=0;k<PB.N;k++){if(PB.BL[k]){blocked++;continue;}const id=PB.OID[k];if(id===-2)continue;n++;if(id>=0){const o=W.objs[id];if(o)cnt.set(o.name,cnt.get(o.name)+1);}}
  STAT={nAz:PB.nAz,L:PB.L,N:PB.N,n,blocked,cnt};
}
// test/diagnose: gemeten rekentijd per kolom
export const debugColMs=()=>({main:colMs,worker:colMsW});
