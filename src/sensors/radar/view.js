/* sensors/radar/view.js — radarvenster (eigen renderer, voertuigframe) en weergave in de 3D-wereld
   Venster: detecties als bollen (grootte ~ SNR, kleur volgens keuze), snelheidsvector (vr over 0,5 s), gezichtsveld en afstandsbogen.
   3D-wereld: bundel als doorschijnende waaier op de weg, detecties als paaltjes, radar als kastje in de bumper. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {$,toast,D2R} from '../../core/util.js';
import {CARL,CARC} from '../../core/vehicle.js';
import {scene,veh} from '../../core/scene.js';
import {R} from './state.js';
import {MOUNTS} from './presets.js';

const MAXD=400;
const V=(x,y,z)=>new THREE.Vector3(x,z,-y);

/* ---------- venster ---------- */
export const radStage=document.createElement('section');
radStage.className='stage sview';radStage.id='radStage';radStage.dataset.pane='radar';radStage.setAttribute('aria-label','Radarbeeld');
radStage.innerHTML='<div class="pcvhead" id="radHead"></div><div class="pcvtb" id="radTb"><button data-rv="top" class="on">Boven</button><button data-rv="3d">3D</button><button id="radFs" title="Radarbeeld op volledig scherm (Esc = terug)">⛶</button></div><div class="pcvleg" id="radLeg"></div>';
$('viewsBox').appendChild(radStage);
export const radR=new THREE.WebGLRenderer({antialias:true});radR.setPixelRatio(Math.min(window.devicePixelRatio,2));radStage.prepend(radR.domElement);
export const radScene=new THREE.Scene();radScene.background=new THREE.Color(0x05080a);
export const radCam=new THREE.PerspectiveCamera(50,1,0.1,2000);
export const radCtl=new OrbitControls(radCam,radR.domElement);radCtl.enableDamping=true;
{const eg=new THREE.Mesh(new THREE.BoxGeometry(CARL,1.4,1.84),new THREE.MeshBasicMaterial({color:0x3cc7aa,transparent:true,opacity:0.18}));eg.position.set(CARC,0.7,0);
  const ed=new THREE.LineSegments(new THREE.EdgesGeometry(eg.geometry),new THREE.LineBasicMaterial({color:0x3cc7aa}));ed.position.copy(eg.position);radScene.add(eg,ed);}
const fovGrp=new THREE.Group();radScene.add(fovGrp);
const dotGeo=new THREE.SphereGeometry(0.45,14,10),dotMat=new THREE.MeshBasicMaterial({color:0xffffff});
const dots=new THREE.InstancedMesh(dotGeo,dotMat,MAXD);dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);dots.count=0;dots.frustumCulled=false;radScene.add(dots);
const vecGeo=new THREE.BufferGeometry();vecGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(MAXD*6),3));vecGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(MAXD*6),3));
const vecs=new THREE.LineSegments(vecGeo,new THREE.LineBasicMaterial({vertexColors:true}));vecs.frustumCulled=false;radScene.add(vecs);
export let radView='top';
export function setRadView(v){radView=v;document.querySelectorAll('#radTb [data-rv]').forEach(b=>b.classList.toggle('on',b.dataset.rv===v));
  const r=Math.min(R.rmax,150),m=MOUNTS[R.mount],cx=m.x+Math.cos(m.yaw*D2R)*r*0.45,cy=m.y+Math.sin(m.yaw*D2R)*r*0.45;
  // net achter het midden: zo staat vooruit (x) bovenaan op het scherm
  if(v==='top'){radCam.position.copy(V(cx-0.01,cy,r*1.25));radCtl.target.copy(V(cx,cy,0));}
  else{radCam.position.copy(V(-12,0,9));radCtl.target.copy(V(cx,cy,0));}
  radCtl.update();}
document.querySelectorAll('#radTb [data-rv]').forEach(b=>b.addEventListener('click',()=>setRadView(b.dataset.rv)));
$('radFs').addEventListener('click',()=>{try{if(document.fullscreenElement)document.exitFullscreen();else radStage.requestFullscreen().catch(()=>toast('Volledig scherm is hier niet toegelaten'));}catch{toast('Volledig scherm is hier niet toegelaten');}});

// gezichtsveld en afstandsbogen (opnieuw opgebouwd als hfov, bereik of montage wijzigt)
let fovSig='';
export function updateFov(){const sig=R.hfov+'|'+R.rmax+'|'+R.mount;if(sig===fovSig)return;fovSig=sig;
  fovGrp.clear();const m=MOUNTS[R.mount],a0=(m.yaw-R.hfov/2)*D2R,a1=(m.yaw+R.hfov/2)*D2R,rm=R.rmax*1.2;
  const line=(pts,col)=>fovGrp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col})));
  line([V(m.x,m.y,0.02),V(m.x+rm*Math.cos(a0),m.y+rm*Math.sin(a0),0.02)],0x6b5a2a);
  line([V(m.x,m.y,0.02),V(m.x+rm*Math.cos(a1),m.y+rm*Math.sin(a1),0.02)],0x6b5a2a);
  const step=R.rmax>120?50:R.rmax>50?20:10;
  for(let r=step;r<=rm;r+=step){const pts=[];for(let i=0;i<=64;i++){const a=a0+(a1-a0)*i/64;pts.push(V(m.x+r*Math.cos(a),m.y+r*Math.sin(a),0.02));}line(pts,0x1d3a44);}
  // waaier in de 3D-wereld
  fan.geometry.dispose();fan.geometry=new THREE.CircleGeometry(Math.min(R.rmax,250),64,a0,a1-a0);fan.geometry.rotateX(-Math.PI/2);fan.position.set(m.x,0.03,-m.y);
  box.position.set(m.x,R.mountH,-m.y);box.rotation.y=m.yaw*D2R;
}

