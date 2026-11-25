/* core/world.js — wereldopbouw en botsvormen
   onderdelen: box(cx,cy,lx,ly,z0,z1,yaw) · cyl(cx,cy,r,z0,z1) · wall(x1,y1,x2,y2,z0,z1,dikte)
   vis:false = enkel botsvorm (visueel door een apart model, bv. een auto)
   Elke wereld (src/worlds/*.js) levert {label, build(helpers) → W, isMark(x,y), marks(dashes,solids,W)}. */
import {S} from './state.js';
import street from '../worlds/street.js';
import highway from '../worlds/highway.js';
import farm from '../worlds/farm.js';
export const WORLDS={street,highway,farm};
export let W=null;                             // enkel in dit bestand toewijzen (live binding voor importeurs)
export const TDX=new Map();                    // verplaatsing van rijdend verkeer (blijft bij herbouw)
export const onPrims=[];                       // callbacks na het herbouwen van de botsvormen (bv. lidar-hoekvakken)
export function buildWorld(){
  const objs=[];
  const O=(name,rho,col,opt={})=>{const o=Object.assign({name,rho,col,parts:[],models:[],glass:false,key:false,v:0},opt);objs.push(o);return o;};
  const box=(o,cx,cy,lx,ly,z0,z1,yaw=0,vis=true)=>o.parts.push({s:'box',cx,cy,lx,ly,z0,z1,yaw,vis});
  const cyl=(o,cx,cy,r,z0,z1,vis=true)=>o.parts.push({s:'cyl',cx,cy,r,z0,z1,vis});
  const wall=(o,x1,y1,x2,y2,z0,z1,t=0.2,vis=true)=>o.parts.push({s:'wall',x1,y1,x2,y2,z0,z1,t,vis});
  const car=(o,cx,cy,yaw,col)=>{const c=Math.cos(yaw),s=Math.sin(yaw),L=(lx,ly)=>[cx+lx*c-ly*s,cy+lx*s+ly*c];
    box(o,cx,cy,4.66,1.84,0.25,0.97,yaw,false);const p=L(-0.28,0);box(o,p[0],p[1],2.55,1.52,0.97,1.43,yaw,false);
    for(const [a,b] of [[1.42,0.82],[1.42,-0.82],[-1.42,0.82],[-1.42,-0.82]]){const q=L(a,b);box(o,q[0],q[1],0.66,0.22,0,0.66,yaw,false);}
    o.models.push({k:'car',cx,cy,yaw,col:col||o.col});o.hx=cx;o.hy=cy;};
  const truck=(o,cx,cy,yaw=0)=>{ // trekker + oplegger, cx = midden oplegger
    box(o,cx,cy,13.6,2.55,1.15,4.0,0,false);box(o,cx+8.2,cy,2.4,2.5,0.5,3.3,0,false);
    for(const x of [cx-5.6,cx-4.3,cx-3.0,cx+7.6,cx+9.0])for(const y of [cy+1.0,cy-1.0])box(o,x,y,1.0,0.35,0,1.0,0,false);
    o.models.push({k:'truck',cx,cy,col:o.col});o.hx=cx;o.hy=cy;};
  const person=(o,x,y,h=1.78)=>{cyl(o,x,y,0.22,0,h,'person');o.hx=x;o.hy=y;};
  W=WORLDS[S.world].build({O,box,cyl,wall,car,truck,person});   // vult ook objs
  objs.forEach((o,i)=>{o.idx=i;o.uid=o.name+'#'+i;o.dx=TDX.get(o.uid)||0;});W.objs=objs;W.dynamic=objs.some(o=>o.v!==0);
  buildPrims();
}
export function buildPrims(){
  const P=[];
  // pi = index van het onderdeel binnen het object (een box levert 4 segmenten met dezelfde pi)
  for(const ob of W.objs){const dx=ob.dx;ob.parts.forEach((p,pi)=>{
    if(p.s==='box'){const c=Math.cos(p.yaw),s=Math.sin(p.yaw),pts=[[1,1],[-1,1],[-1,-1],[1,-1]].map(([a,b])=>[dx+p.cx+(a*p.lx/2)*c-(b*p.ly/2)*s,p.cy+(a*p.lx/2)*s+(b*p.ly/2)*c]);
      for(let i=0;i<4;i++){const A=pts[i],B=pts[(i+1)%4];P.push({k:0,o:ob,pi,x1:A[0],y1:A[1],x2:B[0],y2:B[1],z0:p.z0,z1:p.z1});}}
    else if(p.s==='cyl')P.push({k:1,o:ob,pi,cx:dx+p.cx,cy:p.cy,r:p.r,z0:p.z0,z1:p.z1});
    else P.push({k:0,o:ob,pi,x1:dx+p.x1,y1:p.y1,x2:dx+p.x2,y2:p.y2,z0:p.z0,z1:p.z1});});}
  W.prims=P;for(const f of onPrims)f();
}
/* wegmarkering: retroreflecterende verf → hogere reflectie dan asfalt (definitie per wereld) */
// enkel voor de lidar-worker: wereld (ground, dustC, prims) overnemen van de main thread
export function setWorld(w){W=w;}
export function isMark(x,y){const w=WORLDS[W.ground];return w&&w.isMark?w.isMark(x,y):false;}
