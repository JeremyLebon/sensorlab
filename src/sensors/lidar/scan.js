/* sensors/lidar/scan.js — puntenbuffer: één vak per straal (kolom × laag), in wereldcoördinaten
   Roterend + rijden: elke frame wordt enkel de sector berekend die de sensor in die tijd doorlopen heeft
   (zoals een echte lidar live in RViz). Zo loopt de puntenwolk niet achter op de 3D-wereld.          */
import {D2R,fmod,mulberry32,gauss} from '../../core/util.js';
import {S,EGO,F} from '../../core/state.js';
import {L} from './state.js';
import {W,buildPrims} from '../../core/world.js';
import {layerEls,selfBlock,measure,effRange,sTh,mountX,buildBins} from './model.js';
import {ptsGeo,resizePoints,colorSlot,setPointSize} from './pointcloud.js';
export let PB=null,STAT={};
let sweepAz=-180,revVx=0,revVy=0,revYaw=0;
function rcull(){return Math.min(effRange(3)*1.05+5,2000);}
function ensureBuffer(){
  const els=layerEls(),nL=els.length,nAz=Math.max(1,Math.round(L.hfov/L.hres)),N=nAz*nL,sig=nAz+'|'+nL+'|'+L.hfov;
  if(PB&&PB.sig===sig){PB.els=els;return;}
  PB={sig,els,L:nL,nAz,N,az0:L.hfov>=360?-180:-L.hfov/2,step:L.hfov/nAz,Z:new Float32Array(N),SG:new Float32Array(N),LY:new Uint8Array(N),SRC:new Uint8Array(N),OID:new Int16Array(N).fill(-2),BL:new Uint8Array(N)};
  resizePoints(N);
}
let RNG=mulberry32(12345),colMs=0.05,colCount=0,sweepDone=0,effT=0;
export let effHz=0;
// werkelijke pose (vx,vy,yaw) bepaalt de stralen; geplotte pose (qx,qy,qyaw) = wat de software denkt (zonder deskew: pose bij begin omwenteling)
function computeColumn(i,vx,vy,yaw,qx,qy,qyaw){colCount++;
  const H=L.mountH,mx=mountX(),yawE=L.err.yaw*D2R,pitE=L.err.pitch*D2R,th=sTh(),nL=PB.L,els=PB.els;
  const azN=PB.az0+(i+0.5)*PB.step,azNr=azN*D2R,azR=azNr+yawE,dxR=Math.cos(azR),dyR=Math.sin(azR),cA=Math.cos(azNr),sA=Math.sin(azNr);
  const cy=Math.cos(yaw),sy=Math.sin(yaw),ox=vx+mx*cy,oy=vy+mx*sy,cq=Math.cos(qyaw),sq=Math.sin(qyaw);
  const pa=ptsGeo.attributes.position.array;
  for(let j=0;j<nL;j++){const k=i*nL+j,elR=els[j]+pitE*cA;let ok=false;PB.BL[k]=0;
    if(selfBlock(mx,0,H,dxR,dyR,Math.tan(elR)))PB.BL[k]=1;
    else{const m=measure(RNG,ox,oy,H,azR+yaw,elR);
      if(m){const R=m.R+(L.noise>0?gauss(RNG)*L.noise:0);
        if(R>=0.3){const elN=els[j],hz=R*Math.cos(elN),z=H+L.err.h+R*Math.sin(elN);
          const hx=mx+L.err.x+hz*cA,hy=hz*sA;pa[k*3]=qx+hx*cq-hy*sq;pa[k*3+1]=z;pa[k*3+2]=-(qy+hx*sq+hy*cq);
          PB.Z[k]=z;PB.SG[k]=Math.log10(Math.max(m.sig/th,1));PB.LY[k]=j;PB.SRC[k]=m.src;PB.OID[k]=m.o&&m.o.idx!==undefined?m.o.idx:-1;
          colorSlot(k);ok=true;}}}
    if(!ok){pa[k*3+1]=-1e5;PB.OID[k]=-2;}}
}
function prepScan(margin){if(W.dynamic)buildPrims();W.dustC={cx:S.vx+W.dust.dx,cy:W.dust.dy,r:W.dust.r};const mx=mountX();buildBins(S.vx+mx*Math.cos(EGO.yaw),S.vy+mx*Math.sin(EGO.yaw),margin,rcull());}
// volledige scan in één keer (stilstand, na een wijziging, of een statische flash-lidar)
export function fullScan(v){
  ensureBuffer();RNG=mulberry32(L.live||F.driving?(Math.random()*1e9)|0:12345);
  prepScan(v/L.freq*1.5+1);
  for(let i=0;i<PB.nAz;i++){const azN=PB.az0+(i+0.5)*PB.step;const t=L.type==='rot'?fmod(azN+180,360)/360/L.freq:0,sh=v*t;
    computeColumn(i,S.vx+sh,S.vy,EGO.yaw,S.vx+(L.deskew?sh:0),S.vy,EGO.yaw);}
  sweepAz=-180;revVx=S.vx;revVy=S.vy;revYaw=EGO.yaw;markPts();
}
// roterende lidar tijdens het rijden: enkel de sector die in dt doorlopen werd
export function sweepStep(dt){
  ensureBuffer();RNG=mulberry32((Math.random()*1e9)|0);prepScan(1);
  const maxCols=Math.max(4,Math.floor(14/Math.max(colMs,1e-4)));   // rekenbudget per frame: ±14 ms
  let adv=Math.min(360,360*L.freq*dt,maxCols*PB.step*1.0001);sweepDone+=adv;
  const tc0=performance.now(),nc0=colCount;
  let a=sweepAz,b=a+adv;const segs=b<=180?[[a,b]]:[[a,180],null,[-180,b-360]];
  for(const sg of segs){if(!sg){revVx=S.vx;revVy=S.vy;revYaw=EGO.yaw;continue;}
    const i0=Math.max(0,Math.floor((sg[0]-PB.az0)/PB.step-0.5)+1),i1=Math.min(PB.nAz-1,Math.floor((sg[1]-PB.az0)/PB.step-0.5));
    for(let i=i0;i<=i1;i++){if(L.deskew)computeColumn(i,S.vx,S.vy,EGO.yaw,S.vx,S.vy,EGO.yaw);else computeColumn(i,S.vx,S.vy,EGO.yaw,revVx,revVy,revYaw);}}
  sweepAz=b>180?b-360:b;markPts();
  const nc=colCount-nc0;if(nc>0)colMs=0.8*colMs+0.2*(performance.now()-tc0)/nc;
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
