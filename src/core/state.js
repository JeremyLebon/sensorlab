/* core/state.js — gedeelde toestand
   Opmerking: S bevat nu nog ook de lidar-parameters (type … deskew). Bij de stap naar de
   sensor-interface verhuizen die naar sensors/lidar (zie CLAUDE.md). */
const S={world:'street',preset:'vlp16',type:'rot',hfov:360,hres:0.2,layers:16,vfov:30,vcenter:0,rmax:100,freq:10,mount:'roofM',mountH:1.85,
  err:{yaw:0,pitch:0,h:0,x:0},rain:0,fog:0,dust:false,dustD:0.6,wet:false,interf:false,
  echo:'first',noise:0.02,speed:8,deskew:true,color:'height',objects:'full',beams:true,live:false,psize:1,
  ped:{x:12,y:1.2},dog:{x:7,y:-1.8},vx:0,vy:0};
const EGO={yaw:0,vyRate:0,target:0};   // rijstrookwissel: laterale positie S.vy, koers EGO.yaw
const BASE=JSON.parse(JSON.stringify(S));
const WORLDSTART={street:{ped:{x:12,y:1.2},dog:{x:7,y:-1.8},speed:8},farm:{ped:{x:18,y:-2},dog:{x:9,y:1.6},speed:6},highway:{ped:{x:334,y:-8.2},dog:{x:0,y:0},speed:30}};
