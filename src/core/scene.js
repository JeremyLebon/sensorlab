/* core/scene.js — hoofdscene: renderer, licht, grond, wegen, wereldobjecten, eigen wagen */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {$} from './util.js';
import {S} from './state.js';
import {CARC} from './vehicle.js';
import {W,WORLDS} from './world.js';
import {V,css,M,buildCar,buildTruck,buildMoto} from './models3d.js';
export const stage=$('stage');
export const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
stage.prepend(renderer.domElement);
$('loading').remove();
export const scene=new THREE.Scene();
export const camera=new THREE.PerspectiveCamera(50,1,0.05,1200);
export const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.maxPolarAngle=Math.PI*0.495;
scene.add(new THREE.HemisphereLight(0xffffff,0x667766,1.5));
export const sun=new THREE.DirectionalLight(0xffffff,1.7);sun.position.set(-30,60,25);scene.add(sun);
export const groundMat=new THREE.MeshStandardMaterial({roughness:1,depthWrite:false});
export const roadMat=new THREE.MeshStandardMaterial({roughness:0.95,metalness:0,depthWrite:false});
export const markMat=new THREE.MeshBasicMaterial({color:0xf4f4ee,depthWrite:false});
export const ground=new THREE.Mesh(new THREE.PlaneGeometry(3000,400),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-0.012;ground.renderOrder=-3;scene.add(ground);
export const grid=new THREE.GridHelper(400,80,0x888888,0x888888);grid.material.opacity=0.1;grid.material.transparent=true;grid.material.depthWrite=false;grid.renderOrder=-2;scene.add(grid);
export let roadGroup=new THREE.Group();scene.add(roadGroup);
export function themeColors(){scene.background=new THREE.Color(css('--sky'));if(scene.fog)scene.fog.color=new THREE.Color(css('--sky'));
  groundMat.color.set(W&&W.ground==='farm'?(matchMedia('(prefers-color-scheme: dark)').matches?'#2a2418':'#cbbd9c'):css('--floor'));
  roadMat.color.set(css('--road'));if(S.wet)roadMat.color.multiplyScalar(0.55);
  markMat.color.set(S.wet?0x9aa0a0:0xf4f4ee);}

export let worldGroup=new THREE.Group();scene.add(worldGroup);
export const worldMats=new Set();
export function mat(col,glass){const m=new THREE.MeshStandardMaterial({color:col,roughness:glass?0.1:0.75,metalness:0,transparent:true,opacity:glass?0.22:1,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:6});m.userData.glass=glass;worldMats.add(m);return m;}
export function buildRoads(){
  scene.remove(roadGroup);roadGroup=new THREE.Group();scene.add(roadGroup);
  for(const [y0,y1] of W.roads){const r=new THREE.Mesh(new THREE.PlaneGeometry(W.x1-W.x0,y1-y0),roadMat);r.rotation.x=-Math.PI/2;r.position.set((W.x0+W.x1)/2,-0.008,-(y0+y1)/2);r.renderOrder=-2;roadGroup.add(r);}
  // markeringen tekenen (dezelfde definitie als het lidarmodel, als strepen) — zie worlds/*.js marks()
  const pl=new THREE.PlaneGeometry(1,1);pl.rotateX(-Math.PI/2);
  const dashes=[],solids=[];
  const wd=WORLDS[W.ground];if(wd&&wd.marks)wd.marks(dashes,solids,W);
  if(dashes.length){const im=new THREE.InstancedMesh(pl,markMat,dashes.length);const m4=new THREE.Matrix4();
    dashes.forEach((d,i)=>{m4.makeScale(d[2],1,d[3]);m4.setPosition(d[0],-0.004,-d[1]);im.setMatrixAt(i,m4);});im.renderOrder=-1;roadGroup.add(im);}
  for(const [y,w] of solids){const s=new THREE.Mesh(pl,markMat);s.scale.set(W.x1-W.x0,1,w);s.position.set((W.x0+W.x1)/2,-0.004,-y);s.renderOrder=-1;roadGroup.add(s);}
}
export function buildWorldMeshes(){
  scene.remove(worldGroup);worldMats.clear();
  worldGroup=new THREE.Group();scene.add(worldGroup);
  for(const ob of W.objs){const og=new THREE.Group();ob.group=og;worldGroup.add(og);const m=mat(ob.col,ob.glass);
    for(const md of ob.models){let g;
      if(md.k==='car'){g=buildCar(md.col);worldMats.add(g.userData.paint);g.position.copy(V(md.cx,md.cy,0));g.rotation.y=md.yaw;}
      else if(md.k==='truck'){g=buildTruck(md.col);g.traverse(c=>{if(c.material&&c.material.transparent!==undefined&&c.material!==M.tire&&c.material!==M.glass)worldMats.add(c.material);});g.position.copy(V(md.cx,md.cy,0));}
      else if(md.k==='moto'){g=buildMoto();g.position.copy(V(md.cx,md.cy,0));}
      og.add(g);}
    const groups=new Map();
    for(const p of ob.parts){if(p.vis!==true||p.s==='wall')continue;const key=p.s==='box'?['b',p.lx,p.ly,p.z0,p.z1,p.yaw].join():['c',p.r,p.z0,p.z1].join();(groups.get(key)||groups.set(key,[]).get(key)).push(p);}
    const inst=new Set();
    for(const [key,arr] of groups){if(arr.length<8)continue;const q=arr[0];
      const geo=q.s==='box'?new THREE.BoxGeometry(q.lx,q.z1-q.z0,q.ly):new THREE.CylinderGeometry(q.r,q.r,q.z1-q.z0,q.r>1?32:10);
      const im=new THREE.InstancedMesh(geo,m,arr.length),m4=new THREE.Matrix4(),qt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),q.yaw||0),one=new THREE.Vector3(1,1,1);
      arr.forEach((p,i)=>{m4.compose(V(p.cx,p.cy,(p.z0+p.z1)/2),qt,one);im.setMatrixAt(i,m4);inst.add(p);});og.add(im);}
    for(const p of ob.parts){if(p.vis===false||inst.has(p))continue;let mesh;
      if(p.vis==='person'){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.2,p.z1-0.25,14),m);body.position.y=(p.z1-0.25)/2;
        const head=new THREE.Mesh(new THREE.SphereGeometry(0.12,14,10),m);head.position.y=p.z1-0.12;g.add(body,head);g.position.copy(V(p.cx,p.cy,0));mesh=g;}
      else if(p.vis==='wheel'){const w=new THREE.Mesh(new THREE.CylinderGeometry(p.lx/2,p.lx/2,p.ly,18),M.tire);w.rotation.x=Math.PI/2;const g=new THREE.Group();g.add(w);g.position.copy(V(p.cx,p.cy,p.lx/2));g.rotation.y=p.yaw;mesh=g;}
      else if(p.vis==='twheel'){const w=new THREE.Mesh(new THREE.CylinderGeometry(p.z1/2,p.z1/2,0.45,20),M.tire);w.rotation.x=Math.PI/2;const g=new THREE.Group();g.add(w);g.position.copy(V(p.cx,p.cy,p.z1/2));mesh=g;}
      else if(p.vis==='tire'){mesh=new THREE.Mesh(new THREE.TorusGeometry(p.r*0.7,p.r*0.32,10,24),M.tire);mesh.rotation.x=Math.PI/2;mesh.position.copy(V(p.cx,p.cy,p.r*0.32));}
      else if(p.vis==='dog'){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.22,0.24),m);body.position.y=0.38;
        const head=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.18),m);head.position.set(0.36,0.5,0);g.add(body,head);
        for(const [a,b] of [[0.22,0.08],[0.22,-0.08],[-0.22,0.08],[-0.22,-0.08]]){const l=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.28,0.06),m);l.position.set(a,0.14,b);g.add(l);}
        g.position.copy(V(p.cx,p.cy,0));g.rotation.y=p.yaw;mesh=g;}
      else if(p.s==='box'){mesh=new THREE.Mesh(new THREE.BoxGeometry(p.lx,p.z1-p.z0,p.ly),m);mesh.position.copy(V(p.cx,p.cy,(p.z0+p.z1)/2));mesh.rotation.y=p.yaw;}
      else if(p.s==='cyl'){mesh=new THREE.Mesh(new THREE.CylinderGeometry(p.r,p.r,p.z1-p.z0,p.r>1?32:14),m);mesh.position.copy(V(p.cx,p.cy,(p.z0+p.z1)/2));}
      else{const dx=p.x2-p.x1,dy=p.y2-p.y1,len=Math.hypot(dx,dy);mesh=new THREE.Mesh(new THREE.BoxGeometry(len,p.z1-p.z0,Math.max(p.t,0.015)),m);
        mesh.position.copy(V((p.x1+p.x2)/2,(p.y1+p.y2)/2,(p.z0+p.z1)/2));mesh.rotation.y=Math.atan2(dy,dx);}
      og.add(mesh);}
    og.position.x=ob.dx;
  }
  buildRoads();applyObjMode();themeColors();
  $('dogBtn').hidden=W.ground==='highway';
}
export function applyObjMode(){worldGroup.visible=S.objects!=='hidden';
  for(const m of worldMats){m.opacity=m.userData.glass?0.22:(S.objects==='ghost'?0.18:1);m.depthWrite=S.objects!=='ghost'&&!m.userData.glass;m.needsUpdate=true;}
  for(const k of ['glass','tire','rim','head','tail']){M[k].transparent=S.objects==='ghost';M[k].opacity=S.objects==='ghost'?0.18:1;M[k].depthWrite=S.objects!=='ghost';M[k].needsUpdate=true;}}

/* eigen wagen */
export const veh=new THREE.Group();scene.add(veh);
export const egoPaint=new THREE.MeshStandardMaterial({color:0x1d5c8f,metalness:0.55,roughness:0.3,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:6});
export const egoCar=buildCar(null,egoPaint);egoCar.position.x=CARC;veh.add(egoCar);
export const rackMat=new THREE.MeshStandardMaterial({color:0x2a2e33,metalness:0.6,roughness:0.4});
for(const x of [-2.0,-3.0]){const b=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.04,1.3),rackMat);b.position.set(x,1.47,0);veh.add(b);}
