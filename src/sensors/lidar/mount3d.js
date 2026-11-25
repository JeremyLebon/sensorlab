/* sensors/lidar/mount3d.js — 3D-model van de lidar op de wagen (puck of solid-state + mastje) */
const sensorGrp=new THREE.Group();veh.add(sensorGrp);
const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,1,10),rackMat);sensorGrp.add(mast);
const puck=new THREE.Group();{const a=new THREE.Mesh(new THREE.CylinderGeometry(0.052,0.052,0.072,28),new THREE.MeshStandardMaterial({color:0x2c3237,metalness:0.6,roughness:0.35}));
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(0.053,0.053,0.03,28),new THREE.MeshStandardMaterial({color:0x0b0d0f,roughness:0.1,metalness:0.3}));puck.add(a,ring);}
const ssBox=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.06,0.13),new THREE.MeshStandardMaterial({color:0x22272b,roughness:0.3}));
sensorGrp.add(puck,ssBox);
function updateSensorMesh(){const mx=mountX(),H=S.mountH;puck.visible=S.type==='rot';ssBox.visible=!puck.visible;
  for(const m of [puck,ssBox]){m.position.set(mx,H,0);m.rotation.set(0,S.err.yaw*D2R,0);m.rotateZ(-S.err.pitch*D2R);}
  const base=S.mount==='front'?Math.min(H,0.3):carTop(mx);const len=Math.max(0.005,H-0.04-base);
  mast.visible=len>0.03;mast.scale.set(1,len,1);mast.position.set(mx,base+len/2,0);}
