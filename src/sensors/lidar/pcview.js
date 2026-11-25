/* sensors/lidar/pcview.js — puntenwolkvenster (eigen renderer, enkel punten, voertuigframe zoals RViz met base_link) */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {$,toast} from '../../core/util.js';
import {CARL,CARC} from '../../core/vehicle.js';
import {ptsGeo,pointUsers,pointMats} from './pointcloud.js';
// venster zelf aanmaken (core/layout.js toont/verbergt het via data-pane)
export const pcvStage=document.createElement('section');
pcvStage.className='stage sview';pcvStage.id='pcvStage';pcvStage.dataset.pane='lidar';pcvStage.setAttribute('aria-label','Lidar-puntenwolk');
pcvStage.innerHTML='<div class="pcvhead" id="pcvHead"></div><div class="pcvtb" id="pcvTb"><button data-pv="3d" class="on">3D</button><button data-pv="top">Boven</button><button data-pv="drv">Bestuurder</button><button id="pcvFs" title="Puntenwolk op volledig scherm (Esc = terug)">⛶</button></div><div class="pcvleg" id="pcvLeg"></div>';
$('viewsBox').appendChild(pcvStage);
export const pcvR=new THREE.WebGLRenderer({antialias:true});pcvR.setPixelRatio(Math.min(window.devicePixelRatio,2));pcvStage.prepend(pcvR.domElement);
export const pcvScene=new THREE.Scene();pcvScene.background=new THREE.Color(0x05080a);
export const pcvCam=new THREE.PerspectiveCamera(55,1,0.05,1200);
export const pcvCtl=new OrbitControls(pcvCam,pcvR.domElement);pcvCtl.enableDamping=true;
const pcvMat=new THREE.PointsMaterial({size:0.08,vertexColors:true,sizeAttenuation:true});
const pcvPts=new THREE.Points(ptsGeo,pcvMat);pcvPts.frustumCulled=false;pointUsers.push(pcvPts);pointMats.push([pcvMat,1.15]);
export const pcvWorld=new THREE.Group();pcvWorld.add(pcvPts);pcvScene.add(pcvWorld);export const YAX=new THREE.Vector3(0,1,0);
export const pcvEgo=new THREE.Group();pcvScene.add(pcvEgo);
{const eg=new THREE.Mesh(new THREE.BoxGeometry(CARL,1.4,1.84),new THREE.MeshBasicMaterial({color:0x3cc7aa,transparent:true,opacity:0.18}));eg.position.set(CARC,0.7,0);
  const ed=new THREE.LineSegments(new THREE.EdgesGeometry(eg.geometry),new THREE.LineBasicMaterial({color:0x3cc7aa}));ed.position.copy(eg.position);pcvEgo.add(eg,ed);
  for(const r of [10,20,30,50,100]){const c=new THREE.EllipseCurve(0,0,r,r,0,2*Math.PI).getPoints(128);const g=new THREE.BufferGeometry().setFromPoints(c.map(p=>new THREE.Vector3(p.x,0.01,p.y)));
    const l=new THREE.LineLoop(g,new THREE.LineBasicMaterial({color:0x1d3a44}));pcvEgo.add(l);}
  const ax=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0.01,0),new THREE.Vector3(3,0.01,0),new THREE.Vector3(0,0.01,0),new THREE.Vector3(0,0.01,-3)]),new THREE.LineBasicMaterial({color:0x9fb3bd}));pcvEgo.add(ax);}
export const pcvSensor=new THREE.Mesh(new THREE.SphereGeometry(0.06,12,8),new THREE.MeshBasicMaterial({color:0xffab3d}));pcvEgo.add(pcvSensor);
export let pcvView='3d';
export function setPcvView(v){pcvView=v;document.querySelectorAll('#pcvTb [data-pv]').forEach(b=>b.classList.toggle('on',b.dataset.pv===v));const x=0; // venster in voertuigframe (zoals RViz met base_link)
pcvCtl.enabled=v!=='drv';
  if(v==='3d'){pcvCam.position.set(x-13,7.5,5);pcvCtl.target.set(x+14,0,0);}
  if(v==='top'){pcvCam.position.set(x+10,55,0.01);pcvCtl.target.set(x+10,0,0);}
  pcvCtl.update();}
document.querySelectorAll('#pcvTb [data-pv]').forEach(b=>b.addEventListener('click',()=>setPcvView(b.dataset.pv)));
$('pcvFs').addEventListener('click',()=>{try{if(document.fullscreenElement)document.exitFullscreen();else pcvStage.requestFullscreen().catch(()=>toast('Volledig scherm is hier niet toegelaten'));}catch(e){toast('Volledig scherm is hier niet toegelaten');}});
