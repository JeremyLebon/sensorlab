/* core/camera.js — camerastandpunten van de 3D-wereld; volgt de wagen tijdens het rijden */
let view='free';
function setView(v){view=v;document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  const x=S.vx,z=-S.vy;controls.enabled=v!=='sensor';
  if(v==='free'){camera.position.set(x-13,8,z+11);controls.target.set(x+8,0.6,z);}
  if(v==='chase'){camera.position.set(x-11,4.2,z+0.01);controls.target.set(x+12,1,z);}
  if(v==='top'){camera.position.set(x+9,50,z+0.01);controls.target.set(x+9,0,z);}
  camera.fov=v==='sensor'?75:50;camera.updateProjectionMatrix();controls.update();}
let lastVx=0,lastVy=0;
function followCams(){
  const d=S.vx-lastVx,dz=-(S.vy-lastVy);
  if(view==='sensor'){const mx=mountX()+0.12,c=Math.cos(EGO.yaw),s2=Math.sin(EGO.yaw);camera.position.set(S.vx+mx*c,S.mountH+0.05,-(S.vy+mx*s2));camera.lookAt(S.vx+mx*c+20*c,S.mountH-1.0,-(S.vy+mx*s2+20*s2));}
  else if(d!==0||dz!==0){camera.position.x+=d;controls.target.x+=d;camera.position.z+=dz;controls.target.z+=dz;}
  if(pcvView==='drv'){pcvCam.position.set(-0.6,1.25,0);pcvCam.lookAt(30,0.6,0);}
}
