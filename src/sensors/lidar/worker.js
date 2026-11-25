/* sensors/lidar/worker.js — web worker: meet een reeks kolommen buiten de UI-thread
   De build bundelt dit bestand apart en zet het als tekst in de hoofdbundel (Blob-URL), want Toledo
   en file:// laden geen apart worker-bestand. Bericht in: {job, S, L, world, bin}; uit: {job, out, ms}. */
import {S} from '../../core/state.js';
import {setWorld} from '../../core/world.js';
import {L} from './state.js';
import {buildBins} from './model.js';
import {allocOut,outBuffers,computeColumns} from './rays.js';

// botsvormen uitpakken: per primitief 8 getallen [k, objIdx, x1|cx, y1|cy, x2|r, y2, z0, z1]
function unpackWorld(w){
  const objs=[];for(const o of w.objs)objs[o.idx]=o;
  const f=w.prims,P=[];
  for(let i=0;i<f.length;i+=8){const o=objs[f[i+1]];
    if(f[i]===0)P.push({k:0,o,x1:f[i+2],y1:f[i+3],x2:f[i+4],y2:f[i+5],z0:f[i+6],z1:f[i+7]});
    else P.push({k:1,o,cx:f[i+2],cy:f[i+3],r:f[i+4],z0:f[i+6],z1:f[i+7]});}
  return {ground:w.ground,dustC:w.dustC,objs,prims:P};
}
let cur=null;
self.onmessage=e=>{
  const m=e.data,t0=performance.now();
  Object.assign(S,m.S);Object.assign(L,m.L);
  if(m.world.prims)cur=unpackWorld(m.world);   // enkel meegestuurd als de botsvormen veranderden
  cur.dustC=m.world.dustC;setWorld(cur);
  if(m.bin)buildBins(m.bin.ox,m.bin.oy,m.bin.margin,m.bin.rc);
  const n=(m.job.i1-m.job.i0+1)*m.job.nL,out=allocOut(n);
  computeColumns(m.job,out);
  self.postMessage({job:m.job,out,ms:performance.now()-t0},outBuffers(out));
};