/* ---------- kleuren ---------- */
const C=new THREE.Color(),GREY=new THREE.Color(0x9aa6ad);
export function detColor(d,mode,out){
  if(mode==='source')return out.set(d.src==='ghost'?0xd04bff:0x1fb5a3);
  if(mode==='stat')return out.set(d.stat?0x9aa6ad:0xffa630);
  if(mode==='snr'){const v=Math.max(0,Math.min(1,(d.snr-0)/35));return out.setHSL(50/360,0.95,0.2+0.6*v);}
  const v=Math.max(-1,Math.min(1,d.vr/15));   // naderend rood, wegrijdend blauw
  return v<0?out.copy(GREY).lerp(C.set(0xff3b3b),-v):out.copy(GREY).lerp(C.set(0x3b8bff),v);
}
export function legendHtml(){const m=R.color;
  if(m==='source')return '<span><i style="background:#1fb5a3"></i>echt object</span><span><i style="background:#d04bff"></i>spookdoel (multipath)</span>';
  if(m==='stat')return '<span><i style="background:#ffa630"></i>bewegend</span><span><i style="background:#9aa6ad"></i>stilstaand</span>';
  if(m==='snr')return '0 dB<span class="barc" style="background:linear-gradient(90deg,hsl(50,95%,20%),hsl(50,95%,80%))"></span>35 dB';
  return 'naderend −15 m/s<span class="barc" style="background:linear-gradient(90deg,#ff3b3b,#9aa6ad,#3b8bff)"></span>+15 m/s wegrijdend';}

/* ---------- 3D-wereld ---------- */
const fan=new THREE.Mesh(new THREE.CircleGeometry(1,8),new THREE.MeshBasicMaterial({color:0xffb000,transparent:true,opacity:0.07,depthWrite:false,side:THREE.DoubleSide}));
fan.renderOrder=-1;veh.add(fan);
const box=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.09,0.16),new THREE.MeshStandardMaterial({color:0x1b1f22,roughness:0.4}));veh.add(box);
const pegs=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18,0.18,1.2,10),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85}),MAXD);
pegs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);pegs.count=0;pegs.frustumCulled=false;scene.add(pegs);

const M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),SC=new THREE.Vector3(),P3=new THREE.Vector3();
// detecties tonen (venster + wereld); gefilterde (stilstaand + ACC-filter) niet
export function showDets(dets){
  const shown=dets.filter(d=>!d.filtered).slice(0,MAXD),pa=vecGeo.attributes.position.array,ca=vecGeo.attributes.color.array;
  // stilstaande doelen (vangrail, borden…) kleiner en zonder vector, zodat bewegende doelen opvallen
  shown.forEach((d,i)=>{const s=(d.stat?0.45:0.7)+Math.min(1,Math.max(0,d.snr)/30)*(d.stat?0.4:1);
    P3.copy(V(d.vx,d.vy,R.mountH));SC.set(s,s,s);M4.compose(P3,Q,SC);dots.setMatrixAt(i,M4);detColor(d,R.color,C);dots.setColorAt(i,C);
    const L=R.vectors&&!d.stat?d.vr*0.5:0,ex=d.vx+L*Math.cos(d.azv),ey=d.vy+L*Math.sin(d.azv),o=i*6;
    pa[o]=d.vx;pa[o+1]=R.mountH;pa[o+2]=-d.vy;pa[o+3]=ex;pa[o+4]=R.mountH;pa[o+5]=-ey;for(let k=0;k<6;k+=3){ca[o+k]=C.r;ca[o+k+1]=C.g;ca[o+k+2]=C.b;}
    const ps=d.stat?0.5:1;P3.copy(V(d.x,d.y,0.6*ps));SC.set(ps,ps,ps);M4.compose(P3,Q,SC);pegs.setMatrixAt(i,M4);pegs.setColorAt(i,C);});
  dots.count=shown.length;pegs.count=R.show3d?shown.length:0;
  dots.instanceMatrix.needsUpdate=true;if(dots.instanceColor)dots.instanceColor.needsUpdate=true;
  pegs.instanceMatrix.needsUpdate=true;if(pegs.instanceColor)pegs.instanceColor.needsUpdate=true;
  vecGeo.setDrawRange(0,shown.length*2);vecGeo.attributes.position.needsUpdate=true;vecGeo.attributes.color.needsUpdate=true;
  fan.visible=R.show3d;
}
