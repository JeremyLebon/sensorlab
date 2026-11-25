/* core/models3d.js — gedeelde 3D-modellen (sedan, vrachtwagen, moto) */
import * as THREE from 'three';
export const V=(x,y,z)=>new THREE.Vector3(x,z,-y);  // wereld (x vooruit, y links, z omhoog) → three (y omhoog)
export const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export const geoCache={};
export function carGeos(){
  if(geoCache.car)return geoCache.car;
  const s=new THREE.Shape();
  s.moveTo(-2.3,0.3);s.lineTo(-2.34,0.6);s.quadraticCurveTo(-2.37,0.9,-2.12,0.95);s.lineTo(1.05,0.98);
  s.quadraticCurveTo(2.0,0.93,2.26,0.8);s.quadraticCurveTo(2.4,0.6,2.31,0.34);s.lineTo(1.84,0.33);
  s.absarc(1.42,0.33,0.42,0,Math.PI,false);s.lineTo(-1.0,0.33);s.absarc(-1.42,0.33,0.42,0,Math.PI,false);s.lineTo(-2.3,0.3);
  const body=new THREE.ExtrudeGeometry(s,{depth:1.62,bevelEnabled:true,bevelThickness:0.1,bevelSize:0.07,bevelSegments:4,curveSegments:16});body.translate(0,0,-0.81);
  const g=new THREE.Shape();g.moveTo(-1.6,0.95);g.quadraticCurveTo(-1.25,1.25,-0.95,1.38);g.quadraticCurveTo(-0.4,1.43,0.25,1.41);g.quadraticCurveTo(0.7,1.25,1.02,0.97);g.lineTo(-1.6,0.95);
  const glass=new THREE.ExtrudeGeometry(g,{depth:1.36,bevelEnabled:true,bevelThickness:0.06,bevelSize:0.04,bevelSegments:3,curveSegments:12});glass.translate(0,0,-0.68);
  const roof=new THREE.BoxGeometry(1.15,0.035,1.38);roof.translate(-0.33,1.43,0);
  const tire=new THREE.CylinderGeometry(0.33,0.33,0.23,24);tire.rotateX(Math.PI/2);
  const rim=new THREE.CylinderGeometry(0.21,0.21,0.235,16);rim.rotateX(Math.PI/2);
  const lamp=new THREE.BoxGeometry(0.06,0.09,0.34);
  return geoCache.car={body,glass,roof,tire,rim,lamp};
}
export const M={glass:new THREE.MeshStandardMaterial({color:0x17222c,metalness:0.4,roughness:0.12}),tire:new THREE.MeshStandardMaterial({color:0x151617,roughness:0.9}),
  rim:new THREE.MeshStandardMaterial({color:0xc4cad0,metalness:0.8,roughness:0.3}),head:new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xfff3d6,emissiveIntensity:0.6}),
  tail:new THREE.MeshStandardMaterial({color:0xb01818,emissive:0x8a0000,emissiveIntensity:0.6})};
for(const m of Object.values(M)){m.polygonOffset=true;m.polygonOffsetFactor=2;m.polygonOffsetUnits=6;}
export function paint(col){return new THREE.MeshStandardMaterial({color:col,metalness:0.45,roughness:0.35,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:6,transparent:true});}
export function buildCar(col,bodyMat){
  const G=carGeos(),g=new THREE.Group(),pm=bodyMat||paint(col);
  g.add(new THREE.Mesh(G.body,pm),new THREE.Mesh(G.glass,M.glass),new THREE.Mesh(G.roof,pm));
  for(const [x,z] of [[1.42,0.83],[1.42,-0.83],[-1.42,0.83],[-1.42,-0.83]]){const t=new THREE.Mesh(G.tire,M.tire);t.position.set(x,0.33,z);const r=new THREE.Mesh(G.rim,M.rim);r.position.set(x,0.33,z);g.add(t,r);}
  for(const z of [0.58,-0.58]){const h=new THREE.Mesh(G.lamp,M.head);h.position.set(2.3,0.72,z);const t=new THREE.Mesh(G.lamp,M.tail);t.position.set(-2.36,0.8,z);g.add(h,t);}
  for(const z of [0.98,-0.98]){const m=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.1,0.14),pm);m.position.set(0.85,1.02,z);g.add(m);}
  g.userData.paint=pm;return g;
}
export function buildTruck(col){
  const g=new THREE.Group(),pm=paint(col),cab=paint('#2f6db5');
  const tr=new THREE.Mesh(new THREE.BoxGeometry(13.6,2.85,2.55),pm);tr.position.set(0,1.15+1.425,0);
  const chassis=new THREE.Mesh(new THREE.BoxGeometry(14.5,0.3,1.0),M.tire);chassis.position.set(1.5,1.0,0);
  const c=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.5,2.5),cab);c.position.set(8.2,0.55+1.25,0);
  const ws=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.9,2.2),M.glass);ws.position.set(9.42,2.4,0);
  g.add(tr,chassis,c,ws);
  const tg=new THREE.CylinderGeometry(0.5,0.5,0.35,20);tg.rotateX(Math.PI/2);
  for(const x of [-5.6,-4.3,-3.0,7.6,9.0])for(const z of [1.05,-1.05]){const w=new THREE.Mesh(tg,M.tire);w.position.set(x,0.5,z);g.add(w);}
  return g;
}
export function buildMoto(){const g=new THREE.Group(),pm=paint('#c42b2b'),dark=paint('#202326');
  const tg=new THREE.CylinderGeometry(0.32,0.32,0.14,20);tg.rotateX(Math.PI/2);
  for(const x of [0.72,-0.72]){const w=new THREE.Mesh(tg,M.tire);w.position.set(x,0.32,0);g.add(w);}
  const b=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.35,0.35),pm);b.position.set(0.05,0.7,0);
  const r=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.2,0.7,12),dark);r.position.set(-0.15,1.15,0);r.rotation.z=-0.35;
  const h=new THREE.Mesh(new THREE.SphereGeometry(0.15,14,10),pm);h.position.set(0.0,1.55,0);g.add(b,r,h);return g;}
