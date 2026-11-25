/* sensors/lidar/pointcloud.js — puntenwolk (gedeelde geometrie voor beide vensters), kleuren en stralen-sweep */
import * as THREE from 'three';
import {D2R,fmod,mulberry32} from '../../core/util.js';
import {S,EGO} from '../../core/state.js';
import {L} from './state.js';
import {scene} from '../../core/scene.js';
import {css} from '../../core/models3d.js';
import {layerEls,selfBlock,measure,mountX} from './model.js';
import {PB} from './scan.js';
export let ptsGeo=new THREE.BufferGeometry();   // enkel hier toewijzen (resizePoints)
export const ptsMat=new THREE.PointsMaterial({size:0.07,vertexColors:true,sizeAttenuation:true});
const ptsObj=new THREE.Points(ptsGeo,ptsMat);ptsObj.frustumCulled=false;ptsObj.renderOrder=2;scene.add(ptsObj);
export const pointUsers=[ptsObj];             // alle Points-objecten die ptsGeo tonen (ook het puntenwolkvenster)
export const pointMats=[[ptsMat,1]];          // [materiaal, factor puntgrootte]
export function resizePoints(N){
  ptsGeo.dispose();ptsGeo=new THREE.BufferGeometry();const pos=new Float32Array(N*3);for(let k=0;k<N;k++)pos[k*3+1]=-1e5;
  ptsGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));ptsGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(N*3),3));
  for(const p of pointUsers)p.geometry=ptsGeo;}
export function setPointSize(sz){for(const [m,f] of pointMats)m.size=sz*f;}
export const SRCCOL=['#7d8792','#1fb5a3','#7fb8ff','#9b6bff','#bdbdbd','#c08a3e','#ff3b3b','#f5f0a0'];
export const SRCNAME=['grond','object','glas','regen','mist','stof','storing','markering'];
const tmpC=new THREE.Color();
function hcol(z,c){const t=Math.max(0,Math.min(1,z/3));return c.setHSL((240-240*t)/360,0.85,0.5+0.06*t);}
const SRC_C=SRCCOL.map(c=>new THREE.Color(c)),G_C=new THREE.Color('#8a949e'),O_C=new THREE.Color('#ff9a1f');
export function colorSlot(k){const ca=ptsGeo.attributes.color.array,mode=L.color,nL=PB.L;let c;
  if(mode==='height')c=hcol(PB.Z[k],tmpC);
  else if(mode==='class')c=PB.Z[k]<0.2?G_C:O_C;
  else if(mode==='intensity'){const v=Math.min(1,PB.SG[k]/3);c=tmpC.setHSL(45/360,0.95,0.12+0.66*v);}
  else if(mode==='layer')c=tmpC.setHSL((nL>1?PB.LY[k]/(nL-1)*300:180)/360,0.85,0.55);
  else c=SRC_C[PB.SRC[k]];
  ca[k*3]=c.r;ca[k*3+1]=c.g;ca[k*3+2]=c.b;}

/* stralen: vertraagde sweep (roterend) of FOV-kegel (statisch) */
const beamGeo=new THREE.BufferGeometry();beamGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(300*2*3),3));
const beamMat=new THREE.LineBasicMaterial({color:0xd26a00,transparent:true,opacity:0.75});
const beams=new THREE.LineSegments(beamGeo,beamMat);beams.frustumCulled=false;scene.add(beams);
const hitGeo=new THREE.BufferGeometry();hitGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(300*3),3));
const hits=new THREE.Points(hitGeo,new THREE.PointsMaterial({color:0xd26a00,size:0.16}));hits.frustumCulled=false;scene.add(hits);
let sweep=0;
export function updateBeams(dt){
  beams.visible=hits.visible=L.beams;if(!L.beams)return;
  beamMat.color.set(css('--lidar'));hits.material.color.set(css('--lidar'));
  const pa=beamGeo.attributes.position.array,ha=hitGeo.attributes.position.array;
  const els=layerEls(),H=L.mountH,mx=mountX(),yw=EGO.yaw,ox=S.vx+mx*Math.cos(yw),oy=S.vy+mx*Math.sin(yw),rng=mulberry32(99);let k=0,h=0;const rays=[];
  if(L.type==='rot'){sweep+=dt*180;let a=L.hfov>=360?fmod(sweep,360)-180:fmod(sweep,L.hfov)-L.hfov/2;
    const stepE=Math.max(1,Math.floor(els.length/48));for(let j=0;j<els.length;j+=stepE)rays.push([a,j]);}
  else{const as=[-L.hfov/2,-L.hfov/4,0,L.hfov/4,L.hfov/2];const js=els.length>1?[0,Math.floor(els.length/2),els.length-1]:[0];for(const a of as)for(const j of js)rays.push([a,j]);}
  for(const [azN,j] of rays){const azR=(azN+L.err.yaw)*D2R,elR=els[j]+L.err.pitch*D2R*Math.cos(azN*D2R);
    const dx=Math.cos(azR),dy=Math.sin(azR);let len,hit=false;
    if(selfBlock(mx,0,H,dx,dy,Math.tan(elR)))len=0.35;else{const m=measure(rng,ox,oy,H,azR+yw,elR);if(m){len=m.R;hit=true;}else len=Math.min(L.rmax,60);}
    const ce=Math.cos(elR),wx=Math.cos(azR+yw),wy=Math.sin(azR+yw);const ex=ox+len*ce*wx,ey=oy+len*ce*wy,ez=H+len*Math.sin(elR);
    pa[k++]=ox;pa[k++]=H;pa[k++]=-oy;pa[k++]=ex;pa[k++]=ez;pa[k++]=-ey;
    if(hit){ha[h++]=ex;ha[h++]=ez;ha[h++]=-ey;}}
  beamGeo.setDrawRange(0,k/3);beamGeo.attributes.position.needsUpdate=true;
  hitGeo.setDrawRange(0,h/3);hitGeo.attributes.position.needsUpdate=true;
}
