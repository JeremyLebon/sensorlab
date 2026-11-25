/* sensors/lidar/rays.js — rekenkern: een reeks kolommen (azimut × alle lagen) meten
   Zuivere functie: schrijft enkel in `out`. Draait op de main thread én in de workers (worker.js),
   dus GEEN three.js, DOM of puntenbuffer hier.
   Elke kolom heeft een eigen RNG-seed → resultaat onafhankelijk van hoe de kolommen verdeeld worden.

   job: {i0,i1, nL, az0, step, els[], ax,ay,ayaw (werkelijke pose), qx,qy,qyaw (geplotte pose),
         v (snelheid voor de verschuiving tijdens een volledige omwenteling, 0 bij sweep), shiftQ (deskew), seed}
   out: {pos F32[n*3], Z F32, SG F32, LY U8, SRC U8, OID I16, BL U8}   met n = (i1-i0+1)·nL           */
import {D2R,fmod,mulberry32,gauss} from '../../core/util.js';
import {L} from './state.js';
import {selfBlock,measure,sTh,mountX} from './model.js';

export function allocOut(n){return {pos:new Float32Array(n*3),Z:new Float32Array(n),SG:new Float32Array(n),LY:new Uint8Array(n),SRC:new Uint8Array(n),OID:new Int16Array(n),BL:new Uint8Array(n)};}
export const outBuffers=o=>[o.pos.buffer,o.Z.buffer,o.SG.buffer,o.LY.buffer,o.SRC.buffer,o.OID.buffer,o.BL.buffer];

export function computeColumns(j,out){
  const nL=j.nL,els=j.els,H=L.mountH,mx=mountX(),yawE=L.err.yaw*D2R,pitE=L.err.pitch*D2R,th=sTh();
  const cy=Math.cos(j.ayaw),sy=Math.sin(j.ayaw),cq=Math.cos(j.qyaw),sq=Math.sin(j.qyaw),rot=L.type==='rot';
  const pa=out.pos;
  for(let i=j.i0;i<=j.i1;i++){
    const rng=mulberry32((j.seed^Math.imul(i+1,0x9E3779B1))>>>0);
    const azN=j.az0+(i+0.5)*j.step,azNr=azN*D2R,azR=azNr+yawE,dxR=Math.cos(azR),dyR=Math.sin(azR),cA=Math.cos(azNr),sA=Math.sin(azNr);
    // verplaatsing tijdens de omwenteling (enkel volledige scan in beweging): werkelijk altijd, geplot enkel met deskew
    const sh=j.v&&rot?j.v*fmod(azN+180,360)/360/L.freq:0;
    const vx=j.ax+sh,ox=vx+mx*cy,oy=j.ay+mx*sy,qx=j.qx+(j.shiftQ?sh:0),qy=j.qy;
    for(let jj=0;jj<nL;jj++){const k=(i-j.i0)*nL+jj,elR=els[jj]+pitE*cA;let ok=false;out.BL[k]=0;
      if(selfBlock(mx,0,H,dxR,dyR,Math.tan(elR)))out.BL[k]=1;
      else{const m=measure(rng,ox,oy,H,azR+j.ayaw,elR);
        if(m){const R=m.R+(L.noise>0?gauss(rng)*L.noise:0);
          if(R>=0.3){const elN=els[jj],hz=R*Math.cos(elN),z=H+L.err.h+R*Math.sin(elN);
            const hx=mx+L.err.x+hz*cA,hy=hz*sA;pa[k*3]=qx+hx*cq-hy*sq;pa[k*3+1]=z;pa[k*3+2]=-(qy+hx*sq+hy*cq);
            out.Z[k]=z;out.SG[k]=Math.log10(Math.max(m.sig/th,1));out.LY[k]=jj;out.SRC[k]=m.src;out.OID[k]=m.o&&m.o.idx!==undefined?m.o.idx:-1;ok=true;}}}
      if(!ok){pa[k*3]=0;pa[k*3+1]=-1e5;pa[k*3+2]=0;out.OID[k]=-2;}}
  }
}
