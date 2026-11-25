/* core/state.js — gedeelde toestand

   S = wereld, weer, voertuig. De toestand van elke sensor staat in sensors/<id>/state.js. */
export const S={world:'street',rain:0,fog:0,dust:false,dustD:0.6,wet:false,interf:false,speed:8,objects:'full',
  ped:{x:12,y:1.2},dog:{x:7,y:-1.8},vx:0,vy:0};
export const EGO={yaw:0,vyRate:0,target:0};   // rijstrookwissel: laterale positie S.vy, koers EGO.yaw
export const BASE=JSON.parse(JSON.stringify(S));
// gedeelde vlaggen (meerdere modules schrijven ze): herberekenen, wereld herbouwen, camera na experiment, rijden
export const F={dirty:true,worldDirty:true,pendingCam:null,driving:false};
export const WORLDSTART={street:{ped:{x:12,y:1.2},dog:{x:7,y:-1.8},speed:8},farm:{ped:{x:18,y:-2},dog:{x:9,y:1.6},speed:6},highway:{ped:{x:334,y:-8.2},dog:{x:0,y:0},speed:30}};
