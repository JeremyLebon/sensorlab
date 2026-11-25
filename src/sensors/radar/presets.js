/* sensors/radar/presets.js — voorbeeldradars (77 GHz, didactisch afgerond) */
export const PRESETS={
  lrr:{hfov:20,angRes:2,rangeRes:0.5,vRes:0.1,rmax:200,vfov:8,freq:20,mount:'front',mountH:0.5},
  mrr:{hfov:90,angRes:5,rangeRes:0.3,vRes:0.15,rmax:80,vfov:14,freq:20,mount:'front',mountH:0.5},
  srr:{hfov:150,angRes:10,rangeRes:0.15,vRes:0.2,rmax:40,vfov:20,freq:20,mount:'cornerL',mountH:0.55},
  img:{hfov:100,angRes:1,rangeRes:0.2,vRes:0.1,rmax:150,vfov:15,freq:15,mount:'front',mountH:0.5}
};
export const SENSORKEYS=['hfov','angRes','rangeRes','vRes','rmax','vfov','freq','mount','mountH'];
// montage in het voertuigframe (x vooruit vanaf de voorkant, y links), yaw in graden
export const MOUNTS={front:{x:0.08,y:0,yaw:0,label:'Voorbumper, midden'},cornerL:{x:-0.35,y:0.82,yaw:45,label:'Hoek linksvoor (45°)'},cornerR:{x:-0.35,y:-0.82,yaw:-45,label:'Hoek rechtsvoor (−45°)'}};
