/* sensors/lidar/presets.js — voorbeeldsensoren */
const PRESETS={
  vlp16:{type:'rot',hfov:360,hres:0.2,layers:16,vfov:30,vcenter:0,rmax:100,freq:10,mount:'roofM',mountH:1.85},
  os64:{type:'rot',hfov:360,hres:0.35,layers:64,vfov:45,vcenter:0,rmax:80,freq:10,mount:'roofM',mountH:1.85},
  hr128:{type:'rot',hfov:360,hres:0.2,layers:128,vfov:40,vcenter:-10,rmax:200,freq:10,mount:'roofM',mountH:1.85},
  solid:{type:'static',hfov:120,hres:0.2,layers:64,vfov:25,vcenter:-3,rmax:200,freq:10,mount:'front',mountH:0.6},
  safety:{type:'rot',hfov:270,hres:0.5,layers:1,vfov:2,vcenter:0,rmax:30,freq:25,mount:'front',mountH:0.25},
  lds:{type:'rot',hfov:360,hres:1,layers:1,vfov:2,vcenter:0,rmax:8,freq:5,mount:'front',mountH:0.3}
};
const SENSORKEYS=['type','hfov','hres','layers','vfov','vcenter','rmax','freq','mount','mountH'];
