/* core/weather.js — regen, stofwolk en mist (visueel; het effect op de sensor zit in het sensormodel) */
import * as THREE from 'three';
import {S} from './state.js';
import {W} from './world.js';
import {scene} from './scene.js';
import {css} from './models3d.js';
export const RAIN_N=2500;const rainGeo=new THREE.BufferGeometry();const rainPos=new Float32Array(RAIN_N*6);rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
export const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0x6f8fb0,transparent:true,opacity:0.45}));rain.frustumCulled=false;scene.add(rain);
for(let i=0;i<RAIN_N;i++){rainPos[i*6]=Math.random()*60-20;rainPos[i*6+1]=Math.random()*15;rainPos[i*6+2]=Math.random()*40-20;}
export function updateRain(dt){rain.visible=S.rain>0;if(!rain.visible)return;const cnt=Math.floor(RAIN_N*S.rain);
  for(let i=0;i<RAIN_N;i++){let y=rainPos[i*6+1]-dt*9;if(y<0)y+=15;rainPos[i*6+1]=y;let X=rainPos[i*6];
    if(X<S.vx-20)X+=60;if(X>S.vx+40)X-=60;rainPos[i*6]=X;rainPos[i*6+3]=X;rainPos[i*6+4]=y+0.35;rainPos[i*6+5]=rainPos[i*6+2];}
  rainGeo.setDrawRange(0,cnt*2);rainGeo.attributes.position.needsUpdate=true;}
export const DUST_N=1500;const dustGeo=new THREE.BufferGeometry();const dustBase=new Float32Array(DUST_N*3),dustPos=new Float32Array(DUST_N*3);
for(let i=0;i<DUST_N;i++){const r=Math.cbrt(Math.random()),th=Math.random()*2*Math.PI,ph=Math.acos(2*Math.random()-1);dustBase[i*3]=r*Math.sin(ph)*Math.cos(th);dustBase[i*3+1]=Math.abs(r*Math.cos(ph))*0.65;dustBase[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
export const dustMat=new THREE.PointsMaterial({color:0xb8925a,size:0.35,transparent:true,opacity:0.25,depthWrite:false});
export const dust=new THREE.Points(dustGeo,dustMat);dust.frustumCulled=false;scene.add(dust);
export let tt=0;
export function updateDust(dt){dust.visible=S.dust;if(!S.dust)return;tt+=dt;const d=W.dust,cx=S.vx+d.dx;
  for(let i=0;i<DUST_N;i++){dustPos[i*3]=cx+dustBase[i*3]*d.r+Math.sin(tt*0.7+i)*0.15;dustPos[i*3+1]=dustBase[i*3+1]*d.r;dustPos[i*3+2]=-(d.dy+dustBase[i*3+2]*d.r);}
  dustGeo.attributes.position.needsUpdate=true;dustMat.opacity=0.12+0.3*S.dustD;}
export function updateFog(){scene.fog=S.fog>0?new THREE.FogExp2(css('--sky'),S.fog*0.045):null;}
