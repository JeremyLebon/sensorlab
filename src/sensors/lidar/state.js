/* sensors/lidar/state.js — toestand van de lidar (los van de gedeelde wereld-/voertuigtoestand S)
   UI-sleutels krijgen het prefix "lidar." (bv. lidar.layers, lidar.err.yaw). */
export const L={preset:'vlp16',type:'rot',hfov:360,hres:0.2,layers:16,vfov:30,vcenter:0,rmax:100,freq:10,mount:'roofM',mountH:1.85,
  err:{yaw:0,pitch:0,h:0,x:0},echo:'first',noise:0.02,deskew:true,
  color:'height',psize:1,beams:true,live:false};
export const LBASE=JSON.parse(JSON.stringify(L));
